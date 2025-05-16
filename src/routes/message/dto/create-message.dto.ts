import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateMessageDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: '发送者ID' })
  fromUserId: number

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: '接收者ID' })
  toUserId: number

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '消息内容' })
  message: string

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '消息类型', default: 'text' })
  type?: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card'
}
