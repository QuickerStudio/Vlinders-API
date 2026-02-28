/**
 * HTTP Client with Fetch Wrapper
 *
 * Production-grade fetch wrapper with:
 * - Timeout control
 * - Error retry
 * - Byte counting
 * - Streaming support
 */

/**
 * Fetch options
 */
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | ReadableStream<Uint8Array>;
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
}

/**
 * Fetch response wrapper
 */
export class FetchResponse {
  private _bytesReceived = 0;

  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly headers: Headers,
    public readonly body: ReadableStream<Uint8Array> | null,
    public readonly url: string
  ) {}

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  get bytesReceived(): number {
    return this._bytesReceived;
  }

  /**
   * Gets response body as text
   */
  async text(): Promise<string> {
    if (!this.body) {
      return '';
    }

    const chunks: Uint8Array[] = [];
    const reader = this.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this._bytesReceived += value.length;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(result);
  }

  /**
   * Gets response body as JSON
   */
  async json<T = any>(): Promise<T> {
    const text = await this.text();
    try {
      return JSON.parse(text);
    } catch (err: any) {
      err.message = `Failed to parse JSON: ${err.message}. Response: ${text.substring(0, 200)}`;
      throw err;
    }
  }

  /**
   * Gets response body as stream with byte counting
   */
  stream(): ReadableStream<Uint8Array> {
    if (!this.body) {
      return new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
    }

    const self = this;
    return new ReadableStream({
      async start(controller) {
        const reader = self.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            self._bytesReceived += value.length;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }
}

/**
 * Fetch error
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly response?: FetchResponse
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Checks if error is an abort error
 */
export function isAbortError(err: any): boolean {
  return err && err.name === 'AbortError';
}

/**
 * Checks if error is a timeout error
 */
export function isTimeoutError(err: any): boolean {
  return err instanceof FetchError && err.code === 'TIMEOUT';
}

/**
 * Checks if error is a network error
 */
export function isNetworkError(err: any): boolean {
  return err instanceof FetchError && err.code === 'NETWORK_ERROR';
}

/**
 * HTTP client with retry and timeout support
 */
export class Fetcher {
  /**
   * Performs HTTP request with retry and timeout
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      signal,
      retries = 0,
      retryDelay = 1000,
    } = options;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        return await this.fetchOnce(url, {
          method,
          headers,
          body,
          timeout,
          signal,
        });
      } catch (err: any) {
        lastError = err;

        // Don't retry on abort or non-retryable errors
        if (isAbortError(err) || (err instanceof FetchError && err.statusCode && err.statusCode < 500)) {
          throw err;
        }

        // Retry if attempts remaining
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
          attempt++;
          continue;
        }

        throw err;
      }
    }

    throw lastError!;
  }

  /**
   * Performs single HTTP request with timeout
   */
  private async fetchOnce(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string | ReadableStream<Uint8Array>;
      timeout: number;
      signal?: AbortSignal;
    }
  ): Promise<FetchResponse> {
    const { method, headers, body, timeout, signal } = options;

    // Create timeout controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // Combine signals
    const combinedSignal = signal
      ? this.combineSignals([signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: typeof body === 'string' ? body : undefined,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      return new FetchResponse(
        response.status,
        response.statusText,
        response.headers,
        response.body,
        response.url
      );
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (isAbortError(err)) {
        if (timeoutController.signal.aborted) {
          throw new FetchError(`Request timeout after ${timeout}ms`, 'TIMEOUT');
        }
        throw err;
      }

      throw new FetchError(
        `Network request failed: ${err.message}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Combines multiple abort signals
   */
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }

  /**
   * Delays execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default fetcher instance
 */
export const fetcher = new Fetcher();
