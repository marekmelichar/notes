import type en from '../../public/locales/en/translation.json';

/**
 * Recursively builds dot-notation key paths from a nested object type.
 * E.g. { Common: { Nav: { Home: string } } } → "Common.Nav.Home"
 */
type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? DotPaths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

/** Union of all valid translation keys derived from the English translation file. */
export type TranslationKey = DotPaths<typeof en>;
