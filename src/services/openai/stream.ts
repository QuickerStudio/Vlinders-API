/**
 * OpenAI Streaming Processor
 *
 * Handles SSE streaming responses from OpenAI API
 * Accumulates tool call arguments and generates chunks
 */

import { SSEParser, type ISSEEvent } from '../../network/sseParser';
import type {
  ChatCompletionChunk,
  ChatCompletionChunkChoice,
  ToolCallDelta,
  OpenAIError,
} from '../../types/openai';

/**
 * Streaming tool call accumulator
 */
class StreamingToolCall {
  id?: string;
  name?: string;
  arguments = '';

  update(delta: ToolCallDelta): boolean {
    let changed = false;

    if (delta.id) {
      this.id = delta.id;
    }

    if (delta.function?.name) {
      this.name = delta.function.name;
    }

    if (delta.function?.arguments) {
      this.arguments += delta.function.arguments;
      changed = true;
    }

    return changed;
  }

  isComplete(): boolean {
    return !!(this.id && this.name);
  }
}

/**
 * Streaming tool calls manager
 */
class StreamingToolCalls {
  private toolCalls: StreamingToolCall[] = [];

  update(deltas: ToolCallDelta[]): ToolCallDelta[] {
    const updates: ToolCallDelta[] = [];

    for (const delta of deltas) {
      let currentCall: StreamingToolCall | undefined;

      // Find existing tool call by index
      if (delta.index !== undefined) {
        currentCall = this.toolCalls[delta.index];
      }

      // Create new tool call if needed
      if (!currentCall) {
        currentCall = new StreamingToolCall();
        this.toolCalls[delta.index] = currentCall;
      }

      // Update and track changes
      const changed = currentCall.update(delta);
      if (changed || delta.id || delta.function?.name) {
        updates.push({
          index: delta.index,
          id: currentCall.id,
          type: 'function',
          function: {
            name: currentCall.name,
            arguments: currentCall.arguments,
          },
        });
      }
    }

    return updates;
  }

  getToolCalls() {
    return this.toolCalls
      .filter((call) => call.isComplete())
      .map((call, index) => ({
        index,
        id: call.id!,
        type: 'function' as const,
        function: {
          name: call.name!,
          arguments: call.arguments,
        },
      }));
  }

  hasToolCalls(): boolean {
    return this.toolCalls.some((call) => call.isComplete());
  }
}

/**
 * Stream processor options
 */
export interface StreamProcessorOptions {
  onChunk?: (chunk: ChatCompletionChunk) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

/**
 * OpenAI streaming processor
 */
export class OpenAIStreamProcessor {
  private parser: SSEParser;
  private toolCalls = new StreamingToolCalls();
  private chunks: ChatCompletionChunk[] = [];

  constructor(private options: StreamProcessorOptions = {}) {
    this.parser = new SSEParser((event) => this.handleEvent(event));
  }

  /**
   * Feeds data chunk to processor
   */
  feed(chunk: Uint8Array): void {
    this.parser.feed(chunk);
  }

  /**
   * Handles SSE event
   */
  private handleEvent(event: ISSEEvent): void {
    // Skip non-message events
    if (event.type !== 'message') {
      return;
    }

    // Handle [DONE] marker
    if (event.data === '[DONE]') {
      this.options.onDone?.();
      return;
    }

    try {
      const chunk = JSON.parse(event.data) as ChatCompletionChunk;
      this.processChunk(chunk);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to parse SSE data');
      this.options.onError?.(error);
    }
  }

  /**
   * Processes a chunk
   */
  private processChunk(chunk: ChatCompletionChunk): void {
    // Process tool calls in choices
    for (const choice of chunk.choices) {
      if (choice.delta.tool_calls) {
        const updates = this.toolCalls.update(choice.delta.tool_calls);
        if (updates.length > 0) {
          // Update delta with accumulated tool calls
          choice.delta.tool_calls = updates;
        }
      }
    }

    this.chunks.push(chunk);
    this.options.onChunk?.(chunk);
  }

  /**
   * Gets all accumulated chunks
   */
  getChunks(): ChatCompletionChunk[] {
    return this.chunks;
  }

  /**
   * Gets accumulated tool calls
   */
  getToolCalls() {
    return this.toolCalls.getToolCalls();
  }

  /**
   * Resets processor state
   */
  reset(): void {
    this.parser.reset();
    this.toolCalls = new StreamingToolCalls();
    this.chunks = [];
  }
}

/**
 * Creates SSE stream from chunks
 */
export function createSSEStream(
  chunks: AsyncIterable<ChatCompletionChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // Send [DONE] marker
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Formats error as SSE event
 */
export function formatErrorAsSSE(error: OpenAIError): string {
  return `data: ${JSON.stringify({ error: error.toJSON() })}\n\n`;
}
