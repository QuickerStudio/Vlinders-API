/**
 * Responses Route (Placeholder for Phase 4)
 *
 * Copilot responses endpoint
 * POST /v1/responses
 */

import { Hono } from 'hono';
import type { Env, HonoVariables } from '../types';

export const responsesRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * POST /v1/responses
 */
responsesRoutes.post('/responses', (c) => {
  return c.json(
    {
      message: 'Copilot responses endpoint - Coming in Phase 4',
      status: 'not_implemented',
    },
    501
  );
});
