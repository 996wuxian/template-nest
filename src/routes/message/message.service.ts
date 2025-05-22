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
    message.cardContent = createMessageDto.cardContent || {}
    message.status = '0'

    const savedMessage = await this.entityManager.save(MessageEntity, message)
    return this.entityManager.findOne(MessageEntity, {
      where: { id: savedMessage.id },
      relations: ['sender', 'receiver']
    })
  }

  async findMessagesBetweenUsers(
    senderId: number,
    receiverId: number,
    page: number = 1,
    pageSize: number = 20
  ) {
    // 查询双向的消息记录，并过滤掉已删除的消息
    const [messages, total] = await this.entityManager.findAndCount(MessageEntity, {
      where: [
        {
          senderId,
          receiverId,
          senderDeleted: false
        },
        {
          senderId: receiverId,
          receiverId: senderId,
          receiverDeleted: false
        }
      ],
      order: {
        createdAt: 'ASC' // 按时间升序排列
      },
      relations: ['sender', 'receiver'], // 关联用户信息
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    // 处理返回数据，移除敏感信息
    const processedMessages = messages.map((message) => {
      if (message.sender) {
        message.sender.password = undefined
      }
      if (message.receiver) {
        message.receiver.password = undefined
      }
      return message
    })

    return {
      code: 200,
      data: {
        list: processedMessages,
        pagination: {
          current: page,
          pageSize: pageSize,
          total: total
        }
      }
    }
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
        msg: '消息已标记为已读',
        data: {
          ...message,
          status: '1'
        }
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

  async updateDeleteStatus(messageId: number, userId: number) {
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

      // 判断用户是发送者还是接收者
      if (message.senderId !== userId && message.receiverId !== userId) {
        return {
          code: 403,
          msg: '无权操作此消息'
        }
      }

      const updateData =
        message.senderId === userId ? { senderDeleted: true } : { receiverDeleted: true }

      await this.entityManager.update(MessageEntity, messageId, updateData)

      // 如果双方都删除了消息，可以考虑物理删除
      const updatedMessage = await this.entityManager.findOne(MessageEntity, {
        where: { id: messageId }
      })

      if (updatedMessage.senderDeleted && updatedMessage.receiverDeleted) {
        await this.entityManager.delete(MessageEntity, messageId)
        return {
          code: 200,
          msg: '消息已完全删除'
        }
      }

      return {
        code: 200,
        msg: '消息已删除',
        data: updatedMessage
      }
    } catch (error) {
      console.error('删除消息失败:', error)
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
