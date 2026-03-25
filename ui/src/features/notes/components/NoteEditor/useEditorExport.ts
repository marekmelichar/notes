import { useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export type ExportFormat = 'markdown' | 'html';

export interface ExportResult {
  blob: Blob;
}

export function useEditorExport(editor: Editor | null) {
  const exportTo = useCallback(
    async (format: ExportFormat, title?: string): Promise<ExportResult> => {
      if (!editor) throw new Error('Editor not ready');

      let blob: Blob;

      switch (format) {
        case 'markdown': {
          const html = editor.getHTML();
          const md = turndown.turndown(html);
          const withTitle = title ? `# ${title}\n\n${md}` : md;
          blob = new Blob([withTitle], { type: 'text/markdown;charset=utf-8' });
          break;
        }
        case 'html': {
          const html = editor.getHTML();
          const escapedTitle = title ? escapeHtml(title) : '';
          const withTitle = escapedTitle ? `<h1>${escapedTitle}</h1>\n${html}` : html;
          blob = new Blob([withTitle], { type: 'text/html;charset=utf-8' });
          break;
        }
      }

      return { blob };
    },
    [editor],
  );

  return { exportTo };
}
