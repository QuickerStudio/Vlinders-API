/**
 * Anthropic Stream Processor
 *
 * Converts Anthropic Messages API SSE events to OpenAI ChatCompletion format
 * Based on Vlinder-chat AnthropicMessagesProcessor implementation
 */

import {
  StreamEvent,
  Usage,
} from '../../types/anthropic.js';
import {
  ChatCompletionChunk,
  ChatCompletionChunkChoice,
  ToolCallDelta,
} from '../../types/openai.js';

/**
 * Thinking data for extended thinking feature
 */
export interface ThinkingData {
  id: string;
  text?: string;
  encrypted?: string;
}

/**
 * Stream processor state
 */
interface ProcessorState {
  messageId: string;
  model: string;
  textAccumulator: string;
  toolCallAccumulator: Map<number, { id: string; name: string; arguments: string }>;
  thinkingAccumulator: Map<number, { thinking: string; signature: string }>;
  completedToolCalls: Array<{ id: string; name: string; arguments: string }>;
  usage: Usage | null;
  stopReason: string | null;
}

/**
 * Anthropic stream processor
 * Converts Messages API events to OpenAI format
 */
export class AnthropicStreamProcessor {
  private state: ProcessorState;

  constructor(private readonly requestId: string) {
    this.state = {
      messageId: '',
      model: '',
      textAccumulator: '',
      toolCallAccumulator: new Map(),
      thinkingAccumulator: new Map(),
      completedToolCalls: [],
      usage: null,
      stopReason: null,
    };
  }

  /**
   * Process a stream event and return ChatCompletion chunk if applicable
   */
  process(event: StreamEvent): ChatCompletionChunk | null {
    switch (event.type) {
      case 'message_start':
        return this.handleMessageStart(event);
      case 'content_block_start':
        return this.handleContentBlockStart(event);
      case 'content_block_delta':
        return this.handleContentBlockDelta(event);
      case 'content_block_stop':
        return this.handleContentBlockStop(event);
      case 'message_delta':
        return this.handleMessageDelta(event);
      case 'message_stop':
        return this.handleMessageStop();
      case 'ping':
        return null;
      case 'error':
        return null;
      default:
        return null;
    }
  }

  /**
   * Handle message_start event
   */
  private handleMessageStart(event: StreamEvent): null {
    if (event.type !== 'message_start') return null;

    this.state.messageId = event.message.id;
    this.state.model = event.message.model;
    this.state.usage = event.message.usage;

    return null;
  }

  /**
   * Handle content_block_start event
   */
  private handleContentBlockStart(event: StreamEvent): ChatCompletionChunk | null {
    if (event.type !== 'content_block_start') return null;

    const block = event.content_block;

    // Handle tool use start
    if (block.type === 'tool_use') {
      const toolCallId = block.id;
      this.state.toolCallAccumulator.set(event.index, {
        id: toolCallId,
        name: block.name,
        arguments: '',
      });

      return this.createChunk({
        role: 'assistant',
        tool_calls: [
          {
            index: event.index,
            id: toolCallId,
            type: 'function',
            function: {
              name: block.name,
              arguments: '',
            },
          },
        ],
      });
    }

    // Handle thinking start
    if (block.type === 'thinking') {
      this.state.thinkingAccumulator.set(event.index, {
        thinking: '',
        signature: '',
      });
    }

    return null;
  }

  /**
   * Handle content_block_delta event
   */
  private handleContentBlockDelta(event: StreamEvent): ChatCompletionChunk | null {
    if (event.type !== 'content_block_delta') return null;

    const delta = event.delta;

    // Handle text delta
    if (delta.type === 'text_delta' && delta.text) {
      this.state.textAccumulator += delta.text;
      return this.createChunk({
        role: 'assistant',
        content: delta.text,
      });
    }

    // Handle tool input delta
    if (delta.type === 'input_json_delta' && delta.partial_json) {
      const toolCall = this.state.toolCallAccumulator.get(event.index);
      if (toolCall) {
        toolCall.arguments += delta.partial_json;
        return this.createChunk({
          tool_calls: [
            {
              index: event.index,
              function: {
                arguments: delta.partial_json,
              },
            },
          ],
        });
      }
    }

    // Handle thinking delta
    if (delta.type === 'thinking_delta' && delta.thinking) {
      const thinking = this.state.thinkingAccumulator.get(event.index);
      if (thinking) {
        thinking.thinking += delta.thinking;
      }
    }

    // Handle signature delta (for thinking verification)
    if (delta.type === 'signature_delta' && delta.signature) {
      const thinking = this.state.thinkingAccumulator.get(event.index);
      if (thinking) {
        thinking.signature += delta.signature;
      }
    }

    return null;
  }

  /**
   * Handle content_block_stop event
   */
  private handleContentBlockStop(event: StreamEvent): ChatCompletionChunk | null {
    if (event.type !== 'content_block_stop') return null;

    // Complete tool call
    const toolCall = this.state.toolCallAccumulator.get(event.index);
    if (toolCall) {
      this.state.completedToolCalls.push(toolCall);
      this.state.toolCallAccumulator.delete(event.index);
    }

    // Complete thinking
    const thinking = this.state.thinkingAccumulator.get(event.index);
    if (thinking && thinking.signature) {
      this.state.thinkingAccumulator.delete(event.index);
    }

    return null;
  }

  /**
   * Handle message_delta event
   */
  private handleMessageDelta(event: StreamEvent): null {
    if (event.type !== 'message_delta') return null;

    // Update usage
    if (event.usage) {
      if (!this.state.usage) {
        this.state.usage = {
          input_tokens: 0,
          output_tokens: event.usage.output_tokens,
        };
      } else {
        this.state.usage.output_tokens = event.usage.output_tokens;
      }
    }

    // Update stop reason
    if (event.delta.stop_reason) {
      this.state.stopReason = event.delta.stop_reason;
    }

    return null;
  }

  /**
   * Handle message_stop event
   */
  private handleMessageStop(): ChatCompletionChunk {
    const finishReason = this.mapStopReason(this.state.stopReason);

    return this.createChunk({
      finish_reason: finishReason,
    });
  }

  /**
   * Map Anthropic stop reason to OpenAI finish reason
   */
  private mapStopReason(
    stopReason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  /**
   * Create a ChatCompletion chunk
   */
  private createChunk(
    choice: Partial<ChatCompletionChunkChoice>
  ): ChatCompletionChunk {
    return {
      id: this.state.messageId || this.requestId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: this.state.model || 'claude-3-5-sonnet-20241022',
      choices: [
        {
          index: 0,
          delta: choice.delta || {
            role: choice.role,
            content: choice.content,
            tool_calls: choice.tool_calls as ToolCallDelta[] | undefined,
          },
          finish_reason: choice.finish_reason ?? null,
        },
      ],
    };
  }

  /**
   * Get final usage information
   */
  getUsage(): Usage | null {
    return this.state.usage;
  }
}
