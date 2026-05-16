// netlify/functions/admin.js
// 管理接口（仅供你自己使用，需要 ADMIN_KEY）
//
// GET  /admin?key=xxx&action=list                      → 列出所有账号
// GET  /admin?key=xxx&action=get&account=78000801      → 查看持仓数据
// POST /admin?key=xxx&action=setConfig&account=xxx     → 设置账号配置
// POST /admin?key=xxx&action=setGlobalConfig           → 全局配置覆盖（紧急停止用）
// POST /admin?key=xxx&action=deleteConfig&account=xxx  → 删除账号个性化配置

const { getStore } = require("@netlify/blobs");

// 在 Netlify 环境变量中设置 ADMIN_KEY，不要硬编码
const ADMIN_KEY = process.env.ADMIN_KEY || "change_me_admin_key";

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
  const key     = (params.key     || "").trim();
  const action  = (params.action  || "").trim();
  const account = (params.account || "").trim();

  if (key !== ADMIN_KEY) {
    return respond(403, { status: "error", message: "forbidden" });
  }

  const store = getStore("account-data");

  // ── list ─────────────────────────────────────────────────────
  if (action === "list") {
    const { blobs } = await store.list({ prefix: "account_data/" });
    const accounts = blobs.map(b => b.key.replace("account_data/", ""));
    return respond(200, { status: "ok", accounts });
  }

  // ── get ──────────────────────────────────────────────────────
  if (action === "get") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    const data = await store.get(`account_data/${account}`, { type: "json" }).catch(() => null);
    if (!data) return respond(404, { status: "error", message: "not_found" });
    return respond(200, { status: "ok", data });
  }

  // ── setConfig ─────────────────────────────────────────────────
  if (action === "setConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    if (event.httpMethod !== "POST") return respond(405, { status: "error", message: "use_POST" });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { status: "error", message: "invalid_json" }); }
    await store.setJSON(`config/${account}`, body);
    return respond(200, { status: "ok", message: "config_saved", account, config: body });
  }

  // ── setGlobalConfig ───────────────────────────────────────────
  if (action === "setGlobalConfig") {
    if (event.httpMethod !== "POST") return respond(405, { status: "error", message: "use_POST" });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { status: "error", message: "invalid_json" }); }
    await store.setJSON("config/global", body);
    return respond(200, { status: "ok", message: "global_config_saved", config: body });
  }

  // ── deleteConfig ──────────────────────────────────────────────
  if (action === "deleteConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    await store.delete(`config/${account}`);
    return respond(200, { status: "ok", message: "config_deleted", account });
  }

  return respond(400, { status: "error", message: "unknown_action" });
};
