import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
  Session,
  BadRequestException,
  UseGuards,
  Query
} from '@nestjs/common'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { LoginDto } from './dto/login.dto'
import { findAllUserDto } from './dto/find-all-user.dto'

import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'

import { RequireLogin, RequirePermission } from '../../guard/custom-decorator'
import { AddFriendDto, UpdateFriendDto } from './dto/friend.dto'
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto'
import { join } from 'path'
import * as fs from 'fs'

@Controller('api/user')
@ApiTags('用户')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('init')
  @ApiOperation({ summary: '初始化用户、角色、权限' })
  async initData() {
    await this.userService.initUserRulePermission()
    return {
      code: 200,
      msg: '已初始化user表role表permission表'
    }
  }

  @Get('code')
  @ApiOperation({ summary: '获取图文验证码' })
  code(@Req() req, @Res() res, @Session() session) {
    const data = this.userService.code()
    session.code = data.text // 记录密码赋值给session自定义变量，做校验
    res.type('image/svg+xml')
    res.send(data)
  }

  @Get('emailCode')
  @ApiOperation({ summary: '获取邮箱验证码' })
  async emailCode(@Req() req, @Res() res, @Session() session) {
    const email = req.query.email
    const data = await this.userService.emailCode(email)
    session.code = data
    if (!data) return
    res.send({ code: 200, msg: '已发送，请注意查收' })
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() loginDto: LoginDto, @Session() session, @Res() res) {
    if (loginDto?.code?.toLocaleLowerCase() === session?.code?.toLocaleLowerCase()) {
      res.send(await this.userService.login(loginDto))
    } else {
      res.send({
        code: 501,
        msg: '验证码错误'
      })
    }
  }

  @Get('refresh')
  @ApiOperation({ summary: '刷新token' })
  async refresh(@Query('refresh_token') refreshToken: string) {
    const { access_token, refresh_token } = await this.userService.refreshToken(refreshToken)
    return {
      access_token,
      refresh_token
    }
  }

  @Post('register')
  @ApiOperation({ summary: '创建用户' })
  async create(@Body() createUserDto: CreateUserDto) {
    // 生成随机10位数账号
    const generateUsername = async (startNum: number): Promise<string> => {
      const randomNum = Math.floor(Math.random() * 9) + 1 // 1-9随机数
      const username = startNum.toString() + randomNum.toString().padStart(9, '0')

      // 检查用户名是否存在
      const existUser = await this.userService.findOneOfName(username)
      if (existUser.length) {
        // 如果存在，递增起始数字重试
        return generateUsername(startNum + 1)
      }
      return username
    }

    // 从1开始生成用户名
    const username = await generateUsername(1)

    // 合并生成的用户名到注册数据
    const registerData = {
      ...createUserDto,
      username,
      state: 1 // 默认启用状态
    }

    const { password, ...data } = await this.userService.create(registerData)
    return {
      code: 200,
      msg: '注册成功',
      data: {
        ...data,
        username // 返回生成的用户名
      }
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '删除用户' })
  @RequirePermission('delete')
  @RequireLogin()
  async delete(@Param('id') id: number) {
    const res = await this.userService.findOneOfById(id)
    if (!res) {
      return {
        code: 501,
        msg: '用户不存在'
      }
    }
    const isDel = await this.userService.deleteById(id)
    if (isDel) {
      return {
        code: 200,
        msg: '删除成功'
      }
    } else {
      return {
        code: 501,
        msg: '删除失败'
      }
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '修改用户' })
  async update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto, @Res() res) {
    const data = await this.userService.update(id, updateUserDto)
    if (data) {
      res.send({
        code: 200,
        msg: '修改成功'
      })
    } else {
      res.send({
        code: 400,
        msg: '修改失败'
      })
    }
  }

  @Get('info/:id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '获取用户信息' })
  async getUserInfo(@Param('id') id: number) {
    return await this.userService.getUserInfo(id)
  }

  @Post('findAll')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '查找所有用户带分页带keyword' })
  async findAll(@Body() body: findAllUserDto, @Res() res, @Req() req) {
    console.log(req.user, 'req.user')
    const { data, totalCount } = await this.userService.findAll(body, req.user)
    res.send({
      code: 200,
      data,
      totalCount
    })
  }

  @Post('addFriend')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('add')
  @ApiOperation({ summary: '添加好友' })
  async addFriend(@Req() req, @Body() addFriendDto: AddFriendDto) {
    const userId = req.user
    return await this.userService.addFriend(userId, addFriendDto)
  }

  @Get('friendList')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @ApiOperation({ summary: '获取好友列表' })
  @RequirePermission('select')
  @ApiQuery({
    name: 'type',
    enum: ['notice', 'friend', 'black', 'all'],
    required: false,
    description:
      'notice-待确认和已拒绝的列表, friend-已添加的好友列表, black-黑名单列表, all或不传-返回所有类型'
  })
  async getFriendList(@Req() req, @Query('type') type?: 'notice' | 'friend' | 'black' | 'all') {
    const userId = req.user
    return await this.userService.getFriendList(userId, type)
  }

  @Patch('friend/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '更新好友信息' })
  async updateFriend(
    @Req() req,
    @Param('friendId') friendId: number,
    @Body() updateFriendDto: UpdateFriendDto
  ) {
    const userId = req.user
    return await this.userService.updateFriend(userId, friendId, updateFriendDto)
  }

  @Delete('friend/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @ApiOperation({ summary: '删除好友' })
  async deleteFriend(@Req() req, @Param('friendId') friendId: number) {
    const userId = req.user.userId
    return await this.userService.deleteFriend(userId, friendId)
  }

  // 创建聊天关系
  @Post('chat/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('add')
  @ApiOperation({ summary: '创建聊天关系' })
  async createChatList(@Req() req, @Param('friendId') friendId: number) {
    const userId = req.user
    return await this.userService.createChatList(userId, friendId)
  }

  // 修改群聊列表状态
  @Post('group/updateGroupList')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '创建聊天关系' })
  async updateGroupList(@Req() req, @Body() body) {
    const userId = req.user
    const { groupId, status } = body
    return await this.userService.updateGroupList(userId, groupId, status)
  }

  // 获取聊天列表
  @Get('chat/list')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '获取聊天列表' })
  async getChatList(@Req() req) {
    const userId = req.user
    const chatList = await this.userService.getChatList(userId)
    return {
      code: 200,
      msg: '获取成功',
      data: chatList
    }
  }

  // 获取emoji表情列表
  @Get('emoji/list')
  @ApiOperation({ summary: '获取emoji表情列表' })
  async getEmojiList() {
    const emojiDir = join(__dirname, '../../../emoji')
    const files = await fs.promises.readdir(emojiDir)
    const emojiList = files
      .filter((file) => file.endsWith('.gif'))
      .map((file) => ({
        name: file.replace('.gif', ''),
        url: `http://localhost:9528/emoji/${file}`
      }))

    return {
      code: 200,
      msg: '获取成功',
      data: emojiList
    }
  }

  @Patch('updateChatTop/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '修改聊天列表置顶状态' })
  async updateChatTop(@Req() req, @Param('friendId') friendId: number, @Body() body) {
    const userId = req.user
    const { isTop } = body
    const res = await this.userService.updateChatTop(userId, friendId, isTop)
    if (res) {
      return {
        code: 200,
        msg: '修改成功'
      }
    } else {
      return {
        code: 500,
        msg: '修改失败'
      }
    }
  }

  @Patch('disturb/:id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '修改聊天免打扰状态' })
  async updateDisturb(
    @Param('id') chatId: number,
    @Body('is_disturb') isDisturb: '0' | '1',
    @Req() req
  ) {
    const userId = req.user
    return await this.userService.updateDisturb(userId, chatId, isDisturb)
  }

  @Delete('chat/:id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('delete')
  @ApiOperation({ summary: '删除聊天' })
  async deleteChatList(@Param('id') id: number) {
    return await this.userService.deleteChatList(id)
  }

  @Post('blacklist/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '将好友拉入黑名单' })
  async blacklistFriend(@Req() req, @Param('friendId') friendId: number) {
    const userId = req.user
    return await this.userService.blacklistFriend(userId, friendId)
  }

  @Post('unblacklist/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '将好友从黑名单中移除' })
  async unblacklistFriend(@Req() req, @Param('friendId') friendId: number) {
    const userId = req.user
    return await this.userService.unblacklistFriend(userId, friendId)
  }

  @Post('group/create')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('add')
  @ApiOperation({ summary: '创建群聊' })
  async createGroup(@Req() req, @Body() createGroupDto: CreateGroupDto) {
    // 使用当前登录用户作为创建者
    createGroupDto.creatorId = req.user
    return await this.userService.createGroup(createGroupDto)
  }

  @Get('group/list')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '获取用户所在的群聊列表' })
  async getUserGroups(@Req() req) {
    const userId = req.user
    return await this.userService.getUserGroups(userId)
  }

  @Get('group/:id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '获取群聊详情' })
  async getGroupDetail(@Req() req, @Param('id') groupId: number) {
    const userId = req.user
    return await this.userService.getGroupDetail(groupId, userId)
  }
}
