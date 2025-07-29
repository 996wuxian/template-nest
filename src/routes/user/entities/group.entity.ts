import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm'
import { UserEntity } from './user.entity'
import { GroupMemberEntity } from './group_member.entity'

@Entity('group')
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    type: 'varchar',
    length: 50,
    comment: '群名称'
  })
  name: string

  @Column({
    type: 'varchar',
    length: 8,
    comment: '群号（8位随机数）',
    unique: true
  })
  groupNumber: string
  
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '群头像'
  })
  avatar: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '群描述'
  })
  description: string

  @Column({
    name: 'creator_id',
    comment: '创建者ID'
  })
  creatorId: number

  @Column({
    name: 'max_member_count',
    type: 'int',
    default: 200,
    comment: '最大成员数'
  })
  maxMemberCount: number

  @Column({
    name: 'current_member_count',
    type: 'int',
    default: 1,
    comment: '当前成员数'
  })
  currentMemberCount: number

  @Column({
    name: 'is_dismiss',
    type: 'enum',
    default: '0',
    comment: '是否已解散 0-否 1-是',
    enum: ['0', '1']
  })
  is_dismiss: '0' | '1'

  @Column({
    name: 'last_msg',
    type: 'text',
    nullable: true,
    comment: '最后一条消息内容'
  })
  lastMsg: string

  @Column({
    name: 'last_msg_time',
    type: 'datetime',
    nullable: true,
    comment: '最后一条消息时间'
  })
  lastMsgTime: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'creator_id' })
  creator: UserEntity

  @OneToMany(() => GroupMemberEntity, (member) => member.group)
  members: GroupMemberEntity[]
}
