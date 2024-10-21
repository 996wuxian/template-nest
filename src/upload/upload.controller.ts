import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Res,
  Req,
  Delete,
  Body,
  UploadedFiles,
  Query
} from '@nestjs/common'
import { UploadService } from './upload.service'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
// 上传文件限制
import { multerConfig } from '../config/multerConfig'
import { RequireLogin, RequirePermission } from '../guard/custom-decorator'

import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateFileDto } from './dto/create-upload.dto'
import { FileSizeValidationPipe } from './file-size-validation-pipe.pipe'

import * as fs from 'fs'

@RequireLogin() // 校验token
@Controller('api/upload')
@ApiTags('上传')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: '单文件上传' })
  @RequirePermission('add')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(@UploadedFile(FileSizeValidationPipe) file: Express.Multer.File, @Body() body) {
    return this.uploadService.upload(file)
  }

  @Post('uploadFile')
  @ApiOperation({ summary: '分片上传' })
  @RequirePermission('add')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: 'uploads'
    })
  )
  uploadFile(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body: { name: string }) {
    const fileName = body.name.match(/(.+)\-\d+$/)[1]
    const chunkDir = 'uploads/chunks_' + fileName
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir)
    }
    fs.cpSync(files[0].path, chunkDir + '/' + body.name)
    fs.rmSync(files[0].path)
  }

  @Get('merge')
  @ApiOperation({ summary: '合并文件' })
  @RequirePermission('add')
  merge(@Query('name') name: string) {
    const chunkDir = 'uploads/chunks_' + name

    const files = fs.readdirSync(chunkDir)

    let count = 0
    let startPos = 0
    files.map((file) => {
      const filePath = chunkDir + '/' + file
      const stream = fs.createReadStream(filePath)
      stream
        .pipe(
          fs.createWriteStream('uploads/' + name, {
            start: startPos
          })
        )
        .on('finish', () => {
          count++

          if (count === files.length) {
            fs.rm(
              chunkDir,
              {
                recursive: true
              },
              () => {}
            )
          }
        })

      startPos += fs.statSync(filePath).size
    })
  }

  @Post('addFile')
  @ApiOperation({ summary: '将上传的文件的对应关系存储到数据库' })
  @RequirePermission('add')
  async create(@Body() createFileDto: CreateFileDto, @Res() res) {
    const data = await this.uploadService.create(createFileDto)
    if (data) {
      res.send({
        code: 200,
        msg: '新增成功'
      })
    }
  }

  @Get()
  @ApiOperation({ summary: '查询所有文件' })
  @RequirePermission('select') //给查询权限
  async getAllFile(@Res() res) {
    const data = await this.uploadService.findAll()
    if (data) {
      res.send({
        code: 200,
        data
      })
    }
  }

  @Get('/:id')
  @ApiOperation({ summary: '根据id查询文件' })
  @RequirePermission('select') //给查询权限
  async getFile(@Req() req, @Res() res) {
    const data = await this.uploadService.findOne(req.params.id)

    data[0].fileName = `http://localhost:${process.env.PORT}/uploadFile/${data[0].fileName}`

    if (!data.length) return
    res.send({
      code: 200,
      data
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  @RequirePermission('delete') //给添加权限
  async deleteFile(@Req() req, @Res() res) {
    const data = await this.uploadService.delete(req.params.id)
    res.send({
      code: 200,
      data,
      msg: '删除成功'
    })
  }

  @Get('download/:id')
  @RequirePermission('select') //给添加权限
  @ApiOperation({ summary: '下载文件' })
  async export(@Req() req, @Res() res) {
    const data = await this.uploadService.export(req.params.id)
    res.download(data)
  }
}
