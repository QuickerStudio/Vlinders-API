# 聊天对话 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

聊天对话 API 是 Vlinders API 的核心功能，提供 AI 驱动的多轮对话能力。支持流式和非流式响应，兼容多种 API 格式。

### 设计目标

1. **兼容性**: 兼容 OpenAI、Anthropic、Copilot 多种 API 格式
2. **流式响应**: 支持 Server-Sent Events (SSE) 实时流式输出
3. **工具调用**: 支持 Function Calling 和 Tool Use
4. **上下文管理**: 智能管理对话历史和 Token 使用
5. **多模态**: 支持文本和图片输入（视觉模型）
6. **Agent 编排**: 支持复杂任务的 Agent 自动编排和执行

### 参考 Copilot API

Copilot API 支持三种端点格式：
1. `/chat/completions` - OpenAI 兼容格式
2. `/responses` - Copilot 专有格式
3. `/v1/messages` - Anthropic Messages API
4. `/agents/*` - Agent 编排 API（Vlinders 扩展）

Vlinders API 将实现所有格式以确保最大兼容性，并扩展 Agent API 支持复杂任务编排。

---

## 🌐 API 端点

### 1. 聊天补全（OpenAI 格式）

```http
POST /v1/chat/completions
```

这是最常用的端点，兼容 OpenAI API 格式。

#### 请求体

```json
{
  "model": "vlinders-gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful coding assistant."
    },
    {
      "role": "user",
      "content": "Write a function to calculate fibonacci numbers"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_code",
        "description": "Search for code in the repository",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The search query"
            }
          },
          "required": ["query"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

#### 请求参数详解

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `model` | string | ✅ | - | 模型 ID |
| `messages` | array | ✅ | - | 对话消息列表 |
| `temperature` | number | ❌ | 0.7 | 采样温度 (0-2) |
| `max_tokens` | number | ❌ | 4096 | 最大生成 tokens |
| `stream` | boolean | ❌ | false | 是否流式响应 |
| `top_p` | number | ❌ | 1.0 | 核采样参数 |
| `frequency_penalty` | number | ❌ | 0 | 频率惩罚 (-2 到 2) |
| `presence_penalty` | number | ❌ | 0 | 存在惩罚 (-2 到 2) |
| `stop` | string/array | ❌ | null | 停止序列 |
| `n` | number | ❌ | 1 | 生成的响应数量 |
| `tools` | array | ❌ | null | 可用工具列表 |
| `tool_choice` | string/object | ❌ | "auto" | 工具选择策略 |

#### 消息格式

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;           // 用户或工具名称
  tool_calls?: ToolCall[]; // 助手调用的工具
  tool_call_id?: string;   // 工具响应的 ID
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;           // 图片 URL 或 base64
    detail?: 'auto' | 'low' | 'high';
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;     // JSON 字符串
  };
}
```

#### 非流式响应 (stream: false)

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1709107200,
  "model": "vlinders-gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's a function to calculate Fibonacci numbers:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 50,
    "total_tokens": 75
  }
}
```

#### 流式响应 (stream: true)

使用 Server-Sent Events (SSE) 格式：

```
data: {"id":"chatcmpl-1234567890","object":"chat.completion.chunk","created":1709107200,"model":"vlinders-gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-1234567890","object":"chat.completion.chunk","created":1709107200,"model":"vlinders-gpt-4","choices":[{"index":0,"delta":{"content":"Here"},"finish_reason":null}]}

data: {"id":"chatcmpl-1234567890","object":"chat.completion.chunk","created":1709107200,"model":"vlinders-gpt-4","choices":[{"index":0,"delta":{"content":"'s"},"finish_reason":null}]}

