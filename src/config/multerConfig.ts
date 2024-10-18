// 上传文件限制
// import { extname } from 'path';
// import { diskStorage } from 'multer';

export const multerConfig = {
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: (_req, file: Express.Multer.File, cb) => {
    // 限制上传图片类型文件
    // if (file.mimetype.match(/(jpg|jpeg|png|gif)$/)) {
    if (file.mimetype.match(/(jpg|jpeg|png|gif)$/)) {
      return cb(null, true)
    }

    return cb(null, false)
  }
  // storage: diskStorage({
  //   destination: 'uploads/',
  //   filename: (_req, file, cb) => {
  //     const randomName = Array(32)
  //       .fill(null)
  //       .map(() => Math.round(Math.random() * 16).toString(16))
  //       .join('');
  //     // 获取文件后缀
  //     const suffix = extname(file.originalname);
  //     return cb(null, `${randomName}${suffix}`);
  //   },
  // }),
}
