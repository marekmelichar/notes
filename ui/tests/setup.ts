import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Match ui/public/env.js so modules that read Keycloak config at import time
// (the editor's upload views pull in the API client) can load under Vitest.
window.KEYCLOAK_URL = '';
window.KEYCLOAK_REALM = 'notes';
window.KEYCLOAK_CLIENT_ID = 'notes-frontend';
window.API_URL = '';

// ProseMirror measures text ranges while scrolling a selection into view.
// jsdom's Range has no client-rect APIs, which throws out of the command.
const emptyRect = () =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON() {
      return {};
    },
  }) as DOMRect;

if (typeof Range !== 'undefined' && typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getBoundingClientRect = emptyRect;
  Range.prototype.getClientRects = () => {
    const list = [] as unknown as DOMRectList;
    return list;
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
