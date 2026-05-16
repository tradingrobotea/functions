// netlify/functions/config.js
// 功能：向EA下发云端配置（symbol/buy/sell/tradeEnable/sl/tp 等）
// 访问地址：/.netlify/functions/config?account=xxx&code=yyy
// 方法：GET
//
// 优先级：
//   1. Netlify Blobs 中是否有针对该账号的个性化配置 → 优先使用
//   2. 否则回落到默认全局配置

import { getStore } from "@netlify/blobs";

// ============================================================
// 授权码列表（与 auth.js 保持一致）
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

// ============================================================
// 全局默认配置（当Blobs中无个性化配置时使用）
// ============================================================
const GLOBAL_CONFIG = {
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

// ============================================================
// Handler
// ============================================================
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const params  = event.queryStringParameters || {};
  const code    = (params.code    || "").trim();
  const account = (params.account || "").trim();
  const now     = new Date();

  // ----------------------------------------------------------
  // 授权检查
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
  // 从 Blobs 读取该账号的个性化配置（若存在）
  // key 格式：config/{accountId}  或  config/global
  // ----------------------------------------------------------
  let config = { ...GLOBAL_CONFIG };

  try {
    const store = getStore("account-data");

    // 先尝试账号级别配置
    let customConfig = null;
    if (account) {
      customConfig = await store.get(`config/${account}`, { type: "json" }).catch(() => null);
    }

    // 再尝试全局覆盖配置
    const globalOverride = await store.get("config/global", { type: "json" }).catch(() => null);

    // 合并：全局覆盖 → 账号级别（账号级别优先级最高）
    if (globalOverride) config = { ...config, ...globalOverride };
    if (customConfig)   config = { ...config, ...customConfig };

  } catch (err) {
    console.warn("[config] Blob读取异常（将使用默认配置）:", err.message);
  }

  // ----------------------------------------------------------
  // 返回配置给EA
  // ----------------------------------------------------------
  return respond(200, {
    status:    "ok",
    account:   account || "unknown",
    updatedAt: new Date().toISOString(),
    ...config,
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
