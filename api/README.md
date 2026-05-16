# CloudAuthEA 部署说明

## 系统架构

```
MT5 EA (CloudAuthEA.mq5)
  │
  ├─── /auth     → 授权验证（启动时）
  ├─── /upload   → 上传账户数据（每5分钟）
  └─── /config   → 拉取云端配置（每5分钟）
            │
     Netlify Functions
            │
     Netlify Blobs（持久存储）
            │
     /admin      → 你的管理接口（浏览器/Postman）
```

---

## 文件结构

```
项目根目录/
├── netlify.toml
└── netlify/
    └── functions/
        ├── auth.js       ← 授权验证
        ├── upload.js     ← 接收EA上传数据
        ├── config.js     ← 向EA下发云端配置
        └── admin.js      ← 管理接口（查看数据/改配置）
```

---

## 部署步骤

### 1. 创建 Netlify 项目

1. 把以上文件推送到 GitHub 仓库
2. 在 [netlify.com](https://netlify.com) 创建新站点，关联 GitHub 仓库
3. Netlify 会自动检测 `netlify.toml` 并部署 Functions

### 2. 设置环境变量

在 Netlify → Site Settings → Environment Variables 中添加：

| 变量名      | 说明                    | 示例值              |
|-------------|-------------------------|---------------------|
| ADMIN_KEY   | 管理接口密钥（自定义）   | `MySecretKey2026`   |

### 3. 配置 MT5 WebRequest 白名单

在 MT5 中：**工具 → 选项 → EA交易 → 允许以下URL的WebRequest**

添加你的 Netlify 域名，例如：
```
https://sunny-auth.netlify.app
```

---

## MT5 EA 参数说明

| 参数               | 默认值                              | 说明                |
|--------------------|-------------------------------------|---------------------|
| InpAuthCode        | `123456`                            | 授权码              |
| InpServerBase      | `https://你的域名/.netlify/functions` | 服务器地址          |
| InpUploadInterval  | `300`                               | 上传间隔（秒）      |
| InpPullInterval    | `300`                               | 拉取配置间隔（秒）  |
| InpDebugLog        | `false`                             | 是否打印调试日志    |

---

## API 接口说明

### 授权验证
```
GET /.netlify/functions/auth?code=123456&account=78000801
```
**返回（成功）：**
```json
{
  "status": "ok",
  "mode": "code",
  "expire": "2026-06-30",
  "symbol": "XAUUSD",
  "buy": true,
  "sell": true,
  "tradeEnable": true,
  "sl": 150,
  "tp": 300,
  "gridStep": 50,
  "lotMultiplier": 1.5,
  "partialCloseProfit": 100
}
```

---

### 上传账户数据
```
POST /.netlify/functions/upload?code=123456&account=78000801
Content-Type: application/json

{
  "account": 78000801,
  "name": "John",
  "server": "ICMarkets-Live",
  "currency": "USD",
  "balance": 10000.00,
  "equity": 10250.50,
  "margin": 500.00,
  "freeMargin": 9750.50,
  "profit": 250.50,
  "positions": [
    {
      "ticket": 12345678,
      "symbol": "XAUUSD",
      "type": 0,
      "volume": 0.10,
      "open": 2350.50,
      "current": 2368.20,
      "profit": 177.00,
      "sl": 2330.00,
      "tp": 2400.00
    }
  ],
  "timestamp": 1748000000
}
```

---

### 拉取云端配置
```
GET /.netlify/functions/config?code=123456&account=78000801
```
**返回：**
```json
{
  "status": "ok",
  "symbol": "XAUUSD",
  "buy": true,
  "sell": true,
  "tradeEnable": true,
  "sl": 150,
  "tp": 300,
  "gridStep": 50,
  "lotMultiplier": 1.5,
  "partialCloseProfit": 100
}
```

---

### 管理接口

#### 查看所有账号
```
GET /.netlify/functions/admin?key=MySecretKey2026&action=list
```

#### 查看某账号数据
```
GET /.netlify/functions/admin?key=MySecretKey2026&action=get&account=78000801
```

#### 为某账号设置个性化配置
```
POST /.netlify/functions/admin?key=MySecretKey2026&action=setConfig&account=78000801
Content-Type: application/json

{
  "symbol": "EURUSD",
  "buy": true,
  "sell": false,
  "tradeEnable": true,
  "sl": 50,
  "tp": 100,
  "gridStep": 20,
  "lotMultiplier": 2.0,
  "partialCloseProfit": 50
}
```

#### 设置全局配置覆盖（紧急停止所有EA）
```
POST /.netlify/functions/admin?key=MySecretKey2026&action=setGlobalConfig
Content-Type: application/json

{ "tradeEnable": false }
```

---

## 云端配置字段说明

| 字段                 | 类型    | 说明                            |
|----------------------|---------|---------------------------------|
| symbol               | string  | 交易品种，空字符串=不限制        |
| buy                  | bool    | 是否允许做多                    |
| sell                 | bool    | 是否允许做空                    |
| tradeEnable          | bool    | 总开关（false=EA停止交易）       |
| sl                   | number  | 止损点数                        |
| tp                   | number  | 止盈点数                        |
| gridStep             | number  | 网格步长                        |
| lotMultiplier        | number  | 手数倍数                        |
| partialCloseProfit   | number  | 部分平仓盈利阈值                |

---

## 配置优先级

```
账号级别配置（admin setConfig）
      ↓ 覆盖
全局覆盖配置（admin setGlobalConfig）
      ↓ 覆盖
代码内默认配置（GLOBAL_CONFIG）
```

---

## 安全注意事项

1. **ADMIN_KEY** 必须设为强密码，不要提交到 GitHub
2. 授权码列表建议也通过环境变量或 Netlify Blobs 管理，避免硬编码
3. 生产环境中建议为 `/upload` 和 `/config` 接口添加 IP 白名单或签名验证
