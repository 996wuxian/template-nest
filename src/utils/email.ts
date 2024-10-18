import * as ejs from 'ejs'
import * as nodemail from 'nodemailer'
import EmailConfig from 'src/config/email.config'
import template from 'src/config/email.template'

export class Email {
  private transporter = null

  constructor() {
    // 通过nodemail的createTransport方法创建这个服务，将config中的参数依次传入
    this.transporter = nodemail.createTransport({
      host: EmailConfig.host,
      port: EmailConfig.port,
      secure: EmailConfig.secure,
      auth: {
        user: EmailConfig.user,
        pass: EmailConfig.pass
      }
    })
  }

  // 发送验证码的方法
  async send(data: { email: string }) {
    return new Promise((resolve, reject) => {
      const code = Math.random().toString().slice(-6)
      const compiledTemplate = ejs.render(template.html, {
        email: data.email,
        code: code
      })

      const options = {
        from: `${EmailConfig.alias}<${EmailConfig.user}>`,
        to: data.email,
        subject: '登录验证码',
        html: compiledTemplate
      }
      this.transporter.sendMail(options, (error) => {
        if (error) {
          console.log(error)
          reject(error)
        } else {
          resolve(code)
        }
      })
    })
  }
}
