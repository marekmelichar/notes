import { AxiosError } from 'axios';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

function isProblemDetails(data: unknown): data is ProblemDetails {
  return typeof data === 'object' && data !== null && 'status' in data;
}

/**
 * Extract a human-readable error message from an API error response.
 * Supports RFC 7807 ProblemDetails (JSON) and falls back to a provided default.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError && error.response) {
    const { data } = error.response;

    if (isProblemDetails(data) && data.detail) {
      return data.detail;
    }

    // Fallback for plain-text responses (shouldn't happen after migration)
    if (typeof data === 'string' && data.length > 0 && data.length < 500) {
      return data;
    }
  }

  return fallback;
}
