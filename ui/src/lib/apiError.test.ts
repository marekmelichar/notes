import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getApiErrorMessage } from './apiError';

function makeAxiosError(data: unknown, status = 400): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data,
    status,
    statusText: 'Bad Request',
    headers,
    config: { headers },
  });
}

describe('getApiErrorMessage', () => {
  it('should extract detail from ProblemDetails response', () => {
    const error = makeAxiosError({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: 'File type not allowed.',
      traceId: '0HNV76DA8TJHJ:00000001',
    });

    expect(getApiErrorMessage(error, 'fallback')).toBe('File type not allowed.');
  });

  it('should return fallback when ProblemDetails has no detail', () => {
    const error = makeAxiosError({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
      title: 'Not Found',
      status: 404,
    });

    expect(getApiErrorMessage(error, 'Resource not found')).toBe('Resource not found');
  });

  it('should handle plain-text string response as fallback', () => {
    const error = makeAxiosError('Something went wrong');

    expect(getApiErrorMessage(error, 'fallback')).toBe('Something went wrong');
  });

  it('should return fallback for non-Axios errors', () => {
    expect(getApiErrorMessage(new Error('network'), 'fallback')).toBe('fallback');
  });

  it('should return fallback for unknown error types', () => {
    expect(getApiErrorMessage('string error', 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('should ignore excessively long string responses', () => {
    const error = makeAxiosError('x'.repeat(501));

    expect(getApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('should handle empty string response', () => {
    const error = makeAxiosError('');

    expect(getApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('should handle AxiosError without response', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    expect(getApiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('should handle validation errors ProblemDetails with detail', () => {
    const error = makeAxiosError({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      detail: 'Search query must not exceed 200 characters.',
      errors: { q: ['The field q must be a string with a maximum length of 200.'] },
      traceId: '0HNV76DA8TJHJ:00000002',
    });

    expect(getApiErrorMessage(error, 'fallback')).toBe(
      'Search query must not exceed 200 characters.',
    );
  });
});
