import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus
} from '@nestjs/common'

@Injectable()
// 大于 10m 就抛出异常，返回 400 的响应。
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    console.log('🚀 ~ FileSizeValidationPipe ~ transform ~ value:', value)
    if (value.size > 1024 * 1024 * 10) {
      throw new HttpException('文件大于 10m', HttpStatus.BAD_REQUEST)
    }
    return value
  }
}
