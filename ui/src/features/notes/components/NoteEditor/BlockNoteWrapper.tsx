import { useCallback, useEffect, useState, useRef } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useColorMode } from '@/theme/ThemeProvider';
import { filesApi } from '../../services/filesApi';
import styles from './index.module.css';

const MAX_FILE_SIZE = 104_857_600; // 100 MB

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html';

export interface NoteExportFunctions {
  exportTo: (format: ExportFormat, title?: string) => Promise<Blob>;
}

type MarkdownValidation = {
  isValid: boolean;
  warning?: string;
};

// Detect if content looks like JSON (BlockNote format)
function looksLikeJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    // Check if it looks like BlockNote blocks
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Detect if content looks like raw HTML (not markdown with HTML)
function looksLikeHtml(content: string): boolean {
  const trimmed = content.trim();
  // Check if it starts with DOCTYPE or html tag
  if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
    return true;
  }
  // Check if it's predominantly HTML tags
  const htmlTagCount = (trimmed.match(/<[a-z][^>]*>/gi) || []).length;
  const lines = trimmed.split('\n').length;
  // If more than 50% of lines have HTML tags, it's probably HTML
  return htmlTagCount > lines * 0.5 && htmlTagCount > 5;
}

interface BlockNoteWrapperProps {
  initialContent: PartialBlock[] | undefined;
  noteId?: string;
  onChange: () => void;
  isMobile: boolean;
  lastSaved: Date | null;
  lastSavedLabel: string;
  autoSaveCountdown: number | null;
  autoSaveLabel: string;
  onContentGetterReady: (getter: (() => Promise<string>) | null) => void;
  onExportReady?: (exporter: NoteExportFunctions | null) => void;
  viewMode: 'editor' | 'markdown';
}

