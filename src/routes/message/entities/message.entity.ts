import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { UserEntity } from '../../user/entities/user.entity'

@Entity('message')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  senderId: number

  @Column({
    nullable: true
  })
  receiverId?: number

  @Column({
    type: 'text',
    comment: '消息内容'
  })
  content: string

  @Column({
    type: 'enum',
    enum: ['0', '1', '2', '3'],
    default: '0',
    comment: '消息状态 0-未读 1-已读 2-已撤回 3-已删除'
  })
  status: '0' | '1' | '2' | '3'

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'audio', 'video', 'file', 'card'],
    default: 'text',
    comment: '消息类型 text-文本 image-图片 audio-语音 video-视频 file-文件 card-卡片'
  })
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card'

  @Column({
    type: 'json',
    nullable: true,
    comment: '卡片内容，JSON格式'
  })
  cardContent: object

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '文件状态'
  })
  fileStatus: 'uploaded' | 'downloaded'

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否为群消息'
  })
  isGroup: boolean

  @Column({
    type: 'int',
    nullable: true,
    comment: '群组ID，如果是群消息'
  })
  groupId: number

  @Column({
    type: 'boolean',
    default: false,
    comment: '发送者是否删除'
  })
  senderDeleted: boolean

  @Column({
    type: 'boolean',
    default: false,
    comment: '接收者是否删除'
  })
  receiverDeleted: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'receiverId' })
  receiver: UserEntity
}
