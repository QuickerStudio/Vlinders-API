# 模型管理 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

模型管理 API 提供可用模型的信息查询，包括模型能力、限制、定价等。

### 设计目标

1. **透明性**: 清晰展示模型能力和限制
2. **动态性**: 支持动态添加新模型
3. **兼容性**: 兼容 OpenAI Models API

---

## 🌐 API 端点

### 1. 列出所有模型

```http
GET /v1/models
```

#### 响应格式

```json
{
  "object": "list",
  "data": [
    {
      "id": "vlinders-gpt-4",
      "object": "model",
      "created": 1709107200,
      "owned_by": "vlinders",
      "permission": [],
      "root": "vlinders-gpt-4",
      "parent": null
    },
    {
      "id": "vlinders-gpt-3.5",
      "object": "model",
      "created": 1709107200,
      "owned_by": "vlinders",
      "permission": [],
      "root": "vlinders-gpt-3.5",
      "parent": null
    }
  ]
}
```

### 2. 获取模型详情

```http
GET /v1/models/{model_id}
```

#### 响应格式

```json
{
  "id": "vlinders-gpt-4",
  "name": "Vlinders GPT-4",
  "object": "model",
  "created": 1709107200,
  "owned_by": "vlinders",
  "model_picker_enabled": true,
  "preview": false,
  "is_chat_default": true,
  "is_chat_fallback": false,
  "version": "1.0.0",
  "capabilities": {
    "type": "chat",
    "family": "gpt-4.1",
    "tokenizer": "cl100k_base",
    "limits": {
      "max_prompt_tokens": 128000,
      "max_output_tokens": 4096,
      "max_context_window_tokens": 128000,
      "vision": {
        "max_prompt_images": 10
      }
    },
    "supports": {
      "streaming": true,
      "tool_calls": true,
      "parallel_tool_calls": true,
      "vision": true,
      "prediction": false,
      "thinking": false
    }
  },
  "supported_endpoints": [
    "/chat/completions",
    "/v1/messages"
  ],
  "billing": {
    "is_premium": true,
    "multiplier": 1.0,
    "pricing": {
      "input_tokens": 0.00003,
      "output_tokens": 0.00006,
      "currency": "USD"
    }
  },
  "warning_messages": [],
  "info_messages": [
    {
      "code": "model_updated",
      "message": "This model was updated on 2026-02-01"
    }
  ]
}
```

---

## 🎯 模型列表

### 聊天模型

| 模型 ID | 名称 | 上下文 | 输出 | 特性 | 定价（输入/输出）|
|---------|------|--------|------|------|-----------------|
| `vlinders-gpt-4` | Vlinders GPT-4 | 128K | 4K | 工具、视觉 | $0.03/$0.06 per 1K |
| `vlinders-gpt-4-turbo` | Vlinders GPT-4 Turbo | 128K | 4K | 工具、视觉、更快 | $0.01/$0.03 per 1K |
| `vlinders-gpt-3.5` | Vlinders GPT-3.5 | 16K | 4K | 工具 | $0.0005/$0.0015 per 1K |
| `vlinders-claude-3` | Vlinders Claude 3 | 200K | 4K | 工具、长上下文 | $0.015/$0.075 per 1K |
| `vlinders-claude-3-haiku` | Vlinders Claude 3 Haiku | 200K | 4K | 快速、经济 | $0.00025/$0.00125 per 1K |

### 代码模型

| 模型 ID | 名称 | 上下文 | 输出 | 用途 |
|---------|------|--------|------|------|
| `vlinders-code` | Vlinders Code | 8K | 2K | 代码补全 |
| `vlinders-code-instruct` | Vlinders Code Instruct | 16K | 4K | 代码生成 |

### 嵌入模型

| 模型 ID | 维度 | 最大输入 | 定价 |
|---------|------|---------|------|
| `vlinders-embedding-3-small` | 1536 | 8191 | $0.00002 per 1K |
| `vlinders-embedding-3-large` | 3072 | 8191 | $0.00013 per 1K |
| `vlinders-code-embedding` | 768 | 4096 | $0.00001 per 1K |

---

## 📊 数据库设计

### models 表

```sql
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'chat', 'completion', 'embedding'
  family TEXT NOT NULL,
  capabilities TEXT NOT NULL,      -- JSON
  supported_endpoints TEXT NOT NULL, -- JSON array
  billing TEXT NOT NULL,           -- JSON
  enabled BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 🚀 实施步骤

### 阶段 1: 基础实现（第 1 周）

1. ✅ 实现 `/v1/models` 端点
2. ✅ 实现 `/v1/models/{id}` 端点
3. ✅ 创建模型配置系统

### 阶段 2: 动态管理（第 2 周）

1. ✅ 支持动态添加模型
2. ✅ 模型版本管理
3. ✅ A/B 测试支持

---

## 📚 客户端集成示例

```typescript
export class VlindersModels {
  async list(): Promise<Model[]> {
    const response = await fetch('https://api.vlinders.org/v1/models', {
      headers: {
        'Authorization': await this.auth.getAuthHeader()
      }
    });
    const data = await response.json();
    return data.data;
  }

  async get(modelId: string): Promise<ModelDetail> {
    const response = await fetch(`https://api.vlinders.org/v1/models/${modelId}`, {
      headers: {
        'Authorization': await this.auth.getAuthHeader()
      }
    });
    return response.json();
  }
}
```

---

**下一步**: 实施 [06-订阅与计费API.md](./06-订阅与计费API.md)
