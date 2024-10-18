import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'
export class CreateUserDto {
  /**
   * 用户id
   *
   * @IsOptional()
   * @IsNumber()
   * @ApiProperty(description="用户id", example=1)
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '用户id',
    example: 1
  })
  id?: number
  /**
   * 用户名
   *
   * @IsString()
   * @ApiProperty(description="用户名", example="admin")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '用户名',
    example: 'admin'
  })
  userName: string
  /**
   * 密码
   *
   * @IsString()
   * @ApiProperty(description="密码", example="123456")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '密码',
    example: '123456'
  })
  password: string
  /**
   * 邮箱
   *
   * @IsString()
   * @ApiProperty(description="用户名", example="admin")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '邮箱',
    example: '1640551913@qq.com'
  })
  email: string
  /**
   * 角色
   *
   * @IsString()
   * @ApiProperty(description="角色", example=1)
   */
  @IsNumber()
  @IsOptional()
  @IsEnum([1, 2])
  @ApiProperty({
    description: '角色',
    example: '1'
  })
  role: number
  /**
   * 手机号
   *
   * @IsOptional()
   * @IsString()
   * @ApiProperty(description="手机号", example="13888888888")
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '手机号',
    example: '13888888888'
  })
  phone: string

  /**
   * 状态
   *
   * @IsOptional()
   * @IsNumber()
   * @IsEnum([0, 1])
   * @ApiProperty(description="状态", example=1)
   */
  @IsOptional()
  @IsNumber()
  @IsEnum([0, 1])
  @ApiProperty({
    description: '状态',
    example: 1
  })
  state: number
}
