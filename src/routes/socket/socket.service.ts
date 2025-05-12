import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { CreateSocketDto } from './dto/create-socket.dto'
import { UpdateSocketDto } from './dto/update-socket.dto'
import { JwtService } from '@nestjs/jwt'
import { UserService } from '../user/user.service'
@Injectable()
export class SocketService {
  // 存储用户ID到平台集合的映射
  private readonly connectedClients: Map<number, Set<string>> = new Map()
  // 存储socketId到用户ID的映射
  private readonly socketToUser: Map<string, { userId: number; platform: string }> = new Map()

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}
  async create(createSocketDto: CreateSocketDto, socketId: string) {
    try {
      // 验证token
      const decoded = this.jwtService.verify(createSocketDto.token)
      const userId = decoded.id

      // 验证用户是否存在
      const user = await this.userService.findOneOfById(userId)
      if (!user) {
        return {
          code: 400,
          msg: '用户不存在'
        }
      }

      // 验证传入的userId与token中的userId是否一致
      if (userId !== createSocketDto.userId) {
        return {
          code: 401,
          msg: '用户ID与token不匹配'
        }
      }

      // 记录用户连接信息
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set())
      }
      this.connectedClients.get(userId).add(createSocketDto.platform)

      // 记录socketId到用户的映射
      this.socketToUser.set(socketId, {
        userId,
        platform: createSocketDto.platform
      })

      return {
        code: 200,
        msg: '连接成功',
        data: {
          userId,
          platform: createSocketDto.platform
        }
      }
    } catch (error) {
      console.error('Socket连接验证失败:', error)
      return {
        code: 401,
        msg: 'token验证失败'
      }
    }
  }

  getUserDataBySocketId(socketId: string) {
    return this.socketToUser.get(socketId)
  }

  findAll() {
    const connections = []
    this.connectedClients.forEach((platforms, userId) => {
      platforms.forEach((platform) => {
        connections.push({ userId, platform })
      })
    })
    return {
      code: 200,
      data: connections
    }
  }

  findOne(userId: number) {
    const platforms = this.connectedClients.get(userId)
    return {
      code: 200,
      data: platforms ? Array.from(platforms) : []
    }
  }

  update(id: number, updateSocketDto: UpdateSocketDto) {
    return {
      code: 200,
      msg: '更新成功'
    }
  }

  remove(userId: number) {
    this.connectedClients.delete(userId)

    // 清理socketToUser映射
    for (const [socketId, userData] of this.socketToUser.entries()) {
      if (userData.userId === userId) {
        this.socketToUser.delete(socketId)
      }
    }

    return {
      code: 200,
      msg: '断开连接成功'
    }
  }

  // 根据socketId移除连接
  removeBySocketId(socketId: string) {
    const userData = this.socketToUser.get(socketId)
    if (userData) {
      const { userId, platform } = userData

      // 从用户的平台集合中移除
      const platforms = this.connectedClients.get(userId)
      if (platforms) {
        platforms.delete(platform)

        // 如果用户没有其他平台连接，则删除用户
        if (platforms.size === 0) {
          this.connectedClients.delete(userId)
        }
      }

      // 删除socketId映射
      this.socketToUser.delete(socketId)

      return {
        code: 200,
        msg: '断开连接成功',
        data: { userId, platform }
      }
    }

    return {
      code: 404,
      msg: '连接不存在'
    }
  }

  // 获取在线用户数量
  getOnlineCount() {
    return {
      code: 200,
      data: {
        userCount: this.connectedClients.size,
        connectionCount: this.socketToUser.size
      }
    }
  }

  // 判断用户是否在线
  isUserOnline(userId: number) {
    return {
      code: 200,
      data: {
        online: this.connectedClients.has(userId),
        platforms: this.connectedClients.get(userId)
          ? Array.from(this.connectedClients.get(userId))
          : []
      }
    }
  }
}
