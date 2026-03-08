import { describe, it, expect } from 'vitest';

/**
 * Tests for the link URL validation logic used in TiptapToolbar.handleLinkSubmit
 * and the markdown preview DANGEROUS_PROTOCOL check.
 *
 * The logic is inline in the components, so we test the same regex patterns directly
 * to ensure the security invariants hold.
 */

const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;
const HAS_SAFE_PROTOCOL = /^(https?:\/\/|mailto:)/i;

function validateAndNormalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Block dangerous protocols
  if (DANGEROUS_PROTOCOL.test(trimmed)) return null;

  // Auto-prefix https:// if no recognized protocol
  return HAS_SAFE_PROTOCOL.test(trimmed) ? trimmed : `https://${trimmed}`;
}

describe('Link URL validation', () => {
  describe('dangerous protocol blocking', () => {
    it('should block javascript: protocol', () => {
      expect(validateAndNormalizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should block JavaScript: with mixed case', () => {
      expect(validateAndNormalizeUrl('JavaScript:alert(1)')).toBeNull();
      expect(validateAndNormalizeUrl('JAVASCRIPT:void(0)')).toBeNull();
    });

    it('should block data: protocol', () => {
      expect(validateAndNormalizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should block vbscript: protocol', () => {
      expect(validateAndNormalizeUrl('vbscript:MsgBox("xss")')).toBeNull();
    });

    it('should block protocols with leading whitespace after trim', () => {
      expect(validateAndNormalizeUrl('  javascript:alert(1)  ')).toBeNull();
    });
  });

  describe('safe URL handling', () => {
    it('should pass through https:// URLs', () => {
      expect(validateAndNormalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should pass through http:// URLs', () => {
      expect(validateAndNormalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should pass through mailto: URLs', () => {
      expect(validateAndNormalizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    });

    it('should auto-prefix https:// when no protocol', () => {
      expect(validateAndNormalizeUrl('example.com')).toBe('https://example.com');
    });

    it('should auto-prefix https:// for bare domains with paths', () => {
      expect(validateAndNormalizeUrl('example.com/page?q=1')).toBe('https://example.com/page?q=1');
    });

    it('should return null for empty input', () => {
      expect(validateAndNormalizeUrl('')).toBeNull();
    });

    it('should return null for whitespace-only input', () => {
      expect(validateAndNormalizeUrl('   ')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should not block strings containing "javascript" but not as protocol', () => {
      // "javascript" as a search term, not a protocol
      expect(validateAndNormalizeUrl('https://search.com?q=javascript')).toBe('https://search.com?q=javascript');
    });

    it('should handle URLs with fragments', () => {
      expect(validateAndNormalizeUrl('https://example.com#section')).toBe('https://example.com#section');
    });

    it('should handle URLs with special characters', () => {
      expect(validateAndNormalizeUrl('https://example.com/path?q=hello%20world&lang=en')).toBe(
        'https://example.com/path?q=hello%20world&lang=en',
      );
    });
  });
});
