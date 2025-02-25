import { Request } from 'express';
//设置允许访问的域名
const allowlist = ['http://localhost:9527', 'http://localhost:5174'];
const corsOptionsDelegate = (req: Request, callback) => {
  let corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    // console.log("req.header('Origin')", req.header('Origin'));
    // 如果你不需要 Cookie 可以设置为 *
    // credentials 与前端的 axios 的 withCredentials（XMLHttpRequest.withCredentials）匹配
    // 同时 origin 必须设置为访问域 才能正常访问，主要是为了 凭证是 Cookie ，授权标头或 TLS 客户端证书
    corsOptions = {
      origin: req.header('Origin'),
      credentials: true,
    };
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
};
export default corsOptionsDelegate;
