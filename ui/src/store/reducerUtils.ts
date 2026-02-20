// ========================================================
// Shared reducer helpers for common array operations
// Works with Immer draft state (Redux Toolkit)
// ========================================================

/**
 * Replace an item in an array by matching its `id` field.
 * No-op if the item is null/undefined or not found in the array.
 */
export function updateItemById<T extends { id: string }>(
  items: T[],
  newItem: T | null | undefined,
): void {
  if (!newItem) return;
  const index = items.findIndex((item) => item.id === newItem.id);
  if (index !== -1) {
    items[index] = newItem;
  }
}

/**
 * Remove an item from an array by its `id`.
 * Returns the filtered array (assign back to state field).
 */
export function removeItemById<T extends { id: string }>(
  items: T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}
