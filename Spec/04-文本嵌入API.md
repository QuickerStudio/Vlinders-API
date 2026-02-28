# 文本嵌入 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

文本嵌入 API 将文本转换为高维向量，用于语义搜索、相似度计算、聚类等任务。

### 设计目标

1. **高质量**: 准确捕捉文本语义
2. **高性能**: 批量处理能力
3. **多语言**: 支持多种编程语言和自然语言
4. **标准化**: 兼容 OpenAI Embeddings API

---

## 🌐 API 端点

### 生成文本嵌入

```http
POST /v1/embeddings
```

#### 请求体

```json
{
  "model": "vlinders-embedding-3-small",
  "input": [
    "def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
    "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }"
  ],
  "encoding_format": "float",
  "dimensions": 1536
}
```

#### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `model` | string | ✅ | 嵌入模型 ID |
| `input` | string/array | ✅ | 文本或文本数组（最多 2048 个）|
| `encoding_format` | string | ❌ | "float" 或 "base64" |
| `dimensions` | number | ❌ | 输出维度（某些模型支持）|
| `user` | string | ❌ | 用户标识（用于滥用监控）|

#### 响应格式

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023, -0.0091, 0.0134, ...]
    },
    {
      "object": "embedding",
      "index": 1,
      "embedding": [0.0019, -0.0088, 0.0129, ...]
    }
  ],
  "model": "vlinders-embedding-3-small",
  "usage": {
    "prompt_tokens": 50,
    "total_tokens": 50
  }
}
```

---

## 🎯 支持的模型

| 模型 ID | 维度 | 最大输入 | 用途 |
|---------|------|---------|------|
| `vlinders-embedding-3-small` | 1536 | 8191 tokens | 通用、高性价比 |
| `vlinders-embedding-3-large` | 3072 | 8191 tokens | 高精度 |
| `vlinders-code-embedding` | 768 | 4096 tokens | 代码专用 |

---

## 🔧 使用场景

### 1. 语义搜索

```typescript
// 1. 为代码库生成嵌入
const codeFiles = await readAllFiles();
const embeddings = await generateEmbeddings(codeFiles);
await saveToVectorDB(embeddings);

// 2. 搜索相似代码
const queryEmbedding = await generateEmbedding("fibonacci function");
const results = await vectorDB.search(queryEmbedding, topK=5);
```

### 2. 代码相似度

```typescript
const code1Embedding = await generateEmbedding(code1);
const code2Embedding = await generateEmbedding(code2);

// 计算余弦相似度
const similarity = cosineSimilarity(code1Embedding, code2Embedding);
console.log(`Similarity: ${similarity}`);  // 0.0 - 1.0
```

### 3. 代码聚类

```typescript
// 将相似的代码文件分组
const embeddings = await generateEmbeddings(allFiles);
const clusters = kMeansClustering(embeddings, k=10);
```

---

## 📊 数据库设计

### embeddings 表

```sql
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,       -- 用于缓存
  embedding BLOB NOT NULL,        -- 向量数据
  dimensions INTEGER NOT NULL,
  tokens INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_embeddings_input_hash ON embeddings(input_hash);
```

---

## 🚀 实施步骤

### 阶段 1: 基础实现（第 1 周）

1. ✅ 实现 `/v1/embeddings` 端点
2. ✅ 集成 OpenAI Embeddings API
3. ✅ 实现批量处理

### 阶段 2: 优化（第 2 周）

1. ✅ 实现缓存机制
2. ✅ 添加代码专用模型
3. ✅ 性能优化

---

## 📚 客户端集成示例

```typescript
export class VlindersEmbeddings {
  async generate(input: string | string[]): Promise<number[][]> {
    const response = await fetch('https://api.vlinders.org/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'vlinders-embedding-3-small',
        input: Array.isArray(input) ? input : [input]
      })
    });

    const data = await response.json();
    return data.data.map(d => d.embedding);
  }
}
```

---

**下一步**: 实施 [05-模型管理API.md](./05-模型管理API.md)
