import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber } from 'class-validator'
export class findAllUserDto {
  /**
   * 页码
   *
   * @IsOptional()
   * @IsNumber()
   * @ApiProperty(description="页码", example=1)
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '页码',
    example: 1
  })
  page?: number
  /**
   * 每页条数
   * @IsOptional()
   * @IsString()
   * @ApiProperty(description="每页条数", example="10")
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '每页条数',
    example: 10
  })
  pageSize: number
  /**
   * 关键字
   *
   * @IsString()
   * @ApiProperty(description="关键字", example="")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '密码',
    example: ''
  })
  keyWord: string
}
