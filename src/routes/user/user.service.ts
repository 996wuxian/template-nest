import { Injectable, UnauthorizedException } from '@nestjs/common'
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

import { UserChatListEntity } from './entities/user-chat-list.entity'
import { AddFriendDto, UpdateFriendDto } from './dto/user-chat-list.dto'

@Injectable()
export class UserService {
  constructor(private jwtService: JwtService) {}

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
              id: 'wuxian'
            },
            {
              secret: jwtConstants.secret,
              expiresIn: '5h' // 过期时间
            }
          ),
          refresh_token: this.jwtService.sign(
            {
              userId: result.id,
              id: 'wuxian'
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

    const existFriend = await this.entityManager.findOne(UserChatListEntity, {
      where: {
        userId,
        friendId: addFriendDto.friendId
      }
    })

    if (existFriend) {
      return {
        code: 400,
        msg: '已经是好友了'
      }
    }

    const chatList = new UserChatListEntity()
    chatList.userId = userId
    chatList.friendId = addFriendDto.friendId
    chatList.remark = addFriendDto.remark
    chatList.status = 0

    await this.entityManager.save(UserChatListEntity, chatList)
    return {
      code: 200,
      msg: '好友请求已发送'
    }
  }

  // 获取好友列表
  async getFriendList(userId: number) {
    const friends = await this.entityManager.find(UserChatListEntity, {
      where: { userId, status: 1 },
      relations: ['friend']
    })
    return {
      code: 200,
      data: friends
    }
  }

  // 更新好友信息
  async updateFriend(userId: number, friendId: number, updateFriendDto: UpdateFriendDto) {
    const friend = await this.entityManager.findOne(UserChatListEntity, {
      where: { userId, friendId }
    })

    if (!friend) {
      return {
        code: 400,
        msg: '好友不存在'
      }
    }

    await this.entityManager.update(UserChatListEntity, { userId, friendId }, updateFriendDto)
    return {
      code: 200,
      msg: '更新成功'
    }
  }

  // 删除好友
  async deleteFriend(userId: number, friendId: number) {
    const friend = await this.entityManager.findOne(UserChatListEntity, {
      where: { userId, friendId }
    })

    if (!friend) {
      return {
        code: 400,
        msg: '好友不存在'
      }
    }

    await this.entityManager.delete(UserChatListEntity, { userId, friendId })
    return {
      code: 200,
      msg: '删除成功'
    }
  }
}
