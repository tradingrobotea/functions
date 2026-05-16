// netlify/functions/upload.js
// 功能：接收 EA 上传的账户数据，存入 Netlify Blobs（持久存储）
// 访问地址：/.netlify/functions/upload?account=xxx&code=yyy
// 方法：POST，body 为 JSON

import { getStore } from "@netlify/blobs";

// ============================================================
// 授权验证（与 auth.js 共用，简化版：只验证code是否合法）
// ============================================================
const CODE_LIST = [
  { code: "123456", expire: "2026-06-30" },
  { code: "3456",   expire: "2026-08-01" },
  { code: "VIP888", expire: "2027-01-01" },
];

const ACCOUNT_LIST = [
  { account: "78000801", expire: "2026-06-30" },
  { account: "88888888", expire: "2026-12-31" },
];

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

  if (event.httpMethod !== "POST") {
    return respond(405, { status: "error", message: "method_not_allowed" });
  }

  const params  = event.queryStringParameters || {};
  const code    = (params.code    || "").trim();
  const account = (params.account || "").trim();
  const now     = new Date();

  // ----------------------------------------------------------
  // 授权检查（code 或 account 任一有效即可上传）
  // ----------------------------------------------------------
  const codeOk = CODE_LIST.some(
    item => item.code === code && now <= new Date(item.expire)
  );
  const accountOk = ACCOUNT_LIST.some(
    item => item.account === account && now <= new Date(item.expire)
  );

  if (!codeOk && !accountOk) {
    return respond(403, { status: "error", message: "unauthorized" });
  }

  // ----------------------------------------------------------
  // 解析上传body
  // ----------------------------------------------------------
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { status: "error", message: "invalid_json" });
  }

  if (!payload.account) {
    return respond(400, { status: "error", message: "missing_account" });
  }

  // ----------------------------------------------------------
  // 追加服务器时间戳
  // ----------------------------------------------------------
  payload.serverTime = new Date().toISOString();

  // ----------------------------------------------------------
  // 写入 Netlify Blobs
  // key 格式：account_data/{accountId}
  // ----------------------------------------------------------
  try {
    const store = getStore("account-data");
    await store.setJSON(`account_data/${payload.account}`, payload);
  } catch (err) {
    console.error("[upload] Blob写入失败:", err);
    return respond(500, { status: "error", message: "storage_error" });
  }

  console.log(`[upload] 账号 ${payload.account} 数据已保存`);

  return respond(200, {
    status:    "ok",
    message:   "uploaded",
    account:   payload.account,
    serverTime: payload.serverTime,
  });
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
