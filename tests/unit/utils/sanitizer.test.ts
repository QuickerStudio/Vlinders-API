import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeObject, sanitizeHeaders } from '../../../src/utils/sanitizer';

describe('sanitizer', () => {
  describe('sanitize', () => {
    it('should mask email addresses', () => {
      expect(sanitize('user@example.com')).toBe('u***@example.com');
      expect(sanitize('Contact: admin@test.org')).toBe('Contact: a***@test.org');
    });

    it('should mask phone numbers', () => {
      expect(sanitize('+1234567890')).toBe('+123***7890');
      expect(sanitize('Call me at +31612345678')).toBe('Call me at +316***5678');
    });

    it('should mask IP addresses', () => {
      expect(sanitize('192.168.1.1')).toBe('192.168.*.*');
      expect(sanitize('Server IP: 10.0.0.5')).toBe('Server IP: 10.0.*.*');
    });

    it('should mask credit card numbers', () => {
      expect(sanitize('4532-1234-5678-9010')).toBe('4532-****-****-9010');
      expect(sanitize('Card: 5425233430109903')).toBe('Card: 5425-****-****-9903');
    });

    it('should mask JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(sanitize(jwt)).toBe('eyJhbGci***');
    });

    it('should mask API keys', () => {
      expect(sanitize('sk_test_1234567890abcdef')).toBe('sk_test_***');
      expect(sanitize('API_KEY=abc123def456')).toBe('API_KEY=***');
    });

    it('should not modify safe strings', () => {
      expect(sanitize('Hello World')).toBe('Hello World');
      expect(sanitize('User ID: 12345')).toBe('User ID: 12345');
    });

    it('should handle empty strings', () => {
      expect(sanitize('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize sensitive keys', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123',
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('j***@example.com');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should sanitize arrays', () => {
      const obj = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.users[0].name).toBe('John');
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].name).toBe('Jane');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject({ value: null })).toEqual({ value: null });
      expect(sanitizeObject({ value: undefined })).toEqual({ value: undefined });
    });

    it('should not modify non-sensitive data', () => {
      const obj = {
        id: 123,
        name: 'Test',
        active: true,
      };

      expect(sanitizeObject(obj)).toEqual(obj);
    });
  });

  describe('sanitizeHeaders', () => {
    it('should sanitize authorization header', () => {
      const headers = new Headers({
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json',
      });

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized.Authorization).toBe('Bearer ***');
      expect(sanitized['Content-Type']).toBe('application/json');
    });

    it('should sanitize cookie header', () => {
      const headers = new Headers({
        'Cookie': 'session=abc123; user=john',
      });

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized.Cookie).toBe('[REDACTED]');
    });

    it('should sanitize API key headers', () => {
      const headers = new Headers({
        'X-API-Key': 'secret-key-123',
        'X-Auth-Token': 'token-456',
      });

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized['X-API-Key']).toBe('[REDACTED]');
      expect(sanitized['X-Auth-Token']).toBe('[REDACTED]');
    });

    it('should preserve safe headers', () => {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Test/1.0',
      });

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized['Content-Type']).toBe('application/json');
      expect(sanitized.Accept).toBe('application/json');
      expect(sanitized['User-Agent']).toBe('Test/1.0');
    });
  });
});
