import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable
} from '@nestjs/common'
import { UserService } from '../user/user.service'
import { Request } from 'express'
import { PermissionEntity } from '../user/entities/permission.entity'
import { Reflector } from '@nestjs/core'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class PermissionGuard implements CanActivate {
  @Inject(UserService) private userService: UserService
  @Inject(Reflector) private reflector: Reflector
  @Inject(RedisService) private redisService: RedisService

  // 经过登录守卫获得到的request中的user后，将对应的用户的permission存到redis中，当Redis中有缓存时，则使用缓存，否则
  // 请求数据库拿对应的用户数据
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    console.log('🚀 ~ PermissionGuard ~ canActivate ~ request:', request.user)
    if (!request.user) {
      return true
    }

    let permissions = await this.redisService.listGet(`user_${request.user.userName}_permission`)
    console.log('🚀 ~ PermissionGuard ~ canActivate ~ permissions:', permissions)

    if (permissions.length === 0) {
      console.log('请求数据库')
      //! 可能一个用户是多个角色
      const roles = await this.userService.findRolesByIds(request.user.roles.map((item) => item.id))
      console.log('🚀 ~ PermissionGuard ~ canActivate ~ roles:', roles)
      //! 可能存在roles[0].permissions 和roles[1].permissions
      const permissionsList: PermissionEntity[] = roles.reduce((total, current) => {
        total.push(...current.permissions)
        return total
      }, [])
      permissions = permissionsList.map((item) => item.name)
      this.redisService.listSet(`user_${request.user.userName}_permission`, permissions, 60 * 30)
    }
    //! 获取当前handler的元数据
    const requirePermissions = this.reflector.getAllAndOverride('require-permission', [
      context.getClass(),
      context.getHandler()
    ])
    console.log('🚀 ~ PermissionGuard ~ canActivate ~ requirePermissions:', requirePermissions)

    const isPermit = permissions.some((item) => {
      return item == requirePermissions
    })
    console.log('🚀 ~ PermissionGuard ~ isPermit ~ isPermit:', isPermit)
    if (isPermit && requirePermissions !== undefined) {
      return true
    } else {
      throw new ForbiddenException('您没有权限访问该接口')
    }
  }
}
