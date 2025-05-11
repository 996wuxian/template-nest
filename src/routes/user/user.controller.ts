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
import { AddFriendDto, UpdateFriendDto } from './dto/user-chat-list.dto'

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
    console.log(addFriendDto, 'addFriendDto')
    console.log(req.user, 'req.user')
    const userId = req.user
    return await this.userService.addFriend(userId, addFriendDto)
  }

  @Get('friend')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @ApiOperation({ summary: '获取好友列表' })
  async getFriendList(@Req() req) {
    const userId = req.user.userId
    return await this.userService.getFriendList(userId)
  }

  @Patch('friend/:friendId')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @ApiOperation({ summary: '更新好友信息' })
  async updateFriend(
    @Req() req,
    @Param('friendId') friendId: number,
    @Body() updateFriendDto: UpdateFriendDto
  ) {
    const userId = req.user.userId
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
}
