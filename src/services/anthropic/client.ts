/**
 * Anthropic Messages API Client
 *
 * HTTP client for Anthropic Messages API
 * Handles both streaming and non-streaming requests
 */

import {
  MessagesRequest,
  MessagesResponse,
  StreamEvent,
  AnthropicError,
} from '../../types/anthropic.js';

/**
 * Client configuration
 */
export interface AnthropicClientConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}

/**
 * Anthropic Messages API client
 */
export class AnthropicClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor(config: AnthropicClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
  }

  /**
   * Create a message (non-streaming)
   */
  async createMessage(request: Omit<MessagesRequest, 'stream'>): Promise<MessagesResponse> {
    const url = `${this.baseURL}/v1/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as MessagesResponse;
      return data;
    } catch (error) {
      if (error instanceof AnthropicError) {
        throw error;
      }
      throw new AnthropicError(
        error instanceof Error ? error.message : 'Unknown error',
        'api_error',
        500
      );
    }
  }

  /**
   * Create a message stream
   */
  async createMessageStream(
    request: Omit<MessagesRequest, 'stream'>
  ): Promise<AsyncIterable<StreamEvent>> {
    const url = `${this.baseURL}/v1/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new AnthropicError('No response body', 'api_error', 500);
      }

      return this.parseSSEStream(response.body);
    } catch (error) {
      if (error instanceof AnthropicError) {
        throw error;
      }
      throw new AnthropicError(
        error instanceof Error ? error.message : 'Unknown error',
        'api_error',
        500
      );
    }
  }

  /**
   * Parse SSE stream from response body
   */
  private async *parseSSEStream(body: NodeJS.ReadableStream): AsyncIterable<StreamEvent> {
    let buffer = '';

    for await (const chunk of body) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            return;
          }

          if (data) {
            try {
              const event = JSON.parse(data) as StreamEvent;
              yield event;
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorType = 'api_error';

    try {
      const errorData = (await response.json()) as {
        error?: { type?: string; message?: string };
      };
      if (errorData.error) {
        errorType = errorData.error.type || errorType;
        errorMessage = errorData.error.message || errorMessage;
      }
    } catch {
      // Use default error message
    }

    throw new AnthropicError(errorMessage, errorType, response.status);
  }
}

/**
 * Create Anthropic client from environment
 */
export function createAnthropicClient(): AnthropicClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return new AnthropicClient({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL,
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL,
  });
}
