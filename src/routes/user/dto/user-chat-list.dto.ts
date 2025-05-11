import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddFriendDto {
  @ApiProperty({ description: '好友ID' })
  @IsNotEmpty({ message: '好友ID不能为空' })
  @IsNumber()
  friendId: number

  @ApiProperty({ description: '好友备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  desc?: string
}

export class UpdateFriendDto {
  @ApiProperty({ description: '好友备注' })
  @IsString()
  remark: string
}
