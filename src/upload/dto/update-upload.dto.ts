import { PartialType } from '@nestjs/swagger'
import { CreateFileDto } from './create-upload.dto'

export class UpdateUploadDto extends PartialType(CreateFileDto) {}
