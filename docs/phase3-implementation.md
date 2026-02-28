# Phase 3 - OpenAI服务基础架构实现

## 概述

Phase 3实现了OpenAI服务的核心基础架构，包括完整的类型定义、SSE流式解析器和生产级HTTP客户端。

## 实现的组件

### 1. OpenAI类型定义 (`src/types/openai.ts`)

完整的OpenAI Chat Completion API类型定义：

#### 核心类型
- `ChatRole`: 消息角色类型
- `ChatMessage`: 聊天消息结构
- `ChatContentPart`: 多模态内容支持
- `Tool` / `ToolCall`: 工具调用支持

#### 请求/响应类型
- `ChatCompletionRequest`: 聊天补全请求
- `ChatCompletionResponse`: 非流式响应
- `ChatCompletionChunk`: 流式响应块
- `ChatCompletionChoice`: 响应选择
- `ToolCallDelta`: 流式工具调用增量

#### 错误处理
- `OpenAIError`: 自定义错误类
- `OpenAIErrorResponse`: 错误响应格式
- `StreamEvent`: 流式事件类型

### 2. SSE解析器 (`src/network/sseParser.ts`)

基于microsoft/vscode实现的生产级SSE解析器：

#### 特性
- **状态机处理**: 正确处理CR/LF边界分割
- **字段解析**: 支持data、event、id、retry字段
- **多行数据**: 正确处理多行data字段
- **重连支持**: 保存lastEventId用于重连
- **注释过滤**: 自动过滤以':'开头的注释行

#### 使用示例
```typescript
import { SSEParser } from './network/sseParser';

const parser = new SSEParser((event) => {
  console.log('Event type:', event.type);
  console.log('Event data:', event.data);

  if (event.data === '[DONE]') {
    console.log('Stream completed');
  }
});

// 处理流式数据
for await (const chunk of stream) {
  parser.feed(chunk);
}
```

#### 边界情况处理
- CR/LF跨chunk分割
- 不完整的行缓冲
- UTF-8解码流式处理
- 空行触发事件分发

### 3. HTTP客户端 (`src/network/fetcher.ts`)

生产级fetch封装，支持超时、重试和字节计数：

#### 特性
- **超时控制**: 可配置的请求超时
- **错误重试**: 指数退避重试策略
- **字节计数**: 自动统计接收字节数
- **流式支持**: 支持ReadableStream响应
- **信号组合**: 支持多个AbortSignal组合
- **错误分类**: 区分超时、中止、网络错误

#### 使用示例
```typescript
import { Fetcher } from './network/fetcher';

const fetcher = new Fetcher();

// 基础请求
const response = await fetcher.fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});

// 处理响应
if (response.ok) {
  const data = await response.json();
  console.log('Bytes received:', response.bytesReceived);
}

// 流式响应
const stream = response.stream();
for await (const chunk of stream) {
  // 处理chunk
}
```

#### 错误处理
```typescript
import { isAbortError, isTimeoutError, isNetworkError } from './network/fetcher';

try {
  const response = await fetcher.fetch(url, options);
} catch (err) {
  if (isTimeoutError(err)) {
    console.error('Request timeout');
  } else if (isAbortError(err)) {
    console.error('Request aborted');
  } else if (isNetworkError(err)) {
    console.error('Network error');
  }
}
```

## 架构设计

### 类型安全
- 完整的TypeScript类型定义
- 严格的类型检查
- 类型推导支持

### 错误处理
- 自定义错误类
- 错误分类和识别
- 详细的错误信息

### 流式处理
- 高效的字节流处理
- 正确的边界处理
- 内存优化

### 生产级特性
- 超时控制
- 重试机制
- 字节计数
- 状态管理

## 测试

测试文件位于 `src/tests/phase3.test.ts`，包含：

1. **SSE解析器测试**
   - 基础事件解析
   - 自定义事件类型
   - 多行数据处理
   - [DONE]标记处理

2. **Fetcher测试**
   - 超时错误
   - 中止信号
   - 重试机制

3. **OpenAI错误测试**
   - 错误创建
   - 错误序列化
   - 类型检查

## 集成

Phase 3的组件已集成到主类型系统：

```typescript
// src/types/index.ts
export * from './openai';
```

可以直接从types模块导入：

```typescript
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  OpenAIError
} from './types';
```

## 下一步

Phase 3为后续实现提供了坚实的基础：

- **Phase 4**: OpenAI服务实现（使用这些类型和工具）
- **Phase 5**: Anthropic服务实现
- **Phase 6**: 流式响应处理（使用SSE解析器）
- **Phase 7**: 错误处理和重试（使用Fetcher）

## 参考

- [HTML SSE规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [OpenAI API文档](https://platform.openai.com/docs/api-reference)
- [microsoft/vscode SSE实现](https://github.com/microsoft/vscode)
- [Vlinder-chat参考实现](https://github.com/QuickerStudio/Vlinder-chat)
