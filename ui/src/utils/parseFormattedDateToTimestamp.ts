import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const parseFormattedDateToTimestamp = (formatted: string): number | null => {
  const date = dayjs(formatted, 'DD.MM.YYYY', true); // true = strict mode
  return date.isValid() ? date.valueOf() : null;
};

/**
 * Parses a DD.MM.YYYY formatted date string to ISO 8601 format
 * @param formatted - Date string in DD.MM.YYYY format
 * @returns ISO 8601 date string (e.g., "2025-12-17T00:00:00.000Z") or empty string if invalid
 */
export const parseFormattedDateToISO = (formatted: string): string => {
  const date = dayjs(formatted, 'DD.MM.YYYY', true); // true = strict mode
  return date.isValid() ? date.toISOString() : '';
};
