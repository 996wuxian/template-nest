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

  upload(file: Express.Multer.File, type: string = 'image') {
    if (!file) {
      return {
        code: 400,
        msg: '文件上传失败，请检查文件格式是否正确'
      }
    }

    return {
      code: 200,
      data: {
        url: `http://localhost:${process.env.PORT}/uploadFile/${type}/${file.filename}`,
        type: type,
        originalName: file.originalname,
        size: file.size
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
