// 3 获取.env环境变量(需安装)
import 'dotenv/config';

import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

import * as session from 'express-session';

import { AppModule } from './app.module';
import corsOptionsDelegate from './cors';

// 1
export const IS_DEV = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 9528;
const PREFIX = process.env.PREFIX || '/';

const startTime = new Date().getTime();
async function bootstrap() {
  // 3
  const logger: Logger = new Logger('main.ts');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 开启日志级别打印
    logger: IS_DEV ? ['log', 'debug', 'error', 'warn'] : ['error', 'warn'],
  });

  // 4 接口参数验证
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5 安装 class-validator class-transformer 接口参数约束
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 6 session
  app.use(
    session({
      secret: 'wuxian',
      resave: false,
      name: 'wuxian.sid',
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: false,
      },
    }),
  );

  // 7 swagger 需要在controller配置才能读到api-json
  const options = new DocumentBuilder()
    .setTitle('template-nest')
    .setVersion('1.0')
    .setExternalDoc('api-json', `http://localhost:${PORT}/api-json`)
    .build();

  const document = SwaggerModule.createDocument(app as any, options);

  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
  SwaggerModule.setup('/api-docs', app as any, document);

  // 8 跨域配置
  app.enableCors(corsOptionsDelegate);

  // 2
  await app.listen(PORT, () => {
    logger.log(`服务已经启动,接口请访问:http://localhost:${PORT}/${PREFIX}`);
  });
  console.info(`执行至 listen 耗时 ${new Date().getTime() - startTime}`);
}
bootstrap();
