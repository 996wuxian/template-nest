import { Inject, Injectable } from '@nestjs/common'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { Article } from './entities/article.entity'

import { InjectEntityManager } from '@nestjs/typeorm'
import { EntityManager } from 'typeorm'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class ArticleService {
  @Inject(RedisService)
  private redisService: RedisService

  @InjectEntityManager()
  entityManager: EntityManager
  create(createArticleDto: CreateArticleDto) {
    return 'This action adds a new article'
  }

  findAll() {
    return `This action returns all article`
  }

  async findOne(id: number) {
    const res = await this.redisService.hashGet('article_1')
    console.log(res, 'res')
    return await this.entityManager.findOneBy(Article, {
      id
    })
  }

  async view(id: number, userId: number) {
    console.log('🚀 ~ ArticleService ~ view ~ userId:', userId)
    console.log('🚀 ~ ArticleService ~ view ~ id:', id)
    const res = await this.redisService.hashGet(`article_${id}`)

    console.log('🚀 ~ ArticleService ~ view ~ res:', res)
    if (res.viewCount === undefined) {
      const article = await this.findOne(id)
      console.log('🚀 ~ ArticleService ~ view ~ article:', article)

      article.viewCount++

      // await this.entityManager.save(article)
      await this.entityManager.update(
        Article,
        { id },
        {
          viewCount: article.viewCount
        }
      )

      await this.redisService.hashSet(`article_${id}`, {
        viewCount: article.viewCount,
        likeCount: article.likeCount,
        collectCount: article.collectCount
      })

      await this.redisService.set(`user_${userId}_article_${id}`, 1, 43200)

      return article.viewCount
    } else {
      const flag = await this.redisService.get(`user_${userId}_article_${id}`)

      if (flag) {
        return res.viewCount
      }

      await this.redisService.hashSet(`article_${id}`, {
        ...res,
        viewCount: +res.viewCount + 1
      })

      await this.redisService.set(`user_${userId}_article_${id}`, 1, 43200)

      return +res.viewCount + 1
    }
  }

  async flushRedisToDB() {
    const keys = await this.redisService.keys(`article_*`)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]

      const res = await this.redisService.hashGet(key)

      const [, id] = key.split('_')

      await this.entityManager.update(
        Article,
        {
          id: +id
        },
        {
          viewCount: +res.viewCount
        }
      )
    }
  }

  update(id: number, updateArticleDto: UpdateArticleDto) {
    return `This action updates a #${id} article`
  }

  remove(id: number) {
    return `This action removes a #${id} article`
  }
}
