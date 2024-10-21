// 上传文件限制
import { diskStorage } from 'multer'
import { join } from 'path'

export const multerConfig = {
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: (_req, file: Express.Multer.File, cb) => {
    // 限制上传图片类型文件
    // if (file.mimetype.match(/(jpg|jpeg|png|gif)$/)) {
    if (file.mimetype.match(/(jpg|jpeg|png|gif)$/)) {
      return cb(null, true)
    }

    return cb(null, false)
  },
  storage: diskStorage({
    // destination: join(__dirname, '../uploadFile'), // 存放位置：dist/uploadFile
    destination: 'uploadFile/', // 存放位置：根目录
    filename: (_req, file, cb) => {
      const currentDate = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      const originalName = file.originalname
      const formattedName = `${currentDate}--${originalName}`
      return cb(null, formattedName)
    }
  })
}
