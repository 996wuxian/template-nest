import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ArticleService } from '../article/article.service'

@Injectable()
export class TaskService {
  @Inject(ArticleService)
  private articleService: ArticleService

  // 通过 @Cron 声明每 10s 执行一次：
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCron() {
    await this.articleService.flushRedisToDB()
  }
}
