/**
 * Copilot Responses API client
 * Handles both streaming and non-streaming requests
 */

import axios, { AxiosInstance } from 'axios';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ChatMessage,
} from '../../types/chat';
import {
  ResponsesRequest,
  ReasoningConfig,
  ContextManagementResponse,
  ThinkingData,
} from '../../types/copilot';
import { rawMessagesToResponseAPI } from './transformer';
import { applyContextManagement } from './contextManager';
import { logger } from '../../utils/logger';

/**
 * Copilot client configuration
 */
export interface CopilotClientConfig {
  /** API base URL */
  baseURL: string;
  /** API token */
  token: string;
  /** Model family */
  modelFamily?: string;
  /** Model max prompt tokens */
  modelMaxPromptTokens?: number;
  /** Enable context management */
  enableContextManagement?: boolean;
  /** Enable reasoning */
  enableReasoning?: boolean;
  /** Reasoning effort level */
  reasoningEffort?: 'low' | 'medium' | 'high';
  /** Reasoning summary mode */
  reasoningSummary?: 'auto' | 'concise' | 'detailed' | 'off';
  /** Enable truncation */
  enableTruncation?: boolean;
}

/**
 * Copilot Responses API client
 */
export class CopilotClient {
  private client: AxiosInstance;
  private config: CopilotClientConfig;

  constructor(config: CopilotClientConfig) {
    this.config = {
      enableContextManagement: true,
      enableReasoning: true,
      reasoningEffort: 'medium',
      reasoningSummary: 'auto',
      enableTruncation: false,
      modelMaxPromptTokens: 50000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a non-streaming response
   */
  async createResponse(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const responsesRequest = this.buildResponsesRequest(request, false);

    logger.debug('Copilot Responses API request:', {
      model: responsesRequest.model,
      inputItems: responsesRequest.input.length,
      previousResponseId: responsesRequest.previous_response_id,
    });

    const response = await this.client.post<any>(
      '/responses',
      responsesRequest
    );

    return this.transformResponse(response.data);
  }

  /**
   * Create a streaming response
   */
  async *createResponseStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk> {
    const responsesRequest = this.buildResponsesRequest(request, true);

    logger.debug('Copilot Responses API streaming request:', {
      model: responsesRequest.model,
      inputItems: responsesRequest.input.length,
      previousResponseId: responsesRequest.previous_response_id,
    });

    const response = await this.client.post<ReadableStream>(
      '/responses',
      responsesRequest,
      {
        responseType: 'stream',
      }
    );

    yield* this.processStreamResponse(response.data);
  }

  /**
   * Build Responses API request from chat completion request
   */
  private buildResponsesRequest(
    request: ChatCompletionRequest,
    stream: boolean
  ): ResponsesRequest {
    // Transform messages to Responses API format
    const { input, previous_response_id } = rawMessagesToResponseAPI(
      request.messages,
      {
        modelId: request.model,
        ignoreStatefulMarker: false,
      }
    );

    // Build base request
    const responsesRequest: ResponsesRequest = {
      model: request.model,
      input,
      previous_response_id,
      stream,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      n: request.n,
      stop: request.stop,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      logit_bias: request.logit_bias,
      user: request.user,
    };

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      responsesRequest.tools = request.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters || {},
          strict: false,
        },
      }));

      // Handle tool_choice
      if (request.tool_choice) {
        if (typeof request.tool_choice === 'object') {
          responsesRequest.tool_choice = {
            type: 'function',
            name: request.tool_choice.function.name,
          };
        } else {
          responsesRequest.tool_choice = request.tool_choice;
        }
      }
    }

    // Add context management
    if (this.config.enableContextManagement) {
      const contextManagement = applyContextManagement(
        this.config.modelMaxPromptTokens || 50000,
        true
      );
      if (contextManagement) {
        responsesRequest.context_management = contextManagement;
      }
    }

    // Add reasoning configuration
    if (this.config.enableReasoning) {
      const reasoning: ReasoningConfig = {};

      if (this.config.reasoningEffort) {
        reasoning.effort = this.config.reasoningEffort;
      }

      if (
        this.config.reasoningSummary &&
        this.config.reasoningSummary !== 'off'
      ) {
        reasoning.summary = this.config.reasoningSummary;
      }

      if (Object.keys(reasoning).length > 0) {
        responsesRequest.reasoning = reasoning;
      }
    }

    // Add truncation
    responsesRequest.truncation = this.config.enableTruncation
      ? 'auto'
      : 'disabled';

    // Include encrypted reasoning content
    responsesRequest.include = ['reasoning.encrypted_content'];

    return responsesRequest;
  }

  /**
   * Transform Responses API response to chat completion response
   */
  private transformResponse(data: any): ChatCompletionResponse {
    const message: ChatMessage = {
      role: 'assistant',
      content: [],
    };

    // Extract text content from output
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              message.content.push({
                type: 'text',
                text: content.text,
              });
            }
          }
        }
      }
    }

    return {
      id: data.id || 'response-' + Date.now(),
      object: 'chat.completion',
      created: data.created_at || Math.floor(Date.now() / 1000),
      model: data.model || this.config.modelFamily || 'unknown',
      choices: [
        {
          index: 0,
          message,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Process streaming response
   */
  private async *processStreamResponse(
    stream: any
  ): AsyncGenerator<ChatCompletionChunk> {
    let buffer = '';
    const textDecoder = new TextDecoder();

    for await (const chunk of stream) {
      buffer += textDecoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) {
          continue;
        }

        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          return;
        }

        try {
          const event = JSON.parse(data);
          const chunk = this.transformStreamEvent(event);
          if (chunk) {
            yield chunk;
          }
        } catch (error) {
          logger.error('Failed to parse SSE event:', error);
        }
      }
    }
  }

  /**
   * Transform stream event to chat completion chunk
   */
  private transformStreamEvent(event: any): ChatCompletionChunk | null {
    switch (event.type) {
      case 'response.output_text.delta':
        return {
          id: 'chunk-' + Date.now(),
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: this.config.modelFamily || 'unknown',
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                content: event.delta,
              },
              finish_reason: null,
            },
          ],
        };

      case 'response.completed':
        return {
          id: event.response.id,
          object: 'chat.completion.chunk',
          created: event.response.created_at,
          model: event.response.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };

      default:
        return null;
    }
  }
}
