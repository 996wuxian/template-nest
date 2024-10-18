export default {
  html: `<div style="display: flex; flex-direction: column">
  <h3>Hi! 亲爱的<%=email%>用户:</h3>
  <p>您正在进行邮箱验证，本次验证码为：</p>
  <div><span style="font-size: 40px; color: red"><%=code%></span>(为了保障您的账户安全，请勿泄露验证码)</div>
  <div style="margin-left: auto">系统邮件，回复无效。</div>
  <div style="margin-left: auto">如果您没有在本站注册，请忽略此邮件。</div>
</div>`
}
