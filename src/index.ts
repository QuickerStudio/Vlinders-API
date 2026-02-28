/**
 * Vlinders API - Main Entry Point
 *
 * 生产级AI API服务器
 * 基于Cloudflare Workers + Hono
 * 完整复刻Copilot API功能
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import type { Env, HonoVariables } from './types';
import { healthRoutes } from './routes/health';
import { chatRoutes } from './routes/chat';
import { responsesRoutes } from './routes/responses';
import { messagesRoutes } from './routes/messages';
import { toApiError, RateLimitError } from './utils/errors';
import { sanitize } from './utils/sanitizer';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { loggerMiddleware } from './middleware/logger';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// 全局中间件
// ============================================================================

/**
 * 日志中间件
 */
app.use('*', loggerMiddleware());

/**
 * 美化JSON输出
 */
app.use('*', prettyJSON());

/**
 * CORS配置
 */
app.use(
  '*',
  cors({
    origin: '*', // 生产环境应该限制具体域名
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['Content-Length', 'X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 600,
    credentials: true,
  })
);

/**
 * 请求ID中间件
 */
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});

// ============================================================================
// 路由
// ============================================================================

/**
 * 健康检查路由（无需认证）
 */
app.route('/', healthRoutes);

/**
 * API路由（需要认证和速率限制）
 */
app.use('/v1/*', authMiddleware);
app.use('/v1/*', rateLimitMiddleware());

/**
 * Chat completions endpoint (Phase 3)
 */
app.route('/v1/chat', chatRoutes);

/**
 * Copilot Responses API endpoint (Phase 4)
 */
app.route('/v1/responses', responsesRoutes);

/**
 * Anthropic Messages API endpoint (Phase 5)
 */
app.route('/v1/messages', messagesRoutes);

// ============================================================================
// 错误处理
// ============================================================================

/**
 * 404处理
 */
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: 'Not Found',
        type: 'not_found',
        code: 404,
        path: c.req.path,
      },
    },
    404
  );
});

/**
 * 全局错误处理
 */
app.onError((err, c) => {
  console.error('Error:', err);

  const apiError = toApiError(err);

  // 脱敏错误消息
  const sanitizedMessage = sanitize(apiError.message);

  // 记录错误（生产环境应该发送到日志服务）
  if (c.env.ENVIRONMENT === 'production') {
    // TODO: Phase 6 - 发送到R2日志存储
    console.error('Production error:', {
      type: apiError.type,
      message: sanitizedMessage,
      code: apiError.code,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    });
  }

  // 处理速率限制错误，添加Retry-After头
  if (apiError instanceof RateLimitError && apiError.retryAfter) {
    c.header('Retry-After', apiError.retryAfter.toString());
  }

  return c.json(
    {
      error: {
        type: apiError.type,
        message: sanitizedMessage,
        code: apiError.code,
        ...(apiError.details && { details: apiError.details }),
      },
    },
    apiError.code as any
  );
});

// ============================================================================
// 导出
// ============================================================================

export default app;
