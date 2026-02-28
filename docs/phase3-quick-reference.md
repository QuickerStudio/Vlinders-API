# Phase 3 快速参考

## 文件结构

```
src/
├── network/
│   ├── fetcher.ts       # HTTP客户端 (302行)
│   ├── sseParser.ts     # SSE解析器 (253行)
│   └── index.ts         # 导出模块
├── types/
│   ├── openai.ts        # OpenAI类型 (194行)
│   └── index.ts         # 更新：导出OpenAI类型
├── tests/
│   └── phase3.test.ts   # Phase 3测试
└── docs/
    └── phase3-implementation.md  # 详细文档
```

## 快速使用

### 1. SSE解析器

```typescript
import { SSEParser } from './network';

const parser = new SSEParser((event) => {
  if (event.data === '[DONE]') return;
  const chunk = JSON.parse(event.data);
  console.log(chunk.choices[0].delta.content);
});

// 处理流
for await (const chunk of response.body) {
  parser.feed(chunk);
}
```

### 2. HTTP客户端

```typescript
import { Fetcher } from './network';

const fetcher = new Fetcher();
const response = await fetcher.fetch(url, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify(data),
  timeout: 30000,
  retries: 3,
});

const json = await response.json();
```

### 3. OpenAI类型

```typescript
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  OpenAIError
} from './types';

const request: ChatCompletionRequest = {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
};
```

## 核心特性

### SSE解析器
- ✅ 状态机处理CR/LF边界
- ✅ 支持data、event、id、retry字段
- ✅ 多行数据处理
- ✅ [DONE]标记识别

### HTTP客户端
- ✅ 超时控制
- ✅ 指数退避重试
- ✅ 字节计数
- ✅ 流式响应
- ✅ 信号组合

### OpenAI类型
- ✅ 完整的API类型
- ✅ 流式响应类型
- ✅ 工具调用支持
- ✅ 错误处理类

## 验证

```bash
# 类型检查（仅Phase 3文件）
npx tsc --noEmit src/types/openai.ts src/network/sseParser.ts src/network/fetcher.ts

# 运行测试
npm test src/tests/phase3.test.ts
```

## 统计

- **总代码行数**: 749行
- **类型定义**: 194行
- **SSE解析器**: 253行
- **HTTP客户端**: 302行
- **测试覆盖**: 基础功能测试

## 下一步集成

Phase 3组件将在以下阶段使用：

1. **Phase 4**: OpenAI服务 → 使用类型和Fetcher
2. **Phase 5**: Anthropic服务 → 使用Fetcher
3. **Phase 6**: 流式处理 → 使用SSE解析器
4. **Phase 7**: 错误处理 → 使用OpenAIError
