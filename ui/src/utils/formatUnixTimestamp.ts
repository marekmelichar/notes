// utils/date.ts
import dayjs from 'dayjs';

/**
 * Formats a Unix timestamp (in seconds or milliseconds) to DD.MM.YYYY format
 *
 * Automatically detects whether the input is in seconds or milliseconds:
 * - Values < 1e12 (1 trillion) are treated as seconds
 * - Values >= 1e12 are treated as milliseconds
 *
 * @param input - Unix timestamp as number or string (in seconds or milliseconds)
 * @returns Formatted date string (DD.MM.YYYY) or empty string if input is invalid
 *
 * @example
 * ```tsx
 * formatUnixTimestamp(1609459200)        // Seconds: Returns "01.01.2021"
 * formatUnixTimestamp(1609459200000)     // Milliseconds: Returns "01.01.2021"
 * formatUnixTimestamp('1609459200')      // String: Returns "01.01.2021"
 * formatUnixTimestamp('invalid')         // Returns ""
 * ```
 */
export const formatUnixTimestamp = (input: number | string): string => {
  const timestamp = typeof input === 'string' ? Number(input) : input;

  if (isNaN(timestamp)) return '';
  const isInSeconds = timestamp < 1e12;

  const date = isInSeconds ? dayjs.unix(timestamp) : dayjs(timestamp);
  return date.format('DD.MM.YYYY');
};
