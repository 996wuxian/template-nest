import { forwardRef, Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { PermissionEntity } from './entities/permission.entity'
import { RoleEntity } from './entities/role.entity'
import { UserFriendEntity } from './entities/friend.entity'
import { ChatListEntity } from './entities/chat_list.entity'
import { GroupEntity } from './entities/group.entity'
import { GroupMemberEntity } from './entities/group_member.entity'
import { jwtConstants } from './jwt/constants'
// 注入策略
import { JwtStrategy } from './jwt/jwt.strategy'

import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { SocketModule } from '../socket/socket.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PermissionEntity,
      RoleEntity,
      UserFriendEntity,
      ChatListEntity,
      GroupEntity,
      GroupMemberEntity
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5h' }
    }),
    forwardRef(() => SocketModule),
    PassportModule
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  // 其他地方要注入的话，要导出
  exports: [UserService, JwtModule]
})
export class UserModule {}
