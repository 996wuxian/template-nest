import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  @Inject('REDIS_CLENT') private redisClient: RedisClientType;

  async listGet(key: string) {
    //!在Redis中，LRANGE是一个用于获取列表（List）的指令 以下代码相当于LRANGE key start stop
    return await this.redisClient.lRange(key, 0, -1);
  }

  async listSet(key: string, list: string[], ttl?: number) {
    for (let i = 0; i < list.length; i++) {
      await this.redisClient.lPush(key, list[i]);
    }
    if (ttl) {
      await this.redisClient.expire(key, ttl);
    }
  }
}
