import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'

import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from './routes/user/user.module'
import { MenuModule } from './routes/menu/menu.module'
import { RedisModule } from './redis/redis.module'

import { APP_GUARD } from '@nestjs/core'
import { LoginGuard } from './guard/login.guard'
import { PermissionGuard } from './guard/permission.guard'
import { UploadModule } from './routes/upload/upload.module'
import { SocketModule } from './routes/socket/socket.module'
import { MessageModule } from './routes/message/message.module'

import { EventEmitterModule } from '@nestjs/event-emitter'
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'wuxian',
      database: 'im-db',
      // entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      retryDelay: 500,
      retryAttempts: 10,
      autoLoadEntities: true
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    MenuModule,
    RedisModule,
    UploadModule,
    SocketModule,
    MessageModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: LoginGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard
    }
  ]
})
export class AppModule {}
