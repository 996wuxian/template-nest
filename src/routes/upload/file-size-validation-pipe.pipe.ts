import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus
} from '@nestjs/common'

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  // 不同类型文件的大小限制（单位：MB）
  private readonly SIZE_LIMITS = {
    image: 10, // 图片限制 10MB
    audio: 30, // 音频限制 30MB
    video: 100, // 视频限制 100MB
    document: 20 // 文档限制 20MB
  }

  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!value) {
      throw new HttpException('文件不能为空', HttpStatus.BAD_REQUEST)
    }

    // 从请求体中获取文件类型，默认为 image
    const fileType =
      value.originalname && value.originalname.match(/\.(mp3|wav|ogg|m4a)$/)
        ? 'audio'
        : value.originalname && value.originalname.match(/\.(mp4|avi|mov|wmv|flv)$/)
          ? 'video'
          : value.originalname && value.originalname.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/)
            ? 'document'
            : 'image'

    const maxSize = (this.SIZE_LIMITS[fileType] || 10) * 1024 * 1024 // 转换为字节

    if (value.size > maxSize) {
      throw new HttpException(
        `文件大小超过限制：${this.SIZE_LIMITS[fileType]}MB`,
        HttpStatus.BAD_REQUEST
      )
    }
    return value
  }
}
