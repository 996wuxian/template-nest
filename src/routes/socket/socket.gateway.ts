import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer
} from '@nestjs/websockets'
import { SocketService } from './socket.service'
import { CreateSocketDto } from './dto/create-socket.dto'
import { UpdateSocketDto } from './dto/update-socket.dto'
import { Server, Socket } from 'socket.io'
import { MessageService } from '../message/message.service'
import { InjectEntityManager } from '@nestjs/typeorm'
import { EntityManager } from 'typeorm'
import { ChatListEntity } from '../user/entities/chat_list.entity'

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  constructor(
    private readonly socketService: SocketService,

    private readonly messageService: MessageService
  ) {}

  private connectedClients: Set<string> = new Set()

  @InjectEntityManager()
  entityManager: EntityManager

  async handleConnection(client: Socket) {
    this.connectedClients.add(client.id)
    console.log(`客户端连接: ${client.id}`)
    console.log(`当前在线连接数: ${this.connectedClients.size}`)
    // 连接时不做验证，等待客户端发送createSocket事件
  }

  async handleDisconnect(client: Socket) {
    console.log(`客户端断开连接: ${client.id}`)
    this.connectedClients.delete(client.id)
    console.log(`当前在线连接数: ${this.connectedClients.size}`)
    // 从连接映射中移除
    await this.socketService.removeBySocketId(client.id)
  }

  @SubscribeMessage('createSocket')
  async create(@MessageBody() createSocketDto: CreateSocketDto, @ConnectedSocket() client: Socket) {
    console.log('收到客户端的连接请求:', createSocketDto)
    // 处理不同类型的输入数据
    let socketData: CreateSocketDto = null
    if (Array.isArray(createSocketDto)) {
      // 如果是数组格式，转换为对象
      socketData = {
        userId: Number(createSocketDto[0]),
        platform: String(createSocketDto[1]),
        token: String(createSocketDto[2])
      }
    } else {
      socketData = createSocketDto
    }
    console.log('🚀 ~ SocketGateway ~ create ~ socketData:', socketData)
    // 验证必要参数
    if (!socketData.userId || !socketData.platform || !socketData.token) {
      client.emit('createSocketResponse', {
        code: 400,
        msg: 'im缺少必要的连接参数'
      })
      // 然后再断开连接
      client.disconnect()
      return
    }

    const result = await this.socketService.create(socketData, client.id)

    if (result.code === 200) {
      // 加入用户专属房间
      client.join(`user_${socketData.userId}`)
      console.log(
        '\x1b[32m%s\x1b[0m',
        `用户 ${result.data.userId} 已通过 ${socketData.platform} 端登录`
      )
    } else {
      // 验证失败，断开连接
      client.disconnect()
    }

    return result
  }

  // 添加心跳响应
  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    return {
      event: 'pong',
      data: {
        time: Date.now()
      }
    }
  }

  @SubscribeMessage('findAllSocket')
  findAll() {
    return this.socketService.findAll()
  }

  @SubscribeMessage('findOneSocket')
  findOne(@MessageBody() id: number) {
    return this.socketService.findOne(id)
  }

  @SubscribeMessage('updateSocket')
  update(@MessageBody() updateSocketDto: UpdateSocketDto) {
    return this.socketService.update(updateSocketDto.id, updateSocketDto)
  }

  @SubscribeMessage('removeSocket')
  remove(@MessageBody() id: number, @ConnectedSocket() client: Socket) {
    // 断开连接前，离开房间
    const roomName = `user_${id}`
    client.leave(roomName)
    return this.socketService.remove(id)
  }

  // 发送消息到指定用户
  @SubscribeMessage('sendTextMessage')
  async sendTextMessage(
    @MessageBody() data: { toUserId: number; message: any },
    @ConnectedSocket() client: Socket
  ) {
    console.log('🚀 ~ SocketGateway ~ data:', data)
    if (Array.isArray(data)) {
      data = {
        toUserId: Number(data[0]),
        message: data[1]
      }
    }

    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '发送者未登录'
      }
    }

    // 打印接收到的消息
    console.log('收到私聊消息：', {
      time: new Date().toLocaleString(),
      fromUserId: userData.userId,
      toUserId: data.toUserId,
      message: data.message
    })

    // 保存消息到数据库
    const savedMessage = await this.messageService.create({
      fromUserId: userData.userId,
      toUserId: data.toUserId,
      message: data.message,
      type: 'text'
    })

    // 更新发送者的聊天列表（显示[送达]）
    await this.entityManager.update(
      ChatListEntity,
      { userId: userData.userId, friendId: data.toUserId },
      {
        lastMsg: `[送达] ${data.message}`,
        lastMsgTime: new Date(),
        unReadCount: 0
      }
    )

    // 更新接收者的聊天列表（直接显示消息内容）
    await this.entityManager.update(
      ChatListEntity,
      { userId: data.toUserId, friendId: userData.userId },
      {
        lastMsg: data.message,
        lastMsgTime: new Date(),
        unReadCount: () => 'un_read_count + 1'
      }
    )

    // 统一消息格式，使用数据库实体格式
    const messageData = {
      id: savedMessage.id,
      senderId: userData.userId,
      receiverId: data.toUserId,
      content: data.message,
      type: 'text',
      status: '0',
      isGroup: false,
      groupId: null,
      attachmentUrl: null,
      cardContent: null,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
      sender: savedMessage.sender,
      receiver: savedMessage.receiver
    }

    // 发送给接收者
    this.server.to(`user_${data.toUserId}`).emit('receivePrivateMessage', messageData)

    // 发送回执给发送者
    client.emit('messageSent', {
      code: 200,
      msg: '私聊消息发送成功',
      data: messageData
    })

    return {
      code: 200,
      msg: '私聊消息发送成功',
      data: messageData
    }
  }

  @SubscribeMessage('sendCardMessage')
  async sendCardMessage(
    @MessageBody() data: { toUserId: number; message: string; cardContent: any },
    @ConnectedSocket() client: Socket
  ) {
    if (Array.isArray(data)) {
      data = {
        toUserId: Number(data[0]),
        message: data[1],
        cardContent: data[2]
      }
    }

    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '发送者未登录'
      }
    }

    // 打印接收到的消息
    console.log('收到卡片消息：', {
      time: new Date().toLocaleString(),
      fromUserId: userData.userId,
      toUserId: data.toUserId,
      message: data.message,
      cardContent: data.cardContent
    })

    // 保存消息到数据库
    const savedMessage = await this.messageService.create({
      fromUserId: userData.userId,
      toUserId: data.toUserId,
      message: data.message,
      cardContent: data.cardContent,
      type: 'card'
    })

    // 更新发送者的聊天列表（显示[送达]）
    await this.entityManager.update(
      ChatListEntity,
      { userId: userData.userId, friendId: data.toUserId },
      {
        lastMsg: `[送达] ${data.message}`,
        lastMsgTime: new Date(),
        unReadCount: 0
      }
    )

    // 更新接收者的聊天列表（直接显示消息内容）
    await this.entityManager.update(
      ChatListEntity,
      { userId: data.toUserId, friendId: userData.userId },
      {
        lastMsg: data.message,
        lastMsgTime: new Date(),
        unReadCount: () => 'un_read_count + 1'
      }
    )

    // 统一消息格式，使用数据库实体格式
    const messageData = {
      id: savedMessage.id,
      senderId: userData.userId,
      receiverId: data.toUserId,
      content: data.message,
      type: 'card',
      status: '0',
      isGroup: false,
      groupId: null,
      attachmentUrl: null,
      cardContent: data.cardContent,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
      sender: savedMessage.sender,
      receiver: savedMessage.receiver
    }

    // 发送给接收者
    this.server.to(`user_${data.toUserId}`).emit('receivePrivateMessage', messageData)

    // 发送回执给发送者
    client.emit('messageSent', {
      code: 200,
      msg: '卡片消息发送成功',
      data: messageData
    })

    return {
      code: 200,
      msg: '卡片消息发送成功',
      data: messageData
    }
  }

  // 标记单条消息为已读
  @SubscribeMessage('oneMsgRead')
  async oneMsgRead(@MessageBody() data: { messageId: number }, @ConnectedSocket() client: Socket) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    const result = await this.messageService.oneMsgRead(data.messageId, userData.userId)

    // 只有在消息成功标记为已读，且返回了消息数据时才发送通知
    if (result.code === 200 && result.data) {
      // 更新聊天列表中的未读消息数
      await this.entityManager.update(
        ChatListEntity,
        {
          userId: userData.userId,
          friendId: result.data.senderId
        },
        {
          unReadCount: () => 'un_read_count - 1'
        }
      )

      // 向发送者发送消息已读通知
      this.server.to(`user_${result.data.senderId}`).emit('messageRead', {
        messageId: data.messageId,
        status: '1' // 1表示已读
      })
    }

    return result
  }

  // 标记与指定用户的所有消息为已读
  @SubscribeMessage('allMsgRead')
  async allMsgRead(@MessageBody() data: { fromUserId: number }, @ConnectedSocket() client: Socket) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    const result = await this.messageService.allMsgRead(userData.userId, data.fromUserId)

    // 如果消息标记已读成功，通知发送者
    if (result.code === 200) {
      // 更新聊天列表中的未读消息数为0
      await this.entityManager.update(
        ChatListEntity,
        {
          userId: userData.userId,
          friendId: data.fromUserId
        },
        {
          unReadCount: 0
        }
      )

      // 向发送者发送消息已读通知
      this.server.to(`user_${data.fromUserId}`).emit('messagesAllRead', {
        status: true,
        fromUserId: data.fromUserId,
        toUserId: userData.userId
      })
    }

    return result
  }

  // 撤回消息
  @SubscribeMessage('recallMessage')
  async recallMessage(
    @MessageBody() data: { messageId: number },
    @ConnectedSocket() client: Socket
  ) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    console.log('收到消息撤回请求：', {
      time: new Date().toLocaleString(),
      userId: userData.userId,
      messageId: data.messageId
    })

    const result = await this.messageService.recallMessage(data.messageId, userData.userId)

    // 如果消息撤回成功，通知接收者
    if (result.code === 200 && result.data) {
      const message = result.data

      // 更新发送者的聊天列表
      await this.entityManager.update(
        ChatListEntity,
        { userId: userData.userId, friendId: message.receiverId },
        {
          lastMsg: `[已撤回] 一条消息`,
          lastMsgTime: new Date()
        }
      )

      // 更新接收者的聊天列表
      await this.entityManager.update(
        ChatListEntity,
        { userId: message.receiverId, friendId: userData.userId },
        {
          lastMsg: `[已撤回] 一条消息`,
          lastMsgTime: new Date()
        }
      )

      // 向接收者发送消息撤回通知
      this.server.to(`user_${message.receiverId}`).emit('messageRecalled', {
        messageId: data.messageId,
        senderId: userData.userId,
        receiverId: message.receiverId,
        time: new Date()
      })

      // 向发送者发送撤回成功通知
      client.emit('messageRecallResult', {
        code: 200,
        msg: '消息撤回成功',
        data: {
          messageId: data.messageId,
          time: new Date()
        }
      })
    }

    return result
  }
}
