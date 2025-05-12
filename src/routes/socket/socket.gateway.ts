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

  async handleConnection(client: Socket) {
    console.log(`客户端连接: ${client.id}`)
    // 连接时不做验证，等待客户端发送createSocket事件
  }

  async handleDisconnect(client: Socket) {
    console.log(`客户端断开连接: ${client.id}`)
    // 从连接映射中移除
    await this.socketService.removeBySocketId(client.id)
  }

  @SubscribeMessage('createSocket')
  async create(@MessageBody() createSocketDto: CreateSocketDto, @ConnectedSocket() client: Socket) {
    const result = await this.socketService.create(createSocketDto, client.id)

    if (result.code === 200) {
      console.log(
        '\x1b[32m%s\x1b[0m',
        `用户 ${result.data.userId} 已通过 ${createSocketDto.platform} 端登录`
      )
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
  @SubscribeMessage('sendPrivateMessage')
  async sendPrivateMessage(
    @MessageBody() data: { toUserId: number; message: any },
    @ConnectedSocket() client: Socket
  ) {
    const userData = this.socketService.getUserDataBySocketId(client.id)
    if (!userData) {
      return {
        code: 400,
        msg: '发送者未登录'
      }
    }

    this.server.to(`user_${data.toUserId}`).emit('receivePrivateMessage', {
      fromUserId: userData.userId,
      message: data.message
    })

    return {
      code: 200,
      msg: '私聊消息发送成功'
    }
  }
}
