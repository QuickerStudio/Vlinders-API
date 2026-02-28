# Agent 工具调用 API 规范

**版本**: v1.0
**最后更新**: 2026-02-28
**状态**: 📝 规划中

---

## 📋 概述

Agent 工具调用 API 允许 AI 模型调用外部工具和函数，实现复杂的任务自动化。

### 设计目标

1. **灵活性**: 支持自定义工具定义
2. **安全性**: 工具调用权限控制
3. **可扩展性**: 易于添加新工具
4. **兼容性**: 兼容 OpenAI Function Calling

---

## 🔧 工具定义格式

### 工具定义

```json
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
        },
        "file_pattern": {
          "type": "string",
          "description": "File pattern to search in (e.g., '*.py')"
        },
        "max_results": {
          "type": "number",
          "description": "Maximum number of results",
          "default": 10
        }
      },
      "required": ["query"]
    }
  }
}
```

---

## 🎯 内置工具

### 1. 代码搜索

```json
{
  "name": "search_code",
  "description": "Search for code in the repository",
  "parameters": {
    "query": "string",
    "file_pattern": "string (optional)",
    "max_results": "number (optional)"
  }
}
```

### 2. 文件读取

```json
{
  "name": "read_file",
  "description": "Read the contents of a file",
  "parameters": {
    "path": "string",
    "start_line": "number (optional)",
    "end_line": "number (optional)"
  }
}
```

### 3. 文件写入

```json
{
  "name": "write_file",
  "description": "Write content to a file",
  "parameters": {
    "path": "string",
    "content": "string",
    "create_if_not_exists": "boolean (optional)"
  }
}
```

### 4. 执行命令

```json
{
  "name": "execute_command",
  "description": "Execute a shell command",
  "parameters": {
    "command": "string",
    "working_directory": "string (optional)",
    "timeout": "number (optional)"
  }
}
```

### 5. Web 搜索

```json
{
  "name": "web_search",
  "description": "Search the web for information",
  "parameters": {
    "query": "string",
    "num_results": "number (optional)"
  }
}
```

---

## 🌐 API 端点

### 1. 列出可用工具

```http
GET /v1/tools
```

#### 响应格式

```json
{
  "tools": [
    {
      "name": "search_code",
      "description": "Search for code in the repository",
      "category": "code",
      "enabled": true
    },
    {
      "name": "read_file",
      "description": "Read the contents of a file",
      "category": "file",
      "enabled": true
    }
  ]
}
```

### 2. 执行工具

```http
POST /v1/tools/execute
```

#### 请求体

```json
{
  "tool": "search_code",
  "arguments": {
    "query": "fibonacci function",
    "file_pattern": "*.py",
    "max_results": 5
  }
}
```

#### 响应格式

```json
{
  "result": {
    "matches": [
      {
        "file": "utils.py",
        "line": 42,
        "content": "def fibonacci(n):\n    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)"
      }
    ]
  },
  "execution_time_ms": 150
}
```

---

## 🔒 安全措施

### 1. 工具权限

```typescript
interface ToolPermission {
  tool_name: string;
  allowed_for_plans: string[];  // ['free', 'pro', 'team']
  rate_limit: {
    calls_per_minute: number;
    calls_per_day: number;
  };
}
```

### 2. 参数验证

```typescript
function validateToolArguments(
  tool: Tool,
  arguments: Record<string, any>
): ValidationResult {
  // 验证必需参数
  // 验证参数类型
  // 验证参数范围
  // 防止注入攻击
}
```

### 3. 沙箱执行

```typescript
// 工具在隔离环境中执行
// 限制文件系统访问
// 限制网络访问
// 限制执行时间
```

---

## 📊 数据库设计

### tool_calls 表

```sql
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  arguments TEXT NOT NULL,        -- JSON
  result TEXT,                    -- JSON
  execution_time_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tool_calls_user_id ON tool_calls(user_id);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name);
```

---

## 🚀 实施步骤

### 阶段 1: 基础工具（第 1 周）

1. ✅ 实现工具定义系统
2. ✅ 实现基础工具（搜索、读取）
3. ✅ 实现工具调用端点

### 阶段 2: 高级功能（第 2 周）

1. ✅ 实现自定义工具
2. ✅ 实现工具权限控制
3. ✅ 实现沙箱执行

---

## 📚 客户端集成示例

```typescript
export class VlindersTools {
  async execute(toolName: string, args: Record<string, any>): Promise<any> {
    const response = await fetch('https://api.vlinders.org/v1/tools/execute', {
      method: 'POST',
      headers: {
        'Authorization': await this.auth.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: toolName,
        arguments: args
      })
    });

    const data = await response.json();
    return data.result;
  }
}
```

---

## ⚠️ 注意事项

### 给实施者的提醒

1. **安全第一**
   - 严格验证所有工具参数
   - 在沙箱中执行工具
   - 限制文件系统和网络访问

2. **性能考虑**
   - 工具执行可能很慢
   - 实现超时机制
   - 考虑异步执行

3. **错误处理**
   - 工具可能失败
   - 提供清晰的错误信息
   - 支持重试机制

---

**完成**: 所有 API 规范文档已创建
