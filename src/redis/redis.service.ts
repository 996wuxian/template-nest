import { Inject, Injectable } from '@nestjs/common'
import { RedisClientType } from 'redis'

@Injectable()
export class RedisService {
  @Inject('REDIS_CLIENT') private redisClient: RedisClientType

  async get(key: string) {
    return await this.redisClient.get(key)
  }

  async set(key: string, value: string | number, ttl?: number) {
    await this.redisClient.set(key, value)

    if (ttl) {
      await this.redisClient.expire(key, ttl)
    }
  }

  async keys(pattern: string) {
    return await this.redisClient.keys(pattern)
  }

  async hashGet(key: string) {
    return await this.redisClient.hGetAll(key)
  }

  async hashSet(key: string, obj: Record<string, any>, ttl?: number) {
    for (let name in obj) {
      await this.redisClient.hSet(key, name, obj[name])
    }

    if (ttl) {
      await this.redisClient.expire(key, ttl)
    }
  }

  async listGet(key: string) {
    // 在Redis中，lRange是一个用于获取列表（List）的指令 以下代码相当于lRange key start stop
    return await this.redisClient.lRange(key, 0, -1)
  }

  async listSet(key: string, list: string[], ttl?: number) {
    for (let i = 0; i < list.length; i++) {
      await this.redisClient.lPush(key, list[i])
    }
    if (ttl) {
      await this.redisClient.expire(key, ttl)
    }
  }
}
