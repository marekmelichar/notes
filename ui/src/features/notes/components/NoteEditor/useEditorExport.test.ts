import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEditorExport } from './useEditorExport';
import type { Editor } from '@tiptap/core';

function createMockEditor(html: string, text = ''): Editor {
  return {
    getHTML: vi.fn(() => html),
    getText: vi.fn(() => text),
  } as unknown as Editor;
}

async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe('useEditorExport', () => {
  describe('exportTo — markdown', () => {
    it('should export editor content as markdown', async () => {
      const editor = createMockEditor('<p>Hello <strong>world</strong></p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('markdown');

      expect(blob.type).toBe('text/markdown;charset=utf-8');
      const text = await blobToText(blob);
      expect(text).toContain('Hello');
      expect(text).toContain('**world**');
    });

    it('should prepend title as H1 when provided', async () => {
      const editor = createMockEditor('<p>Content</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('markdown', 'My Note');
      const text = await blobToText(blob);

      expect(text).toMatch(/^# My Note\n\n/);
    });

    it('should not prepend title when not provided', async () => {
      const editor = createMockEditor('<p>Content</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('markdown');
      const text = await blobToText(blob);

      expect(text).not.toMatch(/^#/);
    });
  });

  describe('exportTo — html', () => {
    it('should export editor content as HTML', async () => {
      const editor = createMockEditor('<p>Hello</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('html');

      expect(blob.type).toBe('text/html;charset=utf-8');
      const text = await blobToText(blob);
      expect(text).toContain('<p>Hello</p>');
    });

    it('should prepend escaped title as H1 when provided', async () => {
      const editor = createMockEditor('<p>Content</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('html', 'My Note');
      const text = await blobToText(blob);

      expect(text).toMatch(/^<h1>My Note<\/h1>/);
    });

    it('should escape HTML special characters in title', async () => {
      const editor = createMockEditor('<p>Content</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('html', '<script>alert("xss")</script>');
      const text = await blobToText(blob);

      expect(text).not.toContain('<script>');
      expect(text).toContain('&lt;script&gt;');
    });

    it('should not prepend title when not provided', async () => {
      const editor = createMockEditor('<p>Content</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const { blob } = await result.current.exportTo('html');
      const text = await blobToText(blob);

      expect(text).not.toContain('<h1>');
    });
  });

  describe('exportTo — edge cases', () => {
    it('should throw when editor is null', async () => {
      const { result } = renderHook(() => useEditorExport(null));

      await expect(result.current.exportTo('markdown')).rejects.toThrow('Editor not ready');
    });
  });

  describe('getMarkdownContent', () => {
    it('should return markdown from editor HTML', () => {
      const editor = createMockEditor('<h1>Title</h1><p>Paragraph</p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const md = result.current.getMarkdownContent();

      expect(md).toContain('Title');
      expect(md).toContain('Paragraph');
    });

    it('should return empty string when editor is null', () => {
      const { result } = renderHook(() => useEditorExport(null));

      expect(result.current.getMarkdownContent()).toBe('');
    });

    it('should convert links to markdown', () => {
      const editor = createMockEditor('<p><a href="https://example.com">link</a></p>');
      const { result } = renderHook(() => useEditorExport(editor));

      const md = result.current.getMarkdownContent();

      expect(md).toContain('[link](https://example.com)');
    });
  });
});
