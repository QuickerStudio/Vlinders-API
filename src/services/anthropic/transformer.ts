/**
 * Anthropic Messages API Transformer
 *
 * Converts OpenAI format to Anthropic Messages API format
 * Based on Vlinder-chat rawMessagesToMessagesAPI implementation
 */

import {
  ChatMessage,
  ChatContentPart,
  Tool,
} from '../../types/openai.js';
import {
  MessageParam,
  TextBlock,
  ImageBlock,
  ContentBlock,
  AnthropicTool,
  ThinkingConfig,
  MessagesRequest,
} from '../../types/anthropic.js';

/**
 * Transform options
 */
export interface TransformOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  tools?: Tool[];
  thinking?: ThinkingConfig;
  stream?: boolean;
}

/**
 * Transform result
 */
export interface TransformResult {
  messages: MessageParam[];
  system?: TextBlock[] | string;
}

/**
 * Convert OpenAI messages to Anthropic Messages API format
 */
export function transformToMessagesAPI(options: TransformOptions): MessagesRequest {
  const { messages, system } = convertMessages(options.messages);

  // Convert tools if provided
  const anthropicTools = options.tools?.map(convertTool);

  // Build stop sequences
  const stopSequences = options.stop
    ? Array.isArray(options.stop)
      ? options.stop
      : [options.stop]
    : undefined;

  return {
    model: options.model,
    messages,
    system,
    max_tokens: options.max_tokens ?? 4096,
    temperature: options.temperature,
    top_p: options.top_p,
    stop_sequences: stopSequences,
    stream: options.stream ?? false,
    tools: anthropicTools && anthropicTools.length > 0 ? anthropicTools : undefined,
    thinking: options.thinking,
  };
}

/**
 * Convert OpenAI messages to Anthropic format
 * Extracts system messages and converts user/assistant/tool messages
 */
export function convertMessages(messages: ChatMessage[]): TransformResult {
  const unmergedMessages: MessageParam[] = [];
  const systemBlocks: TextBlock[] = [];

  for (const message of messages) {
    switch (message.role) {
      case 'system': {
        // Extract system messages to separate field
        const content = convertContent(message.content);
        systemBlocks.push(...content.filter((c): c is TextBlock => c.type === 'text'));
        break;
      }
      case 'user': {
        const content = convertContent(message.content);
        if (content.length > 0) {
          unmergedMessages.push({
            role: 'user',
            content,
          });
        }
        break;
      }
      case 'assistant': {
        const content = convertContent(message.content);

        // Add tool calls if present
        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(toolCall.function.arguments);
            } catch {
              // Keep empty object if parse fails
            }
            content.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.function.name,
              input: parsedInput,
            });
          }
        }

        if (content.length > 0) {
          unmergedMessages.push({
            role: 'assistant',
            content,
          });
        }
        break;
      }
      case 'tool': {
        // Convert tool messages to tool_result blocks
        if (message.tool_call_id) {
          const toolContent = convertContent(message.content);
          const validContent = toolContent.filter(
            (c): c is TextBlock | ImageBlock =>
              (c.type === 'text' || c.type === 'image') &&
              !(c.type === 'text' && c.text.trim() === '')
          );

          unmergedMessages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: message.tool_call_id,
                content: validContent.length > 0 ? validContent : undefined,
              },
            ],
          });
        }
        break;
      }
    }
  }

  // Merge consecutive messages with same role
  const mergedMessages = mergeConsecutiveMessages(unmergedMessages);

  return {
    messages: mergedMessages,
    system: systemBlocks.length > 0 ? systemBlocks : undefined,
  };
}

/**
 * Convert message content to Anthropic content blocks
 */
function convertContent(content: string | ChatContentPart[]): ContentBlock[] {
  if (typeof content === 'string') {
    return content.trim() ? [{ type: 'text', text: content }] : [];
  }

  const blocks: ContentBlock[] = [];

  for (const part of content) {
    if (part.type === 'text' && part.text?.trim()) {
      blocks.push({ type: 'text', text: part.text });
    } else if (part.type === 'image_url' && part.image_url) {
      const imageBlock = convertImageUrl(part.image_url.url);
      if (imageBlock) {
        blocks.push(imageBlock);
      }
    }
  }

  return blocks;
}

/**
 * Convert image URL to Anthropic image block
 * Supports data URLs with base64 encoding
 */
function convertImageUrl(url: string): ImageBlock | null {
  // Parse data URL: data:image/png;base64,<data>
  const match = url.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (match) {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: match[2],
      },
    };
  }
  return null;
}

/**
 * Convert OpenAI tool to Anthropic tool
 */
function convertTool(tool: Tool): AnthropicTool {
  return {
    name: tool.function.name,
    description: tool.function.description,
    input_schema: {
      type: 'object',
      properties: (tool.function.parameters as { properties?: Record<string, unknown> })?.properties ?? {},
      required: (tool.function.parameters as { required?: string[] })?.required ?? [],
    },
  };
}

/**
 * Merge consecutive messages with the same role
 * Required by Anthropic API - alternating user/assistant messages
 */
function mergeConsecutiveMessages(messages: MessageParam[]): MessageParam[] {
  const merged: MessageParam[] = [];

  for (const message of messages) {
    const lastMessage = merged[merged.length - 1];

    if (lastMessage && lastMessage.role === message.role) {
      // Merge with previous message
      const prevContent = Array.isArray(lastMessage.content)
        ? lastMessage.content
        : [{ type: 'text' as const, text: lastMessage.content }];
      const newContent = Array.isArray(message.content)
        ? message.content
        : [{ type: 'text' as const, text: message.content }];

      lastMessage.content = [...prevContent, ...newContent];
    } else {
      merged.push(message);
    }
  }

  return merged;
}
