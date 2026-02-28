# 代码补全 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

代码补全 API 提供实时的代码建议和自动补全功能，是 IDE 集成的核心特性。支持多种编程语言和补全模式。

### 设计目标

1. **低延迟**: 补全响应时间 < 300ms
2. **高质量**: 提供上下文相关的准确建议
3. **多语言**: 支持主流编程语言
4. **智能排序**: 根据上下文和用户习惯排序建议

### 参考 Copilot API

Copilot 的代码补全特点：
- 实时补全（边输入边建议）
- 多行补全
- 函数签名补全
- 注释生成代码

---

## 🌐 API 端点

### 1. 代码补全

```http
POST /v1/completions
```

#### 请求体

```json
{
  "model": "vlinders-code",
  "prompt": "def fibonacci(n):\n    ",
  "suffix": "\n    return result",
  "max_tokens": 100,
  "temperature": 0.2,
  "top_p": 0.95,
  "n": 3,
  "stream": false,
  "stop": ["\n\n", "def ", "class "],
  "language": "python",
  "file_path": "/workspace/utils.py",
  "context": {
    "before": "# Calculate fibonacci numbers\n",
    "after": "\n# Test the function\nprint(fibonacci(10))"
  }
}
```

#### 请求参数详解

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `model` | string | ✅ | - | 模型 ID |
| `prompt` | string | ✅ | - | 光标前的代码 |
| `suffix` | string | ❌ | "" | 光标后的代码（填充模式）|
| `max_tokens` | number | ❌ | 100 | 最大生成 tokens |
| `temperature` | number | ❌ | 0.2 | 采样温度（建议低值）|
| `top_p` | number | ❌ | 0.95 | 核采样参数 |
| `n` | number | ❌ | 1 | 生成的建议数量（1-5）|
| `stream` | boolean | ❌ | false | 是否流式响应 |
| `stop` | array | ❌ | null | 停止序列 |
| `language` | string | ❌ | null | 编程语言 |
| `file_path` | string | ❌ | null | 文件路径（用于上下文）|
| `context` | object | ❌ | null | 额外上下文 |

#### 响应格式

```json
{
  "id": "cmpl_1234567890",
  "object": "text_completion",
  "created": 1709107200,
  "model": "vlinders-code",
  "choices": [
    {
      "text": "if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    },
    {
      "text": "if n < 2:\n        return n\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
      "index": 1,
      "logprobs": null,
      "finish_reason": "stop"
    },
    {
      "text": "return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
      "index": 2,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 45,
    "total_tokens": 60
  }
}
```

### 2. 流式代码补全

```http
POST /v1/completions/stream
```

用于实时显示补全过程：

```
data: {"id":"cmpl_1234567890","object":"text_completion","created":1709107200,"choices":[{"text":"if","index":0,"logprobs":null,"finish_reason":null}],"model":"vlinders-code"}

data: {"id":"cmpl_1234567890","object":"text_completion","created":1709107200,"choices":[{"text":" n","index":0,"logprobs":null,"finish_reason":null}],"model":"vlinders-code"}

data: {"id":"cmpl_1234567890","object":"text_completion","created":1709107200,"choices":[{"text":" <=","index":0,"logprobs":null,"finish_reason":null}],"model":"vlinders-code"}

...

data: {"id":"cmpl_1234567890","object":"text_completion","created":1709107200,"choices":[{"text":"","index":0,"logprobs":null,"finish_reason":"stop"}],"model":"vlinders-code","usage":{"prompt_tokens":15,"completion_tokens":45,"total_tokens":60}}

data: [DONE]
```

---

## 🎯 补全模式

### 1. 行内补全（Inline Completion）

最常见的补全模式，在当前行提供建议：

```python
# 用户输入：
def calculate_sum(a, b):
    return |  # 光标位置

# API 请求：
{
  "prompt": "def calculate_sum(a, b):\n    return ",
  "max_tokens": 20
}

# 建议：
a + b
```

### 2. 多行补全（Multi-line Completion）

补全整个代码块：

```python
# 用户输入：
def quicksort(arr):
    |  # 光标位置

# 建议：
if len(arr) <= 1:
    return arr
pivot = arr[len(arr) // 2]
left = [x for x in arr if x < pivot]
middle = [x for x in arr if x == pivot]
right = [x for x in arr if x > pivot]
return quicksort(left) + middle + quicksort(right)
```

### 3. 填充补全（Fill-in-the-Middle）

在代码中间插入：

```python
# 用户代码：
def process_data(data):
    # 验证数据
    |  # 光标位置
    # 返回结果
    return result

# API 请求：
{
  "prompt": "def process_data(data):\n    # 验证数据\n    ",
  "suffix": "\n    # 返回结果\n    return result"
}

# 建议：
if not data:
    raise ValueError("Data cannot be empty")
if not isinstance(data, list):
    raise TypeError("Data must be a list")
```

