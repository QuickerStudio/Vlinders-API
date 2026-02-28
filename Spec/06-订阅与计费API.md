# 订阅与计费 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

订阅与计费 API 管理用户的订阅计划、支付、发票等功能，是商业化的核心模块。

### 设计目标

1. **灵活性**: 支持多种订阅计划
2. **透明性**: 清晰的计费规则
3. **可扩展性**: 易于添加新计划
4. **集成性**: 与 Stripe 等支付平台集成

---

## 🌐 API 端点

### 1. 获取订阅信息

```http
GET /v1/subscription
```

#### 响应格式

```json
{
  "subscription": {
    "id": "sub_1234567890",
    "user_id": "usr_1234567890",
    "plan": "pro",
    "status": "active",
    "current_period_start": "2026-02-01T00:00:00Z",
    "current_period_end": "2026-03-01T00:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2026-01-01T00:00:00Z"
  },
  "plan_details": {
    "name": "Pro",
    "price": 9.99,
    "currency": "USD",
    "interval": "month",
    "features": {
      "requests_per_month": 1000,
      "tokens_per_month": 500000,
      "models": ["vlinders-gpt-4", "vlinders-gpt-3.5", "vlinders-claude-3"],
      "priority_support": true,
      "api_access": true
    }
  }
}
```

### 2. 创建订阅

```http
POST /v1/subscription
```

#### 请求体

```json
{
  "plan": "pro",
  "payment_method": "pm_1234567890",
  "billing_cycle": "monthly"
}
```

#### 响应格式

```json
{
  "subscription": {
    "id": "sub_1234567890",
    "status": "active",
    "plan": "pro",
    "current_period_start": "2026-02-28T00:00:00Z",
    "current_period_end": "2026-03-28T00:00:00Z"
  },
  "invoice": {
    "id": "inv_1234567890",
    "amount": 9.99,
    "currency": "USD",
    "status": "paid",
    "invoice_url": "https://vlinders.org/invoices/inv_1234567890"
  }
}
```

### 3. 更新订阅

```http
PUT /v1/subscription
```

#### 请求体

```json
{
  "plan": "team",
  "proration_behavior": "create_prorations"
}
```

### 4. 取消订阅

```http
DELETE /v1/subscription
```

#### 请求体

```json
{
  "cancel_at_period_end": true,
  "reason": "switching_service"
}
```

### 5. 获取发票列表

```http
GET /v1/subscription/invoices
```

#### 响应格式

```json
{
  "invoices": [
    {
      "id": "inv_1234567890",
      "amount": 9.99,
      "currency": "USD",
      "status": "paid",
      "period_start": "2026-02-01T00:00:00Z",
      "period_end": "2026-03-01T00:00:00Z",
      "invoice_url": "https://vlinders.org/invoices/inv_1234567890",
      "created_at": "2026-02-01T00:00:00Z"
    }
  ]
}
```

---

## 💰 订阅计划

### Free 计划

```json
{
  "id": "free",
  "name": "Free",
  "price": 0,
  "currency": "USD",
  "interval": "month",
  "features": {
    "requests_per_month": 100,
    "tokens_per_month": 50000,
    "models": ["vlinders-gpt-3.5"],
    "priority_support": false,
    "api_access": true,
    "rate_limit": {
      "requests_per_minute": 3,
      "tokens_per_minute": 40000
    }
  }
}
```

### Pro 计划 ($9.99/月)

```json
{
  "id": "pro",
  "name": "Pro",
  "price": 9.99,
  "currency": "USD",
  "interval": "month",
  "features": {
    "requests_per_month": 1000,
    "tokens_per_month": 500000,
    "models": ["vlinders-gpt-4", "vlinders-gpt-3.5", "vlinders-claude-3"],
    "priority_support": true,
    "api_access": true,
    "rate_limit": {
      "requests_per_minute": 60,
      "tokens_per_minute": 200000
    }
  }
}
```

### Team 计划 ($29.99/月)

```json
{
  "id": "team",
  "name": "Team",
  "price": 29.99,
  "currency": "USD",
  "interval": "month",
  "features": {
    "requests_per_month": -1,
    "tokens_per_month": -1,
    "models": ["all"],
    "priority_support": true,
    "api_access": true,
    "team_members": 5,
    "rate_limit": {
      "requests_per_minute": -1,
      "tokens_per_minute": 500000
    }
  }
}
```

---

## 📊 数据库设计

### subscriptions 表

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at INTEGER,
  stripe_subscription_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### invoices 表

```sql
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  stripe_invoice_id TEXT,
  invoice_url TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

---

## 🚀 实施步骤

### 阶段 1: 基础订阅（第 1 周）

1. ✅ 实现订阅 CRUD 端点
2. ✅ 集成 Stripe
3. ✅ 实现计划管理

### 阶段 2: 计费逻辑（第 2 周）

1. ✅ 实现按量计费
2. ✅ 实现配额检查
3. ✅ 发票生成

---

**下一步**: 实施 [07-使用量统计API.md](./07-使用量统计API.md)
