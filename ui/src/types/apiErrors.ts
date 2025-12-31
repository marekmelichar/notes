/**
 * API Error Types
 *
 * Type-safe definitions for API error responses
 */

import { AxiosError } from 'axios';

/**
 * Standard API error response structure
 */
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  errors?: ApiValidationError[];
}

/**
 * Validation error from API
 */
interface ApiValidationError {
  field?: string;
  message?: string;
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    error.isAxiosError === true
  );
}