### 4. 注释生成代码（Comment-to-Code）

根据注释生成代码：

```python
# 用户输入：
# 创建一个函数，计算列表中所有偶数的和
|

# 建议：
def sum_even_numbers(numbers):
    return sum(num for num in numbers if num % 2 == 0)
```

### 5. 函数签名补全（Signature Completion）

补全函数参数和返回类型：

```typescript
// 用户输入：
function fetchUserData(|

// 建议：
userId: string): Promise<User>
```

---

## 🔧 高级功能

### 1. 上下文感知

利用文件上下文提供更准确的建议：

```json
{
  "prompt": "def calculate_total(items):\n    ",
  "context": {
    "imports": [
      "from typing import List",
      "from decimal import Decimal"
    ],
    "classes": [
      "class Item:\n    def __init__(self, price: Decimal, quantity: int):\n        self.price = price\n        self.quantity = quantity"
    ],
    "recent_code": [
      "def calculate_tax(amount: Decimal) -> Decimal:\n    return amount * Decimal('0.1')"
    ]
  }
}
```

### 2. 语言特定优化

不同语言使用不同的停止序列和参数：

```typescript
const languageConfigs = {
  python: {
    stop: ['\n\n', 'def ', 'class ', 'if __name__'],
    temperature: 0.2,
    indentation: '    '
  },
  javascript: {
    stop: ['\n\n', 'function ', 'class ', 'const ', 'let '],
    temperature: 0.2,
    indentation: '  '
  },
  go: {
    stop: ['\n\n', 'func ', 'type ', 'package '],
    temperature: 0.1,
    indentation: '\t'
  }
};
```

### 3. 智能排序

根据多个因素对建议排序：

```typescript
interface CompletionScore {
  relevance: number;      // 与上下文的相关性
  popularity: number;     // 常见模式的流行度
  recency: number;        // 用户最近的选择
  length: number;         // 代码长度（偏好简洁）
  syntax_valid: boolean;  // 语法是否有效
}

// 综合评分
const finalScore =
  relevance * 0.4 +
  popularity * 0.2 +
  recency * 0.2 +
  length * 0.1 +
  (syntax_valid ? 0.1 : 0);
```

### 4. 缓存机制

缓存常见的补全请求：

```typescript
// 缓存 key
const cacheKey = hash({
  prompt: prompt.slice(-200),  // 只使用最后 200 字符
  language,
  model
});

// 检查缓存
const cached = await kv.get(`completion:${cacheKey}`);
if (cached) {
  return JSON.parse(cached);
}

// 生成补全
const completion = await generateCompletion(...);

// 缓存结果（5 分钟）
await kv.put(`completion:${cacheKey}`, JSON.stringify(completion), {
  expirationTtl: 300
});
```

---

## 🛡️ 质量控制

### 1. 语法验证

验证生成的代码语法是否正确：

```typescript
async function validateSyntax(code: string, language: string): Promise<boolean> {
  try {
    switch (language) {
      case 'python':
        // 使用 Python AST 解析
        await parsePython(code);
        return true;
      case 'javascript':
      case 'typescript':
        // 使用 Babel 解析
        await parseJavaScript(code);
        return true;
      default:
        return true;  // 未知语言跳过验证
    }
  } catch (error) {
    return false;
  }
}
```

### 2. 安全检查

过滤不安全的代码建议：

```typescript
const unsafePatterns = [
  /eval\(/,
  /exec\(/,
  /__import__\(/,
  /os\.system\(/,
  /subprocess\./,
  /rm -rf/,
  /DROP TABLE/i
];

function isSafe(code: string): boolean {
  return !unsafePatterns.some(pattern => pattern.test(code));
}
```

### 3. 重复检测

避免建议重复的代码：

```typescript
function removeDuplicates(completions: Completion[]): Completion[] {
  const seen = new Set<string>();
  return completions.filter(c => {
    const normalized = c.text.trim().toLowerCase();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}
```

---

## 📊 性能优化

### 1. 延迟要求

| 场景 | 目标延迟 | 最大延迟 |
|------|---------|---------|
| 行内补全 | < 200ms | < 500ms |
| 多行补全 | < 300ms | < 800ms |
| 填充补全 | < 400ms | < 1000ms |

### 2. 批处理

合并多个请求以提高效率：

```typescript
class CompletionBatcher {
  private queue: CompletionRequest[] = [];
  private timer: NodeJS.Timeout | null = null;

  async add(request: CompletionRequest): Promise<Completion> {
    return new Promise((resolve) => {
      this.queue.push({ request, resolve });

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), 50);  // 50ms 批处理窗口
      }
    });
  }

  private async flush() {
    const batch = this.queue.splice(0);
    this.timer = null;

    // 批量请求
    const results = await this.batchGenerate(batch.map(b => b.request));

    // 分发结果
    batch.forEach((item, index) => {
      item.resolve(results[index]);
    });
  }
}
```

