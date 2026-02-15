import { useCallback, useEffect, useState, useRef, type ComponentProps } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useColorMode } from '@/theme/ThemeProvider';
import { filesApi } from '../../services/filesApi';
import styles from './index.module.css';

const MAX_FILE_SIZE = 104_857_600; // 100 MB

// 1x1 transparent PNG as bytes
const PLACEHOLDER_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function createPlaceholderBlob(): Blob {
  const bin = atob(PLACEHOLDER_PNG_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html';

export interface ExportResult {
  blob: Blob;
  failedImages: number;
}

export interface NoteExportFunctions {
  exportTo: (format: ExportFormat, title?: string) => Promise<ExportResult>;
}

interface BlockNoteWrapperProps {
  initialContent: PartialBlock[] | undefined;
  noteId?: string;
  onChange: () => void;
  lastSaved: Date | null;
  lastSavedLabel: string;
  autoSaveCountdown: number | null;
  autoSaveLabel: string;
  onContentGetterReady: (getter: (() => Promise<string>) | null) => void;
  onExportReady?: (exporter: NoteExportFunctions | null) => void;
  viewMode: 'editor' | 'markdown';
}

// Open all links in new tab
const markdownComponents: ComponentProps<typeof Markdown>['components'] = {
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

export const BlockNoteWrapper = ({
  initialContent,
  noteId,
  onChange,
  lastSaved,
  lastSavedLabel,
  autoSaveCountdown,
  autoSaveLabel,
  onContentGetterReady,
  onExportReady,
  viewMode,
}: BlockNoteWrapperProps) => {
  const { t } = useTranslation();
  const { mode } = useColorMode();
  const [markdownContent, setMarkdownContent] = useState('');
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const prevViewModeRef = useRef(viewMode);

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file: File) => {
      if (!navigator.onLine) {
        enqueueSnackbar(t('Files.OfflineError'), { variant: 'error' });
        throw new Error('Offline');
      }
      if (file.size > MAX_FILE_SIZE) {
        enqueueSnackbar(t('Files.TooLarge'), { variant: 'error' });
        throw new Error('File too large');
      }
      try {
        const response = await filesApi.upload(file, noteId);
        return response.url;
      } catch (err) {
        const detail = err instanceof Error ? err.message : '';
        const status = (err as { response?: { status?: number } })?.response?.status;
        const serverMsg = (err as { response?: { data?: string } })?.response?.data;
        const info = serverMsg || (status ? `HTTP ${status}` : detail);
        enqueueSnackbar(`${t('Files.UploadError')}: ${info}`, { variant: 'error' });
        throw err;
      }
    },
  });

  // Mark editor as mounted after first render
  useEffect(() => {
    // Small delay to ensure BlockNote's internal view is ready
    const timer = setTimeout(() => setIsEditorMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle view mode transitions
  useEffect(() => {
    if (!isEditorMounted) return;

    const handleModeSwitch = async () => {
      if (prevViewModeRef.current === viewMode) return;

      if (viewMode === 'markdown') {
        // Switching to markdown preview: convert blocks to markdown (read-only)
        const md = await editor.blocksToMarkdownLossy(editor.document);
        setMarkdownContent(md);
      }
      // Switching back to editor: nothing to do — editor state is untouched

      prevViewModeRef.current = viewMode;
    };

    handleModeSwitch();
  }, [viewMode, editor, isEditorMounted]);

  // Extract visible text from blocks (for consistent word/char count)
  const getTextFromBlocks = (blocks: Block[]): string => {
    let text = '';
    for (const block of blocks) {
      if (block.content && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === 'text' && item.text) {
            text += item.text + ' ';
          }
        }
      }
      if (block.children) {
        text += getTextFromBlocks(block.children as Block[]);
      }
    }
    return text;
  };

  // Always count from editor blocks for consistency across view modes
  const textContent = getTextFromBlocks(editor.document);
  const charCount = textContent.replace(/\s/g, '').length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  const handleChange = useCallback(() => {
    onChange();
  }, [onChange]);

  // Content getter always returns editor document (markdown is read-only preview)
  const getContent = useCallback(async (): Promise<string> => {
    return JSON.stringify(editor.document);
  }, [editor]);

  useEffect(() => {
    onContentGetterReady(getContent);
    return () => {
      onContentGetterReady(null);
    };
  }, [onContentGetterReady, getContent]);

  // Expose export functions to parent via callback
  const exportTo = useCallback(
    async (format: ExportFormat, title?: string): Promise<ExportResult> => {
      const blocks = editor.document;

      // Build blocks with title by cloning (avoids mutating the live editor)
      const getBlocksWithTitle = (): typeof blocks => {
        if (!title) return blocks;
        const titleBlock = {
          type: 'heading' as const,
          props: { level: 1 as const },
          content: [{ type: 'text' as const, text: title, styles: {} }],
          children: [],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [titleBlock as any, ...blocks];
      };

      // Fetch file directly, return placeholder on failure and track failures
      let failedImages = 0;
      const resolveFileUrl = async (url: string): Promise<Blob> => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        } catch {
          failedImages++;
          return createPlaceholderBlob();
        }
      };

      let blob: Blob;

      switch (format) {
        case 'pdf': {
          const blocksWithTitle = getBlocksWithTitle();
          const [{ PDFExporter, pdfDefaultSchemaMappings }, { pdf }] = await Promise.all([
            import('@blocknote/xl-pdf-exporter'),
            import('@react-pdf/renderer'),
          ]);
          const exporter = new PDFExporter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.schema as any, pdfDefaultSchemaMappings as any,
            { resolveFileUrl },
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const doc = await exporter.toReactPDFDocument(blocksWithTitle as any);
          blob = await pdf(doc).toBlob();
          break;
        }
        case 'docx': {
          const blocksWithTitle = getBlocksWithTitle();
          const { DOCXExporter, docxDefaultSchemaMappings } = await import(
            '@blocknote/xl-docx-exporter'
          );
          const exporter = new DOCXExporter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.schema as any, docxDefaultSchemaMappings as any,
            { resolveFileUrl },
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blob = await exporter.toBlob(blocksWithTitle as any);
          break;
        }
        case 'markdown': {
          const md = await editor.blocksToMarkdownLossy(blocks);
          const withTitle = title ? `# ${title}\n\n${md}` : md;
          blob = new Blob([withTitle], { type: 'text/markdown;charset=utf-8' });
          break;
        }
        case 'html': {
          const html = await editor.blocksToFullHTML(blocks);
          const withTitle = title ? `<h1>${title}</h1>\n${html}` : html;
          blob = new Blob([withTitle], { type: 'text/html;charset=utf-8' });
          break;
        }
      }

      return { blob, failedImages };
    },
    [editor],
  );

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady({ exportTo });
    return () => {
      onExportReady(null);
    };
  }, [onExportReady, exportTo]);

  return (
    <>
      <Box className={styles.editorContent}>
        {viewMode === 'editor' ? (
          <BlockNoteView editor={editor} theme={mode} onChange={handleChange} sideMenu={false} />
        ) : (
          <div className={styles.markdownPreview}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {markdownContent}
            </Markdown>
          </div>
        )}
      </Box>
      <Box className={styles.footer}>
        <Box className={styles.footerLeft}>
          <Typography variant="caption">
            {wordCount} {t('Notes.Words')} | {charCount} {t('Notes.Characters')}
          </Typography>
        </Box>
        <Box className={styles.footerRight}>
          {autoSaveCountdown !== null && (
            <Typography variant="caption">
              {autoSaveLabel} {autoSaveCountdown}s
            </Typography>
          )}
          {lastSaved && (
            <Typography variant="caption">
              {lastSavedLabel} {lastSaved.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
};
