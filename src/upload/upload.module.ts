import { Module } from '@nestjs/common'
import { UploadService } from './upload.service'
import { UploadController } from './upload.controller'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { UploadEntity } from './entities/upload.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [
    // MulterModule.register({
    //   storage: diskStorage({
    //     destination: join(__dirname, '../uploadFile'), // 存放位置
    //     filename: (_, file, cb) => {
    //       // const filename = `${Date.now()}-${decodeURIComponent(
    //       //   escape(file.originalname),
    //       // )}`;
    //       const filename = decodeURIComponent(escape(file.originalname))
    //       return cb(null, filename)
    //     }
    //   })
    // }),
    MulterModule,
    TypeOrmModule.forFeature([UploadEntity])
  ],
  controllers: [UploadController],
  providers: [UploadService]
})
export class UploadModule {}
