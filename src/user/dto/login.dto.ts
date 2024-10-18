import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'
export class LoginDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '用户名',
    example: 'admin'
  })
  userName: string

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '邮箱',
    example: 'email@qq.com'
  })
  email: string

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
   * 验证码
   *
   * @IsString()
   * @ApiProperty(description="验证码")
   */
  @IsString()
  @ApiProperty({
    description: '验证码'
  })
  code: string
}