### 3. 预测性预加载

预测用户可能需要的补全：

```typescript
// 当用户输入 "def " 时，预加载常见函数模式
if (prompt.endsWith('def ')) {
  // 异步预加载，不阻塞当前请求
  this.preloadCompletions([
    'def __init__(self',
    'def main(',
    'def test_'
  ]);
}
```

---

## 📊 数据库设计

### completions 表

```sql
CREATE TABLE completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  language TEXT,
  prompt_hash TEXT NOT NULL,      -- 用于缓存查找
  completion_text TEXT NOT NULL,
  accepted BOOLEAN DEFAULT FALSE, -- 用户是否接受
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_completions_user_id ON completions(user_id);
CREATE INDEX idx_completions_prompt_hash ON completions(prompt_hash);
CREATE INDEX idx_completions_accepted ON completions(accepted);
```

### completion_feedback 表

```sql
CREATE TABLE completion_feedback (
  id TEXT PRIMARY KEY,
  completion_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'accepted', 'rejected', 'modified'
  modified_text TEXT,             -- 如果用户修改了建议
  created_at INTEGER NOT NULL,
  FOREIGN KEY (completion_id) REFERENCES completions(id)
);
```

---

## 🧪 测试用例

### 1. 基础补全测试

```typescript
describe('Code Completions', () => {
  it('should complete simple function', async () => {
    const response = await fetch('/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-code',
        prompt: 'def add(a, b):\n    return ',
        language: 'python',
        max_tokens: 20
      })
    });

    const data = await response.json();
    expect(data.choices[0].text).toContain('a + b');
  });

  it('should respect stop sequences', async () => {
    const response = await fetch('/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-code',
        prompt: 'def func1():\n    pass\n\n',
        stop: ['def ', 'class '],
        max_tokens: 100
      })
    });

    const data = await response.json();
    expect(data.choices[0].text).not.toContain('def ');
  });
});
```

### 2. 填充补全测试

```typescript
describe('Fill-in-the-Middle', () => {
  it('should fill code in the middle', async () => {
    const response = await fetch('/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-code',
        prompt: 'def process(data):\n    ',
        suffix: '\n    return result',
        language: 'python'
      })
    });

    const data = await response.json();
    expect(data.choices[0].text).toBeDefined();
    expect(data.choices[0].text.length).toBeGreaterThan(0);
  });
});
```

---

## 🚀 实施步骤

### 阶段 1: 基础补全（第 1 周）

1. ✅ 实现 `/v1/completions` 端点
2. ✅ 集成代码生成模型
3. ✅ 实现基础的停止序列处理

### 阶段 2: 多建议支持（第 2 周）

1. ✅ 支持生成多个建议（n > 1）
2. ✅ 实现建议排序算法
3. ✅ 添加语法验证

### 阶段 3: 上下文优化（第 3 周）

1. ✅ 实现上下文提取
2. ✅ 语言特定优化
3. ✅ 填充补全支持

### 阶段 4: 性能优化（第 4 周）

1. ✅ 实现缓存机制
2. ✅ 批处理优化
3. ✅ 延迟监控和优化

---

## 📚 客户端集成示例

### TypeScript 客户端

```typescript
// src/platform/vlinders/vlindersCompletion.ts
export class VlindersCompletion {
  constructor(private auth: VlindersAuth) {}

  async complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const response = await fetch('https://api.vlinders.org/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-code',
        prompt,
        suffix: options?.suffix,
        max_tokens: options?.maxTokens || 100,
        temperature: 0.2,
        n: options?.n || 1,
        language: options?.language,
        stop: options?.stop
      })
    });

    if (!response.ok) {
      throw new VlindersAPIError(response.status, await response.text());
    }

    return response.json();
  }

  // VSCode InlineCompletionItemProvider 集成
  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext
  ): Promise<vscode.InlineCompletionItem[]> {
    const prompt = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    );

    const suffix = document.getText(
      new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end)
    );

    const response = await this.complete(prompt, {
      suffix,
      language: document.languageId,
      n: 3
    });

    return response.choices.map(choice => ({
      insertText: choice.text,
      range: new vscode.Range(position, position)
    }));
  }
}
```

---

## ⚠️ 注意事项

### 给实施者的提醒

1. **延迟优化**
   - 代码补全对延迟极其敏感
   - 使用更小的模型以降低延迟
   - 实现超时机制（500ms）

2. **上下文窗口**
   - 不要发送整个文件（太大）
   - 只发送光标附近的代码（前后各 1000 tokens）
   - 智能提取相关的导入和定义

3. **用户体验**
   - 不要在用户快速输入时频繁请求
   - 实现防抖（debounce）机制
   - 缓存最近的补全结果

4. **质量控制**
   - 过滤语法错误的建议
   - 过滤不安全的代码
   - 过滤重复的建议

---

**下一步**: 实施 [04-文本嵌入API.md](./04-文本嵌入API.md)
