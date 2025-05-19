import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { LoginDto } from './dto/login.dto'

import { UserEntity } from './entities/user.entity'
import { PermissionEntity } from './entities/permission.entity'
import { RoleEntity } from './entities/role.entity'
import { jwtConstants } from './jwt/constants'

import { InjectEntityManager } from '@nestjs/typeorm'
import { Like, EntityManager, In, Not } from 'typeorm'
import { JwtService } from '@nestjs/jwt'

import * as svgCaptcha from 'svg-captcha'

import { Email } from 'src/utils/email'
import { encryptPwd, compareSyncPwd } from 'src/utils/tools'

import { UserFriendEntity } from './entities/friend.entity'
import { AddFriendDto, UpdateFriendDto } from './dto/friend.dto'
import { SocketGateway } from '../socket/socket.gateway'
import { ChatListEntity } from './entities/chat_list.entity'

@Injectable()
export class UserService {
  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => SocketGateway))
    private socketGateway: SocketGateway
  ) {}

  @InjectEntityManager()
  entityManager: EntityManager

  // 初始化用户、角色和权限
  async initUserRulePermission() {
    // 用户初始化
    const adminUser = new UserEntity()
    adminUser.username = 'admin'
    adminUser.password = encryptPwd('iopp1234')

    const ordinaryUser = new UserEntity()
    ordinaryUser.username = '1640551913'
    ordinaryUser.password = encryptPwd('123123')

    // 角色初始化
    const adminRole = new RoleEntity()
    adminRole.name = '管理员'

    const ordinaryRole = new RoleEntity()
    ordinaryRole.name = '普通用户'

    // 权限初始化
    // 增删改查
    const addPer = new PermissionEntity()
    addPer.name = 'add'

    const deletePer = new PermissionEntity()
    deletePer.name = 'delete'

    const updatePer = new PermissionEntity()
    updatePer.name = 'update'

    const selectPer = new PermissionEntity()
    selectPer.name = 'select'

    adminUser.roles = [adminRole]
    adminRole.permissions = [addPer, deletePer, updatePer, selectPer]

    ordinaryUser.roles = [ordinaryRole]
    ordinaryRole.permissions = [addPer, updatePer, selectPer]

    await this.entityManager.save(PermissionEntity, [addPer, deletePer, updatePer, selectPer])

    await this.entityManager.save(RoleEntity, [adminRole, ordinaryRole])

    await this.entityManager.save(UserEntity, [adminUser, ordinaryUser])
  }

  // 获取验证码
  code() {
    const Captcha = svgCaptcha.create({
      size: 4, // 生成验证码的个数
      fontSize: 50, //文字大小
      width: 100, //宽度
      height: 34, //高度
      background: '#cc9966' //背景颜色
    })
    return Captcha
  }

  // 获取邮箱验证码
  async emailCode(emailText) {
    const newEmail = new Email()
    const data = await newEmail.send({
      email: emailText
    })
    return data
  }

  // 登录
  async login(userInfo: LoginDto) {
    const res = await this.validateUser(userInfo)
    if (res) {
      return {
        ...res
      }
    } else {
      return {
        code: 400,
        message: '密码错误'
      }
    }
  }

  // 验证用户
  async validateUser(userInfo: LoginDto): Promise<any> {
    let data = []
    if (userInfo.email) {
      data = await this.findOneOfEmail(userInfo.email)
      if (!data.length) {
        const res = await this.entityManager.save({
          email: userInfo.email
        } as CreateUserDto)
        data.push(res)
      }
    } else {
      data = await this.findOneOfName(userInfo.username)
      if (!data.length) {
        return {
          code: 400,
          msg: '用户不存在'
        }
      }
    }
    if (
      (data[0].username === userInfo.username &&
        compareSyncPwd(userInfo.password, data[0].password)) ||
      data[0].email === userInfo.email
    ) {
      /* eslint-disable */
      const { password, ...result } = data[0]
      // 签发
      return {
        code: 200,
        msg: '登录成功',
        data: {
          token: this.jwtService.sign(
            {
              result,
              id: result.id
            },
            {
              secret: jwtConstants.secret,
              expiresIn: '5h' // 过期时间
            }
          ),
          refresh_token: this.jwtService.sign(
            {
              userId: result.id,
              id: result.id
            },
            {
              secret: jwtConstants.secret,
              expiresIn: '7d'
            }
          ),
          userInfo: result
        }
      }
    } else {
      return false
    }
  }

  // 通过名字查找用户
  async findOneOfName(username: string) {
    const data = await this.entityManager.find(UserEntity, {
      where: { username },
      relations: {
        roles: true
      }
    })
    return data
  }

  // 通过邮箱查找用户
  async findOneOfEmail(email: string) {
    const data = await this.entityManager.find(UserEntity, {
      where: { email }
    })
    return data
  }

  // 创建用户
  async create(createUserDto: CreateUserDto) {
    const data = new UserEntity()
    data.username = createUserDto?.username || ''
    data.nickname = createUserDto?.nickname || ''
    data.password = createUserDto?.password ? encryptPwd(createUserDto?.password) : ''
    data.phone = createUserDto?.phone || ''
    data.email = createUserDto?.email || ''
    data.state = createUserDto?.state || 1

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      // 如果 createUserDto 中包含角色 ID，使用指定角色
      if (createUserDto.role) {
        const role = await transactionalEntityManager.findOne(RoleEntity, {
          where: { id: createUserDto.role }
        })

        if (role) {
          data.roles = [role]
        } else {
          throw new Error(`Role with id ${createUserDto.role} not found`)
        }
      } else {
        // 如果没有指定角色，默认分配普通用户角色
        const ordinaryRole = await transactionalEntityManager.findOne(RoleEntity, {
          where: { name: '普通用户' },
          relations: ['permissions']
        })

        if (ordinaryRole) {
          data.roles = [ordinaryRole]
        } else {
          throw new Error('默认角色"普通用户"不存在，请先初始化角色')
        }
      }
    })

    return this.entityManager.save(UserEntity, data)
  }

  // 通过id查找角色
  async findRolesByIds(roleIds: number[]) {
    return this.entityManager.find(RoleEntity, {
      where: {
        id: In(roleIds)
      },
      relations: {
        permissions: true
      }
    })
  }

  // 通过id查找用户
  async findOneOfById(id: number) {
    return this.entityManager.findOne(UserEntity, {
      where: {
        id
      }
    })
  }

  // 删除用户
  async deleteById(id: number) {
    return this.entityManager.delete(UserEntity, { id })
  }

  // 查询所有用户
  async findAll(
    query: { keyWord?: string; page?: number; pageSize?: number },
    currentUserId: number
  ) {
    let data
    let totalCount

    // 构建基础查询选项
    const queryOptions: any = {
      relations: {
        roles: true
      }
    }

    // 构建where条件
    let whereCondition: any = {}

    // 如果currentUserId存在且有效，添加排除条件
    if (currentUserId) {
      whereCondition.id = Not(currentUserId)
    }

    // 如果有关键字，添加模糊查询条件
    if (query.keyWord) {
      whereCondition.nickname = Like(`%${query.keyWord || ''}%`)
    }

    // 添加where条件到查询选项
    if (Object.keys(whereCondition).length > 0) {
      queryOptions.where = whereCondition
    }

    // 只有同时提供了page和pageSize才进行分页
    if (query.page && query.pageSize) {
      queryOptions.skip = (query.page - 1) * query.pageSize
      queryOptions.take = query.pageSize
    }

    // 执行查询
    data = (await this.entityManager.find(UserEntity, queryOptions)).filter(
      (user) => delete user.password
    )

    // 获取总数
    totalCount = await this.entityManager.count(UserEntity, {
      where: whereCondition
    })

    return {
      data,
      totalCount
    }
  }

  // 获取用户信息
  async getUserInfo(id: number) {
    const user = await this.entityManager.findOne(UserEntity, {
      where: { id },
      relations: {
        roles: true
      }
    })

    if (!user) {
      return {
        code: 400,
        msg: '用户不存在'
      }
    }

    // 移除密码字段
    const { password, ...result } = user

    return {
      code: 200,
      msg: '获取成功',
      data: result
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.entityManager.update(UserEntity, id, updateUserDto)
  }

  // 刷新token
  async refreshToken(refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken)

      const user = await this.findOneOfById(data.userId)

      const access_token = this.jwtService.sign(
        {
          userId: user.id,
          username: user.username
        },
        {
          expiresIn: '30m'
        }
      )

      const refresh_token = this.jwtService.sign(
        {
          userId: user.id
        },
        {
          expiresIn: '7d'
        }
      )

      return {
        access_token,
        refresh_token
      }
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录')
    }
  }

  // 添加好友
  async addFriend(userId: number, addFriendDto: AddFriendDto) {
    const friend = await this.findOneOfById(addFriendDto.friendId)
    if (!friend) {
      return {
        code: 400,
        msg: '用户不存在'
      }
    }

    // 检查是否已存在好友关系（包括双向关系）
    const existFriend = await this.entityManager.findOne(UserFriendEntity, {
      where: [
        { userId, friendId: addFriendDto.friendId },
        { userId: addFriendDto.friendId, friendId: userId }
      ],
      order: {
        createdAt: 'DESC' // 获取最新的一条记录
      }
    })

    if (existFriend) {
      // 根据不同状态返回不同的提示信息
      switch (existFriend.status) {
        case '0':
          return {
            code: 400,
            msg: '好友请求待确认中'
          }
        case '1':
          return {
            code: 400,
            msg: '已经是好友了'
          }
        case '2':
          // 如果是已删除状态，允许重新添加
          // 判断当前用户是发送者还是接收者
          if (existFriend.userId === userId) {
            existFriend.status = '0'
            existFriend.remark = addFriendDto.remark
            await this.entityManager.save(UserFriendEntity, existFriend)
          } else {
            // 如果当前用户是之前的接收者，创建新的请求
            const newFriendRequest = new UserFriendEntity()
            newFriendRequest.userId = userId
            newFriendRequest.friendId = addFriendDto.friendId
            newFriendRequest.remark = addFriendDto.remark
            newFriendRequest.desc = addFriendDto.desc
            newFriendRequest.status = '0'
            await this.entityManager.save(UserFriendEntity, newFriendRequest)
          }
          break
        case '3':
          return {
            code: 400,
            msg: '对方已将您拉黑'
          }
        case '4':
          // 如果是已拒绝状态，创建新的请求
          const newRequest = new UserFriendEntity()
          newRequest.userId = userId
          newRequest.friendId = addFriendDto.friendId
          newRequest.remark = addFriendDto.remark
          newRequest.desc = addFriendDto.desc
          newRequest.status = '0'
          await this.entityManager.save(UserFriendEntity, newRequest)
          break
      }
    }

    const chatList = new UserFriendEntity()
    chatList.userId = userId
    chatList.friendId = addFriendDto.friendId
    chatList.remark = addFriendDto.remark
    chatList.desc = addFriendDto.desc
    chatList.status = '0'

    await this.entityManager.save(UserFriendEntity, chatList)

    // 获取发送者的用户信息
    const sender = await this.findOneOfById(userId)

    console.log(userId, 'userId')
    console.log(sender, 'sender')
    console.log(addFriendDto.remark, 'addFriendDto.remark')

    // 通过 socket 发送好友请求通知
    this.socketGateway.server.to(`user_${addFriendDto.friendId}`).emit('systemMessage', {
      type: 'friendRequest',
      targetUserId: addFriendDto.friendId, // 接收者ID
      data: {
        fromUserId: userId,
        fromUserName: sender.nickname || sender.username,
        desc: addFriendDto.desc,
        time: new Date()
      }
    })

    return {
      code: 200,
      msg: '好友请求已发送'
    }
  }

  // 获取好友列表
  async getFriendList(userId: number, type?: 'notice' | 'friend' | 'black' | 'all') {
    if (!type || type === 'all') {
      // 如果不传type或type为all，返回所有类型的列表
      const [noticeList, friendList, blackList] = await Promise.all([
        this.getFriendListByType(userId, 'notice'),
        this.getFriendListByType(userId, 'friend'),
        this.getFriendListByType(userId, 'black')
      ])

      return {
        code: 200,
        data: {
          notice: noticeList, // 待确认和已拒绝的列表
          friend: friendList, // 已添加的好友列表
          black: blackList // 黑名单列表
        }
      }
    }

    // 如果传了具体的type，只返回对应类型的列表
    const list = await this.getFriendListByType(userId, type)
    return {
      code: 200,
      data: list
    }
  }

  // 根据类型获取具体的列表
  private async getFriendListByType(userId: number, type: 'notice' | 'friend' | 'black') {
    let whereConditions: any

    switch (type) {
      case 'notice':
        // 待确认和已拒绝的列表
        whereConditions = [
          { friendId: userId, status: '0' }, // 待确认
          { friendId: userId, status: '4' } // 已拒绝
        ]
        break
      case 'friend':
        // 已添加的好友列表
        whereConditions = [
          { userId, status: '1' },
          { friendId: userId, status: '1' }
        ]
        break
      case 'black':
        // 黑名单列表
        whereConditions = [
          { userId, status: '3' },
          { friendId: userId, status: '3' }
        ]
        break
    }

    // 查询好友关系
    const friends = await this.entityManager.find(UserFriendEntity, {
      where: whereConditions,
      relations: ['user', 'friend']
    })

    // 处理结果
    return friends.map((item) => {
      // 移除密码字段
      if (item.user) {
        item.user.password = undefined
      }
      if (item.friend) {
        item.friend.password = undefined
      }
      // 如果当前用户是接收者，对方是发送者
      if (item.friendId === userId) {
        // 创建一个新对象，避免修改原对象
        const result = { ...item }
        result.friend = item.user // 将发送者信息赋值给friend字段
        delete result.user // 删除user字段
        return result
      }

      // 如果当前用户是发送者，保持原样但删除user字段
      delete item.user
      return item
    })
  }

  // 更新好友信息
  async updateFriend(userId: number, friendId: number, updateFriendDto: UpdateFriendDto) {
    console.log(userId, 'userId')
    console.log(friendId, 'friendId')
    console.log(updateFriendDto, 'updateFriendDto')
    // 修改查询条件，同时查询正向和反向的好友关系
    const friend = await this.entityManager.findOne(UserFriendEntity, {
      where: [
        { id: updateFriendDto.id, userId, friendId },
        { id: updateFriendDto.id, userId: friendId, friendId: userId }
      ]
    })

    if (!friend) {
      return {
        code: 400,
        msg: '好友不存在'
      }
    }

    // 更新时必须包含id条件
    await this.entityManager.update(
      UserFriendEntity,
      { id: updateFriendDto.id }, // 只使用id作为更新条件
      updateFriendDto
    )

    return {
      code: 200,
      msg: '更新成功'
    }
  }

  // 删除好友
  async deleteFriend(userId: number, friendId: number) {
    const friend = await this.entityManager.findOne(UserFriendEntity, {
      where: { userId, friendId }
    })

    if (!friend) {
      return {
        code: 400,
        msg: '好友不存在'
      }
    }

    await this.entityManager.delete(UserFriendEntity, { userId, friendId })
    return {
      code: 200,
      msg: '删除成功'
    }
  }

  // 创建聊天列表
  async createChatList(userId: number, friendId: number) {
    // 检查好友关系是否存在
    const friend = await this.entityManager.findOne(UserFriendEntity, {
      where: [
        { userId, friendId, status: '1' },
        { userId: friendId, friendId: userId, status: '1' }
      ]
    })

    if (!friend) {
      return {
        code: 400,
        msg: '请先添加对方为好友'
      }
    }

    // 检查聊天列表是否已存在
    const existingChat = await this.entityManager.findOne(ChatListEntity, {
      where: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    })

    if (existingChat) {
      return {
        code: 400,
        msg: '聊天已存在'
      }
    }

    // 创建双向聊天关系
    const chat1 = new ChatListEntity()
    chat1.userId = userId
    chat1.friendId = friendId
    chat1.lastMsg = ''
    chat1.lastMsgTime = new Date()
    chat1.unReadCount = 0

    const chat2 = new ChatListEntity()
    chat2.userId = friendId
    chat2.friendId = userId
    chat2.lastMsg = ''
    chat2.lastMsgTime = new Date()
    chat2.unReadCount = 0

    await this.entityManager.save(ChatListEntity, [chat1, chat2])

    return {
      code: 200,
      msg: '创建成功'
    }
  }

  // 获取聊天列表
  async getChatList(userId: number) {
    const chatList = await this.entityManager.find(ChatListEntity, {
      where: { userId },
      relations: ['friend'],
      order: {
        unReadCount: 'DESC', // 首先按未读数降序
        lastMsgTime: 'DESC' // 然后按最后消息时间降序
      }
    })

    // 处理返回数据，移除敏感信息
    return chatList.map((chat) => {
      if (chat.friend) {
        chat.friend.password = undefined
      }
      return chat
    })
  }
}