data: {"id":"chatcmpl-1234567890","object":"chat.completion.chunk","created":1709107200,"model":"vlinders-gpt-4","choices":[{"index":0,"delta":{"content":" a"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-1234567890","object":"chat.completion.chunk","created":1709107200,"model":"vlinders-gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":25,"completion_tokens":50,"total_tokens":75}}

data: [DONE]
```

#### 工具调用响应

当模型决定调用工具时：

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1709107200,
  "model": "vlinders-gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "search_code",
              "arguments": "{\"query\":\"fibonacci function\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 20,
    "total_tokens": 70
  }
}
```

客户端需要执行工具，然后将结果添加到对话中：

```json
{
  "model": "vlinders-gpt-4",
  "messages": [
    // ... 之前的消息
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "search_code",
            "arguments": "{\"query\":\"fibonacci function\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "Found 3 implementations of fibonacci function..."
    }
  ]
}
```

---

### 2. Copilot 响应格式

```http
POST /v1/responses
```

这是 Copilot 专有格式，用于兼容旧版客户端。

#### 请求体

```json
{
  "model": "vlinders-gpt-4",
  "messages": [
    {
      "role": "user",
      "content": "Write a fibonacci function"
    }
  ],
  "intent": true,
  "n": 1,
  "stream": true,
  "temperature": 0.1
}
```

#### 响应格式

```json
{
  "id": "resp_1234567890",
  "model": "vlinders-gpt-4",
  "created": 1709107200,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's a fibonacci function..."
      },
      "finish_reason": "stop"
    }
  ]
}
```

---

### 3. Anthropic Messages 格式

```http
POST /v1/messages
```

兼容 Anthropic Claude API 格式。

#### 请求体

```json
{
  "model": "vlinders-claude-3",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Write a fibonacci function"
    }
  ],
  "system": "You are a helpful coding assistant.",
  "temperature": 0.7,
  "stream": true
}
```

#### 响应格式

```json
{
  "id": "msg_1234567890",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Here's a fibonacci function..."
    }
  ],
  "model": "vlinders-claude-3",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 25,
    "output_tokens": 50
  }
}
```

#### 流式响应

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_1234567890","type":"message","role":"assistant","content":[],"model":"vlinders-claude-3"}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Here"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"'s"}}

...

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":50}}

event: message_stop
data: {"type":"message_stop"}
```

---

## 🎯 支持的模型

### 模型列表

| 模型 ID | 名称 | 上下文窗口 | 输出限制 | 特性 |
|---------|------|-----------|---------|------|
| `vlinders-gpt-4` | Vlinders GPT-4 | 128K | 4K | 工具调用、视觉 |
| `vlinders-gpt-4-turbo` | Vlinders GPT-4 Turbo | 128K | 4K | 工具调用、视觉、更快 |
| `vlinders-gpt-3.5` | Vlinders GPT-3.5 | 16K | 4K | 工具调用 |
| `vlinders-claude-3` | Vlinders Claude 3 | 200K | 4K | 工具调用、长上下文 |
| `vlinders-claude-3-haiku` | Vlinders Claude 3 Haiku | 200K | 4K | 快速、经济 |

### 模型能力

```typescript
interface ModelCapabilities {
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_parallel_tools: boolean;
  max_context_tokens: number;
  max_output_tokens: number;
}
```

---

## 🔧 高级功能

### 1. 视觉输入（多模态）

支持图片输入的模型可以分析图片内容：

```json
{
  "model": "vlinders-gpt-4",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What's in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

支持的图片格式：
- URL: `https://...`
- Base64: `data:image/jpeg;base64,/9j/4AAQ...`

### 2. 并行工具调用

模型可以同时调用多个工具：

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "search_code",
        "arguments": "{\"query\":\"fibonacci\"}"
      }
    },
    {
      "id": "call_2",
      "type": "function",
      "function": {
        "name": "read_file",
        "arguments": "{\"path\":\"utils.py\"}"
      }
    }
  ]
}
```

### 3. 思维链（Thinking）

某些模型支持显式的思维过程：

```json
{
  "model": "vlinders-claude-3",
  "messages": [...],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 1000
  }
}
```

响应中会包含思维过程：

```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me break down this problem..."
    },
    {
      "type": "text",
      "text": "Here's the solution..."
    }
  ]
}
```

### 4. 响应格式控制

强制模型输出 JSON：

```json
{
  "model": "vlinders-gpt-4",
  "messages": [...],
  "response_format": {
    "type": "json_object"
  }
}
```

---

## 🛡️ 安全和限制

### 1. 内容过滤

所有请求和响应都会经过内容安全检查：

```typescript
interface ContentFilterResult {
  hate: 'safe' | 'low' | 'medium' | 'high';
  self_harm: 'safe' | 'low' | 'medium' | 'high';
  sexual: 'safe' | 'low' | 'medium' | 'high';
  violence: 'safe' | 'low' | 'medium' | 'high';
}
```

如果检测到不安全内容，返回错误：

```json
{
  "error": {
    "code": "content_filter",
    "message": "Your request was rejected due to content policy",
    "type": "invalid_request_error"
  }
}
```

### 2. Token 限制

每个请求的 Token 数量受限：

```typescript
// 检查 Token 数量
const promptTokens = countTokens(messages);
if (promptTokens > model.max_context_tokens) {
  return error('prompt_too_long');
}

if (max_tokens > model.max_output_tokens) {
  max_tokens = model.max_output_tokens;
}
```

### 3. 速率限制

基于用户订阅计划的速率限制：

| 计划 | 请求/分钟 | 请求/天 | Token/分钟 |
|------|----------|---------|-----------|
| Free | 3 | 100 | 40K |
| Pro | 60 | 1000 | 200K |
| Team | 无限 | 无限 | 500K |

超出限制时返回：

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again in 30 seconds.",
    "type": "rate_limit_error",
    "retry_after": 30
  }
}
```

### 4. 超时控制

```typescript
// 非流式请求：30 秒超时
// 流式请求：60 秒超时（首个 token）

const timeout = stream ? 60000 : 30000;
```

