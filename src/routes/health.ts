/**
 * 健康检查路由
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET / - 根路径，返回API信息
 */
app.get('/', (c) => {
  return c.json({
    name: 'Vlinders API',
    version: '1.0.0',
    description: 'Production-grade AI API server - Copilot API compatible',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/v1/chat/completions',
      '/v1/responses',
      '/v1/messages',
      '/health',
    ],
  });
});

/**
 * GET /health - 健康检查
 */
app.get('/health', (c) => {
  const env = c.env;

  // 检查环境变量
  const checks = {
    openai: !!env.OPENAI_API_KEY,
    anthropic: !!env.ANTHROPIC_API_KEY,
    kv: !!env.API_KEYS,
    db: !!env.DB,
    logs: !!env.LOGS,
  };

  const allHealthy = Object.values(checks).every((check) => check);

  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    environment: env.ENVIRONMENT || 'unknown',
  });
});

/**
 * GET /health/ready - 就绪检查
 */
app.get('/health/ready', (c) => {
  const env = c.env;

  // 至少需要一个AI提供商的API密钥
  const ready = !!(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY);

  if (!ready) {
    return c.json(
      {
        status: 'not_ready',
        message: 'No AI provider API key configured',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }

  return c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live - 存活检查
 */
app.get('/health/live', (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = app;
