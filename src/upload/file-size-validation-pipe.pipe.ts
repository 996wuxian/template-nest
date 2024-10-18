import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus
} from '@nestjs/common'

@Injectable()
// 大于 10k 就抛出异常，返回 400 的响应。
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    if (value.size > 10 * 1024) {
      throw new HttpException('文件大于 10k', HttpStatus.BAD_REQUEST)
    }
    return value
  }
}
