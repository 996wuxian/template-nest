// 上传文件限制
import { diskStorage } from 'multer'
import { join } from 'path'
import * as fs from 'fs'

// 定义允许的文件类型
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif'],
  audio: ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'],
  video: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
}

export const multerConfig = {
  limits: {
    fileSize: 1024 * 1024 * 50 // 默认限制50MB
  },
  fileFilter: (req, file: Express.Multer.File, cb) => {
    const fileType = req.body.type || 'image' // 从请求体获取文件类型，默认为图片
    const allowedTypes = ALLOWED_MIME_TYPES[fileType]

    if (!allowedTypes) {
      return cb(new Error('不支持的文件类型'), false)
    }

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true)
    }

    return cb(new Error(`只支持以下文件类型：${allowedTypes.join(', ')}`), false)
  },
  storage: diskStorage({
    destination: (req, file, cb) => {
      const fileType = req.body.type || 'image'
      const uploadPath = `uploadFile/${fileType}` // 根据文件类型分目录存储

      // 确保目录存在
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true })
      }

      cb(null, uploadPath)
    },
    filename: (_req, file, cb) => {
      const currentDate = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      const originalName = file.originalname
      const formattedName = `${currentDate}--${originalName}`
      return cb(null, formattedName)
    }
  })
}
