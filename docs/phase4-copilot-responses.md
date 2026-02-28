# Phase 4 - Copilot Responses API 实现

## 概述

Phase 4 实现了完整的 Copilot Responses API，包括上下文管理、状态标记、推理配置等高级功能。

## 核心组件

### 1. 类型定义 (`src/types/copilot.ts`)

定义了 Responses API 的所有类型：

- **ResponsesRequest**: 扩展标准聊天请求，添加 Responses API 特有字段
- **ResponseInputItem**: 输入项类型（消息、函数调用、推理数据等）
- **ContextManagementConfig**: 上下文管理配置
- **ReasoningConfig**: 推理配置
- **ThinkingData**: 思考/推理数据
- **StatefulMarkerWithModel**: 状态标记

### 2. 上下文管理器 (`src/services/copilot/contextManager.ts`)

处理上下文管理相关功能：

- `extractCompactionData()`: 从消息中提取压缩数据
- `extractStatefulMarker()`: 提取状态标记
- `extractThinkingData()`: 提取思考数据
- `extractPhaseData()`: 提取阶段数据
- `applyContextManagement()`: 应用上下文管理配置
- `getLatestCompactionMessageIndex()`: 查找最新压缩消息

### 3. 消息转换器 (`src/services/copilot/transformer.ts`)

将标准聊天消息转换为 Responses API 格式：

- `rawMessagesToResponseAPI()`: 主转换函数
- `transformAssistantMessage()`: 转换助手消息
- `transformToolMessage()`: 转换工具消息
- `transformUserMessage()`: 转换用户消息
- `transformSystemMessage()`: 转换系统消息

### 4. Copilot 客户端 (`src/services/copilot/client.ts`)

核心客户端实现：

```typescript
const client = new CopilotClient({
  baseURL: 'https://api.githubcopilot.com',
  token: 'your-token',
  modelFamily: 'gpt-5.3-codex-spark-preview',
  modelMaxPromptTokens: 128000,
  enableContextManagement: true,
  enableReasoning: true,
  reasoningEffort: 'medium',
  reasoningSummary: 'auto',
});
```

**功能**：
- `createResponse()`: 非流式请求
- `createResponseStream()`: 流式请求
- 自动处理上下文管理
- 自动处理推理配置
- 自动转换消息格式

### 5. API 路由 (`src/routes/responses.ts`)

提供 HTTP 端点：

```
POST /v1/responses/completions
```

支持流式和非流式响应。

## 关键特性

### 上下文管理（Context Management）

自动压缩历史对话以节省 token：

```typescript
context_management: [{
  type: 'compaction',
  compact_threshold: 115200  // 90% of max tokens
}]
```

### 状态标记（Stateful Marker）

支持有状态的对话延续：

```typescript
{
  previous_response_id: 'resp_abc123',
  input: [...]
}
```

### 推理配置（Reasoning）

控制模型推理行为：

```typescript
reasoning: {
  effort: 'medium',      // low | medium | high
  summary: 'auto'        // auto | concise | detailed | off
}
```

### 思考数据（Thinking Data）

保存和传递模型的思考过程：

```typescript
{
  type: 'reasoning',
  id: 'reasoning_123',
  summary: [...],
  encrypted_content: '...'
}
```

## 使用示例

### 基础用法

```typescript
import { CopilotClient } from './services/copilot';

const client = new CopilotClient({
  baseURL: 'https://api.githubcopilot.com',
  token: process.env.COPILOT_TOKEN,
  modelFamily: 'gpt-5.3-codex-spark-preview',
});

const response = await client.createResponse({
  model: 'gpt-5.3-codex-spark-preview',
  messages: [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Hello!' }]
    }
  ],
  max_tokens: 1000,
});
```

### 流式响应

```typescript
for await (const chunk of client.createResponseStream(request)) {
  const delta = chunk.choices[0]?.delta;
  if (delta?.content) {
    process.stdout.write(delta.content);
  }
}
```

### 多轮对话

```typescript
const messages = [
  { role: 'user', content: [{ type: 'text', text: 'What is TypeScript?' }] }
];

let response = await client.createResponse({
  model: 'gpt-5.3-codex-spark-preview',
  messages,
});

messages.push(response.choices[0].message);
messages.push({
  role: 'user',
  content: [{ type: 'text', text: 'Give me an example.' }]
});

response = await client.createResponse({
  model: 'gpt-5.3-codex-spark-preview',
  messages,
});
```

### 工具调用

```typescript
const response = await client.createResponse({
  model: 'gpt-5.3-codex-spark-preview',
  messages: [...],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          },
          required: ['location']
        }
      }
    }
  ],
  tool_choice: 'auto',
});
```

## API 端点

### POST /v1/responses/completions

**请求体**：

```json
{
  "model": "gpt-5.3-codex-spark-preview",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Hello!" }
      ]
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**响应**：

```json
{
  "id": "response-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-5.3-codex-spark-preview",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": [
          { "type": "text", "text": "Hello! How can I help you?" }
        ]
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## 配置选项

### CopilotClientConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `baseURL` | string | - | API 基础 URL |
| `token` | string | - | API 令牌 |
| `modelFamily` | string | - | 模型系列 |
| `modelMaxPromptTokens` | number | 50000 | 最大提示 token 数 |
| `enableContextManagement` | boolean | true | 启用上下文管理 |
| `enableReasoning` | boolean | true | 启用推理 |
| `reasoningEffort` | string | 'medium' | 推理努力程度 |
| `reasoningSummary` | string | 'auto' | 推理摘要模式 |
| `enableTruncation` | boolean | false | 启用截断 |

## 与 Vlinder-chat 的对比

本实现完整参考了 Vlinder-chat 的以下文件：

1. **responsesApi.ts**: 核心 Responses API 逻辑
2. **compactionDataContainer.tsx**: 压缩数据处理
3. **statefulMarkerContainer.tsx**: 状态标记处理
4. **thinkingDataContainer.tsx**: 思考数据处理
5. **phaseDataContainer.tsx**: 阶段数据处理

主要改进：

- 使用 TypeScript 严格类型
- 简化的 API 设计
- 更好的错误处理
- 完整的文档和示例

## 测试

参考 `src/examples/copilot-usage.ts` 查看完整的使用示例。

## 下一步

Phase 5 将实现 Anthropic Messages API，提供对 Claude 模型的支持。
