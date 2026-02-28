# Vlinders API

**独立的服务端 API 仓库 - 为 Vlinder Chat VSCode 扩展提供 AI 服务**

> ⚠️ **重要说明**: 这个文件夹仅作为占位符和文档参考。实际的 Vlinders API 服务端代码应该在独立的 Git 仓库中开发和部署。

---

## 📋 项目概述

### 仓库关系

```
┌─────────────────────────────────────────┐
│  Vlinder-chat (本仓库)                   │
│  ├─ VSCode 扩展客户端                    │
│  ├─ 运行在用户本地                       │
│  ├─ GitHub: QuickerStudio/Vlinder       │
│  └─ 包含 Vlinders API 客户端代码         │
└─────────────────────────────────────────┘
              ↓ HTTPS
┌─────────────────────────────────────────┐
│  Vlinders-API (独立仓库)                 │
│  ├─ 服务端 API 实现                      │
│  ├─ 运行在 Cloudflare Workers           │
│  ├─ GitHub: QuickerStudio/Vlinders-API  │
│  └─ 提供 AI 服务接口                     │
└─────────────────────────────────────────┘
```

### 为什么需要独立仓库？

1. **职责分离**: 客户端和服务端代码完全独立
2. **独立部署**: 服务端可以独立更新，不影响客户端
3. **安全性**: 服务端密钥和配置不会暴露在客户端仓库
4. **团队协作**: 前端和后端团队可以并行开发
5. **版本管理**: 服务端和客户端可以有独立的版本号

---

## 🎯 Vlinders API 的职责

### 核心功能

Vlinders API 是一个**独立的后端服务**，负责：

1. **AI 模型调用**
   - 聊天对话（Chat Completions）
   - 代码补全（Code Completions）
   - 文本嵌入（Embeddings）
   - Agent 工具调用

2. **用户认证与授权**
   - API Key 管理
   - JWT Token 签发和验证
   - OAuth 2.0 集成（可选）

3. **订阅管理**
   - 订阅计划管理
   - 使用量统计
   - 配额控制
   - 计费集成

4. **速率限制**
   - 基于用户的请求限流
   - 基于 IP 的防滥用
   - 配额管理

5. **日志和监控**
   - 请求日志
   - 错误追踪
   - 性能监控
   - 使用分析

### 不负责的功能

- ❌ VSCode 扩展 UI
- ❌ GitHub 仓库管理（由客户端直接调用 GitHub API）
- ❌ 本地文件操作
- ❌ VSCode 特定功能

---

## 🏗️ 推荐技术架构

### 方案：Cloudflare Workers + Hono

**为什么选择 Cloudflare Workers？**

1. ✅ **全球边缘网络** - 低延迟，用户体验好
2. ✅ **按需付费** - 成本低，适合初创项目
3. ✅ **自动扩展** - 无需担心流量峰值
4. ✅ **免费额度** - 每天 10 万次请求免费
5. ✅ **TypeScript 原生支持** - 与客户端技术栈一致
6. ✅ **简单部署** - 一条命令即可部署

### 技术栈

```yaml
运行时: Cloudflare Workers
框架: Hono (轻量级，专为边缘计算设计)
语言: TypeScript
数据库:
  - Cloudflare D1 (SQLite) - 用户数据、订阅信息
  - Cloudflare KV - Token 缓存、速率限制
认证: JWT + Cloudflare Workers KV
AI 服务:
  - OpenAI API (GPT-4, GPT-3.5)
  - Anthropic API (Claude)
  - 或其他 LLM 提供商
部署: Wrangler CLI
监控: Cloudflare Analytics + Sentry
```

### 备选方案

如果不使用 Cloudflare，也可以考虑：

| 方案 | 优势 | 劣势 |
|------|------|------|
| **Node.js + NestJS** | 功能丰富，生态成熟 | 需要自己管理服务器 |
| **Go + Gin** | 性能优秀，并发强 | 与客户端技术栈不一致 |
| **Python + FastAPI** | AI/ML 生态最强 | 性能相对较弱 |
| **Rust + Actix** | 性能最强，内存安全 | 学习曲线陡峭 |

