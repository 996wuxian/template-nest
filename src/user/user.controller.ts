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

import { RequireLogin, RequirePermission } from '../guard/custom-decorator'

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
    const { userName } = createUserDto
    const existUser = await this.userService.findOneOfName(userName)
    if (existUser.length) {
      throw new BadRequestException('注册用户已存在')
    }

    const { password, ...data } = await this.userService.create(createUserDto)
    return {
      code: 200,
      msg: '创建成功',
      data
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

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('select')
  @ApiOperation({ summary: '查找所有用户带分页带keyword' })
  async findAll(@Body() body: findAllUserDto, @Res() res) {
    const { data, totalCount } = await this.userService.findAll(body)
    res.send({
      code: 200,
      data,
      totalCount
    })
  }
}
