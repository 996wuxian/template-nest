import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { UserEntity } from './user.entity'
import { GroupEntity } from './group.entity'

@Entity('group_member')
export class GroupMemberEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'group_id',
    comment: '群ID'
  })
  groupId: number

  @Column({
    name: 'user_id',
    comment: '用户ID'
  })
  userId: number

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '群内昵称'
  })
  nickname: string

  @Column({
    type: 'enum',
    enum: ['0', '1', '2'],
    default: '2',
    comment: '成员角色 0-群主 1-管理员 2-普通成员'
  })
  role: '0' | '1' | '2'

  @Column({
    name: 'join_time',
    type: 'datetime',
    comment: '加入时间'
  })
  joinTime: Date

  @Column({
    name: 'un_read_count',
    type: 'int',
    default: 0,
    comment: '未读消息数'
  })
  unReadCount: number

  @Column({
    name: 'is_top',
    type: 'enum',
    default: '0',
    comment: '是否置顶 0-否 1-是',
    enum: ['0', '1']
  })
  is_top: '0' | '1'

  @Column({
    name: 'is_disturb',
    type: 'enum',
    default: '0',
    comment: '是否免打扰 0-否 1-是',
    enum: ['0', '1']
  })
  is_disturb: '0' | '1'

  @Column({
    name: 'is_exit',
    type: 'enum',
    default: '0',
    comment: '是否已退出 0-否 1-是',
    enum: ['0', '1']
  })
  is_exit: '0' | '1'

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id' })
  group: GroupEntity
}
