export async function onRequest(context) {

  const url = new URL(context.request.url);

  //========================
  // 获取参数
  //========================
  const code = url.searchParams.get("code") || "";
  const account = url.searchParams.get("account") || "";
  const server = url.searchParams.get("server") || "";

  //========================
  // 模拟数据库（你后面可换成KV / D1 / Mongo）
  //========================
  const validCodes = {
    "123456": {
      account: "78000801",
      expire: "2026-12-31",
      status: "ok"
    },
    "ABC123": {
      account: "11111111",
      expire: "2026-06-01",
      status: "ok"
    }
  };

  //========================
  // 验证 code
  //========================
  if (!validCodes[code]) {
    return new Response(JSON.stringify({
      status: "unauthorized",
      msg: "invalid code"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const user = validCodes[code];

  //========================
  // 账号绑定检查（关键）
  //========================
  if (account && user.account !== account) {
    return new Response(JSON.stringify({
      status: "blocked",
      msg: "account mismatch"
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  //========================
  // 到期检查
  //========================
  const now = new Date();
  const expireTime = new Date(user.expire);

  if (now > expireTime) {
    return new Response(JSON.stringify({
      status: "expired",
      expire: user.expire
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  //========================
  // 成功返回（MT5标准格式）
  //========================
  return new Response(JSON.stringify({
    status: "ok",
    account: user.account,
    expire: user.expire,
    trade: true,
    symbol: "BTCUSD",
    buy: true,
    sell: false,
    sl: 300,
    tp: 600
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
