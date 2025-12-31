import { ActionCreatorWithPayload, ActionCreatorWithoutPayload } from '@reduxjs/toolkit';
import { useCallback } from 'react';
import { useAppDispatch } from '@/store';

/**
 * Factory function to create Redux state management hooks.
 *
 * This reduces boilerplate for simple set/reset state patterns that are
 * commonly used throughout the application.
 *
 * @example
 * // Basic usage - creates a hook with set and reset functions
 * export const useTrainDriversAddedEdges = createStateHook(
 *   setTrainDriversAddedEdges,
 *   resetTrainDriversAddedEdges
 * );
 *
 * // In a component:
 * const { set, reset } = useTrainDriversAddedEdges();
 * set([1, 2, 3]);
 * reset();
 *
 * @param setAction - Redux action creator for setting the state
 * @param resetAction - Redux action creator for resetting the state
 * @returns A hook that provides set and reset functions
 */
export function createStateHook<T>(
  setAction: ActionCreatorWithPayload<T>,
  resetAction: ActionCreatorWithoutPayload,
) {
  return function useStateHook() {
    const dispatch = useAppDispatch();

    const set = useCallback(
      (value: T) => {
        dispatch(setAction(value));
      },
      [dispatch],
    );

    const reset = useCallback(() => {
      dispatch(resetAction());
    }, [dispatch]);

    return { set, reset };
  };
}

/**
 * Factory for state hooks that also need an update function.
 * This is for backwards compatibility with existing hooks that expose
 * set, update, and reset functions (even if set and update do the same thing).
 *
 * @example
 * export const useTrainDriversAddedEdgesState = createStateHookWithUpdate(
 *   setTrainDriversAddedEdges,
 *   resetTrainDriversAddedEdges,
 *   'TrainDriversAddedEdges'
 * );
 */
export function createStateHookWithUpdate<T>(
  setAction: ActionCreatorWithPayload<T>,
  resetAction: ActionCreatorWithoutPayload,
  /** Name used for generating legacy function names */
  stateName: string,
) {
  return function useStateHook() {
    const dispatch = useAppDispatch();

    const setFn = useCallback(
      (value: T) => {
        dispatch(setAction(value));
      },
      [dispatch],
    );

    const resetFn = useCallback(() => {
      dispatch(resetAction());
    }, [dispatch]);

    // Return with both new and legacy naming for backwards compatibility
    return {
      // New concise API
      set: setFn,
      reset: resetFn,
      // Legacy API for backwards compatibility
      [`setGlobal${stateName}State`]: setFn,
      [`updateGlobal${stateName}State`]: setFn,
      [`resetGlobal${stateName}State`]: resetFn,
    };
  };
}

/**
 * Factory for state hooks that need to transform input before dispatching.
 *
 * @example
 * // For hooks that format input before dispatching
 * export const useDateState = createTransformStateHook(
 *   setDate,
 *   resetDate,
 *   formatUnixTimestamp
 * );
 */
export function createTransformStateHook<TInput, TOutput>(
  setAction: ActionCreatorWithPayload<TOutput>,
  resetAction: ActionCreatorWithoutPayload,
  transform: (input: TInput) => TOutput,
) {
  return function useStateHook() {
    const dispatch = useAppDispatch();

    const set = useCallback(
      (value: TInput) => {
        dispatch(setAction(transform(value)));
      },
      [dispatch],
    );

    const reset = useCallback(() => {
      dispatch(resetAction());
    }, [dispatch]);

    return { set, reset };
  };
}

/**
 * Factory for state hooks that need to extract a field from input.
 *
 * @example
 * // For hooks that extract a field before dispatching
 * export const useFocusedFieldState = createFieldExtractorStateHook(
 *   setFocusedField,
 *   resetFocusedField,
 *   'focusedField'
 * );
 */
export function createFieldExtractorStateHook<TInput, TField extends keyof TInput>(
  setAction: ActionCreatorWithPayload<TInput[TField]>,
  resetAction: ActionCreatorWithoutPayload,
  field: TField,
) {
  return function useStateHook() {
    const dispatch = useAppDispatch();

    const set = useCallback(
      (value: TInput) => {
        dispatch(setAction(value[field]));
      },
      [dispatch],
    );

    const reset = useCallback(() => {
      dispatch(resetAction());
    }, [dispatch]);

    return { set, reset };
  };
}

/**
 * Factory for state hooks that have separate set (replace all) and update (single item) actions.
 *
 * @example
 * export const useTrainDriversAddedPointsState = createStateHookWithSeparateUpdate(
 *   setTrainDriversAddedPoints,    // sets entire array
 *   updateTrainDriversAddedPoint,  // updates single item
 *   resetTrainDriversAddedPoints
 * );
 */
export function createStateHookWithSeparateUpdate<TArray, TItem>(
  setAction: ActionCreatorWithPayload<TArray>,
  updateAction: ActionCreatorWithPayload<TItem>,
  resetAction: ActionCreatorWithoutPayload,
) {
  return function useStateHook() {
    const dispatch = useAppDispatch();

    const set = useCallback(
      (value: TArray) => {
        dispatch(setAction(value));
      },
      [dispatch],
    );

    const update = useCallback(
      (value: TItem) => {
        dispatch(updateAction(value));
      },
      [dispatch],
    );

    const reset = useCallback(() => {
      dispatch(resetAction());
    }, [dispatch]);

    return { set, update, reset };
  };
}
