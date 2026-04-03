const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;
const HAS_SAFE_PROTOCOL = /^(https?:\/\/|mailto:)/i;

/**
 * Validates and normalizes a URL for use in editor links.
 * Returns the normalized URL, or null if the input is empty or dangerous.
 */
export function validateAndNormalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (DANGEROUS_PROTOCOL.test(trimmed)) return null;

  return HAS_SAFE_PROTOCOL.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Truncates a URL for display in the bubble menu.
 * Strips protocol prefix and truncates to maxLength.
 */
export function truncateUrl(url: string, maxLength = 40): string {
  const display = url.replace(/^https?:\/\//, '');
  return display.length > maxLength
    ? `${display.slice(0, maxLength)}...`
    : display;
}