---

## 📊 数据库设计

### conversations 表

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,              -- conv_1234567890
  user_id TEXT NOT NULL,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
```

### messages 表

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,              -- msg_1234567890
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,               -- 'system', 'user', 'assistant', 'tool'
  content TEXT NOT NULL,
  tool_calls TEXT,                  -- JSON
  tool_call_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

### chat_requests 表（用于分析和监控）

```sql
CREATE TABLE chat_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  stream BOOLEAN NOT NULL,
  finish_reason TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_requests_user_id ON chat_requests(user_id);
CREATE INDEX idx_chat_requests_created_at ON chat_requests(created_at);
```

### agent_executions 表（Agent 执行记录）

```sql
CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY,              -- agent_1234567890
  user_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,         -- 'plan', 'explore', 'edit', 'search'
  instruction TEXT NOT NULL,
  workspace TEXT NOT NULL,
  status TEXT NOT NULL,             -- 'pending', 'running', 'completed', 'failed', 'timeout'
  iterations INTEGER,
  tokens_used INTEGER,
  duration_ms INTEGER,
  success BOOLEAN,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at);
```

### agent_tool_calls 表（Agent 工具调用记录）

```sql
CREATE TABLE agent_tool_calls (
  id TEXT PRIMARY KEY,
  agent_execution_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  arguments TEXT NOT NULL,          -- JSON
  result TEXT,                      -- JSON
  success BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_execution_id) REFERENCES agent_executions(id)
);

CREATE INDEX idx_agent_tool_calls_execution_id ON agent_tool_calls(agent_execution_id);
CREATE INDEX idx_agent_tool_calls_tool_name ON agent_tool_calls(tool_name);
```

### agent_sub_agents 表（子 Agent 记录）

```sql
CREATE TABLE agent_sub_agents (
  id TEXT PRIMARY KEY,
  parent_agent_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  instruction TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  iterations INTEGER,
  tokens_used INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_agent_id) REFERENCES agent_executions(id)
);