---

## 📁 推荐的仓库结构

```bash
Vlinders-API/                      # 独立 Git 仓库
├── src/
│   ├── routes/
│   │   ├── auth.ts               # POST /v1/auth/login, /v1/auth/refresh
│   │   ├── chat.ts               # POST /v1/chat/completions
│   │   ├── completions.ts        # POST /v1/completions
│   │   ├── embeddings.ts         # POST /v1/embeddings
│   │   ├── models.ts             # GET /v1/models
│   │   ├── subscription.ts       # GET /v1/subscription
│   │   └── usage.ts              # GET /v1/usage
│   ├── middleware/
│   │   ├── auth.ts               # JWT 验证
│   │   ├── rateLimit.ts          # 速率限制
│   │   ├── quota.ts              # 配额检查
│   │   └── cors.ts               # CORS 配置
│   ├── services/
│   │   ├── ai/
│   │   │   ├── openai.ts         # OpenAI 集成
│   │   │   ├── anthropic.ts     # Anthropic 集成
│   │   │   └── router.ts         # 模型路由
│   │   ├── database.ts           # D1 数据库操作
│   │   ├── cache.ts              # KV 缓存操作
│   │   └── billing.ts            # 计费逻辑
│   ├── types/
│   │   ├── api.ts                # API 请求/响应类型
│   │   ├── models.ts             # 模型定义
│   │   └── user.ts               # 用户类型
│   ├── utils/
│   │   ├── jwt.ts                # JWT 工具
│   │   ├── validation.ts         # 请求验证
│   │   └── errors.ts             # 错误处理
│   └── index.ts                  # 入口文件
├── migrations/                    # D1 数据库迁移
│   ├── 0001_create_users.sql
│   ├── 0002_create_subscriptions.sql
│   └── 0003_create_usage_logs.sql
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── API.md                    # API 文档
│   ├── DEPLOYMENT.md             # 部署指南
│   └── ARCHITECTURE.md           # 架构设计
├── wrangler.toml                 # Cloudflare 配置
├── package.json
├── tsconfig.json
├── .env.example                  # 环境变量示例
└── README.md
```

---

## 🔌 API 端点设计

### 认证相关

```http
POST   /v1/auth/login          # 用户登录（返回 JWT）
POST   /v1/auth/refresh        # 刷新 Token
POST   /v1/auth/register       # 用户注册（可选）
GET    /v1/auth/me             # 获取当前用户信息
DELETE /v1/auth/logout         # 登出
```

### AI 服务

```http
POST   /v1/chat/completions    # 聊天对话（OpenAI 兼容格式）
POST   /v1/responses           # Copilot 响应格式（兼容旧客户端）
POST   /v1/messages            # Anthropic Messages 格式
POST   /v1/completions         # 代码补全
POST   /v1/embeddings          # 文本嵌入
```

### 模型管理

```http
GET    /v1/models              # 获取可用模型列表
GET    /v1/models/{id}         # 获取模型详情
```

### 订阅与计费

```http
GET    /v1/subscription        # 获取订阅信息
POST   /v1/subscription        # 创建/更新订阅
GET    /v1/usage               # 获取使用量统计
GET    /v1/quota               # 获取配额信息
```

### 健康检查

```http
GET    /health                 # 健康检查
GET    /version                # 版本信息
```

---

## 🔐 认证流程设计

### 方案 1: API Key（推荐用于 MVP）

```
1. 用户在 Vlinders 网站注册账号
   ↓
2. 生成 API Key
   ↓
3. 用户在 VSCode 扩展中配置 API Key
   ↓
4. 客户端每次请求携带 API Key
   ↓
5. 服务端验证 API Key 并返回数据
```

**优势**: 简单，易于实现
**劣势**: 安全性相对较低

### 方案 2: OAuth 2.0 + JWT（推荐用于正式版）

