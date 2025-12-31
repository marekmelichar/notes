/**
 * Auth-Aware Mutation Wrappers for Orval-Generated Hooks
 *
 * These utilities wrap Orval-generated mutation hooks to add:
 * 1. Automatic error handling with snackbar notifications
 * 2. Optional success notifications
 *
 * @example
 * ```typescript
 * // In your component:
 * const { mutate, isPending } = useAuthMutation(
 *   usePostUsers,
 *   {
 *     errorMessage: 'Failed to create user',
 *     successMessage: 'User created successfully',
 *     onSuccess: (data) => navigate(`/users/${data.id}`),
 *   }
 * );
 * ```
 */

import { useSnackbar } from 'notistack';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { createMutationErrorHandler } from '@/utils';

/**
 * Options for auth-aware mutation wrapper
 */
export interface AuthMutationOptions<TData, TError, TVariables, TContext> {
  /** Custom error message for snackbar notification */
  errorMessage?: string;
  /** Success message to show (if provided, shows snackbar on success) */
  successMessage?: string;
  /** Whether to show error snackbar (default: true) */
  showErrorSnackbar?: boolean;
  /** Callback on successful mutation */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  /** Callback on mutation error */
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  /** Callback when mutation settles (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => void;
}

/**
 * Generic type for Orval-generated mutation hooks
 */
type OrvalMutationHook<TData, TError, TVariables, TContext = unknown> = (options?: {
  mutation?: UseMutationOptions<TData, TError, TVariables, TContext>;
}) => UseMutationResult<TData, TError, TVariables, TContext>;

/**
 * Creates mutation options with error handling and notifications.
 *
 * Use this helper to build mutation options for Orval-generated hooks.
 *
 * @param enqueueSnackbar - Snackbar function from notistack
 * @param options - Mutation options including error/success messages and callbacks
 * @returns Mutation options object to pass to Orval hook
 *
 * @example
 * ```typescript
 * const { enqueueSnackbar } = useSnackbar();
 * const mutationOptions = buildAuthMutationOptions(enqueueSnackbar, {
 *   errorMessage: 'Failed to create user',
 *   successMessage: 'User created!',
 *   onSuccess: (data) => {
 *     queryClient.invalidateQueries({ queryKey: ['users'] });
 *   },
 * });
 *
 * const { mutate } = usePostUsers({ mutation: mutationOptions });
 * ```
 */
export function buildAuthMutationOptions<TData, TError, TVariables, TContext = unknown>(
  enqueueSnackbar: ReturnType<typeof useSnackbar>['enqueueSnackbar'],
  options: AuthMutationOptions<TData, TError, TVariables, TContext> = {},
): UseMutationOptions<TData, TError, TVariables, TContext> {
  const {
    errorMessage = 'An error occurred',
    successMessage,
    showErrorSnackbar = true,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const handleError = createMutationErrorHandler(enqueueSnackbar, errorMessage);

  return {
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        enqueueSnackbar(successMessage, { variant: 'success' });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (showErrorSnackbar) {
        handleError(error);
      }
      onError?.(error, variables, context);
    },
    onSettled,
  };
}

/**
 * Hook that returns mutation options builder with snackbar already bound.
 *
 * @returns A function to build mutation options
 *
 * @example
 * ```typescript
 * const buildOptions = useAuthMutationOptions();
 * const { mutate } = usePostUsers({
 *   mutation: buildOptions({
 *     errorMessage: 'Failed to create user',
 *     successMessage: 'User created!',
 *   }),
 * });
 * ```
 */
export function useAuthMutationOptions() {
  const { enqueueSnackbar } = useSnackbar();

  return <TData, TError, TVariables, TContext = unknown>(
    options: AuthMutationOptions<TData, TError, TVariables, TContext> = {},
  ) => buildAuthMutationOptions<TData, TError, TVariables, TContext>(enqueueSnackbar, options);
}

/**
 * Creates a reusable auth-aware mutation hook for a specific Orval hook.
 *
 * @param useOrvalHook - The Orval-generated mutation hook to wrap
 * @param defaultErrorMessage - Default error message for this hook
 * @returns A new hook that accepts optional overrides
 *
 * @example
 * ```typescript
 * // Create a reusable hook
 * export const useCreateUser = createAuthMutationHook(
 *   usePostUsers,
 *   'Failed to create user'
 * );
 *
 * // Use in component
 * const { mutate } = useCreateUser({
 *   successMessage: 'User created!',
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function createAuthMutationHook<TData, TError, TVariables, TContext = unknown>(
  useOrvalHook: OrvalMutationHook<TData, TError, TVariables, TContext>,
  defaultErrorMessage: string,
) {
  // Return a new hook function that will always call the same useOrvalHook
  const useCreatedHook = (
    options: Omit<AuthMutationOptions<TData, TError, TVariables, TContext>, 'errorMessage'> & {
      errorMessage?: string;
    } = {},
  ) => {
    const { enqueueSnackbar } = useSnackbar();
    const mutationOptions = buildAuthMutationOptions<TData, TError, TVariables, TContext>(
      enqueueSnackbar,
      {
        errorMessage: defaultErrorMessage,
        ...options,
      },
    );

    return useOrvalHook({
      mutation: mutationOptions,
    });
  };

  return useCreatedHook;
}
