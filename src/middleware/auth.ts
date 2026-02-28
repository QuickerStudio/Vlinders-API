/**
 * 认证中间件
 * 参考: Vlinder-chat/src/platform/authentication/common/copilotToken.ts
 *
 * 实现两层验证策略：严格验证 + 回退验证
 */

import type { Context, Next } from 'hono';
import type { Env, AuthContext } from '../types';
import { UnauthorizedError, ExpiredKeyError, InvalidKeyError } from '../utils/errors';
import { createApiKeyStorage } from '../storage/apiKeys';

/**
 * 认证中间件
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  // 检查Authorization头
  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  // 提取token（支持两种格式：Bearer <token> 或 <token>）
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    throw new UnauthorizedError('Invalid Authorization header format');
  }

  // 验证API密钥
  const authContext = await validateApiKey(token, c.env);

  if (!authContext) {
    throw new InvalidKeyError('Invalid API key');
  }

  // 设置认证上下文
  c.set('authContext', authContext);
  c.set('userId', authContext.userId);
  c.set('apiKey', authContext.apiKey);

  await next();
}

/**
 * 验证API密钥（两层策略）
 */
async function validateApiKey(apiKey: string, env: Env): Promise<AuthContext | null> {
  // 第一层：严格验证（从KV存储查询）
  const strictResult = await strictValidate(apiKey, env);
  if (strictResult) {
    return strictResult;
  }

  // 第二层：回退验证（开发模式）
  if (env.ENVIRONMENT === 'development') {
    const fallbackResult = await fallbackValidate(apiKey, env);
    if (fallbackResult) {
      console.warn('Using fallback validation for API key');
      return fallbackResult;
    }
  }

  return null;
}

/**
 * 严格验证（从KV存储）
 */
async function strictValidate(apiKey: string, env: Env): Promise<AuthContext | null> {
  const storage = createApiKeyStorage(env);
  if (!storage) {
    return null;
  }

  try {
    const keyInfo = await storage.get(apiKey);
    if (!keyInfo) {
      return null;
    }

    // 检查密钥是否激活
    if (!keyInfo.active) {
      return null;
    }

    // 检查密钥是否过期
    if (keyInfo.expiresAt && keyInfo.expiresAt < Date.now()) {
      return null;
    }

    return {
      userId: keyInfo.userId,
      apiKey,
      keyInfo,
    };
  } catch (error) {
    console.error('Strict validation failed:', error);
    return null;
  }
}

/**
 * 回退验证（开发模式）
 * 允许以sk-开头的密钥用于开发测试
 */
async function fallbackValidate(apiKey: string, env: Env): Promise<AuthContext | null> {
  // 仅在开发环境允许
  if (env.ENVIRONMENT !== 'development') {
    return null;
  }

  // 允许sk-开头的密钥
  if (apiKey.startsWith('sk-')) {
    return {
      userId: 'dev-user',
      apiKey,
      keyInfo: {
        userId: 'dev-user',
        active: true,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: 10000,
        },
      },
    };
  }

  return null;
}

/**
 * 可选认证中间件（允许匿名访问）
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    try {
      await authMiddleware(c, next);
      return;
    } catch (error) {
      // 认证失败时继续，但不设置认证上下文
      console.warn('Optional auth failed:', error);
    }
  }

  await next();
}
