import { Module } from '@nestjs/common'
import { SocketService } from './socket.service'
import { SocketGateway } from './socket.gateway'
import { JwtModule } from '@nestjs/jwt'
import { jwtConstants } from '../user/jwt/constants'
import { MessageModule } from '../message/message.module'
import { EventEmitterModule } from '@nestjs/event-emitter'
@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5h' }
    }),
    MessageModule,
    EventEmitterModule
  ],
  providers: [SocketGateway, SocketService],
  exports: [SocketGateway, SocketService]
})
export class SocketModule {}
