import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
@Entity()
export class MenuEntity {
  @PrimaryGeneratedColumn()
  menuId: number
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  // 菜单名称
  title: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  // URL路径 注意根路由（第一条数据）是斜线，第一级路由必须带斜线，第二级路由开始不能，path名不可重复
  path: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  // 标题 首字母大写，一定要与vue文件的name对应起来，name名不可重复，用于noKeepAlive缓存控制（该项特别重要）
  name: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  // 组件路径 后端路由时此项为字符串，前端路由时此项为import的function，第一级路由是为Layout，其余为层级为vue的文件路径
  component: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  // 重定向到子路由，格式从第一级路由开始拼接
  redirect: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  // 父级菜单ID
  parentMenuId: number
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: 'menu'
  })
  // 图标
  icon: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  // 是否隐藏
  hidden: boolean
  @Column({
    name: 'created_at',
    type: 'datetime',
    // default: () => 'NOW()',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间'
  })
  createdAt: Date
  @Column({
    name: 'updated_at',
    type: 'datetime',
    // default: () => 'NOW()',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '更新时间'
  })
  updatedAt: Date
}
