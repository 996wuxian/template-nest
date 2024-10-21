import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service'
import { createClient } from 'redis'

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory() {
        const client = createClient({
          socket: {
            host: '127.0.0.1', // redis服务地址
            port: 6379 // redis服务端口
          }
        })
        await client.connect()
        return client
      }
    }
  ],
  exports: [RedisService]
})
export class RedisModule {}
