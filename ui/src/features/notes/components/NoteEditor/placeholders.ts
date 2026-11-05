/** "Heading 1"–"Heading 3" are translated; pasted h4–h6 fall back to "Heading". */
export function headingPlaceholder(t: (key: string) => string, level: unknown): string {
  return level === 1 || level === 2 || level === 3 ? t(`Editor.Heading${level}`) : t('Editor.Heading');
}
