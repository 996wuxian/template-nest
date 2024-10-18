// 通过@ManyToMany 装饰器来表示多对多的关系，然后通过@JoinTable 来指定关联表user_role_relation。
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  JoinTable,
  ManyToMany,
  UpdateDateColumn
} from 'typeorm'
import { Exclude } from 'class-transformer'

import { RoleEntity } from './role.entity'

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  userName: string
  @Exclude({ toPlainOnly: true })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  password: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  email: string
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  phone: string
  @Column({
    type: 'enum',
    nullable: false,
    default: 0,
    enum: [0, 1]
  })
  state: number
  @Column({
    name: 'created_at',
    type: 'datetime',
    // default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间'
  })
  @CreateDateColumn()
  createdAt: Date

  @Column({
    name: 'updated_at',
    type: 'datetime',
    // default: () => 'CURRENT_TIMESTAMP',
    comment: '更新时间'
  })
  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany(() => RoleEntity)
  @JoinTable({
    name: 'user_role_relation'
  })
  roles: RoleEntity[]
}