```
1. 用户在 VSCode 扩展中点击"登录"
   ↓
2. 打开浏览器，跳转到 Vlinders 登录页
   ↓
3. 用户登录（可选：使用 GitHub 账号关联）
   ↓
4. 授权成功，返回 Authorization Code
   ↓
5. 客户端用 Code 换取 Access Token (JWT)
   ↓
6. 客户端缓存 Token，每次请求携带
   ↓
7. Token 过期时自动刷新
```

**优势**: 安全性高，用户体验好
**劣势**: 实现复杂

### 推荐的混合方案

- **初期（MVP）**: 使用 API Key
- **正式版**: 支持 API Key + OAuth 2.0 两种方式

---

## 📊 数据库设计

### D1 数据库表结构

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  github_id TEXT UNIQUE,
  api_key TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 订阅表
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL, -- 'free', 'pro', 'team'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 使用量日志
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 配额表
CREATE TABLE quotas (
  user_id TEXT PRIMARY KEY,
  requests_used INTEGER DEFAULT 0,
  requests_limit INTEGER NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER NOT NULL,
  reset_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### KV 存储用途

```typescript
// Token 缓存
KV.put(`token:${userId}`, token, { expirationTtl: 86400 }); // 24 小时

// 速率限制
KV.put(`ratelimit:${userId}:${minute}`, count, { expirationTtl: 60 });

// API Key 验证缓存
KV.put(`apikey:${apiKey}`, userId, { expirationTtl: 3600 });
```

---

## 🚀 部署流程

### 1. 初始化项目

```bash
# 创建新仓库
git clone https://github.com/QuickerStudio/Vlinders-API.git
cd Vlinders-API

# 使用 Cloudflare Workers 模板
npm create cloudflare@latest . -- --template hono
```

### 2. 配置环境变量

```bash
# wrangler.toml
name = "vlinders-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "vlinders-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# 敏感信息使用 Secrets
# wrangler secret put OPENAI_API_KEY
# wrangler secret put ANTHROPIC_API_KEY
# wrangler secret put JWT_SECRET
```

### 3. 本地开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev

# 访问 http://localhost:8787
```

### 4. 部署到生产环境

```bash
# 部署
npm run deploy

# 查看日志
wrangler tail

# 查看分析
wrangler pages deployment list
```

### 5. 自定义域名

```bash
# 在 Cloudflare Dashboard 中配置
# 将 api.vlinders.org 指向 Workers
```

---

## 💰 订阅计划设计

### Free 计划
- 每月 100 次 AI 请求
- 基础模型访问（GPT-3.5）
- 社区支持

### Pro 计划 ($9.99/月)
- 每月 1,000 次 AI 请求
- 所有模型访问（GPT-4, Claude）
- 优先响应速度
- 邮件支持

### Team 计划 ($29.99/月)
- 无限 AI 请求
- 所有模型访问
- 团队协作功能
- 专属技术支持
- SLA 保证

### Enterprise 计划（定制）
- 自定义配额
- 私有部署
- 专属客户经理
- 定制开发

---

## 🔗 与客户端的集成

### 客户端代码示例

在 `Vlinder-chat` 仓库中：

```typescript
// src/platform/vlinders/vlindersClient.ts
export class VlindersAPIClient {
  private baseURL = 'https://api.vlinders.org';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vlinder-Chat/0.38.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    return response.json();
  }

  async getModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseURL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.json();
  }

  async getUsage(): Promise<UsageStats> {
    const response = await fetch(`${this.baseURL}/v1/usage`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.json();
  }
}
```

### 配置示例

```json
// Vlinder-chat 的 package.json
{
  "contributes": {
    "configuration": {
      "properties": {
        "vlinder.apiEndpoint": {
          "type": "string",
          "default": "https://api.vlinders.org",
          "description": "Vlinders API 端点地址"
        },
        "vlinder.apiKey": {
          "type": "string",
          "description": "Vlinders API Key"
        }
      }
    }
  }
}
```

---

## 📈 监控和日志

### 推荐的监控方案

1. **Cloudflare Analytics**（内置）
   - 请求量统计
   - 错误率监控
   - 响应时间分析

2. **Sentry**（错误追踪）
   ```typescript
   import * as Sentry from '@sentry/cloudflare';

   Sentry.init({
     dsn: 'your-sentry-dsn',
     environment: 'production'
   });
   ```

3. **自定义日志**
   ```typescript
   // 记录到 D1
   await env.DB.prepare(
     'INSERT INTO logs (user_id, endpoint, status, duration) VALUES (?, ?, ?, ?)'
   ).bind(userId, endpoint, status, duration).run();
   ```

---

## 🔒 安全考虑

### 必须实现的安全措施

1. **速率限制**
   ```typescript
   // 每个用户每分钟最多 60 次请求
   const key = `ratelimit:${userId}:${currentMinute}`;
   const count = await env.KV.get(key);
   if (count && parseInt(count) > 60) {
     return c.json({ error: 'Rate limit exceeded' }, 429);
   }
   ```

2. **API Key 加密存储**
   ```typescript
   // 使用 bcrypt 或 argon2 加密
   const hashedKey = await bcrypt.hash(apiKey, 10);
   ```

3. **CORS 配置**
   ```typescript
   app.use('*', cors({
     origin: ['https://vlinders.org', 'vscode-webview://*'],
     allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowHeaders: ['Content-Type', 'Authorization']
   }));
   ```

4. **输入验证**
   ```typescript
   import { z } from 'zod';

   const chatRequestSchema = z.object({
     model: z.string(),
     messages: z.array(z.object({
       role: z.enum(['user', 'assistant', 'system']),
       content: z.string()
     })),
     max_tokens: z.number().max(4096).optional()
   });
   ```

5. **敏感信息保护**
   - 使用 Cloudflare Secrets 存储 API Keys
   - 不在日志中记录敏感信息
   - 使用 HTTPS 加密传输

---

## 📚 相关文档

### 必读文档
- [迁移计划.md](./迁移计划.md) - 完整的迁移计划
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Hono 框架文档](https://hono.dev/)
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)

### 推荐阅读
- [Cloudflare D1 数据库](https://developers.cloudflare.com/d1/)
- [Cloudflare KV 存储](https://developers.cloudflare.com/kv/)
- [JWT 最佳实践](https://jwt.io/introduction)

---

## 🤝 贡献指南

### 开发流程

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试
- 更新文档

---

## 📞 联系方式

- **产品网站**: https://vlinders.org/
- **GitHub 组织**: https://github.com/QuickerStudio
- **客户端仓库**: https://github.com/QuickerStudio/Vlinder
- **服务端仓库**: https://github.com/QuickerStudio/Vlinders-API (待创建)

---

## 📝 开发日志

### 2026-02-28
- ✅ 创建迁移计划
- ✅ 确定技术架构（Cloudflare Workers + Hono）
- ✅ 设计 API 端点
- ⏳ 待创建独立仓库

### 下一步计划
1. 创建 `QuickerStudio/Vlinders-API` 仓库
2. 初始化 Cloudflare Workers 项目
3. 实现认证和基础 API
4. 部署到测试环境
5. 集成到客户端

---

## ⚠️ 重要提醒

### 给未来的开发者

1. **这个文件夹不是服务端代码**
   - 这只是一个占位符和文档参考
   - 实际的服务端代码应该在独立的 Git 仓库中

2. **不要在客户端仓库中存储服务端代码**
   - 安全风险：密钥可能泄露
   - 部署困难：客户端和服务端混在一起
   - 版本管理混乱：无法独立发布

3. **客户端只需要 API 客户端代码**
   - 位置：`src/platform/vlinders/vlindersClient.ts`
   - 职责：调用 Vlinders API
   - 不包含：业务逻辑、数据库操作、密钥管理

4. **类型定义可以共享**
   - 考虑创建 `@vlinders/types` npm 包
   - 客户端和服务端都引用
   - 保持类型一致性

---

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**最后更新**: 2026-02-28
**维护者**: QuickerStudio Team
**状态**: 📝 规划中
