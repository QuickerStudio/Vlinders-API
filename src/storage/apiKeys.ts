/**
 * API密钥存储管理
 * 参考: Vlinder-chat的Token管理系统
 *
 * 使用Cloudflare KV存储API密钥信息
 */

import type { Env, ApiKeyInfo } from '../types';

/**
 * API密钥存储类
 */
export class ApiKeyStorage {
  constructor(private readonly kv: KVNamespace) {}

  /**
   * 获取API密钥信息
   */
  async get(apiKey: string): Promise<ApiKeyInfo | null> {
    try {
      const data = await this.kv.get(`apikey:${apiKey}`);
      if (!data) return null;

      const keyInfo = JSON.parse(data) as ApiKeyInfo;

      // 检查密钥是否过期
      if (keyInfo.expiresAt && keyInfo.expiresAt < Date.now()) {
        return null;
      }

      // 检查密钥是否激活
      if (!keyInfo.active) {
        return null;
      }

      return keyInfo;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  /**
   * 保存API密钥信息
   */
  async set(apiKey: string, keyInfo: ApiKeyInfo, ttl?: number): Promise<void> {
    try {
      const options = ttl ? { expirationTtl: ttl } : undefined;
      await this.kv.put(`apikey:${apiKey}`, JSON.stringify(keyInfo), options);
    } catch (error) {
      console.error('Failed to set API key:', error);
      throw error;
    }
  }

  /**
   * 删除API密钥
   */
  async delete(apiKey: string): Promise<void> {
    try {
      await this.kv.delete(`apikey:${apiKey}`);
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw error;
    }
  }

  /**
   * 更新使用量
   */
  async updateUsage(apiKey: string, tokensUsed: number): Promise<void> {
    try {
      const keyInfo = await this.get(apiKey);
      if (!keyInfo) return;

      if (!keyInfo.usage) {
        keyInfo.usage = {
          requestsToday: 0,
          tokensToday: 0,
        };
      }

      keyInfo.usage.requestsToday += 1;
      keyInfo.usage.tokensToday += tokensUsed;

      await this.set(apiKey, keyInfo);
    } catch (error) {
      console.error('Failed to update usage:', error);
    }
  }

  /**
   * 检查配额
   */
  async checkQuota(apiKey: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const keyInfo = await this.get(apiKey);
      if (!keyInfo) {
        return { allowed: false, reason: 'Invalid API key' };
      }

      if (!keyInfo.rateLimit) {
        return { allowed: true };
      }

      const usage = keyInfo.usage || { requestsToday: 0, tokensToday: 0 };

      // 检查每日请求限制
      if (
        keyInfo.rateLimit.requestsPerDay &&
        usage.requestsToday >= keyInfo.rateLimit.requestsPerDay
      ) {
        return { allowed: false, reason: 'Daily request quota exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check quota:', error);
      return { allowed: false, reason: 'Failed to check quota' };
    }
  }
}

/**
 * 创建API密钥存储实例
 */
export function createApiKeyStorage(env: Env): ApiKeyStorage | null {
  if (!env.API_KEYS) {
    console.warn('API_KEYS KV namespace not configured');
    return null;
  }
  return new ApiKeyStorage(env.API_KEYS);
}