CREATE INDEX idx_agent_sub_agents_parent_id ON agent_sub_agents(parent_agent_id);
```

---

## 🧪 测试用例

### 1. 基础聊天测试

```typescript
describe('Chat Completions', () => {
  it('should return non-streaming response', async () => {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-gpt-4',
        messages: [
          { role: 'user', content: 'Say hello' }
        ],
        stream: false
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.choices[0].message.content).toContain('hello');
  });

  it('should return streaming response', async () => {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-gpt-4',
        messages: [
          { role: 'user', content: 'Count to 5' }
        ],
        stream: true
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('data:');
  });
});
```

### 2. 工具调用测试

```typescript
describe('Tool Calling', () => {
  it('should call tools when needed', async () => {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-gpt-4',
        messages: [
          { role: 'user', content: 'Search for fibonacci function' }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_code',
              description: 'Search code',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string' }
                }
              }
            }
          }
        ]
      })
    });

    const data = await response.json();
    expect(data.choices[0].finish_reason).toBe('tool_calls');
    expect(data.choices[0].message.tool_calls).toBeDefined();
    expect(data.choices[0].message.tool_calls[0].function.name).toBe('search_code');
  });
});
```

### 3. 视觉输入测试

```typescript
describe('Vision Input', () => {
  it('should analyze image', async () => {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-gpt-4',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this image?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,/9j/4AAQ...'
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    expect(data.choices[0].message.content).toBeDefined();
  });
});
```

### 4. Agent API 测试

```typescript
describe('Agent API', () => {
  it('should invoke plan agent', async () => {
    const response = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'plan',
        instruction: '重构认证系统',
        workspace: '/test/project',
        stream: false
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.agent_type).toBe('plan');
    expect(data.response).toBeDefined();
    expect(data.tool_calls).toBeInstanceOf(Array);
    expect(data.iterations).toBeGreaterThan(0);
  });

  it('should invoke explore agent with streaming', async () => {
    const response = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'explore',
        instruction: '找到所有认证相关代码',
        workspace: '/test/project',
        stream: true
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let events = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          events.push(line.slice(7));
        }
      }
    }

    expect(events).toContain('agent_start');
    expect(events).toContain('agent_end');
  });

  it('should create and execute sub-agents', async () => {
    const response = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'plan',
        instruction: '重构认证系统',
        workspace: '/test/project',
        config: {
          enable_sub_agents: true
        }
      })
    });

    const data = await response.json();
    expect(data.sub_agents).toBeDefined();
    expect(data.sub_agents.length).toBeGreaterThan(0);

    // 验证子 Agent 结果
    for (const subAgent of data.sub_agents) {
      expect(subAgent.agent_id).toBeDefined();
      expect(subAgent.agent_type).toBeDefined();
      expect(subAgent.success).toBe(true);
    }
  });

  it('should query agent status', async () => {
    // 先创建一个 Agent
    const createResponse = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'explore',
        instruction: '搜索代码',
        workspace: '/test/project'
      })
    });

    const createData = await createResponse.json();
    const agentId = createData.id;

    // 查询状态
    const statusResponse = await fetch(`/v1/agents/status/${agentId}`, {
      headers: {
        'Authorization': 'Bearer test_key'
      }
    });

    expect(statusResponse.status).toBe(200);
    const statusData = await statusResponse.json();
    expect(statusData.id).toBe(agentId);
    expect(statusData.status).toBeDefined();
    expect(['pending', 'running', 'completed', 'failed']).toContain(statusData.status);
  });

  it('should handle agent errors gracefully', async () => {
    const response = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'invalid_type',
        instruction: 'test',
        workspace: '/test/project'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('invalid_agent_type');
  });

  it('should respect token limits', async () => {
    const response = await fetch('/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: 'plan',
        instruction: '复杂任务',
        workspace: '/test/project',
        config: {
          max_tokens: 1000  // 很小的限制
        }
      })
    });

    const data = await response.json();
    expect(data.tokens_used).toBeLessThanOrEqual(1000);
  });
});
```

---

## 🚀 实施步骤

### 阶段 1: 基础聊天（第 1 周）

1. ✅ 实现 `/v1/chat/completions` 端点
2. ✅ 支持非流式响应
3. ✅ 集成 OpenAI API
4. ✅ 实现 Token 计数

### 阶段 2: 流式响应（第 2 周）

1. ✅ 实现 SSE 流式输出
2. ✅ 处理流式错误
3. ✅ 优化流式性能

### 阶段 3: 工具调用（第 3 周）

1. ✅ 实现工具定义解析
2. ✅ 实现工具调用响应
3. ✅ 支持并行工具调用

### 阶段 4: 多格式支持（第 4 周）

1. ✅ 实现 `/v1/responses` 端点
2. ✅ 实现 `/v1/messages` 端点
3. ✅ 格式转换层

### 阶段 5: 高级功能（第 5 周）

1. ✅ 视觉输入支持
2. ✅ 思维链支持
3. ✅ 响应格式控制

### 阶段 6: Agent API（第 6 周）

1. ✅ 实现 `/v1/agents/invoke` 端点
2. ✅ 实现 Agent 流式响应
3. ✅ 实现子 Agent 调用
4. ✅ 实现 Agent 状态查询
5. ✅ 集成 Vlinders-Server Agent 编排系统
6. ✅ 实现工具调用转发
7. ✅ 实现 Agent 使用量统计

---

## 🤖 Agent 调用 API

### 概述

Agent API 提供了对 Vlinders-Server Agent 编排系统的访问能力。支持多种 Agent 类型（plan、explore、edit、search），可以执行复杂的代码分析、搜索和编辑任务。

### 4. Agent 调用端点

```http
POST /v1/agents/invoke
```

调用 Agent 执行任务。

#### 请求体

```json
{
  "agent_type": "plan",
  "instruction": "重构整个认证系统，使用 JWT 替换 Session",
  "workspace": "/path/to/project",
  "context": {
    "history": [],
    "metadata": {}
  },
  "config": {
    "max_iterations": 10,
    "max_tokens": 100000,
    "temperature": 0.7,
    "parallel_tools": true,
    "enable_sub_agents": true,
    "timeout": 300
  },
  "stream": false
}
```

#### 请求参数详解

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `agent_type` | string | ✅ | - | Agent 类型 (plan/explore/edit/search) |
| `instruction` | string | ✅ | - | 任务指令 |
| `workspace` | string | ✅ | - | 工作空间路径 |
| `context` | object | ❌ | {} | 上下文信息 |
| `context.history` | array | ❌ | [] | 对话历史 |
| `context.metadata` | object | ❌ | {} | 元数据 |
| `config` | object | ❌ | - | Agent 配置 |
| `config.max_iterations` | number | ❌ | 10 | 最大迭代次数 |
| `config.max_tokens` | number | ❌ | 100000 | Token 预算 |
| `config.temperature` | number | ❌ | 0.7 | 生成温度 |
| `config.parallel_tools` | boolean | ❌ | true | 是否并行执行工具 |
| `config.enable_sub_agents` | boolean | ❌ | true | 是否启用子 Agent |
| `config.timeout` | number | ❌ | 300 | 超时时间（秒） |
| `stream` | boolean | ❌ | false | 是否流式响应 |

#### Agent 类型说明

| Agent 类型 | 说明 | 使用场景 |
|-----------|------|---------|
| `plan` | 规划型 Agent | 复杂任务分解、多步骤规划 |
| `explore` | 探索型 Agent | 代码库搜索、依赖分析 |
| `edit` | 编辑型 Agent | 代码修改、重构 |
| `search` | 搜索型 Agent | 快速搜索、精确匹配 |

#### 非流式响应

```json
{
  "id": "agent_1234567890",
  "object": "agent.result",
  "created": 1709107200,
  "agent_type": "plan",
  "success": true,
  "response": "认证系统重构完成！\n\n## 执行摘要:\n1. ✅ 搜索并分析了 15 个认证相关文件\n2. ✅ 创建了 JWT 工具函数\n...",
  "tool_calls": [
    {
      "id": "call_abc123",
      "tool_name": "search_code",
      "arguments": {
        "pattern": "login"
      },
      "result": {
        "success": true,
        "output": "Found 5 matches..."
      },
      "duration_ms": 120
    }
  ],
  "sub_agents": [
    {
      "agent_id": "agent_sub_001",
      "agent_type": "explore",
      "instruction": "搜索所有认证相关代码",
      "success": true,
      "iterations": 3,
      "tokens_used": 5230
    },
    {
      "agent_id": "agent_sub_002",
      "agent_type": "edit",
      "instruction": "实现 JWT 工具函数",
      "success": true,
      "iterations": 2,
      "tokens_used": 3120
    }
  ],
  "iterations": 3,
  "tokens_used": 45230,
  "duration_ms": 12500,
  "usage": {
    "prompt_tokens": 25000,
    "completion_tokens": 20230,
    "total_tokens": 45230
  }
}
```

#### 流式响应 (stream: true)

使用 Server-Sent Events (SSE) 格式，实时推送 Agent 执行进度：

```
event: agent_start
data: {"id":"agent_1234567890","agent_type":"plan","created":1709107200}

