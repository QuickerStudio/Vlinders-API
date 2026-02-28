# 使用量统计 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

使用量统计 API 提供用户的 API 使用情况查询，包括请求次数、Token 消耗、成本分析等。

### 设计目标

1. **实时性**: 近实时的使用量更新
2. **详细性**: 多维度的统计数据
3. **可视化**: 支持图表展示
4. **导出**: 支持数据导出

---

## 🌐 API 端点

### 1. 获取使用量概览

```http
GET /v1/usage
```

#### 查询参数

```
start_date: 2026-02-01
end_date: 2026-02-28
granularity: day  # hour, day, week, month
```

#### 响应格式

```json
{
  "period": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-28T23:59:59Z"
  },
  "summary": {
    "total_requests": 450,
    "total_tokens": 125000,
    "total_cost": 3.75,
    "currency": "USD"
  },
  "quota": {
    "requests_used": 450,
    "requests_limit": 1000,
    "requests_remaining": 550,
    "tokens_used": 125000,
    "tokens_limit": 500000,
    "tokens_remaining": 375000,
    "reset_at": "2026-03-01T00:00:00Z"
  },
  "by_model": [
    {
      "model": "vlinders-gpt-4",
      "requests": 300,
      "tokens": 100000,
      "cost": 3.00
    },
    {
      "model": "vlinders-gpt-3.5",
      "requests": 150,
      "tokens": 25000,
      "cost": 0.75
    }
  ],
  "by_endpoint": [
    {
      "endpoint": "/v1/chat/completions",
      "requests": 400,
      "tokens": 120000
    },
    {
      "endpoint": "/v1/completions",
      "requests": 50,
      "tokens": 5000
    }
  ],
  "timeline": [
    {
      "date": "2026-02-01",
      "requests": 15,
      "tokens": 4200,
      "cost": 0.13
    },
    {
      "date": "2026-02-02",
      "requests": 18,
      "tokens": 5100,
      "cost": 0.15
    }
  ]
}
```

### 2. 获取详细日志

```http
GET /v1/usage/logs
```

#### 查询参数

```
start_date: 2026-02-01
end_date: 2026-02-28
model: vlinders-gpt-4
endpoint: /v1/chat/completions
limit: 100
offset: 0
```

#### 响应格式

```json
{
  "logs": [
    {
      "id": "log_1234567890",
      "timestamp": "2026-02-28T10:30:00Z",
      "endpoint": "/v1/chat/completions",
      "model": "vlinders-gpt-4",
      "prompt_tokens": 250,
      "completion_tokens": 150,
      "total_tokens": 400,
      "cost": 0.012,
      "duration_ms": 1250,
      "status": "success"
    }
  ],
  "pagination": {
    "total": 450,
    "limit": 100,
    "offset": 0,
    "has_more": true
  }
}
```

### 3. 导出使用数据

```http
GET /v1/usage/export
```

#### 查询参数

```
start_date: 2026-02-01
end_date: 2026-02-28
format: csv  # csv, json, xlsx
```

#### 响应

返回文件下载链接或直接返回文件内容。

---

## 📊 数据库设计

### usage_logs 表

```sql
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost REAL NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX idx_usage_logs_model ON usage_logs(model);
```

### usage_aggregates 表（用于快速查询）

```sql
CREATE TABLE usage_aggregates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,              -- YYYY-MM-DD
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  requests INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  total_cost REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_usage_aggregates_unique
  ON usage_aggregates(user_id, date, model, endpoint);
```

---

## 🚀 实施步骤

### 阶段 1: 基础统计（第 1 周）

1. ✅ 实现使用量记录
2. ✅ 实现概览查询
3. ✅ 实现配额检查

### 阶段 2: 高级功能（第 2 周）

1. ✅ 实现详细日志查询
2. ✅ 实现数据聚合
3. ✅ 实现数据导出

---

## 📚 客户端集成示例

```typescript
export class VlindersUsage {
  async getOverview(startDate: string, endDate: string): Promise<UsageOverview> {
    const response = await fetch(
      `https://api.vlinders.org/v1/usage?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          'Authorization': await this.auth.getAuthHeader()
        }
      }
    );
    return response.json();
  }

  async checkQuota(): Promise<QuotaInfo> {
    const response = await fetch('https://api.vlinders.org/v1/usage', {
      headers: {
        'Authorization': await this.auth.getAuthHeader()
      }
    });
    const data = await response.json();
    return data.quota;
  }
}
```

---

**下一步**: 实施 [08-Agent工具调用API.md](./08-Agent工具调用API.md)
