import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { PermissionEntity } from './entities/permission.entity'
import { RoleEntity } from './entities/role.entity'
import { jwtConstants } from './jwt/constants'
// 注入策略
import { JwtStrategy } from './jwt/jwt.strategy'

import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PermissionEntity, RoleEntity]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5h' }
    }),
    PassportModule
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  // 其他地方要注入的话，要导出
  exports: [UserService, JwtModule]
})
export class UserModule {}
