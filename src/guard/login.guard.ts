// 接口守卫，判断接口是否需要登录和解析token中的用户信息

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { RoleEntity } from '../user/entities/role.entity'
import { Reflector } from '@nestjs/core'

declare module 'express' {
  interface Request {
    user: {
      userName: string
      roles: RoleEntity[]
    }
  }
}

@Injectable()
// LoginGuard 使用 Reflector 来检查 require-login 元数据，以确定接口是否需要登录。
export class LoginGuard implements CanActivate {
  @Inject(JwtService) private jwtService: JwtService

  @Inject(Reflector) private reflector: Reflector

  // 首先先经过登录守卫，然后根据token解析对应的用户信息存到request.user中
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    console.log('🚀 ~ LoginGuard ~ canActivate ~ request:', request.user)

    const authorization = request.headers.authorization
    console.log('🚀 ~ LoginGuard ~ canActivate ~ authorization:', authorization)

    // Reflector 是 NestJS 提供的一个工具，用于访问类和方法的元数据。它可以从类或方法上提取装饰器设置的元数据。
    // getAllAndOverride 是 Reflector 的方法。它用于获取某个元数据键的所有值，并按优先级顺序覆盖。这意味着如果有多个装饰器提供相同的元数据键，它会返回最高优先级的那个。
    // 检查当前请求的控制器或处理程序是否需要登录。
    const notLogin = this.reflector.getAllAndOverride('require-login', [
      context.getClass(),
      context.getHandler()
    ])

    // 如果 notLogin 为 false，则不需要登录，直接返回 true。如果 notLogin 为 true 且有授权头，则验证 JWT token，并将解析后的用户信息赋值给 request.user。如果验证失败，则抛出 UnauthorizedException。
    if (!notLogin) {
      return true
    } else if (notLogin && authorization) {
      try {
        const token = authorization.split(' ')[1]
        const data = this.jwtService.verify(token)
        console.log('🚀 ~ LoginGuard ~ canActivate ~ data:', data)
        request.user = data.result
        return true
      } catch (error) {
        throw new UnauthorizedException()
      }
    }
  }
}
