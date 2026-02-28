/**
 * 日志中间件
 * 记录请求和响应信息，并在生产环境发送到R2存储
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { sanitize, sanitizeObject } from '../utils/sanitizer';
import { LogStorage } from '../storage/logs';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 日志中间件
 */
export function loggerMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId') as string;
    const method = c.req.method;
    const path = c.req.path;

    // 记录请求开始
    const requestLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      requestId,
      method,
      path,
    };

    // 如果已认证，添加用户ID
    const userId = c.get('userId') as string | undefined;
    if (userId) {
      requestLog.userId = userId;
    }

    // 输出到控制台
    console.log(`→ ${method} ${path}`, { requestId, userId });

    try {
      await next();

      // 记录响应
      const responseTime = Date.now() - startTime;
      const statusCode = c.res.status;

      const responseLog: LogEntry = {
        ...requestLog,
        statusCode,
        responseTime,
      };

      // 输出到控制台
      console.log(`← ${method} ${path} ${statusCode} ${responseTime}ms`, { requestId });

      // 生产环境发送到R2存储
      if (c.env.ENVIRONMENT === 'production' && c.env.LOGS_BUCKET) {
        const logStorage = new LogStorage(c.env.LOGS_BUCKET);
        await logStorage.log({
          timestamp: responseLog.timestamp,
          level: 'info',
          message: `${method} ${path}`,
          method,
          path: sanitize(path),
          status: statusCode,
          duration: responseTime,
          metadata: userId ? { userId } : undefined,
        }).catch(err => console.error('Failed to log to R2:', err));
      }
    } catch (error) {
      // 记录错误
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorLog: LogEntry = {
        ...requestLog,
        level: LogLevel.ERROR,
        statusCode: 500,
        responseTime,
        error: sanitize(errorMessage),
      };

      // 输出到控制台
      console.error(`✗ ${method} ${path} ${responseTime}ms`, {
        requestId,
        error: sanitize(errorMessage),
      });

      // 生产环境发送到R2存储
      if (c.env.ENVIRONMENT === 'production' && c.env.LOGS_BUCKET) {
        const logStorage = new LogStorage(c.env.LOGS_BUCKET);
        await logStorage.log({
          timestamp: errorLog.timestamp,
          level: 'error',
          message: `${method} ${path}`,
          method,
          path: sanitize(path),
          status: 500,
          duration: responseTime,
          error: sanitize(errorMessage),
          metadata: userId ? { userId } : undefined,
        }).catch(err => console.error('Failed to log error to R2:', err));
      }

      // 重新抛出错误，让错误处理中间件处理
      throw error;
    }
  };
}

/**
 * 脱敏日志条目
 */
function sanitizeLog(log: LogEntry): LogEntry {
  return {
    ...log,
    path: sanitize(log.path),
    error: log.error ? sanitize(log.error) : undefined,
    metadata: log.metadata ? sanitizeObject(log.metadata) : undefined,
  };
}
