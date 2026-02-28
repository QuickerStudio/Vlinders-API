/**
 * OpenAI Message Transformer
 *
 * Converts internal ChatMessage format to OpenAI API format
 * Handles tool calls and multimodal content
 */

import type {
  ChatMessage,
  ChatContentPart,
  ToolCall,
  Tool,
} from '../../types/openai';

/**
 * Transforms messages to OpenAI format
 */
export function transformMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((msg) => transformMessage(msg));
}

/**
 * Transforms a single message
 */
export function transformMessage(message: ChatMessage): ChatMessage {
  const transformed: ChatMessage = {
    role: message.role,
    content: message.content,
  };

  if (message.name) {
    transformed.name = message.name;
  }

  if (message.tool_calls) {
    transformed.tool_calls = message.tool_calls.map(transformToolCall);
  }

  if (message.tool_call_id) {
    transformed.tool_call_id = message.tool_call_id;
  }

  return transformed;
}

/**
 * Transforms tool call
 */
export function transformToolCall(toolCall: ToolCall): ToolCall {
  return {
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    },
  };
}

/**
 * Validates message content
 */
export function validateMessageContent(
  content: string | ChatContentPart[]
): boolean {
  if (typeof content === 'string') {
    return content.length > 0;
  }

  if (!Array.isArray(content)) {
    return false;
  }

  return content.every((part) => {
    if (part.type === 'text') {
      return typeof part.text === 'string' && part.text.length > 0;
    }
    if (part.type === 'image_url') {
      return (
        part.image_url &&
        typeof part.image_url.url === 'string' &&
        part.image_url.url.length > 0
      );
    }
    return false;
  });
}

/**
 * Extracts text from message content
 */
export function extractTextContent(
  content: string | ChatContentPart[]
): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('');
}

/**
 * Counts images in message content
 */
export function countImages(content: string | ChatContentPart[]): number {
  if (typeof content === 'string') {
    return 0;
  }

  return content.filter((part) => part.type === 'image_url').length;
}

/**
 * Validates tool definition
 */
export function validateTool(tool: Tool): boolean {
  return (
    tool.type === 'function' &&
    typeof tool.function.name === 'string' &&
    tool.function.name.length > 0 &&
    typeof tool.function.description === 'string' &&
    typeof tool.function.parameters === 'object'
  );
}
