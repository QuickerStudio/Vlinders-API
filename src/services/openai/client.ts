/**
 * OpenAI Client
 *
 * Production-grade OpenAI API client with:
 * - Streaming and non-streaming support
 * - Complete error handling
 * - Tool call support
 * - Multimodal content
 */

import { Fetcher, FetchError, isAbortError } from '../../network/fetcher';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  OpenAIError,
  OpenAIErrorResponse,
} from '../../types/openai';
import { OpenAIStreamProcessor, createSSEStream } from './stream';
import { transformMessages } from './transformer';

/**
 * OpenAI client options
 */
export interface OpenAIClientOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

/**
 * OpenAI API client
 */
export class OpenAIClient {
  private fetcher: Fetcher;
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private retries: number;

  constructor(options: OpenAIClientOptions) {
    this.fetcher = new Fetcher();
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';
    this.timeout = options.timeout || 60000;
    this.retries = options.retries || 2;
  }

  /**
   * Creates chat completion (non-streaming)
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    // Ensure stream is false
    const body = {
      ...request,
      stream: false,
      messages: transformMessages(request.messages),
    };

    try {
      const response = await this.fetcher.fetch(
        `${this.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          timeout: this.timeout,
          retries: this.retries,
          signal,
        }
      );

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return await response.json<ChatCompletionResponse>();
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Creates chat completion (streaming)
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): Promise<ReadableStream<Uint8Array>> {
    // Ensure stream is true
    const body = {
      ...request,
      stream: true,
      messages: transformMessages(request.messages),
    };

    try {
      const response = await this.fetcher.fetch(
        `${this.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          timeout: this.timeout,
          retries: 0, // No retries for streaming
          signal,
        }
      );

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      // Return the raw stream
      return response.stream();
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Creates chat completion with async iterator (streaming)
   */
  async *createChatCompletionIterator(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatCompletionChunk, void, undefined> {
    const stream = await this.createChatCompletionStream(request, signal);
    const processor = new OpenAIStreamProcessor();

    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Feed chunk to processor
        processor.feed(value);

        // Yield accumulated chunks
        const chunks = processor.getChunks();
        for (const chunk of chunks) {
          yield chunk;
        }

        // Reset for next batch
        processor.reset();
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Gets request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Handles error response
   */
  private async handleErrorResponse(
    response: any
  ): Promise<OpenAIError> {
    let errorData: OpenAIErrorResponse;

    try {
      errorData = await response.json();
    } catch {
      // Fallback if response is not JSON
      errorData = {
        error: {
          message: response.statusText || 'Unknown error',
          type: 'api_error',
        },
      };
    }

    const { message, type, param, code } = errorData.error;

    // Map status codes to error types
    let errorType = type;
    if (response.status === 401) {
      errorType = 'invalid_api_key';
    } else if (response.status === 429) {
      errorType = 'rate_limit_exceeded';
    } else if (response.status === 500) {
      errorType = 'server_error';
    }

    return new (class extends Error {
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
    })(message, errorType, response.status, param, code);
  }

  /**
   * Handles generic errors
   */
  private handleError(err: any): Error {
    if (isAbortError(err)) {
      return new Error('Request was aborted');
    }

    if (err instanceof FetchError) {
      if (err.code === 'TIMEOUT') {
        return new Error('Request timeout');
      }
      if (err.code === 'NETWORK_ERROR') {
        return new Error('Network error');
      }
    }

    return err instanceof Error ? err : new Error('Unknown error');
  }
}

/**
 * Creates OpenAI client instance
 */
export function createOpenAIClient(
  options: OpenAIClientOptions
): OpenAIClient {
  return new OpenAIClient(options);
}
