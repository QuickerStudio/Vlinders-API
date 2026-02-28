/**
 * 速率限制中间件
 * 参考: Vlinder-chat的速率限制实现
 *
 * 基于KV存储实现滑动窗口速率限制
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { RateLimitError } from '../utils/errors';

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

/**
 * 默认速率限制配置
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
};

/**
 * 速率限制中间件
 */
export function rateLimitMiddleware(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const env = c.env;
    const userId = c.get('userId') as string | undefined;

    // 如果没有KV存储或没有用户ID，跳过速率限制
    if (!env.API_KEYS || !userId) {
      await next();
      return;
    }

    // 检查每分钟限制
    if (config.requestsPerMinute) {
      const allowed = await checkRateLimit(
        env.API_KEYS,
        userId,
        'minute',
        config.requestsPerMinute,
        60
      );

      if (!allowed) {
        throw new RateLimitError(
          `Rate limit exceeded: ${config.requestsPerMinute} requests per minute`,
          60
        );
      }
    }

    // 检查每小时限制
    if (config.requestsPerHour) {
      const allowed = await checkRateLimit(
        env.API_KEYS,
        userId,
        'hour',
        config.requestsPerHour,
        3600
      );

      if (!allowed) {
        throw new RateLimitError(
          `Rate limit exceeded: ${config.requestsPerHour} requests per hour`,
          3600
        );
      }
    }

    // 检查每日限制
    if (config.requestsPerDay) {
      const allowed = await checkRateLimit(
        env.API_KEYS,
        userId,
        'day',
        config.requestsPerDay,
        86400
      );

      if (!allowed) {
        throw new RateLimitError(
          `Rate limit exceeded: ${config.requestsPerDay} requests per day`,
          86400
        );
      }
    }

    // 设置响应头
    c.header('X-RateLimit-Limit-Minute', config.requestsPerMinute.toString());
    if (config.requestsPerHour) {
      c.header('X-RateLimit-Limit-Hour', config.requestsPerHour.toString());
    }
    if (config.requestsPerDay) {
      c.header('X-RateLimit-Limit-Day', config.requestsPerDay.toString());
    }

    await next();
  };
}

/**
 * 检查速率限制
 */
async function checkRateLimit(
  kv: KVNamespace,
  userId: string,
  window: 'minute' | 'hour' | 'day',
  limit: number,
  ttl: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = getWindowStart(now, window);
  const key = `ratelimit:${userId}:${window}:${windowStart}`;

  try {
    // 获取当前计数
    const countStr = await kv.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    // 检查是否超限
    if (count >= limit) {
      return false;
    }

    // 增加计数
    await kv.put(key, (count + 1).toString(), { expirationTtl: ttl });

    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // 失败时允许请求通过（fail open）
    return true;
  }
}

/**
 * 获取时间窗口起始时间
 */
function getWindowStart(timestamp: number, window: 'minute' | 'hour' | 'day'): number {
  const date = new Date(timestamp);

  switch (window) {
    case 'minute':
      return Math.floor(timestamp / 60000) * 60000;
    case 'hour':
      date.setMinutes(0, 0, 0);
      return date.getTime();
    case 'day':
      date.setHours(0, 0, 0, 0);
      return date.getTime();
  }
}

/**
 * 获取剩余配额
 */
export async function getRemainingQuota(
  kv: KVNamespace,
  userId: string,
  window: 'minute' | 'hour' | 'day',
  limit: number
): Promise<number> {
  const now = Date.now();
  const windowStart = getWindowStart(now, window);
  const key = `ratelimit:${userId}:${window}:${windowStart}`;

  try {
    const countStr = await kv.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    return Math.max(0, limit - count);
  } catch (error) {
    console.error('Failed to get remaining quota:', error);
    return limit;
  }
}
