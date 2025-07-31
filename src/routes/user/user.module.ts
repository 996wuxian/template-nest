import { Module } from '@nestjs/common'
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
import { GroupAnnouncementEntity } from './entities/group_announcement.entity'
import { jwtConstants } from './jwt/constants'
// 注入策略
import { JwtStrategy } from './jwt/jwt.strategy'

import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { EventEmitterModule } from '@nestjs/event-emitter'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PermissionEntity,
      RoleEntity,
      UserFriendEntity,
      ChatListEntity,
      GroupEntity,
      GroupMemberEntity,
      GroupAnnouncementEntity
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5h' }
    }),
    PassportModule,
    EventEmitterModule
  ],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  // 其他地方要注入的话，要导出
  exports: [UserService, JwtModule]
})
export class UserModule {}
