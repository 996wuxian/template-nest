import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray } from 'class-validator'

export class CreateGroupDto {
  @ApiProperty({ description: '群名称' })
  @IsNotEmpty({ message: '群名称不能为空' })
  @IsString()
  name: string

  @ApiProperty({ description: '群头像', required: false })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiProperty({ description: '群描述', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: '创建者ID' })
  @IsNotEmpty({ message: '创建者ID不能为空' })
  @IsNumber()
  creatorId: number

  @ApiProperty({ description: '成员ID数组', type: [Number] })
  @IsArray()
  @IsNotEmpty({ message: '成员ID数组不能为空' })
  memberIds: number[]
}

export class UpdateGroupDto {
  @ApiProperty({ description: '群ID' })
  @IsNotEmpty({ message: '群ID不能为空' })
  @IsNumber()
  id: number

  @ApiProperty({ description: '群名称', required: false })
  @IsOptional()
  @IsString()
  name?: string

  @ApiProperty({ description: '群头像', required: false })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiProperty({ description: '群描述', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ description: '是否已解散', required: false })
  @IsOptional()
  @IsString()
  is_dismiss?: '0' | '1'
}
