import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * Centralized error handler for API calls
 * Extracts meaningful error messages from different error formats
 */
const handleApiError = (error: unknown, defaultMessage: string = 'An error occurred'): string => {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Try to get error message from response
    const responseMessage = axiosError.response?.data?.detail || axiosError.response?.data?.message;

    if (responseMessage) {
      return responseMessage;
    }

    // Fallback to status-based messages
    if (axiosError.response?.status) {
      switch (axiosError.response.status) {
        case 400:
          return 'Bad request. Please check your input.';
        case 401:
          return 'Unauthorized. Please log in again.';
        case 403:
          return 'Access forbidden. You do not have permission.';
        case 404:
          return 'Resource not found.';
        case 422:
          return 'Validation error. Please check your input.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return `Request failed with status ${axiosError.response.status}`;
      }
    }

    // Fallback to axios error message
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback to default message
  return defaultMessage;
};

/**
 * Creates a standardized error handler for React Query mutations
 */
export const createMutationErrorHandler = (
  enqueueSnackbar: (
    message: string,
    options?: { variant?: 'error' | 'success' | 'info' | 'warning' },
  ) => void,
  defaultMessage?: string,
) => {
  return (error: unknown) => {
    const errorMessage = handleApiError(error, defaultMessage);
    enqueueSnackbar(errorMessage, { variant: 'error' });
  };
};

/**
 * Creates a standardized error handler for React Query queries
 */
export const createQueryErrorHandler = (
  enqueueSnackbar: (
    message: string,
    options?: { variant?: 'error' | 'success' | 'info' | 'warning' },
  ) => void,
  defaultMessage?: string,
) => {
  return (error: unknown) => {
    const errorMessage = handleApiError(error, defaultMessage);
    enqueueSnackbar(errorMessage, { variant: 'error' });
  };
};

/**
 * Validates that required data is present
 */
export const validateRequiredData = <T>(data: T | undefined | null, fieldName: string): T => {
  if (data === undefined || data === null) {
    throw new Error(`${fieldName} is required`);
  }
  return data;
};
