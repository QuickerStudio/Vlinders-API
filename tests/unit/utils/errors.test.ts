import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError } from '../../../src/utils/errors';

describe('errors', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_CODE');
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('should include details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new AppError('Error with details', 400, 'VALIDATION_ERROR', details);
      expect(error.details).toEqual(details);
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new ValidationError('Invalid email', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should use default message', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication required');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should use default message', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Email already exists');
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should use default message', () => {
      const error = new ConflictError();
      expect(error.message).toBe('Resource conflict');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should use default message', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should include retry after', () => {
      const error = new RateLimitError('Rate limited', { retryAfter: 60 });
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('error serialization', () => {
    it('should serialize to JSON', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const json = JSON.parse(JSON.stringify(error));

      expect(json.message).toBe('Invalid input');
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.statusCode).toBe(400);
    });
  });
});
