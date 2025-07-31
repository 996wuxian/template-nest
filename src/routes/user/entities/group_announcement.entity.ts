import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GroupEntity } from './group.entity';
import { UserEntity } from './user.entity';

@Entity('group_announcement')
export class GroupAnnouncementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, comment: '公告标题' })
  title: string;

  @Column({ type: 'text', comment: '公告内容' })
  content: string;

  @Column({ type: 'int', comment: '群组ID' })
  group_id: number;

  @Column({ type: 'int', comment: '发布者ID' })
  publisher_id: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1-正常，0-已删除' })
  status: number;

  @CreateDateColumn({ comment: '创建时间' })
  created_at: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id' })
  group: GroupEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'publisher_id' })
  publisher: UserEntity;
}