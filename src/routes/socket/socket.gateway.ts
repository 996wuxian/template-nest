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
import { EntityManager, Not } from 'typeorm'
import { ChatListEntity } from '../user/entities/chat_list.entity'
import { GroupEntity } from '../user/entities/group.entity'
import { GroupMemberEntity } from '../user/entities/group_member.entity'
import { UserFriendEntity } from '../user/entities/friend.entity'
import { UserEntity } from '../user/entities/user.entity'
import { OnEvent } from '@nestjs/event-emitter'

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  constructor(
    private readonly socketService: SocketService,

    private readonly messageService: MessageService
  ) {}

  private connectedClients: Set<string> = new Set()

  private typingUsers: Map<
    string,
    { userId: number; targetUserId: number; timer?: NodeJS.Timeout }
  > = new Map()

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

    // 获取用户数据
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (userData) {
      // 清除该用户的所有输入状态
      const keysToDelete: string[] = []
      this.typingUsers.forEach((value, key) => {
        if (value.userId === userData.userId) {
          keysToDelete.push(key)
          // 通知目标用户停止输入状态
          this.server.to(`user_${value.targetUserId}`).emit('userTypingStatus', {
            userId: userData.userId,
            isTyping: false,
            timestamp: Date.now()
          })
          // 清除定时器
          if (value.timer) {
            clearTimeout(value.timer)
          }
        }
      })

      // 删除相关记录
      keysToDelete.forEach((key) => this.typingUsers.delete(key))
    }

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
      // 获取用户所在的所有群聊并加入对应房间
      const userGroups = await this.entityManager.find(GroupMemberEntity, {
        where: {
          userId: socketData.userId,
          is_exit: '0' // 未退出的群
        },
        relations: ['group']
      })

      // 加入所有群聊房间
      userGroups.forEach((member) => {
        if (member.group && member.group.is_dismiss === '0') {
          // 群未解散
          client.join(`group_${member.groupId}`)
          console.log(`用户 ${socketData.userId} 加入群聊房间: group_${member.groupId}`)
        }
      })

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

  // 处理用户正在输入状态
  @SubscribeMessage('userTyping')
  async handleUserTyping(
    @MessageBody() data: { targetUserId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    const typingKey = `${userData.userId}_${data.targetUserId}`

    if (data.isTyping) {
      // 用户开始输入
      const existingTyping = this.typingUsers.get(typingKey)

      // 如果已经有输入状态，清除之前的定时器
      if (existingTyping?.timer) {
        clearTimeout(existingTyping.timer)
      }

      // 发送正在输入通知给目标用户
      this.server.to(`user_${data.targetUserId}`).emit('userTypingStatus', {
        userId: userData.userId,
        isTyping: true,
        timestamp: Date.now()
      })

      // 设置自动清除定时器（5秒后自动清除输入状态）
      const timer = setTimeout(() => {
        this.clearTypingStatus(userData.userId, data.targetUserId)
      }, 5000)

      // 保存输入状态
      this.typingUsers.set(typingKey, {
        userId: userData.userId,
        targetUserId: data.targetUserId,
        timer
      })
    } else {
      // 用户停止输入
      this.clearTypingStatus(userData.userId, data.targetUserId)
    }

    return {
      code: 200,
      msg: '输入状态更新成功'
    }
  }

  // 清除输入状态的私有方法
  private clearTypingStatus(userId: number, targetUserId: number) {
    const typingKey = `${userId}_${targetUserId}`
    const existingTyping = this.typingUsers.get(typingKey)

    if (existingTyping) {
      // 清除定时器
      if (existingTyping.timer) {
        clearTimeout(existingTyping.timer)
      }

      // 从Map中移除
      this.typingUsers.delete(typingKey)

      // 通知目标用户停止输入状态
      this.server.to(`user_${targetUserId}`).emit('userTypingStatus', {
        userId: userId,
        isTyping: false,
        timestamp: Date.now()
      })
    }
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
    @MessageBody()
    data: { toUserId?: number; message: any; type?: string; groupId?: number; isGroup?: boolean },
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

    // 判断是否为群聊消息
    const isGroupMessage = data.isGroup || data.type === 'group'
    const groupId = data.groupId

    // 如果是私聊消息，检查是否被拉黑
    if (!isGroupMessage && data.toUserId) {
      this.clearTypingStatus(userData.userId, data.toUserId)
      const blacklistCheck = await this.entityManager.findOne(UserFriendEntity, {
        where: {
          userId: data.toUserId,
          friendId: userData.userId,
          status: '3', // 拉黑状态
          blacklistBy: data.toUserId // 接收者拉黑了发送者
        }
      })

      if (blacklistCheck) {
        // 发送拉黑提示给发送者
        client.emit('messageSent', {
          code: 403,
          msg: '该用户已经拉黑了你，无法发送消息'
        })

        return {
          code: 403,
          msg: '该用户已经拉黑了你，无法发送消息'
        }
      }
    }

    // 打印接收到的消息
    if (isGroupMessage) {
      console.log('收到群聊消息：', {
        time: new Date().toLocaleString(),
        fromUserId: userData.userId,
        groupId: groupId,
        message: data.message
      })
    } else {
      console.log('收到私聊消息：', {
        time: new Date().toLocaleString(),
        fromUserId: userData.userId,
        toUserId: data.toUserId,
        message: data.message
      })
    }

    // 保存消息到数据库
    const messageParams: any = {
      fromUserId: userData.userId,
      message: data.message,
      type: 'text'
    }

    // 根据消息类型设置不同的参数
    if (isGroupMessage) {
      // 群聊消息不需要设置接收者ID，但需要设置群组ID和isGroup标志
      messageParams.isGroup = true
      messageParams.groupId = groupId
    } else {
      // 私聊消息需要设置接收者ID
      messageParams.toUserId = data.toUserId
    }

    const savedMessage = await this.messageService.create(messageParams)

    if (isGroupMessage) {
      // 处理群聊消息逻辑
      // 更新群聊的最后一条消息和时间
      const senderInfo =
        savedMessage.sender ||
        (await this.entityManager.findOne(UserEntity, {
          where: { id: userData.userId },
          select: ['id', 'username', 'nickname']
        }))

      const senderName = senderInfo?.nickname || senderInfo?.username || '未知用户'
      const messageWithSender = `${senderName}: ${data.message}`

      // 更新群聊的最后一条消息和时间
      await this.entityManager.update(
        GroupEntity,
        { id: groupId },
        {
          lastMsg: messageWithSender,
          lastMsgTime: new Date()
        }
      )

      // 获取群成员并更新未读消息数
      const groupMembers = await this.entityManager.find(GroupMemberEntity, {
        where: {
          groupId: groupId,
          is_exit: '0', // 未退出的成员
          userId: Not(userData.userId) // 排除发送者自己
        }
      })

      // 批量更新群成员的未读消息数
      if (groupMembers.length > 0) {
        const memberIds = groupMembers.map((member) => member.id)
        await this.entityManager.query(
          `UPDATE group_member SET un_read_count = un_read_count + 1 WHERE id IN (${memberIds.join(',')}) AND is_exit = '0'`
        )
      }

      // 统一消息格式，使用数据库实体格式
      const messageData = {
        id: savedMessage.id,
        senderId: userData.userId,
        receiverId: null, // 群聊消息没有特定接收者
        content: data.message,
        type: 'text',
        status: '0',
        isGroup: true,
        groupId: groupId,
        attachmentUrl: null,
        cardContent: null,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,
        sender: savedMessage.sender,
        receiver: null
      }

      // 发送给群成员
      client.to(`group_${groupId}`).emit('receiveGroupMessage', messageData)

      // 发送回执给发送者
      client.emit('messageSent', {
        code: 200,
        msg: '群聊消息发送成功',
        data: messageData
      })

      return {
        code: 200,
        msg: '群聊消息发送成功',
        data: messageData
      }
    } else {
      // 处理私聊消息逻辑（保持原有代码）
      // 检查发送者的聊天列表是否存在，不存在则创建
      const senderChatList = await this.entityManager.findOne(ChatListEntity, {
        where: { userId: userData.userId, friendId: data.toUserId }
      })

      if (!senderChatList) {
        const newSenderChat = new ChatListEntity()
        newSenderChat.userId = userData.userId
        newSenderChat.friendId = data.toUserId
        newSenderChat.lastMsg = `[送达] ${data.message}`
        newSenderChat.lastMsgTime = new Date()
        newSenderChat.unReadCount = 0
        await this.entityManager.save(ChatListEntity, newSenderChat)
      } else {
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
      }

      // 检查接收者的聊天列表是否存在，不存在则创建
      const receiverChatList = await this.entityManager.findOne(ChatListEntity, {
        where: { userId: data.toUserId, friendId: userData.userId }
      })

      if (!receiverChatList) {
        const newReceiverChat = new ChatListEntity()
        newReceiverChat.userId = data.toUserId
        newReceiverChat.friendId = userData.userId
        newReceiverChat.lastMsg = data.message
        newReceiverChat.lastMsgTime = new Date()
        newReceiverChat.unReadCount = 1
        await this.entityManager.save(ChatListEntity, newReceiverChat)
      } else {
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
      }

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

    // 检查是否被拉黑
    const blacklistCheck = await this.entityManager.findOne(UserFriendEntity, {
      where: {
        userId: data.toUserId,
        friendId: userData.userId,
        status: '3', // 拉黑状态
        blacklistBy: data.toUserId // 接收者拉黑了发送者
      }
    })

    if (blacklistCheck) {
      // 发送拉黑提示给发送者
      client.emit('messageSent', {
        code: 403,
        msg: '该用户已经拉黑了你，无法发送消息'
      })

      return {
        code: 403,
        msg: '该用户已经拉黑了你，无法发送消息'
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

  @SubscribeMessage('joinGroup')
  async joinGroup(@MessageBody() data: { groupId: number }, @ConnectedSocket() client: Socket) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return { code: 400, msg: '用户未登录' }
    }

    // 验证用户是否是群成员
    const member = await this.entityManager.findOne(GroupMemberEntity, {
      where: {
        groupId: data.groupId,
        userId: userData.userId,
        is_exit: '0'
      }
    })

    if (member) {
      client.join(`group_${data.groupId}`)
      console.log(`用户 ${userData.userId} 加入群聊房间: group_${data.groupId}`)
      return { code: 200, msg: '加入群聊房间成功' }
    }

    return { code: 403, msg: '无权限加入该群聊' }
  }

  // 用户离开群聊时调用
  @SubscribeMessage('leaveGroup')
  async leaveGroup(@MessageBody() data: { groupId: number }, @ConnectedSocket() client: Socket) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return { code: 400, msg: '用户未登录' }
    }

    client.leave(`group_${data.groupId}`)
    console.log(`用户 ${userData.userId} 离开群聊房间: group_${data.groupId}`)
    return { code: 200, msg: '离开群聊房间成功' }
  }

  // 标记群聊消息为已读
  @SubscribeMessage('groupMsgRead')
  async groupMsgRead(@MessageBody() data: { groupId: number }, @ConnectedSocket() client: Socket) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    try {
      // 验证用户是否是群成员
      const groupMember = await this.entityManager.findOne(GroupMemberEntity, {
        where: {
          groupId: data.groupId,
          userId: userData.userId,
          is_exit: '0' // 未退出的成员
        }
      })

      if (!groupMember) {
        return {
          code: 403,
          msg: '您不是该群的成员或已退出群聊'
        }
      }

      // 检查群是否存在且未解散
      const group = await this.entityManager.findOne(GroupEntity, {
        where: {
          id: data.groupId,
          is_dismiss: '0' // 未解散
        }
      })

      if (!group) {
        return {
          code: 404,
          msg: '群聊不存在或已解散'
        }
      }

      // 获取当前未读消息数
      const currentUnreadCount = groupMember.unReadCount

      // 将该用户在该群的未读消息数清零
      await this.entityManager.update(
        GroupMemberEntity,
        {
          groupId: data.groupId,
          userId: userData.userId,
          is_exit: '0'
        },
        {
          unReadCount: 0
        }
      )

      console.log(
        `用户 ${userData.userId} 已读群聊 ${data.groupId} 的消息，清除 ${currentUnreadCount} 条未读消息`
      )

      return {
        code: 200,
        msg: '群聊消息已读成功',
        data: {
          groupId: data.groupId,
          userId: userData.userId,
          clearedUnreadCount: currentUnreadCount,
          readTime: new Date()
        }
      }
    } catch (error) {
      console.error('群聊消息已读处理失败:', error)
      return {
        code: 500,
        msg: '群聊消息已读处理失败'
      }
    }
  }

  // 标记群聊单条消息为已读
  @SubscribeMessage('groupOneMsgRead')
  async groupOneMsgRead(
    @MessageBody() data: { messageId: number; groupId: number },
    @ConnectedSocket() client: Socket
  ) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '用户未登录'
      }
    }

    try {
      // 验证用户是否是群成员
      const groupMember = await this.entityManager.findOne(GroupMemberEntity, {
        where: {
          groupId: data.groupId,
          userId: userData.userId,
          is_exit: '0' // 未退出的成员
        }
      })

      if (!groupMember) {
        return {
          code: 403,
          msg: '您不是该群的成员或已退出群聊'
        }
      }

      // 调用消息服务标记单条消息为已读
      const result = await this.messageService.oneMsgRead(data.messageId, userData.userId)

      // 只有在消息成功标记为已读，且返回了消息数据时才处理群聊逻辑
      if (result.code === 200 && result.data) {
        // 验证消息是否属于指定群聊
        if (result.data.groupId !== data.groupId) {
          return {
            code: 400,
            msg: '消息不属于指定群聊'
          }
        }

        // 减少该用户在该群的未读消息数（但不能小于0）
        await this.entityManager.query(
          `UPDATE group_member SET un_read_count = GREATEST(un_read_count - 1, 0) 
           WHERE group_id = ? AND user_id = ? AND is_exit = '0'`,
          [data.groupId, userData.userId]
        )

        console.log(`用户 ${userData.userId} 已读群聊 ${data.groupId} 中的消息 ${data.messageId}`)

        return {
          code: 200,
          msg: '群聊消息已读成功',
          data: {
            messageId: data.messageId,
            groupId: data.groupId,
            userId: userData.userId,
            readTime: new Date()
          }
        }
      }

      return result
    } catch (error) {
      console.error('群聊单条消息已读处理失败:', error)
      return {
        code: 500,
        msg: '群聊单条消息已读处理失败'
      }
    }
  }

  // 监听好友请求事件
  @OnEvent('friend.request')
  handleFriendRequest(payload: any) {
    this.server.to(`user_${payload.targetUserId}`).emit('systemMessage', payload)
  }

  // 监听好友响应事件
  @OnEvent('friend.response')
  handleFriendResponse(payload: any) {
    this.server.to(`user_${payload.targetUserId}`).emit('systemMessage', payload)
  }

  // 监听群组通知事件
  @OnEvent('group.notification')
  handleGroupNotification(payload: any) {
    if (payload.targetUserIds && payload.targetUserIds.length > 0) {
      payload.targetUserIds.forEach((userId) => {
        this.server.to(`user_${userId}`).emit('systemMessage', payload.data)
      })
    }
  }

  // 用户系统消息事件监听器
  @OnEvent('user.systemMessage')
  handleUserSystemMessage(payload: {
    userId: number
    type: string
    targetUserId: number
    data: any
  }) {
    this.server.to(`user_${payload.userId}`).emit('systemMessage', {
      type: payload.type,
      targetUserId: payload.targetUserId,
      data: payload.data
    })
  }

  // 群成员移除事件监听器
  @OnEvent('group.memberRemoved')
  handleGroupMemberRemoved(payload: {
    groupId: number
    removedMember: any
    operatorId: number
    operatorName: string
    time: Date
  }) {
    this.server.to(`group_${payload.groupId}`).emit('memberRemoved', {
      groupId: payload.groupId,
      removedMember: payload.removedMember,
      operatorId: payload.operatorId,
      operatorName: payload.operatorName,
      time: payload.time
    })
  }

  // 群解散事件监听器
  @OnEvent('group.dismissed')
  handleGroupDismissed(payload: {
    groupId: number
    groupName: string
    operatorId: number
    time: Date
  }) {
    this.server.to(`group_${payload.groupId}`).emit('groupDismissed', {
      groupId: payload.groupId,
      groupName: payload.groupName,
      operatorId: payload.operatorId,
      time: payload.time
    })
  }

  // 新成员加入群聊事件监听器
  @OnEvent('group.newMemberAdded')
  handleNewMemberAdded(payload: {
    groupId: number
    newMembers: any[]
    operatorId: number
    operatorName: string
    time: Date
  }) {
    this.server.to(`group_${payload.groupId}`).emit('newMemberAdded', {
      groupId: payload.groupId,
      newMembers: payload.newMembers,
      operatorId: payload.operatorId,
      operatorName: payload.operatorName,
      time: payload.time
    })
  }

  // 新群公告事件监听器
  @OnEvent('group.newAnnouncement')
  handleNewGroupAnnouncement(payload: { groupId: number; announcement: any; time: Date }) {
    this.server.to(`group_${payload.groupId}`).emit('newGroupAnnouncement', {
      groupId: payload.groupId,
      announcement: payload.announcement,
      time: payload.time
    })
  }

  // 群公告更新事件监听器
  @OnEvent('group.announcementUpdated')
  handleGroupAnnouncementUpdated(payload: {
    groupId: number
    announcement: any
    operatorId: number
    operatorName: string
    time: Date
  }) {
    this.server.to(`group_${payload.groupId}`).emit('groupAnnouncementUpdated', {
      groupId: payload.groupId,
      announcement: payload.announcement,
      operatorId: payload.operatorId,
      operatorName: payload.operatorName,
      time: payload.time
    })
  }
}
