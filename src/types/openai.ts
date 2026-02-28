/**
 * OpenAI API Type Definitions
 *
 * Complete type definitions for OpenAI Chat Completion API
 * Based on Vlinder-chat implementation with production-grade types
 */

/**
 * Chat message role
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message content part (multimodal support)
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
 * Chat message
 */
export interface ChatMessage {
  role: ChatRole;
  content: string | ChatContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * Tool call
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
 * Tool definition
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
 * Chat completion request
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
  response_format?: { type: 'text' | 'json_object' };
  seed?: number;
}

/**
 * Chat completion response (non-streaming)
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
  system_fingerprint?: string;
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: null;
}

/**
 * Chat completion streaming chunk
 */
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  system_fingerprint?: string;
}

/**
 * Chat completion streaming choice
 */
export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: ChatRole;
    content?: string;
    tool_calls?: ToolCallDelta[];
  };
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: null;
}

/**
 * Tool call delta (for streaming)
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
 * OpenAI error response
 */
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * OpenAI API error
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly statusCode: number,
    public readonly param?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }

  toJSON(): OpenAIErrorResponse {
    return {
      error: {
        message: this.message,
        type: this.type,
        param: this.param,
        code: this.code,
      },
    };
  }
}

/**
 * Streaming event types
 */
export type StreamEvent =
  | { type: 'chunk'; data: ChatCompletionChunk }
  | { type: 'done' }
  | { type: 'error'; error: Error };
