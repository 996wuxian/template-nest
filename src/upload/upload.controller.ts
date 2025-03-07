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

  /**
   * 上传文件控制器
   * 该方法负责处理文件上传请求，包括文件分块的存储和管理
   *
   * @param files 上传的文件数组，由Multer中间件处理并注入
   * @param body 请求体，包含文件名信息，用于处理文件分块
   */
  @Post('uploadFile')
  @ApiOperation({ summary: '分片上传' })
  @RequirePermission('add')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: 'uploads'
    })
  )
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: { name: string; fileHash: string; chunkIndex: number; totalChunks: number }
  ) {
    try {
      const { name, fileHash, chunkIndex, totalChunks } = body
      console.log('上传信息:', { name, fileHash, chunkIndex, totalChunks })

      // 使用文件hash作为分片目录名
      const chunkDir = 'uploads/chunks_' + fileHash

      // 检查并创建文件分片目录
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir)
      }

      // 将上传的文件分块复制到对应的分块目录中
      await fs.promises.copyFile(files[0].path, chunkDir + '/' + name)

      // 复制成功后再删除临时文件
      await fs.promises.unlink(files[0].path)

      // 如果是最后一个分片，清理uploads目录下的多余分片
      if (Number(chunkIndex) === Number(totalChunks) - 1) {
        try {
          const uploadsDir = 'uploads'
          const files = await fs.promises.readdir(uploadsDir)
          console.log('🚀 ~ UploadController ~ files:', files)

          for (const file of files) {
            if (!file.startsWith('chunks_')) {
              const filePath = `${uploadsDir}/${file}`
              try {
                // 确保是文件而不是目录
                const stat = await fs.promises.stat(filePath)
                if (stat.isFile()) {
                  // 强制删除文件
                  await fs.rmSync(filePath, { force: true })
                  // 验证文件是否真的被删除
                  if (!fs.existsSync(filePath)) {
                    console.log('成功删除临时文件:', filePath)
                  } else {
                    console.error('文件删除失败，文件仍然存在:', filePath)
                  }
                }
              } catch (e) {
                console.error('删除文件时发生错误:', filePath, e)
                // 尝试使用同步方法删除
                try {
                  fs.rmSync(filePath, { force: true })

                  console.log('使用同步方法成功删除文件:', filePath)
                } catch (syncRmError) {
                  console.error('同步删除也失败:', filePath, syncRmError)
                }
              }
            }
          }
        } catch (error) {
          console.error('清理孤立分片失败:', error)
        }
      }

      return {
        code: 200,
        message: '分片上传成功',
        chunkPath: name
      }
    } catch (error) {
      // 发生错误时，确保清理临时文件
      console.error('上传失败:', error)
      if (files?.[0]?.path && fs.existsSync(files[0].path)) {
        try {
          fs.unlinkSync(files[0].path)
        } catch (e) {
          console.error('清理临时文件失败:', e)
        }
      }
      return {
        code: 500,
        message: '分片上传失败',
        error: error.message
      }
    }
  }
  @Get('checkFileExist')
  @ApiOperation({ summary: '检查文件是否已存在（极速上传）' })
  @RequirePermission('add')
  checkFileExist(@Query('hash') hash: string) {
    try {
      console.log('🚀 ~ UploadController ~ checkFileExist ~ hash:', hash)
      const uploadDir = 'uploads'

      // 检查完整文件是否已存在（通过遍历uploads目录查找是否存在以该hash开头的文件）
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir)
        const existFile = files.find((file) => file.startsWith(hash + '_'))
        if (existFile) {
          return {
            code: 200,
            exist: true,
            message: '文件已存在',
            filename: existFile
          }
        }
      }

      // 检查分片目录是否存在（使用hash作为分片目录名）
      const chunkDir = `uploads/chunks_${hash}`
      if (fs.existsSync(chunkDir)) {
        const existingChunks = fs.readdirSync(chunkDir)
        return {
          code: 200,
          exist: false,
          chunks: existingChunks,
          message: '文件分片已部分存在'
        }
      }

      return {
        code: 200,
        exist: false,
        chunks: [],
        message: '文件不存在'
      }
    } catch (error) {
      return {
        code: 500,
        error: error.message
      }
    }
  }
  @Get('merge')
  @ApiOperation({ summary: '合并文件' })
  @RequirePermission('add')
  merge(@Query('name') name: string, @Query('fileHash') fileHash: string) {
    const chunkDir = 'uploads/chunks_' + fileHash

    // 确保目录存在
    if (!fs.existsSync(chunkDir)) {
      return {
        code: 400,
        message: '分片文件夹不存在'
      }
    }

    // 读取所有分片
    const files = fs.readdirSync(chunkDir)

    // 按照分片索引排序
    files.sort((a, b) => {
      const indexA = parseInt(a.split('-').pop() || '0')
      const indexB = parseInt(b.split('-').pop() || '0')
      return indexA - indexB
    })

    let count = 0
    let startPos = 0

    // 创建写入流
    const writeStream = fs.createWriteStream('uploads/' + name)

    // 合并文件
    const mergeChunk = (index) => {
      if (index >= files.length) {
        // 所有分片处理完成，清理分片目录
        fs.rm(chunkDir, { recursive: true }, () => {})
        return
      }

      const filePath = chunkDir + '/' + files[index]
      const readStream = fs.createReadStream(filePath)

      readStream.pipe(writeStream, { end: false })

      readStream.on('end', () => {
        count++
        if (count === files.length) {
          writeStream.end()
          // 清理分片目录
          fs.rm(chunkDir, { recursive: true }, () => {})
        } else {
          mergeChunk(index + 1)
        }
      })
    }

    // 开始合并
    mergeChunk(0)

    return {
      code: 200,
      message: '文件合并开始',
      filename: name
    }
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