event: iteration_start
data: {"iteration":1,"message":"开始分析任务..."}

event: tool_call
data: {"tool_name":"search_code","arguments":{"pattern":"login"},"status":"executing"}

event: tool_result
data: {"tool_name":"search_code","success":true,"output":"Found 5 matches...","duration_ms":120}

event: content_delta
data: {"delta":"认证系统"}

event: content_delta
data: {"delta":"重构"}

event: content_delta
data: {"delta":"完成！"}

event: iteration_end
data: {"iteration":1,"tokens_used":5230}

event: sub_agent_start
data: {"agent_id":"agent_sub_001","agent_type":"explore","instruction":"搜索所有认证相关代码"}

event: sub_agent_progress
data: {"agent_id":"agent_sub_001","iteration":1,"message":"正在搜索..."}

event: sub_agent_end
data: {"agent_id":"agent_sub_001","success":true,"iterations":3,"tokens_used":5230}

event: agent_end
data: {"id":"agent_1234567890","success":true,"iterations":3,"tokens_used":45230,"duration_ms":12500}

data: [DONE]
```

#### 流式事件类型

| 事件类型 | 说明 | 数据格式 |
|---------|------|---------|
| `agent_start` | Agent 开始执行 | `{id, agent_type, created}` |
| `iteration_start` | 迭代开始 | `{iteration, message}` |
| `tool_call` | 工具调用 | `{tool_name, arguments, status}` |
| `tool_result` | 工具结果 | `{tool_name, success, output, duration_ms}` |
| `content_delta` | 内容增量 | `{delta}` |
| `iteration_end` | 迭代结束 | `{iteration, tokens_used}` |
| `sub_agent_start` | 子 Agent 开始 | `{agent_id, agent_type, instruction}` |
| `sub_agent_progress` | 子 Agent 进度 | `{agent_id, iteration, message}` |
| `sub_agent_end` | 子 Agent 结束 | `{agent_id, success, iterations, tokens_used}` |
| `agent_end` | Agent 结束 | `{id, success, iterations, tokens_used, duration_ms}` |

---

### 5. 子 Agent 调用端点

```http
POST /v1/agents/subagent
```

创建并执行子 Agent（通常由父 Agent 调用）。

#### 请求体

```json
{
  "parent_agent_id": "agent_1234567890",
  "agent_type": "explore",
  "instruction": "搜索所有认证相关代码",
  "workspace": "/path/to/project",
  "config": {
    "max_iterations": 5,
    "max_tokens": 20000,
    "enable_sub_agents": false
  }
}
```

#### 响应格式

与 `/v1/agents/invoke` 相同。

---

### 6. Agent 状态查询端点

```http
GET /v1/agents/status/{agent_id}
```

查询 Agent 执行状态（用于异步调用）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `agent_id` | string | Agent ID |

#### 响应格式

```json
{
  "id": "agent_1234567890",
  "status": "running",
  "agent_type": "plan",
  "created": 1709107200,
  "updated": 1709107210,
  "progress": {
    "current_iteration": 2,
    "max_iterations": 10,
    "tokens_used": 15230,
    "max_tokens": 100000,
    "sub_agents_completed": 2,
    "sub_agents_total": 5
  },
  "result": null
}
```

#### 状态值

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `completed` | 已完成 |
| `failed` | 执行失败 |
| `timeout` | 超时 |

当状态为 `completed` 时，`result` 字段包含完整的执行结果。

---

### 7. Agent 工具定义

Agent 可以调用的工具列表：

#### 代码搜索工具

```json
{
  "name": "search_code",
  "description": "在代码库中搜索指定模式",
  "parameters": {
    "type": "object",
    "properties": {
      "pattern": {
        "type": "string",
        "description": "搜索模式（支持正则表达式）"
      },
      "file_pattern": {
        "type": "string",
        "description": "文件过滤模式（如 *.py）"
      }
    },
    "required": ["pattern"]
  }
}
```

#### 语义搜索工具

```json
{
  "name": "semantic_search",
  "description": "基于语义的代码搜索",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索查询（自然语言）"
      },
      "limit": {
        "type": "number",
        "description": "返回结果数量"
      }
    },
    "required": ["query"]
  }
}
```

#### 文件读取工具

```json
{
  "name": "read_file",
  "description": "读取文件内容",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "文件路径"
      },
      "start_line": {
        "type": "number",
        "description": "起始行号"
      },
      "end_line": {
        "type": "number",
        "description": "结束行号"
      }
    },
    "required": ["path"]
  }
}
```

#### 文件编辑工具

```json
{
  "name": "edit_file",
  "description": "编辑文件内容",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "文件路径"
      },
      "edits": {
        "type": "array",
        "description": "编辑操作列表",
        "items": {
          "type": "object",
          "properties": {
            "start_line": {"type": "number"},
            "end_line": {"type": "number"},
            "new_content": {"type": "string"}
          }
        }
      }
    },
    "required": ["path", "edits"]
  }
}
```

#### 代码分析工具

```json
{
  "name": "analyze_code",
  "description": "分析代码结构（使用 Tree-sitter）",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "文件路径"
      },
      "analysis_type": {
        "type": "string",
        "enum": ["symbols", "dependencies", "complexity"],
        "description": "分析类型"
      }
    },
    "required": ["path"]
  }
}
```

#### 测试运行工具

```json
{
  "name": "run_tests",
  "description": "运行测试",
  "parameters": {
    "type": "object",
    "properties": {
      "test_path": {
        "type": "string",
        "description": "测试文件或目录路径"
      },
      "test_pattern": {
        "type": "string",
        "description": "测试模式"
      }
    }
  }
}
```

#### 子 Agent 创建工具

```json
{
  "name": "create_sub_agent",
  "description": "创建子 Agent 执行子任务",
  "parameters": {
    "type": "object",
    "properties": {
      "agent_type": {
        "type": "string",
        "enum": ["explore", "edit", "search"],
        "description": "子 Agent 类型"
      },
      "instruction": {
        "type": "string",
        "description": "子任务指令"
      }
    },
    "required": ["agent_type", "instruction"]
  }
}
```

---

## 🔗 与 Vlinders-Server 的内部协议

### 内部端点映射

Vlinders-API 将客户端请求转换为内部请求，转发给 Vlinders-Server：

| 客户端端点 | 内部端点 | 说明 |
|-----------|---------|------|
| `POST /v1/agents/invoke` | `POST http://vlinders-server:8000/internal/agent` | Agent 调用 |
| `POST /v1/agents/subagent` | `POST http://vlinders-server:8000/internal/agent` | 子 Agent 调用 |
| `GET /v1/agents/status/{id}` | `GET http://vlinders-server:8000/internal/agent/{id}` | 状态查询 |

