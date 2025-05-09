import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()

    // 处理验证错误
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const messages = Array.isArray(exceptionResponse['message'])
        ? exceptionResponse['message']
        : [exceptionResponse['message']]

      response.status(status).json({
        code: status,
        msg: messages[0], // 只返回第一个错误信息
        data: null
      })
    } else {
      // 处理其他类型的错误
      response.status(status).json({
        code: status,
        msg: exception.message,
        data: null
      })
    }
  }
}
