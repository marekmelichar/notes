const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

/**
 * Scheme of an explicit URL, or null when the text is a bare host (including host:port).
 * A dotted token before the colon is a hostname (`example.com:8080`), not a scheme.
 */
function explicitScheme(input: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(input);
  if (!match || match[1].includes('.')) return null;
  return match[1].toLowerCase();
}

/**
 * Validates and normalizes a URL for use in editor links.
 * Returns the normalized URL, or null if the input is empty, dangerous, or an unsupported scheme.
 * Bare hosts are prefixed with https://. An explicit scheme we don't allow (ftp://, file://)
 * is rejected so it is not rewritten into the malformed "https://ftp://..." form.
 */
export function validateAndNormalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!isSafeLinkHref(trimmed)) return null;

  const scheme = explicitScheme(trimmed);
  if (scheme) {
    return ALLOWED_SCHEMES.has(scheme) ? trimmed : null;
  }

  return `https://${trimmed}`;
}

/**
 * Rejects dangerous schemes even when split by whitespace or control
 * characters, which browsers ignore inside a scheme ("java\nscript:").
 * Every link path (dialog, bubble, markdown rule, autolink, paste) goes
 * through validateAndNormalizeUrl, so this is the one place to check.
 */
export function isSafeLinkHref(href: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !DANGEROUS_PROTOCOL.test(href.replace(/[\s\u0000-\u001F]/g, ''));
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
