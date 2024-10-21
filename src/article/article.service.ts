import { Injectable } from '@nestjs/common'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { Article } from './entities/article.entity'

import { InjectEntityManager } from '@nestjs/typeorm'
import { EntityManager } from 'typeorm'

@Injectable()
export class ArticleService {
  @InjectEntityManager()
  entityManager: EntityManager
  create(createArticleDto: CreateArticleDto) {
    return 'This action adds a new article'
  }

  findAll() {
    return `This action returns all article`
  }

  async findOne(id: number) {
    return await this.entityManager.findOneBy(Article, {
      id
    })
  }

  async view(id: number) {
    const article = await this.findOne(id)

    article.viewCount++

    await this.entityManager.save(article)

    return article.viewCount
  }

  update(id: number, updateArticleDto: UpdateArticleDto) {
    return `This action updates a #${id} article`
  }

  remove(id: number) {
    return `This action removes a #${id} article`
  }
}
