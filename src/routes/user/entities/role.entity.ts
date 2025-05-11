// 通过@ManyToMany 装饰器来表示多对多的关系，然后通过@JoinTable 来指定关联表role_permission_relation。
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { PermissionEntity } from './permission.entity'
import { MenuEntity } from '../../menu/entities/menu.entity'

@Entity()
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    length: 20
  })
  name: string

  @CreateDateColumn()
  createTime: Date

  @UpdateDateColumn()
  updateTime: Date

  // 权限
  @ManyToMany(() => PermissionEntity)
  @JoinTable({
    name: 'role_permission_relation'
  })
  permissions: PermissionEntity[]

  // 菜单
  @ManyToMany(() => MenuEntity)
  @JoinTable({
    name: 'role_menu_relation'
  })
  menus: MenuEntity[]
}
