import { marked } from 'marked';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';

const extensions = [
  StarterKit,
  Link,
  ImageExtension,
  Underline,
];

export function isMarkdownFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.md');
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function markdownToTiptapJson(markdown: string): JSONContent {
  const html = markdownToHtml(markdown);
  return generateJSON(html, extensions);
}

export function getFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.md$/i, '');
}
