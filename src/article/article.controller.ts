import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common'
import { ArticleService } from './article.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

@Controller('api/article')
@ApiTags('文章')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto)
  }

  @Get()
  findAll() {
    return this.articleService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '根据id查询文章' })
  findOne(@Param('id') id: string) {
    console.log('123')
    return this.articleService.findOne(+id)
  }

  @Get('view/count')
  @ApiOperation({ summary: '阅读量, 请求递增' })
  async view(@Query() query: { id: number; userId: number }) {
    // console.log('🚀 ~ ArticleController ~ view ~ param:', param)
    return await this.articleService.view(query.id, query.userId)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articleService.update(+id, updateArticleDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articleService.remove(+id)
  }
}
