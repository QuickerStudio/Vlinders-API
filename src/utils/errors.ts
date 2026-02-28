/**
 * 错误定义
 * 参考: Vlinder-chat的错误分类系统
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 认证错误
  Unauthorized = 'unauthorized',
  ExpiredKey = 'expired_key',
  InvalidKey = 'invalid_key',
  MissingAuth = 'missing_auth',

  // 速率限制
  RateLimited = 'rate_limited',
  QuotaExceeded = 'quota_exceeded',

  // 请求错误
  InvalidRequest = 'invalid_request',
  InvalidModel = 'invalid_model',
  InvalidParameter = 'invalid_parameter',

  // 服务器错误
  ServerError = 'server_error',
  ConfigurationError = 'configuration_error',
  NetworkError = 'network_error',
  Timeout = 'timeout',

  // 业务错误
  NotFound = 'not_found',
  MethodNotAllowed = 'method_not_allowed',
}

/**
 * API错误基类
 */
export class ApiError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly message: string,
    public readonly code: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      error: {
        type: this.type,
        message: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * 认证错误
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(ErrorType.Unauthorized, message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * API密钥过期错误
 */
export class ExpiredKeyError extends ApiError {
  constructor(message: string = 'API key has expired', details?: any) {
    super(ErrorType.ExpiredKey, message, 401, details);
    this.name = 'ExpiredKeyError';
  }
}

/**
 * 无效API密钥错误
 */
export class InvalidKeyError extends ApiError {
  constructor(message: string = 'Invalid API key', details?: any) {
    super(ErrorType.InvalidKey, message, 401, details);
    this.name = 'InvalidKeyError';
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    details?: any
  ) {
    super(ErrorType.RateLimited, message, 429, { ...details, retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends ApiError {
  constructor(message: string = 'Quota exceeded', details?: any) {
    super(ErrorType.QuotaExceeded, message, 429, details);
    this.name = 'QuotaExceededError';
  }
}

/**
 * 无效请求错误
 */
export class InvalidRequestError extends ApiError {
  constructor(message: string = 'Invalid request', details?: any) {
    super(ErrorType.InvalidRequest, message, 400, details);
    this.name = 'InvalidRequestError';
  }
}

/**
 * 服务器错误
 */
export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(ErrorType.ServerError, message, 500, details);
    this.name = 'ServerError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends ApiError {
  constructor(message: string = 'Network error', details?: any) {
    super(ErrorType.NetworkError, message, 502, details);
    this.name = 'NetworkError';
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout', details?: any) {
    super(ErrorType.Timeout, message, 504, details);
    this.name = 'TimeoutError';
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found', details?: any) {
    super(ErrorType.NotFound, message, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 判断是否为API错误
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * 将未知错误转换为API错误
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ServerError(error.message, { originalError: error.name });
  }

  return new ServerError('Unknown error', { error: String(error) });
}
