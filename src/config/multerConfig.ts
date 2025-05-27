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
    // 从文件的 mimetype 来判断文件类型
    let fileType = 'image' // 默认为图片类型

    if (file.mimetype.startsWith('audio/')) {
      fileType = 'audio'
    } else if (file.mimetype.startsWith('video/')) {
      fileType = 'video'
    } else if (file.mimetype.startsWith('application/') || file.mimetype === 'text/plain') {
      fileType = 'document'
    }

    // 将文件类型保存到 file 对象中，供后续使用
    file['fileType'] = fileType

    const allowedTypes = ALLOWED_MIME_TYPES[fileType]
    if (allowedTypes && allowedTypes.includes(file.mimetype)) {
      return cb(null, true)
    }

    return cb(new Error(`不支持的文件类型：${file.mimetype}`), false)
  },
  storage: diskStorage({
    destination: (req, file, cb) => {
      // 使用之前在 fileFilter 中保存的文件类型
      const fileType = file['fileType'] || 'image'
      const uploadPath = `uploadFile/${fileType}`

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true })
      }

      cb(null, uploadPath)
    },
    filename: (_req, file, cb) => {
      const currentDate = new Date().toISOString().split('T')[0]
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      const formattedName = `${currentDate}--${originalName}`
      return cb(null, formattedName)
    }
  })
}
