import { forwardRef, Module } from '@nestjs/common'
import { SocketService } from './socket.service'
import { SocketGateway } from './socket.gateway'
import { JwtModule } from '@nestjs/jwt'
import { jwtConstants } from '../user/jwt/constants'
import { UserModule } from '../user/user.module'
import { MessageModule } from '../message/message.module'

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5h' }
    }),
    forwardRef(() => UserModule),
    MessageModule
  ],
  providers: [SocketGateway, SocketService],
  exports: [SocketGateway, SocketService]
})
export class SocketModule {}
