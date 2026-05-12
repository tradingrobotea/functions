export default function handler(req, res) {
 const { code, account } = req.query;

 const users = {
   "123456": {
     account: 78000801,
     expire: "2026-12-31"
   }
 };

 if (!users[code]) {
   return res.status(401).json({
     status: "unauthorized"
   });
 }

 res.status(200).json({
   status: "ok",
   account: users[code].account,
   expire: users[code].expire
 });
}
