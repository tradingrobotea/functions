// netlify/functions/upload.js
// 功能：接收 EA 上传的账户数据，存入 Netlify Blobs
// 访问：POST /.netlify/functions/upload?account=xxx&code=yyy

const { getStore } = require("@netlify/blobs");

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

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function isAuthorized(code, account) {
  const now = new Date();
  const codeOk    = CODE_LIST.some(i => i.code === code && now <= new Date(i.expire));
  const accountOk = ACCOUNT_LIST.some(i => i.account === account && now <= new Date(i.expire));
  return codeOk || accountOk;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { status: "error", message: "method_not_allowed" });
  }

  const params  = event.queryStringParameters || {};
  const code    = (params.code    || "").trim();
  const account = (params.account || "").trim();

  if (!isAuthorized(code, account)) {
    return respond(403, { status: "error", message: "unauthorized" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { status: "error", message: "invalid_json" });
  }

  if (!payload.account) {
    return respond(400, { status: "error", message: "missing_account" });
  }

  payload.serverTime = new Date().toISOString();

  try {
    const store = getStore("account-data");
    await store.setJSON(`account_data/${payload.account}`, payload);
  } catch (err) {
    console.error("[upload] Blob写入失败:", err);
    return respond(500, { status: "error", message: "storage_error" });
  }

  console.log(`[upload] 账号 ${payload.account} 数据已保存`);
  return respond(200, {
    status:     "ok",
    message:    "uploaded",
    account:    payload.account,
    serverTime: payload.serverTime,
  });
};
