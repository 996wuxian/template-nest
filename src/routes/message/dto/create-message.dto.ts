import { IsNotEmpty, IsNumber, IsString, IsOptional, IsObject, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

interface CardContent {
  type: string
  url: string
  fileType: string
  localPath: string
  size: number
  name: string
}

export class CreateMessageDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: '发送者ID' })
  fromUserId: number

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '接收者ID' })
  toUserId?: number

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '消息内容' })
  message: string

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '消息类型', default: 'text' })
  type?: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card'

  @IsObject()
  @IsOptional()
  @ApiProperty({ description: '卡片内容' })
  cardContent?: CardContent

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: '是否为群消息', default: false })
  isGroup?: boolean

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '群组ID，如果是群消息' })
  groupId?: number
}
