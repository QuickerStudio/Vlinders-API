/**
 * 数据脱敏工具
 * 参考: Vlinder-chat/src/extension/log/vscode-node/test/sanitizer.spec.ts
 *
 * 用于在日志和遥测中脱敏敏感信息
 */

/**
 * 脱敏字符串中的敏感信息
 */
export function sanitize(input: string): string {
  if (!input) return input;

  let output = input;

  // 1. 脱敏IP地址 -> 000.0.0.0
  output = output.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '000.0.0.0');

  // 2. 脱敏端口号 -> :0000
  output = output.replace(/:(\d{4,5})\b/g, ':0000');

  // 3. 脱敏UUID -> 000a00a0-aa00-0a0a-0aa0-0a00000aaa00
  output = output.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    '000a00a0-aa00-0a0a-0aa0-0a00000aaa00'
  );

  // 4. 脱敏Bearer Token -> Bearer ***
  output = output.replace(/Bearer\s+[\w\-._~+/]+=*/gi, 'Bearer ***');

  // 5. 脱敏API密钥 (sk-xxx, sk-ant-xxx等) -> sk-***
  output = output.replace(/\b(sk-[a-z]*-)?[a-zA-Z0-9]{20,}\b/g, 'sk-***');

  // 6. 脱敏Basic认证 -> Basic ***
  output = output.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic ***');

  // 7. 脱敏邮箱地址 -> ***@***.***
  output = output.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');

  // 8. 脱敏域名（保留结构）-> aaaaaa0-aaaaa.aaaa.aa.aa
  output = output.replace(
    /\b([a-z0-9-]+\.)+[a-z]{2,}\b/gi,
    (match) => match.replace(/[a-z0-9]/gi, (c) => (/\d/.test(c) ? '0' : 'a'))
  );

  return output;
}

/**
 * 脱敏对象中的敏感字段
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, sensitiveKeys: string[] = []): T {
  const defaultSensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'auth',
  ];

  const allSensitiveKeys = [...defaultSensitiveKeys, ...sensitiveKeys];

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (allSensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '***';
    } else if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitize(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], sensitiveKeys);
    }
  }

  return sanitized;
}

/**
 * 脱敏错误对象
 */
export function sanitizeError(error: Error): { message: string; stack?: string } {
  return {
    message: sanitize(error.message),
    stack: error.stack ? sanitize(error.stack) : undefined,
  };
}
