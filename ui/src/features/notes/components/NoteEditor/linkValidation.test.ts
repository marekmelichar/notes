import { describe, it, expect } from 'vitest';
import { validateAndNormalizeUrl, truncateUrl } from './linkUtils';

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

describe('truncateUrl', () => {
  it('should strip https:// prefix', () => {
    expect(truncateUrl('https://example.com')).toBe('example.com');
  });

  it('should strip http:// prefix', () => {
    expect(truncateUrl('http://example.com')).toBe('example.com');
  });

  it('should not strip mailto: prefix', () => {
    expect(truncateUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('should truncate long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/that/exceeds/the/maximum/length/limit';
    const result = truncateUrl(longUrl, 30);
    expect(result).toBe('example.com/very/long/path/tha...');
    expect(result.length).toBe(33); // 30 chars + "..."
  });

  it('should not truncate short URLs', () => {
    expect(truncateUrl('https://a.com', 40)).toBe('a.com');
  });
});
