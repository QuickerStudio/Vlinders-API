import type { R2Bucket } from '@cloudflare/workers-types';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class LogStorage {
  private bucket: R2Bucket;
  private buffer: LogEntry[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute
  private flushTimer?: number;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);

    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setTimeout(() => {
      this.flush().catch(console.error);
    }, this.FLUSH_INTERVAL) as unknown as number;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const key = `logs/${date}/${timestamp}.json`;

    const content = logs.map(log => JSON.stringify(log)).join('\n');

    try {
      await this.bucket.put(key, content, {
        httpMetadata: {
          contentType: 'application/x-ndjson',
        },
      });
    } catch (error) {
      console.error('Failed to write logs to R2:', error);
      // Re-add logs to buffer on failure
      this.buffer.unshift(...logs);
    }
  }

  async getLogs(date: string, limit = 1000): Promise<LogEntry[]> {
    const prefix = `logs/${date}/`;
    const list = await this.bucket.list({ prefix, limit: 100 });

    const logs: LogEntry[] = [];

    for (const object of list.objects) {
      if (logs.length >= limit) break;

      const content = await this.bucket.get(object.key);
      if (!content) continue;

      const text = await content.text();
      const entries = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
      logs.push(...entries);
    }

    return logs.slice(0, limit);
  }

  async cleanup(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    let deleted = 0;
    const list = await this.bucket.list({ prefix: 'logs/' });

    for (const object of list.objects) {
      const dateMatch = object.key.match(/logs\/(\d{4}-\d{2}-\d{2})\//);
      if (dateMatch && dateMatch[1] < cutoffDateStr) {
        await this.bucket.delete(object.key);
        deleted++;
      }
    }

    return deleted;
  }
}
