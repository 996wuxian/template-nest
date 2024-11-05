import { Controller, Get, Header, Sse } from '@nestjs/common'
import { PuppeteerService } from './puppeteer.service'

@Controller('api/puppeteer')
export class PuppeteerController {
  constructor(private readonly puppeteerService: PuppeteerService) {}

  @Get('list')
  async universityList() {
    return this.puppeteerService.getUniversityData()
  }

  @Sse('sseList')
  @Header('Content-Type', 'text/event-stream; charset=utf-8')
  async sseUniversityList() {
    return this.puppeteerService.getUniversityData()
  }
}
