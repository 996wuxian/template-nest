export class Upload {}
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { Exclude } from 'class-transformer'
@Entity()
export class UploadEntity {
  @PrimaryGeneratedColumn()
  id: number
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  fileName: string
  @Exclude({ toPlainOnly: true })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  desc: string
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
