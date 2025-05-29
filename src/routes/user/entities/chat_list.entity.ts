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

@Entity('chat_list')
export class ChatListEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column()
  friendId: number

  @Column({
    type: 'text',
    nullable: true,
    comment: '最后一条消息内容'
  })
  lastMsg: string

  @Column({
    name: 'last_msg_time',
    type: 'datetime',
    comment: '最后一条消息时间'
  })
  lastMsgTime: Date

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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'friendId' })
  friend: UserEntity
}
