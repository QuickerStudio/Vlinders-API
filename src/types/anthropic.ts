/**
 * Anthropic Messages API Type Definitions
 *
 * Complete type definitions for Anthropic Messages API
 * Based on Vlinder-chat implementation with production-grade types
 */

/**
 * Content block types for Messages API
 */
export type ContentBlockType = 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking' | 'redacted_thinking';

/**
 * Text content block
 */
export interface TextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

/**
 * Image source (base64)
 */
export interface ImageSource {
  type: 'base64';
  media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  data: string;
}

/**
 * Image content block
 */
export interface ImageBlock {
  type: 'image';
  source: ImageSource;
  cache_control?: { type: 'ephemeral' };
}

/**
 * Tool use content block
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: (TextBlock | ImageBlock)[];
  is_error?: boolean;
  cache_control?: { type: 'ephemeral' };
}

/**
 * Thinking content block (extended thinking)
 */
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature: string;
}

/**
 * Redacted thinking content block (encrypted only)
 */
export interface RedactedThinkingBlock {
  type: 'redacted_thinking';
  data: string;
}

/**
 * Content block union type
 */
export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock | RedactedThinkingBlock;

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message parameter
 */
export interface MessageParam {
  role: MessageRole;
  content: ContentBlock[] | string;
}

/**
 * Tool definition for Messages API
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Thinking configuration
 */
export type ThinkingConfig =
  | { type: 'enabled'; budget_tokens: number }
  | { type: 'adaptive' };

/**
 * Messages API request
 */
export interface MessagesRequest {
  model: string;
  messages: MessageParam[];
  system?: TextBlock[] | string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: AnthropicTool[];
  thinking?: ThinkingConfig;
  metadata?: {
    user_id?: string;
  };
}

/**
 * Usage information
 */
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Messages API response (non-streaming)
 */
export interface MessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence?: string | null;
  usage: Usage;
}

/**
 * Stream event types
 */
export type StreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'ping'
  | 'error';

/**
 * Message start event
 */
export interface MessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: [];
    model: string;
    stop_reason: null;
    stop_sequence: null;
    usage: Usage;
  };
}

/**
 * Content block start event
 */
export interface ContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: ContentBlock;
}

/**
 * Delta types
 */
export type Delta =
  | { type: 'text_delta'; text: string }
  | { type: 'input_json_delta'; partial_json: string }
  | { type: 'thinking_delta'; thinking: string }
  | { type: 'signature_delta'; signature: string };

/**
 * Content block delta event
 */
export interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: Delta;
}

/**
 * Content block stop event
 */
export interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

/**
 * Message delta event
 */
export interface MessageDeltaEvent {
  type: 'message_delta';
  delta: {
    stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
    stop_sequence?: string;
  };
  usage: {
    output_tokens: number;
  };
}

/**
 * Message stop event
 */
export interface MessageStopEvent {
  type: 'message_stop';
}

/**
 * Ping event
 */
export interface PingEvent {
  type: 'ping';
}

/**
 * Error event
 */
export interface ErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * Stream event union type
 */
export type StreamEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | PingEvent
  | ErrorEvent;

/**
 * Anthropic API error response
 */
export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * Anthropic API error
 */
export class AnthropicError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AnthropicError';
  }

  toJSON(): AnthropicErrorResponse {
    return {
      type: 'error',
      error: {
        type: this.type,
        message: this.message,
      },
    };
  }
}
