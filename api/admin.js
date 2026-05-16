// netlify/functions/admin.js
// 功能：管理接口（查看账户数据 / 设置配置覆盖）
// 这个接口仅供你自己在浏览器/Postman中使用，需要 ADMIN_KEY 认证
//
// GET  /.netlify/functions/admin?key=ADMIN&action=list
//      → 列出所有账号的上传数据
//
// GET  /.netlify/functions/admin?key=ADMIN&action=get&account=78000801
//      → 查看某账号的持仓/资金数据
//
// POST /.netlify/functions/admin?key=ADMIN&action=setConfig&account=78000801
//      body: { "symbol":"XAUUSD","buy":true,"sell":false,"tradeEnable":true,"sl":100,"tp":200,... }
//      → 为指定账号写入个性化配置
//
// POST /.netlify/functions/admin?key=ADMIN&action=setGlobalConfig
//      body: { "tradeEnable":false }
//      → 写入全局配置覆盖（对所有账号生效）

import { getStore } from "@netlify/blobs";

// ============================================================
// 管理密钥（建议在 Netlify 环境变量中设置 ADMIN_KEY）
// ============================================================
const ADMIN_KEY = process.env.ADMIN_KEY || "change_me_admin_key";

const CORS = {
  "Content-Type":                "application/json",
  "Cache-Control":               "no-cache",
  "Access-Control-Allow-Origin": "*",
};

// ============================================================
// Handler
// ============================================================
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const params  = event.queryStringParameters || {};
  const key     = (params.key     || "").trim();
  const action  = (params.action  || "").trim();
  const account = (params.account || "").trim();

  // 管理密钥验证
  if (key !== ADMIN_KEY) {
    return respond(403, { status: "error", message: "forbidden" });
  }

  const store = getStore("account-data");

  // --------------------------------------------------------
  // action: list — 列出所有账号key
  // --------------------------------------------------------
  if (action === "list") {
    const { blobs } = await store.list({ prefix: "account_data/" });
    const accounts = blobs.map(b => b.key.replace("account_data/", ""));
    return respond(200, { status: "ok", accounts });
  }

  // --------------------------------------------------------
  // action: get — 获取指定账号的持仓/资金数据
  // --------------------------------------------------------
  if (action === "get") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    const data = await store.get(`account_data/${account}`, { type: "json" }).catch(() => null);
    if (!data) return respond(404, { status: "error", message: "not_found" });
    return respond(200, { status: "ok", data });
  }

  // --------------------------------------------------------
  // action: setConfig — 设置账号级别配置
  // --------------------------------------------------------
  if (action === "setConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    if (event.httpMethod !== "POST") return respond(405, { status: "error", message: "use_POST" });

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { status: "error", message: "invalid_json" }); }

    await store.setJSON(`config/${account}`, body);
    return respond(200, { status: "ok", message: "config_saved", account, config: body });
  }

  // --------------------------------------------------------
  // action: setGlobalConfig — 设置全局覆盖配置
  // --------------------------------------------------------
  if (action === "setGlobalConfig") {
    if (event.httpMethod !== "POST") return respond(405, { status: "error", message: "use_POST" });

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { status: "error", message: "invalid_json" }); }

    await store.setJSON("config/global", body);
    return respond(200, { status: "ok", message: "global_config_saved", config: body });
  }

  // --------------------------------------------------------
  // action: deleteConfig — 删除账号个性化配置（回落到全局）
  // --------------------------------------------------------
  if (action === "deleteConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    await store.delete(`config/${account}`);
    return respond(200, { status: "ok", message: "config_deleted", account });
  }

  return respond(400, { status: "error", message: "unknown_action" });
}

// ============================================================
// 辅助
// ============================================================
function respond(statusCode, body) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
  };
}
