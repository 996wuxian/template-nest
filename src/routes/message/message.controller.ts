import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common'
import { MessageService } from './message.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { AuthGuard } from '@nestjs/passport'
import { RequireLogin, RequirePermission } from 'src/guard/custom-decorator'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

@ApiTags('消息')
@Controller('api/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(createMessageDto)
  }

  @Get('between/:senderId/:receiverId')
  @ApiOperation({ summary: '获取两个用户之间的消息记录' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页条数' })
  async findMessagesBetweenUsers(
    @Param('senderId') senderId: string,
    @Param('receiverId') receiverId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20
  ) {
    return this.messageService.findMessagesBetweenUsers(+senderId, +receiverId, page, pageSize)
  }

  @Patch('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  @RequireLogin()
  @RequirePermission('update')
  @ApiOperation({ summary: '删除消息（软删除）' })
  async updateDeleteStatus(@Param('id') id: string, @Body() body: { userId: number }) {
    return this.messageService.updateDeleteStatus(+id, body.userId)
  }

  @Patch('fileStatus/:id')
  @ApiOperation({ summary: '更新文件下载状态' })
  @RequirePermission('update')
  async updateFileStatus(@Param('id') id: string) {
    return this.messageService.updateFileStatus(+id)
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: '获取群聊消息记录' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页条数' })
  async findGroupMessages(
    @Param('groupId') groupId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20
  ) {
    return this.messageService.findGroupMessages(+groupId, page, pageSize)
  }
}
