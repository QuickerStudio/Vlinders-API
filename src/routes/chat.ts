/**
 * Chat Completions Route
 *
 * OpenAI-compatible chat completions endpoint
 * POST /v1/chat/completions
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, HonoVariables } from '../types';
import { createOpenAIClient } from '../services/openai/client';
import { ApiError, ErrorType } from '../utils/errors';

/**
 * Chat message schema
 */
const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([
    z.string(),
    z.array(
      z.union([
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
      ])
    ),
  ]),
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
    strict: z.boolean().optional(),
  }),
});

/**
 * Chat completion request schema
 */
const chatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  tools: z.array(toolSchema).optional(),
  tool_choice: z
    .union([
      z.enum(['none', 'auto', 'required']),
      z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
        }),
      }),
    ])
    .optional(),
  response_format: z
    .object({
      type: z.enum(['text', 'json_object']),
    })
    .optional(),
  seed: z.number().int().optional(),
});

/**
 * Chat routes
 */
export const chatRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * POST /v1/chat/completions
 */
chatRoutes.post(
  '/completions',
  zValidator('json', chatCompletionRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            message: 'Invalid request body',
            type: 'invalid_request_error',
            code: 'invalid_request',
            details: result.error.errors,
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

    try {
      // Get OpenAI API key from environment
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ApiError(
          ErrorType.ConfigurationError,
          'OpenAI API key not configured',
          500
        );
      }

      // Create OpenAI client
      const client = createOpenAIClient({
        apiKey,
        baseURL: env.OPENAI_BASE_URL,
        timeout: 60000,
        retries: 2,
      });

      // Handle streaming
      if (request.stream) {
        const stream = await client.createChatCompletionStream(request);

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Request-ID': c.get('requestId') as string,
          },
        });
      }

      // Handle non-streaming
      const response = await client.createChatCompletion(request);

      return c.json(response);
    } catch (err: any) {
      // Handle OpenAI errors
      if (err.name === 'OpenAIError') {
        return c.json(err.toJSON(), err.statusCode as any);
      }

      // Handle generic errors
      throw err;
    }
  }
);
