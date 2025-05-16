import { Injectable } from '@nestjs/common'
import { CreateMessageDto } from './dto/create-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { MessageEntity } from './entities/message.entity'
import { InjectEntityManager } from '@nestjs/typeorm'
import { EntityManager } from 'typeorm'
@Injectable()
export class MessageService {
  @InjectEntityManager()
  entityManager: EntityManager
  async create(createMessageDto: CreateMessageDto) {
    const message = new MessageEntity()
    message.senderId = createMessageDto.fromUserId
    message.receiverId = createMessageDto.toUserId
    message.content = createMessageDto.message
    message.type = createMessageDto.type || 'text'
    message.status = '0'

    return this.entityManager.save(MessageEntity, message)
  }

  async findMessagesBetweenUsers(senderId: number, receiverId: number) {
    // 查询双向的消息记录
    const messages = await this.entityManager.find(MessageEntity, {
      where: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ],
      order: {
        createdAt: 'ASC' // 按时间升序排列
      },
      relations: ['sender', 'receiver'] // 关联用户信息
    })

    // 处理返回数据，移除敏感信息
    return messages.map((message) => {
      if (message.sender) {
        message.sender.password = undefined
      }
      if (message.receiver) {
        message.receiver.password = undefined
      }
      return message
    })
  }

  // 将指定消息设置为已读
  async oneMsgRead(messageId: number, userId: number) {
    try {
      const message = await this.entityManager.findOne(MessageEntity, {
        where: { id: messageId }
      })

      if (!message) {
        return {
          code: 404,
          msg: '消息不存在'
        }
      }

      // 确保只有消息接收者可以标记为已读
      if (message.receiverId !== userId) {
        return {
          code: 403,
          msg: '无权操作此消息'
        }
      }

      await this.entityManager.update(MessageEntity, messageId, { status: '1' })

      return {
        code: 200,
        msg: '消息已标记为已读'
      }
    } catch (error) {
      console.error('标记消息已读失败:', error)
      return {
        code: 500,
        msg: '操作失败'
      }
    }
  }

  // 将与指定用户的所有消息标记为已读
  async allMsgRead(userId: number, fromUserId: number) {
    try {
      await this.entityManager.update(
        MessageEntity,
        {
          receiverId: userId,
          senderId: fromUserId,
          status: '0'
        },
        { status: '1' }
      )

      return {
        code: 200,
        msg: '所有消息已标记为已读'
      }
    } catch (error) {
      console.error('标记所有消息已读失败:', error)
      return {
        code: 500,
        msg: '操作失败'
      }
    }
  }

  findAll() {
    return `This action returns all message`
  }

  findOne(id: number) {
    return this.entityManager.findOne(MessageEntity, {
      where: {
        id
      }
    })
  }

  update(id: number, updateMessageDto: UpdateMessageDto) {
    return `This action updates a #${id} message`
  }

  remove(id: number) {
    return `This action removes a #${id} message`
  }
}
