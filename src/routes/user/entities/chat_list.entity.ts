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
    type: 'enum',
    enum: ['0', '1'],
    default: '0',
    comment: '消息状态 0-未读 1-已读'
  })
  msgState: '0' | '1'

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
