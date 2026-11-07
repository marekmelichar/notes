import { describe, it, expect } from 'vitest';
import { headingPlaceholder } from './placeholders';

const t = (key: string) => `t:${key}`;

describe('headingPlaceholder', () => {
  it('uses the level-specific label for h1–h3', () => {
    expect(headingPlaceholder(t, 1)).toBe('t:Editor.Heading1');
    expect(headingPlaceholder(t, 3)).toBe('t:Editor.Heading3');
  });

  it('falls back to the generic label for pasted h4–h6 or a missing level', () => {
    expect(headingPlaceholder(t, 4)).toBe('t:Editor.Heading');
    expect(headingPlaceholder(t, 6)).toBe('t:Editor.Heading');
    expect(headingPlaceholder(t, undefined)).toBe('t:Editor.Heading');
  });
});
