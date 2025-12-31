/**
 * Auth-Aware Query Wrappers for Orval-Generated Hooks
 *
 * These utilities wrap Orval-generated hooks to add:
 * 1. Authentication state check (only fetch when authenticated)
 * 2. Automatic error handling with snackbar notifications
 *
 * @example
 * ```typescript
 * // In your component:
 * const { data, isLoading } = useAuthQuery(
 *   useGetUsers,
 *   { enabled: true },
 *   'Failed to load users'
 * );
 * ```
 */

import { useEffect, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import type { UseQueryResult, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useAppSelector } from '@/store';
import { createQueryErrorHandler } from '@/utils';

/**
 * Options for auth-aware query wrapper
 */
export interface AuthQueryOptions {
  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;
  /** Custom error message for snackbar notification */
  errorMessage?: string;
  /** Whether to show error snackbar (default: true) */
  showErrorSnackbar?: boolean;
}

/**
 * Generic type for Orval-generated query hooks
 */
type OrvalQueryHook<TData, TError, TParams extends unknown[]> = (
  ...args: [...TParams, { query?: Partial<UseQueryOptions<TData, TError, TData, QueryKey>> }?]
) => UseQueryResult<TData, TError>;

/**
 * Wraps an Orval-generated query hook with authentication checks and error handling.
 *
 * This hook:
 * 1. Only enables the query when the user is authenticated
 * 2. Automatically displays error notifications via snackbar
 * 3. Provides consistent error handling across all API calls
 *
 * @param useOrvalHook - The Orval-generated hook to wrap
 * @param params - Parameters to pass to the hook (excluding options)
 * @param options - Auth query options including enabled state and error message
 * @returns The query result with auth-aware behavior
 *
 * @example
 * ```typescript
 * // Simple usage
 * const users = useAuthQuery(useGetUsers, [], { errorMessage: 'Failed to load users' });
 *
 * // With parameters
 * const user = useAuthQuery(
 *   useGetUsersId,
 *   [userId],
 *   { enabled: !!userId, errorMessage: 'Failed to load user' }
 * );
 * ```
 */
export function useAuthQuery<TData, TError, TParams extends unknown[]>(
  useOrvalHook: OrvalQueryHook<TData, TError, TParams>,
  params: TParams,
  options: AuthQueryOptions = {},
): UseQueryResult<TData, TError> {
  const { enabled = true, errorMessage = 'An error occurred', showErrorSnackbar = true } = options;

  const { enqueueSnackbar } = useSnackbar();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const handleError = useMemo(
    () => createQueryErrorHandler(enqueueSnackbar, errorMessage),
    [enqueueSnackbar, errorMessage],
  );

  // Call the Orval hook with auth-aware enabled state
  // eslint-disable-next-line react-compiler/react-compiler -- Hook reference is stable by design in this HOC pattern
  const query = useOrvalHook(...params, {
    query: {
      enabled: enabled && isAuthenticated,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  // Handle errors with snackbar notification
  useEffect(() => {
    if (query.error && showErrorSnackbar) {
      handleError(query.error);
    }
  }, [query.error, handleError, showErrorSnackbar]);

  return query;
}

/**
 * Creates a reusable auth-aware query hook for a specific Orval hook.
 *
 * This is useful when you want to create a custom hook that wraps
 * a specific Orval hook with consistent options.
 *
 * @param useOrvalHook - The Orval-generated hook to wrap
 * @param defaultErrorMessage - Default error message for this hook
 * @returns A new hook that accepts params and optional overrides
 *
 * @example
 * ```typescript
 * // Create a reusable hook
 * export const useUsers = createAuthQueryHook(useGetUsers, 'Failed to load users');
 *
 * // Use it in components
 * const { data, isLoading } = useUsers([], { enabled: shouldFetch });
 * ```
 */
export function createAuthQueryHook<TData, TError, TParams extends unknown[]>(
  useOrvalHook: OrvalQueryHook<TData, TError, TParams>,
  defaultErrorMessage: string,
) {
  return (
    params: TParams,
    options: Omit<AuthQueryOptions, 'errorMessage'> & { errorMessage?: string } = {},
  ) => {
    return useAuthQuery(useOrvalHook, params, {
      errorMessage: defaultErrorMessage,
      ...options,
    });
  };
}
