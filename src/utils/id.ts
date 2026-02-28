/**
 * ID生成工具
 * 参考: Vlinder-chat的ID生成模式
 */

/**
 * 生成唯一ID
 * 格式: prefix-timestamp-random
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return generateId('req');
}

/**
 * 生成聊天补全ID
 */
export function generateChatCompletionId(): string {
  return generateId('chatcmpl');
}

/**
 * 生成工具调用ID
 */
export function generateToolCallId(): string {
  return generateId('call');
}

/**
 * 生成UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
