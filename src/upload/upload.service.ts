import { Injectable } from '@nestjs/common'

import { CreateFileDto } from './dto/create-upload.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { UploadEntity } from './entities/upload.entity'
import { Repository } from 'typeorm'
import { join } from 'path'

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(UploadEntity)
    private readonly uploadRepository: Repository<UploadEntity>
  ) {}

  upload(file: Express.Multer.File) {
    if (!file) {
      return {
        code: 400,
        msg: '错误的文件,请上传jpg|jpeg|png|gif格式的文件'
      }
    }

    return {
      code: 200,
      data: {
        url: `http://localhost:${process.env.PORT}/uploadFile/${file.filename}`
      },
      msg: 'success'
    }
  }

  create(createFileDto: CreateFileDto) {
    const data = new UploadEntity()
    data.fileName = createFileDto.fileName
    data.desc = createFileDto.desc || ''
    return this.uploadRepository.save(data)
  }

  findAll() {
    return this.uploadRepository.find()
  }

  findOne(id) {
    return this.uploadRepository.find({ where: { id: id } })
  }

  delete(id) {
    return this.uploadRepository.delete(id)
  }

  async export(id) {
    const data = await this.uploadRepository.find({ where: { id: id } })
    return join(__dirname, `../uploadFile/${data[0].fileName}`)
  }
}
