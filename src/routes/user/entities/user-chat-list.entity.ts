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

@Entity('user_chat_list')
export class UserChatListEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column()
  friendId: number

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '好友备注'
  })
  remark: string

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '描述'
  })
  desc: string

  @Column({
    type: 'enum',
    enum: [0, 1, 2, 3, 4],
    default: 1,
    comment: '好友状态 0-待确认 1-已添加 2-已删除 3-已拉黑 4-已拒绝'
  })
  status: number

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
