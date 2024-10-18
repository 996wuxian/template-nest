import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'
export class CreateMenuDto {
  /**
   * 菜单id
   *
   * @IsOptional()
   * @IsNumber()
   * @ApiProperty(description="菜单id", example=1)
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '菜单id',
    example: 1
  })
  menuId?: number
  /**
   * 父菜单id
   *
   * @IsOptional()
   * @IsNumber()
   * @ApiProperty(description="父菜单id", example=1)
   */
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '父菜单id',
    example: 1
  })
  parentMenuId?: number
  /**
   * 菜单名
   *
   * @IsString()
   * @ApiProperty(description="菜单名", example="插件")
   */
  @IsString()
  // @IsOptional()
  @ApiProperty({
    description: '菜单名'
  })
  title: string
  /**
   * URL路径
   *
   * @IsString()
   * @ApiProperty(description="URL路径", example="Home")
   */
  @IsString()
  // @IsOptional()
  @ApiProperty({
    description: 'URL路径'
  })
  path: string
  /**
   * 标题
   *
   * @IsString()
   * @ApiProperty(description="标题", example="Name")
   */
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '标题'
  })
  name: string
  /**
   * 组件路径
   *
   * @IsString()
   * @ApiProperty(description="组件路径", home/Home.vue)
   */
  @IsString()
  // @IsOptional()
  @ApiProperty({
    description: '组件路径'
  })
  component: string
  /**
   * 重定向
   *
   * @IsOptional()
   * @IsString()
   * @ApiProperty(description="重定向", example="/home")
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '重定向'
  })
  redirect: string
  /**
   * 图标
   *
   * @IsOptional()
   * @IsString()
   * @ApiProperty(description="图标", example="Menu")
   */
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '图标'
  })
  icon: string
  /**
   * 是否隐藏
   *
   * @IsString()
   * @ApiProperty(description="是否隐藏", example="true")
   */
  // @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @ApiProperty({
    description: '是否隐藏'
  })
  hidden: boolean
}
