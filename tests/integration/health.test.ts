import { describe, it, expect, beforeAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Health Check Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const resp = await worker.fetch('/health');
      expect(resp.status).toBe(200);

      const data = await resp.json();
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
      });
    });

    it('should include service checks', async () => {
      const resp = await worker.fetch('/health');
      const data = await resp.json();

      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.cache).toBeDefined();
      expect(data.checks.storage).toBeDefined();
    });

    it('should return response within acceptable time', async () => {
      const start = Date.now();
      const resp = await worker.fetch('/health');
      const duration = Date.now() - start;

      expect(resp.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const resp = await worker.fetch('/health/ready');
      expect(resp.status).toBe(200);

      const data = await resp.json();
      expect(data).toMatchObject({
        ready: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });

    it('should check all dependencies', async () => {
      const resp = await worker.fetch('/health/ready');
      const data = await resp.json();

      if (data.checks) {
        expect(data.checks.database).toBeDefined();
        expect(data.checks.cache).toBeDefined();
      }
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const resp = await worker.fetch('/health/live');
      expect(resp.status).toBe(200);

      const data = await resp.json();
      expect(data).toMatchObject({
        alive: true,
        timestamp: expect.any(String),
      });
    });

    it('should respond quickly', async () => {
      const start = Date.now();
      const resp = await worker.fetch('/health/live');
      const duration = Date.now() - start;

      expect(resp.status).toBe(200);
      expect(duration).toBeLessThan(500); // Should respond within 500ms
    });
  });

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      const resp = await worker.fetch('/nonexistent');
      expect(resp.status).toBe(404);

      const data = await resp.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        code: 'NOT_FOUND',
      });
    });

    it('should include request ID in error responses', async () => {
      const resp = await worker.fetch('/nonexistent');
      const data = await resp.json();

      expect(data.requestId).toBeDefined();
      expect(typeof data.requestId).toBe('string');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const resp = await worker.fetch('/health', {
        headers: {
          'Origin': 'https://example.com',
        },
      });

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      const resp = await worker.fetch('/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(resp.status).toBe(204);
      expect(resp.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(150).fill(null).map(() =>
        worker.fetch('/health')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // Should rate limit after many requests
      expect(rateLimited).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const resp = await worker.fetch('/health');

      expect(resp.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(resp.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });
});
