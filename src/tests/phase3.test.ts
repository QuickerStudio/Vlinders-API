/**
 * Phase 3 Implementation Tests
 *
 * Basic tests to verify SSE parser and fetcher functionality
 */

import { SSEParser } from '../network/sseParser';
import { Fetcher, FetchError, isAbortError, isTimeoutError } from '../network/fetcher';
import { ChatCompletionChunk, OpenAIError } from '../types/openai';

/**
 * Test SSE Parser
 */
function testSSEParser() {
  console.log('Testing SSE Parser...');

  const events: any[] = [];
  const parser = new SSEParser((event) => {
    events.push(event);
  });

  // Test basic event
  const chunk1 = new TextEncoder().encode('data: hello\n\n');
  parser.feed(chunk1);

  console.assert(events.length === 1, 'Should have 1 event');
  console.assert(events[0].type === 'message', 'Should be message type');
  console.assert(events[0].data === 'hello', 'Should have correct data');

  // Test event with type
  const chunk2 = new TextEncoder().encode('event: test\ndata: world\n\n');
  parser.feed(chunk2);

  console.assert(events.length === 2, 'Should have 2 events');
  console.assert(events[1].type === 'test', 'Should have custom type');
  console.assert(events[1].data === 'world', 'Should have correct data');

  // Test multiline data
  const chunk3 = new TextEncoder().encode('data: line1\ndata: line2\n\n');
  parser.feed(chunk3);

  console.assert(events.length === 3, 'Should have 3 events');
  console.assert(events[2].data === 'line1\nline2', 'Should handle multiline data');

  // Test [DONE] marker
  const chunk4 = new TextEncoder().encode('data: [DONE]\n\n');
  parser.feed(chunk4);

  console.assert(events.length === 4, 'Should have 4 events');
  console.assert(events[3].data === '[DONE]', 'Should handle [DONE] marker');

  console.log('✓ SSE Parser tests passed');
}

/**
 * Test Fetcher
 */
async function testFetcher() {
  console.log('Testing Fetcher...');

  const fetcher = new Fetcher();

  // Test timeout error
  try {
    await fetcher.fetch('https://httpbin.org/delay/10', { timeout: 100 });
    console.assert(false, 'Should have thrown timeout error');
  } catch (err) {
    console.assert(isTimeoutError(err), 'Should be timeout error');
  }

  // Test abort
  try {
    const controller = new AbortController();
    const promise = fetcher.fetch('https://httpbin.org/delay/5', {
      signal: controller.signal,
    });
    controller.abort();
    await promise;
    console.assert(false, 'Should have thrown abort error');
  } catch (err) {
    console.assert(isAbortError(err), 'Should be abort error');
  }

  console.log('✓ Fetcher tests passed');
}

/**
 * Test OpenAI Error
 */
function testOpenAIError() {
  console.log('Testing OpenAI Error...');

  const error = new OpenAIError(
    'Invalid API key',
    'invalid_request_error',
    401,
    'api_key'
  );

  console.assert(error.message === 'Invalid API key', 'Should have correct message');
  console.assert(error.type === 'invalid_request_error', 'Should have correct type');
  console.assert(error.statusCode === 401, 'Should have correct status code');

  const json = error.toJSON();
  console.assert(json.error.message === 'Invalid API key', 'Should serialize correctly');

  console.log('✓ OpenAI Error tests passed');
}

/**
 * Run all tests
 */
export async function runPhase3Tests() {
  console.log('=== Phase 3 Tests ===\n');

  testSSEParser();
  testOpenAIError();
  await testFetcher();

  console.log('\n=== All Phase 3 Tests Passed ===');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase3Tests().catch(console.error);
}
