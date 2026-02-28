/**
 * Vlinders API - Core Type Definitions
 *
 * 基于Vlinder-chat的实现，定义生产级的类型系统
 */

/**
 * Cloudflare Workers环境变量
 */
export interface Env {
  // API密钥
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_BASE_URL?: string;

  // 环境配置
  ENVIRONMENT?: 'development' | 'production';

  // KV命名空间 - API密钥存储
  API_KEYS?: KVNamespace;

  // D1数据库 - 用户数据
  DB?: D1Database;

  // R2存储 - 日志
  LOGS?: R2Bucket;
  LOGS_BUCKET?: R2Bucket;
}

/**
 * Hono context variables
 */
export interface HonoVariables {
  requestId: string;
  userId?: string;
  apiKey?: string;
  authContext?: AuthContext;
}

/**
 * 聊天消息角色
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 聊天消息内容部分（支持多模态）
 */
export interface ChatContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: ChatRole;
  content: string | ChatContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * 工具调用
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * 工具定义
 */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
}

/**
 * 聊天补全请求（OpenAI格式）
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  tools?: Tool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * 聊天补全响应（非流式）
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 聊天补全选择
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: null;
}

/**
 * 聊天补全流式响应
 */
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

/**
 * 聊天补全流式选择
 */
export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: ChatRole;
    content?: string;
    tool_calls?: ToolCallDelta[];
  };
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/**
 * 工具调用增量
 */
export interface ToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    param?: string;
  };
}

/**
 * API密钥信息
 */
export interface ApiKeyInfo {
  userId: string;
  active: boolean;
  expiresAt?: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  usage?: {
    requestsToday: number;
    tokensToday: number;
  };
}

/**
 * 认证上下文
 */
export interface AuthContext {
  userId: string;
  apiKey: string;
  keyInfo: ApiKeyInfo;
}

/**
 * 请求ID
 */
export interface RequestId {
  headerRequestId: string;
  completionId: string;
  created: number;
}

/**
 * SSE事件
 */
export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

// Re-export OpenAI types
export * from './openai';
