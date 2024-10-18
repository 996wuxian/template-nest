import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber } from 'class-validator'
export class CreateFileDto {
  /**
   * 文件id
   *
   * @IsOptional()
   * @IsNumber()
   * @ApiProperty(description="文件id", example=1)
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '文件id',
    example: 1
  })
  id?: number
  /**
   * 文件名
   *
   * @IsString()
   * @ApiProperty(description="文件名")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '文件名'
  })
  fileName: string
  /**
   * 描述
   *
   * @IsString()
   * @ApiProperty(description="描述")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '描述'
  })
  desc: string
}
