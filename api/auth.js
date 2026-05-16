// netlify/functions/auth.js
// 访问：/.netlify/functions/auth?code=xxx&account=yyy

const CODE_LIST = [
  { code: "123456", expire: "2026-06-30" },
  { code: "3456",   expire: "2026-08-01" },
  { code: "VIP888", expire: "2027-01-01" },
];

const ACCOUNT_LIST = [
  { account: "78000801", expire: "2026-06-30" },
  { account: "88888888", expire: "2026-12-31" },
];

// 默认下发配置（EA 启动时收到）
const DEFAULT_CONFIG = {
  symbol:             "XAUUSD",
  buy:                true,
  sell:               true,
  tradeEnable:        true,
  sl:                 150,
  tp:                 300,
  gridStep:           50,
  lotMultiplier:      1.5,
  partialCloseProfit: 100,
};

const CORS = {
  "Content-Type":                "application/json",
  "Cache-Control":               "no-cache",
  "Access-Control-Allow-Origin": "*",
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const params  = event.queryStringParameters || {};
  const code    = (params.code    || "").trim();
  const account = (params.account || "").trim();
  const now     = new Date();

  // 1. code 验证
  const codeData = CODE_LIST.find(item => item.code === code);
  if (codeData) {
    if (now > new Date(codeData.expire)) {
      return respond(400, { status: "error", message: "code_expired" });
    }
    return respond(200, { status: "ok", mode: "code", expire: codeData.expire, ...DEFAULT_CONFIG });
  }

  // 2. account 验证
  const accountData = ACCOUNT_LIST.find(item => item.account === account);
  if (accountData) {
    if (now > new Date(accountData.expire)) {
      return respond(400, { status: "error", message: "account_expired" });
    }
    return respond(200, { status: "ok", mode: "account", expire: accountData.expire, ...DEFAULT_CONFIG });
  }

  // 3. 验证失败
  return respond(403, { status: "error", message: "invalid_credentials" });
};
