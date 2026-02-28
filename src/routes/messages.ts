/**
 * Anthropic Messages Route
 *
 * Anthropic Messages API endpoint with OpenAI compatibility
 * POST /v1/messages
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, HonoVariables } from '../types';
import { AnthropicClient } from '../services/anthropic/client.js';
import { transformToMessagesAPI } from '../services/anthropic/transformer.js';
import { AnthropicStreamProcessor } from '../services/anthropic/stream.js';
import { ApiError, ErrorType } from '../utils/errors.js';

/**
 * Content block schema
 */
const contentBlockSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({
      url: z.string(),
      detail: z.enum(['auto', 'low', 'high']).optional(),
    }),
  }),
]);

/**
 * Message schema
 */
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.array(contentBlockSchema)]),
  name: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      })
    )
    .optional(),
  tool_call_id: z.string().optional(),
});

/**
 * Tool schema
 */
const toolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  }),
});

/**
 * Thinking config schema
 */
const thinkingConfigSchema = z.union([
  z.object({
    type: z.literal('enabled'),
    budget_tokens: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('adaptive'),
  }),
]);

/**
 * Messages request schema
 */
const messagesRequestSchema = z.object({
  model: z.string(),
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  stream: z.boolean().optional(),
  tools: z.array(toolSchema).optional(),
  thinking: thinkingConfigSchema.optional(),
});

/**
 * Messages routes
 */
export const messagesRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * POST /v1/messages
 */
messagesRoutes.post(
  '/',
  zValidator('json', messagesRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Invalid request body',
          },
        },
        400
      );
    }
    return undefined;
  }),
  async (c) => {
    const request = c.req.valid('json');
    const env = c.env;
    const requestId = c.get('requestId') as string;

    try {
      // Get Anthropic API key from environment
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new ApiError(
          ErrorType.ConfigurationError,
          'Anthropic API key not configured',
          500
        );
      }

      // Create Anthropic client
      const client = new AnthropicClient({
        apiKey,
        baseURL: env.ANTHROPIC_BASE_URL,
      });

      // Transform request to Messages API format
      const messagesRequest = transformToMessagesAPI({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        top_p: request.top_p,
        max_tokens: request.max_tokens,
        stop: request.stop,
        tools: request.tools,
        thinking: request.thinking,
        stream: request.stream,
      });


      // Handle streaming
      if (request.stream) {
        const eventStream = await client.createMessageStream(messagesRequest);
        const processor = new AnthropicStreamProcessor(requestId);

        // Create SSE stream
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            try {
              for await (const event of eventStream) {
                const chunk = processor.process(event);
                if (chunk) {
                  const data = `data: ${JSON.stringify(chunk)}\n\n`;
                  controller.enqueue(encoder.encode(data));
                }
              }

              // Send [DONE] message
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Request-ID': requestId,
          },
        });
      }

      // Handle non-streaming
      const response = await client.createMessage(messagesRequest);

      return c.json(response);
    } catch (err: any) {
      // Handle Anthropic errors
      if (err.name === 'AnthropicError') {
        return c.json(err.toJSON(), err.statusCode as any);
      }

      // Handle generic errors
      throw err;
    }
  }
);
