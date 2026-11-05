const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);
/** Schemes whose body is often all digits, so `tel:123` is not mistaken for host:port. */
const NUMERIC_BODY_SCHEMES = new Set(['tel', 'sms', 'fax', 'callto']);
/** A port right after the colon: `localhost:3000`, `intranet:8080/path`. */
const PORT_AFTER_COLON = /^\d{1,5}(?:[/?#]|$)/;

/**
 * Scheme of an explicit URL, or null when the text is a bare host (including host:port).
 * A dotted token before the colon is a hostname (`example.com:8080`), not a scheme, and so
 * is a dot-free name followed by a port (`localhost:3000`).
 */
function explicitScheme(input: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(input);
  if (!match || match[1].includes('.')) return null;
  const name = match[1].toLowerCase();
  const rest = input.slice(match[0].length);
  if (PORT_AFTER_COLON.test(rest) && !NUMERIC_BODY_SCHEMES.has(name)) return null;
  return name;
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

  // Protocol-relative (`//example.com/x`) is a host: give it https, not "https:////…".
  // Any other leading slash is a path with no host, which can't be a link here.
  if (trimmed.startsWith('/')) {
    return /^\/\/[^/\s]/.test(trimmed) ? `https:${trimmed}` : null;
  }

  const scheme = explicitScheme(trimmed);
  if (scheme) {
    return ALLOWED_SCHEMES.has(scheme) ? trimmed : null;
  }

  return `https://${trimmed}`;
}

/**
 * Rejects dangerous schemes even when split by whitespace or control
 * characters, which browsers ignore inside a scheme ("java\nscript:").
 * validateAndNormalizeUrl (what the user types: dialog, bubble, markdown rule)
 * applies it on top of the http/https/mailto allowlist. SafeLink.isAllowedUri
 * (render, parse, paste, autolink) applies it on top of TipTap's own check,
 * so stored tel:/ftp: links keep their href.
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