### 请求转换

#### 客户端请求 → 内部请求

```typescript
// Vlinders-API 转换逻辑
async function forwardAgentRequest(request: AgentRequest): Promise<AgentResponse> {
  // 1. 验证用户和配额
  const user = await authenticateUser(request.headers.authorization);
  await validateUserQuota(user.id);

  // 2. 转换为内部请求格式
  const internalRequest = {
    user_id: user.id,
    agent_type: request.agent_type,
    instruction: request.instruction,
    workspace: request.workspace,
    context: request.context,
    config: request.config,
    stream: request.stream
  };

  // 3. 转发到 Vlinders-Server
  const response = await fetch('http://vlinders-server:8000/internal/agent', {
    method: 'POST',
    headers: {
      'X-Internal-Auth': INTERNAL_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(internalRequest)
  });

  // 4. 记录使用量
  const result = await response.json();
  await recordUsage(user.id, {
    agent_type: request.agent_type,
    tokens: result.tokens_used,
    duration_ms: result.duration_ms
  });

  // 5. 返回响应（保持 Copilot API 格式）
  return result;
}
```

### 响应转换

#### 内部响应 → 客户端响应

```typescript
// Vlinders-Server 内部响应格式
interface InternalAgentResponse {
  agent_id: string;
  success: boolean;
  response: string;
  tool_calls: ToolCall[];
  sub_agents: SubAgentResult[];
  iterations: number;
  tokens_used: number;
  duration_ms: number;
  error?: string;
}

// 转换为客户端响应格式
function transformAgentResponse(internal: InternalAgentResponse): AgentResponse {
  return {
    id: internal.agent_id,
    object: 'agent.result',
    created: Math.floor(Date.now() / 1000),
    agent_type: internal.agent_type,
    success: internal.success,
    response: internal.response,
    tool_calls: internal.tool_calls.map(tc => ({
      id: tc.id,
      tool_name: tc.name,
      arguments: tc.arguments,
      result: tc.result,
      duration_ms: tc.duration_ms
    })),
    sub_agents: internal.sub_agents.map(sa => ({
      agent_id: sa.agent_id,
      agent_type: sa.agent_type,
      instruction: sa.instruction,
      success: sa.success,
      iterations: sa.iterations,
      tokens_used: sa.tokens_used
    })),
    iterations: internal.iterations,
    tokens_used: internal.tokens_used,
    duration_ms: internal.duration_ms,
    usage: {
      prompt_tokens: internal.prompt_tokens,
      completion_tokens: internal.completion_tokens,
      total_tokens: internal.tokens_used
    },
    error: internal.error
  };
}
```

