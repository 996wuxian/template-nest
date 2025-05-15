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

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  constructor(private readonly socketService: SocketService) {}

  private connectedClients: Set<string> = new Set()

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
    console.log('🚀 ~ SocketGateway ~ create ~ result:', result)

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

    this.server.to(`user_${data.toUserId}`).emit('receivePrivateMessage', {
      fromUserId: userData.userId,
      message: data.message,
      type: 'text',
      timestamp: new Date().getTime()
    })

    const messageData = {
      fromUserId: userData.userId,
      toUserId: data.toUserId,
      message: data.message,
      time: new Date().toLocaleString(),
      type: 'text'
    }

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