export const BlockNoteWrapper = ({
  initialContent,
  noteId,
  onChange,
  isMobile,
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
  const [validation, setValidation] = useState<MarkdownValidation>({ isValid: true });
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const prevViewModeRef = useRef(viewMode);
  const markdownRef = useRef(markdownContent);
  const viewModeRef = useRef(viewMode);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep refs in sync
  useEffect(() => {
    markdownRef.current = markdownContent;
  }, [markdownContent]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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

  // Validate markdown content (debounced)
  useEffect(() => {
    if (!isEditorMounted) return;
    if (viewMode !== 'markdown' || !markdownContent.trim()) {
      setValidation({ isValid: true });
      return;
    }

    clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(async () => {
      // Check for JSON (BlockNote format)
      if (looksLikeJson(markdownContent)) {
        setValidation({
          isValid: false,
          warning: t('Notes.MarkdownWarningJson'),
        });
        return;
      }

      // Check for raw HTML
      if (looksLikeHtml(markdownContent)) {
        setValidation({
          isValid: false,
          warning: t('Notes.MarkdownWarningHtml'),
        });
        return;
      }

      // Try to parse markdown
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(markdownContent);
        if (blocks.length === 0) {
          setValidation({
            isValid: false,
            warning: t('Notes.MarkdownWarningEmpty'),
          });
        } else {
          setValidation({ isValid: true });
        }
      } catch {
        setValidation({
          isValid: false,
          warning: t('Notes.MarkdownParseError'),
        });
      }
    }, 500);

    return () => clearTimeout(validationTimeoutRef.current);
  }, [markdownContent, viewMode, editor, t, isEditorMounted]);

  // Handle view mode transitions
  useEffect(() => {
    if (!isEditorMounted) return;

    const handleModeSwitch = async () => {
      if (prevViewModeRef.current === viewMode) return;

      if (viewMode === 'markdown') {
        // Switching to markdown: convert blocks to markdown
        const md = await editor.blocksToMarkdownLossy(editor.document);
        setMarkdownContent(md);
      } else if (prevViewModeRef.current === 'markdown') {
        // Switching back to editor: parse markdown to blocks
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(markdownContent);
          editor.replaceBlocks(editor.document, blocks);
        } catch {
          enqueueSnackbar(t('Notes.MarkdownParseError'), { variant: 'error' });
        }
      }

      prevViewModeRef.current = viewMode;
    };

    handleModeSwitch();
  }, [viewMode, editor, markdownContent, t, isEditorMounted]);

  // Calculate word count from blocks
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

  // Calculate stats based on current view mode
  const textContent =
    viewMode === 'markdown' ? markdownContent : getTextFromBlocks(editor.document);
  const charCount = textContent.replace(/\s/g, '').length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  const handleChange = useCallback(() => {
    onChange();
  }, [onChange]);

  const handleMarkdownChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdownContent(e.target.value);
      onChange();
    },
    [onChange],
  );

  // Async content getter that properly handles markdown mode
  const getContent = useCallback(async (): Promise<string> => {
    // Use refs to get current values (avoids stale closure issues)
    if (viewModeRef.current === 'markdown') {
      // In markdown mode: parse current markdown to blocks
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(markdownRef.current);
        return JSON.stringify(blocks);
      } catch {
        return '[]';
      }
    }
    // In editor mode: return current editor document
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
    async (format: ExportFormat, title?: string): Promise<Blob> => {
      // If in markdown mode, parse markdown to get blocks
      let blocks = editor.document;
      if (viewModeRef.current === 'markdown') {
        try {
          blocks = await editor.tryParseMarkdownToBlocks(markdownRef.current);
        } catch {
          // Keep current editor document if parsing fails
        }
      }

      // Build blocks with title for PDF/DOCX (need full Block objects)
      const getBlocksWithTitle = () => {
        if (!title) return blocks;
        // Insert a temporary heading, snapshot the document, then undo
        editor.insertBlocks(
          [{ type: 'heading', props: { level: 1 }, content: title }],
          blocks[0],
          'before',
        );
        const snapshot = editor.document;
        editor.undo();
        return snapshot;
      };

      switch (format) {
        case 'pdf': {
          const blocksWithTitle = getBlocksWithTitle();
          const [{ PDFExporter, pdfDefaultSchemaMappings }, { pdf }] = await Promise.all([
            import('@blocknote/xl-pdf-exporter'),
            import('@react-pdf/renderer'),
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exporter = new PDFExporter(editor.schema as any, pdfDefaultSchemaMappings as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const doc = await exporter.toReactPDFDocument(blocksWithTitle as any);
          return pdf(doc).toBlob();
        }
        case 'docx': {
          const blocksWithTitle = getBlocksWithTitle();
          const { DOCXExporter, docxDefaultSchemaMappings } = await import(
            '@blocknote/xl-docx-exporter'
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exporter = new DOCXExporter(editor.schema as any, docxDefaultSchemaMappings as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return exporter.toBlob(blocksWithTitle as any);
        }
        case 'markdown': {
          const md = await editor.blocksToMarkdownLossy(blocks);
          const withTitle = title ? `# ${title}\n\n${md}` : md;
          return new Blob([withTitle], { type: 'text/markdown;charset=utf-8' });
        }
        case 'html': {
          const html = await editor.blocksToFullHTML(blocks);
          const withTitle = title ? `<h1>${title}</h1>\n${html}` : html;
          return new Blob([withTitle], { type: 'text/html;charset=utf-8' });
        }
      }
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
      <Box className={`${styles.editorContent} ${isMobile ? styles.editorContentMobile : ''}`}>
        {viewMode === 'editor' ? (
          <BlockNoteView editor={editor} theme={mode} onChange={handleChange} sideMenu={false} />
        ) : (
          <textarea
            className={styles.markdownTextarea}
            value={markdownContent}
            onChange={handleMarkdownChange}
            placeholder={t('Notes.MarkdownPlaceholder')}
          />
        )}
      </Box>
      <Box className={styles.footer}>
        <Box className={styles.footerLeft}>
          <Typography variant="caption">
            {wordCount} {t('Notes.Words')} | {charCount} {t('Notes.Characters')}
          </Typography>
          {viewMode === 'markdown' && markdownContent.trim() && (
            <Tooltip title={validation.warning || t('Notes.MarkdownValid')}>
              {validation.isValid ? (
                <CheckCircleOutlineIcon
                  fontSize="small"
                  color="success"
                  className={styles.validationIcon}
                />
              ) : (
                <WarningAmberIcon
                  fontSize="small"
                  color="warning"
                  className={styles.validationIcon}
                />
              )}
            </Tooltip>
          )}
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
