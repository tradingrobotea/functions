// 导出一个默认的处理函数，用于处理HTTP请求
export default function handler(req, res) {
 // 定义有效的授权码列表，包含四个预设的授权码
 const validCodes = ['ABC123', 'XYZ789', 'TEST001','123456'];
 
 // 从请求的查询参数中解构获取授权码
 const { code } = req.query;
 
 // 验证传入的授权码是否在有效列表中
 if (validCodes.includes(code)) {
   // 如果授权码有效，返回HTTP状态码200和'OK'响应
   res.status(200).send('OK');
 } else {
   // 如果授权码无效，返回HTTP状态码401(未授权)和'FAIL'响应
   res.status(401).send('FAIL');
 }
}