### 流式响应转换

```typescript
// 流式响应转换
async function* transformAgentStream(
  internalStream: AsyncIterator<InternalAgentEvent>
): AsyncGenerator<string> {
  for await (const event of internalStream) {
    // 转换内部事件为 SSE 格式
    const sseEvent = transformEvent(event);
    yield `event: ${sseEvent.type}\ndata: ${JSON.stringify(sseEvent.data)}\n\n`;
  }

  yield 'data: [DONE]\n\n';
}

function transformEvent(event: InternalAgentEvent): SSEEvent {
  switch (event.type) {
    case 'agent_start':
      return {
        type: 'agent_start',
        data: {
          id: event.agent_id,
          agent_type: event.agent_type,
          created: Math.floor(Date.now() / 1000)
        }
      };

    case 'tool_call':
      return {
        type: 'tool_call',
        data: {
          tool_name: event.tool_name,
          arguments: event.arguments,
          status: 'executing'
        }
      };

    case 'content_delta':
      return {
        type: 'content_delta',
        data: {
          delta: event.content
        }
      };

    // ... 其他事件类型转换
  }
}
```

### 内部认证

所有内部请求必须包含认证头：

```typescript
headers: {
  'X-Internal-Auth': process.env.INTERNAL_SECRET
}
```

Vlinders-Server 验证内部请求：

```python
# vlinders_server/api/internal.py

from fastapi import Header, HTTPException

INTERNAL_SECRET = os.getenv('INTERNAL_SECRET')

def verify_internal_auth(x_internal_auth: str = Header(...)):
    """验证内部请求"""
    if x_internal_auth != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
```

---

## 📚 客户端集成示例

### Agent API 客户端

```typescript
// src/platform/vlinders/vlindersAgent.ts
export class VlindersAgent {
  constructor(private auth: VlindersAuth) {}

  async invokeAgent(
    agentType: 'plan' | 'explore' | 'edit' | 'search',
    instruction: string,
    workspace: string,
    options?: AgentOptions
  ): Promise<AgentResult> {
    const response = await fetch('https://api.vlinders.org/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: agentType,
        instruction,
        workspace,
        context: options?.context || {},
        config: options?.config || {},
        stream: false
      })
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    return response.json();
  }

  async *invokeAgentStream(
    agentType: 'plan' | 'explore' | 'edit' | 'search',
    instruction: string,
    workspace: string,
    options?: AgentOptions
  ): AsyncGenerator<AgentEvent> {
    const response = await fetch('https://api.vlinders.org/v1/agents/invoke', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: agentType,
        instruction,
        workspace,
        context: options?.context || {},
        config: options?.config || {},
        stream: true
      })
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7);
          continue;
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const event = JSON.parse(data);
            yield event;
          } catch (e) {
            console.error('Failed to parse SSE data:', data);
          }
        }
      }
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const response = await fetch(
      `https://api.vlinders.org/v1/agents/status/${agentId}`,
      {
        headers: {
          'Authorization': await this.auth.getAuthHeader()
        }
      }
    );

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    return response.json();
  }
}

// 类型定义
interface AgentOptions {
  context?: {
    history?: Message[];
    metadata?: Record<string, any>;
  };
  config?: {
    max_iterations?: number;
    max_tokens?: number;
    temperature?: number;
    parallel_tools?: boolean;
    enable_sub_agents?: boolean;
    timeout?: number;
  };
}

