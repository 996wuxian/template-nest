import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Res,
  Req,
  Delete,
  Body
} from '@nestjs/common'
import { UploadService } from './upload.service'
import { FileInterceptor } from '@nestjs/platform-express'
// 上传文件限制
import { multerConfig } from '../config/multerConfig'
import { RequireLogin, RequirePermission } from '../guard/custom-decorator'

import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateFileDto } from './dto/create-upload.dto'
import { FileSizeValidationPipe } from './file-size-validation-pipe.pipe'

@RequireLogin() // 校验token
@Controller('api/upload')
@ApiTags('上传')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: '上传文件' })
  @RequirePermission('add') // 给添加权限
  // 代表使用FileInterceptor处理上传的form data里的 file 字段的数据，也可以不指定字段名，直接处理整个表单数据。
  // 图片保存位置在module中进行配置
  // 限制文件类型
  @UseInterceptors(FileInterceptor('file', multerConfig))
  // 使用UploadedFile装饰器从 request 中取出 file。
  // FileSizeValidationPipe限制文件大小
  upload(@UploadedFile(FileSizeValidationPipe) file: Express.Multer.File, @Body() body) {
    console.log('🚀 ~ UploadController ~ upload ~ body:', body)
    return this.uploadService.upload(file)
  }

  @Post('addFile')
  @ApiOperation({ summary: '将上传的文件的对应关系存储到数据库' })
  @RequirePermission('add') // 给添加权限
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
