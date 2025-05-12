import { IsNotEmpty, IsNumber, IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateSocketDto {
  @ApiProperty({ description: '用户ID' })
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber()
  userId: number

  @ApiProperty({ description: '平台', enum: ['H5', 'Wechat', 'Pc', 'Android', 'Ios', 'Harmony'] })
  @IsNotEmpty({ message: '平台不能为空' })
  @IsString()
  @IsIn(['H5', 'Wechat', 'Pc', 'Android', 'Ios', 'Harmony'])
  platform: string

  @ApiProperty({ description: '用户token' })
  @IsNotEmpty({ message: 'token不能为空' })
  @IsString()
  token: string
}