interface AgentResult {
  id: string;
  object: 'agent.result';
  created: number;
  agent_type: string;
  success: boolean;
  response: string;
  tool_calls: ToolCall[];
  sub_agents: SubAgentResult[];
  iterations: number;
  tokens_used: number;
  duration_ms: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

interface AgentEvent {
  type: 'agent_start' | 'iteration_start' | 'tool_call' | 'tool_result'
      | 'content_delta' | 'iteration_end' | 'sub_agent_start'
      | 'sub_agent_progress' | 'sub_agent_end' | 'agent_end';
  data: any;
}

interface AgentStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  agent_type: string;
  created: number;
  updated: number;
  progress: {
    current_iteration: number;
    max_iterations: number;
    tokens_used: number;
    max_tokens: number;
    sub_agents_completed: number;
    sub_agents_total: number;
  };
  result: AgentResult | null;
}
```

### 使用示例

```typescript
// 1. 基础 Agent 调用
const agent = new VlindersAgent(auth);

const result = await agent.invokeAgent(
  'explore',
  '找到所有处理用户认证的代码',
  '/path/to/project'
);

console.log(result.response);
console.log(`使用了 ${result.tokens_used} tokens`);
console.log(`执行了 ${result.iterations} 次迭代`);

// 2. 流式 Agent 调用
for await (const event of agent.invokeAgentStream(
  'plan',
  '重构整个认证系统，使用 JWT 替换 Session',
  '/path/to/project',
  {
    config: {
      max_iterations: 15,
      enable_sub_agents: true
    }
  }
)) {
  switch (event.type) {
    case 'agent_start':
      console.log('Agent 开始执行');
      break;

    case 'iteration_start':
      console.log(`迭代 ${event.data.iteration}: ${event.data.message}`);
      break;

    case 'tool_call':
      console.log(`调用工具: ${event.data.tool_name}`);
      break;

    case 'content_delta':
      process.stdout.write(event.data.delta);
      break;

    case 'sub_agent_start':
      console.log(`启动子 Agent: ${event.data.agent_type}`);
      break;

    case 'agent_end':
      console.log(`\n完成! 用时 ${event.data.duration_ms}ms`);
      break;
  }
}

// 3. 异步 Agent 调用 + 状态查询
const result = await agent.invokeAgent('edit', '修改登录函数', '/path/to/project');
const agentId = result.id;

// 轮询状态
const checkStatus = async () => {
  const status = await agent.getAgentStatus(agentId);

  if (status.status === 'running') {
    console.log(`进度: ${status.progress.current_iteration}/${status.progress.max_iterations}`);
    setTimeout(checkStatus, 1000);
  } else if (status.status === 'completed') {
    console.log('完成!', status.result);
  } else {
    console.error('失败:', status);
  }
};

checkStatus();
```

---

### Chat API 客户端

```typescript
// src/platform/vlinders/vlindersChat.ts
export class VlindersChat {
  constructor(private auth: VlindersAuth) {}

  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const response = await fetch('https://api.vlinders.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options?.model || 'vlinders-gpt-4',
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    return response.json();
  }

  async *chatStream(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<ChatChunk> {
    const response = await fetch('https://api.vlinders.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options?.model || 'vlinders-gpt-4',
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk = JSON.parse(data);
            yield chunk;
          } catch (e) {
            console.error('Failed to parse SSE data:', data);
          }
        }
      }
    }
  }
}
```

---

## 🔍 监控和日志

### 需要记录的指标

1. **性能指标**
   - 首个 Token 延迟（TTFT）
   - 总响应时间
   - Token 生成速度

2. **使用指标**
   - 每个模型的请求数
   - 平均 Token 使用量
   - 流式 vs 非流式比例

3. **错误指标**
   - 错误率
   - 超时率
   - 内容过滤触发率

4. **Agent 指标**
   - Agent 调用次数（按类型）
   - Agent 平均执行时间
   - Agent 成功率
   - 子 Agent 创建数量
   - 工具调用次数（按工具类型）
   - Agent Token 使用量

---

## ⚠️ 注意事项

### 给实施者的提醒

1. **流式响应处理**
   - 确保正确处理连接中断
   - 实现心跳机制防止超时
   - 正确处理 `[DONE]` 标记

2. **Token 计数**
   - 使用正确的 tokenizer（tiktoken）
   - 考虑特殊 token 的计数
   - 预留系统消息的 token

3. **错误处理**
   - 区分客户端错误和服务端错误
   - 提供清晰的错误信息
   - 实现重试机制

4. **性能优化**
   - 使用连接池
   - 实现请求缓存（相同输入）
   - 优化流式输出的 chunk 大小

5. **Agent API 特殊注意**
   - Agent 执行可能耗时较长，建议使用流式响应或异步调用
   - 子 Agent 会消耗额外的 Token，需要合理设置 Token 预算
   - 工具调用可能失败，需要优雅处理工具错误
   - Agent 状态需要持久化，支持断点续传
   - 并行工具调用需要注意资源限制
   - 子 Agent 深度应该限制（避免无限递归）

---

**下一步**: 实施 [03-代码补全API.md](./03-代码补全API.md)
