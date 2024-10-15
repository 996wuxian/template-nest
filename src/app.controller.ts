import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api-json')
  @ApiOperation({ summary: '获取接口文档json数据' })
  async code(@Res() res) {
    const filePath = 'swagger-spec.json';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    res.send(JSON.parse(fileContent));
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
