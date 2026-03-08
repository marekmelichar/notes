import { useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/core';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TurndownService from 'turndown';
import { getApiErrorMessage } from '@/lib';
import { filesApi } from '../../services/filesApi';
import { TiptapToolbar } from './TiptapToolbar';
import styles from './index.module.css';

const MAX_FILE_SIZE = 104_857_600; // 100 MB

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

export type ExportFormat = 'markdown' | 'html';

export interface ExportResult {
  blob: Blob;
}

export interface NoteExportFunctions {
  exportTo: (format: ExportFormat, title?: string) => Promise<ExportResult>;
}

interface TiptapEditorProps {
  initialContent: JSONContent | undefined;
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

export const TiptapEditor = ({
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
}: TiptapEditorProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!navigator.onLine) {
        enqueueSnackbar(t('Files.OfflineError'), { variant: 'error' });
        return null;
      }
      if (file.size > MAX_FILE_SIZE) {
        enqueueSnackbar(t('Files.TooLarge'), { variant: 'error' });
        return null;
      }
      try {
        const response = await filesApi.upload(file, noteIdRef.current);
        return response.url;
      } catch (err) {
        const detail = getApiErrorMessage(err, t('Files.UploadError'));
        enqueueSnackbar(detail, { variant: 'error' });
        return null;
      }
    },
    [t],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Underline,
      Placeholder.configure({
        placeholder: t('Editor.Placeholder') || 'Start writing...',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadImage(file).then((url) => {
                if (url) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url }),
                    ),
                  );
                }
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            uploadImage(file).then((url) => {
              if (url && coords) {
                view.dispatch(
                  view.state.tr.insert(
                    coords.pos,
                    view.state.schema.nodes.image.create({ src: url }),
                  ),
                );
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: () => {
      onChange();
    },
  });

  // Word and character count
  const textContent = editor?.getText() || '';
  const charCount = textContent.replace(/\s/g, '').length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  // Content getter
  const getContent = useCallback(async (): Promise<string> => {
    if (!editor) return '{}';
    return JSON.stringify(editor.getJSON());
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    onContentGetterReady(getContent);
    return () => {
      onContentGetterReady(null);
    };
  }, [onContentGetterReady, getContent, editor]);

  // Export functions
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
          const withTitle = title ? `<h1>${title}</h1>\n${html}` : html;
          blob = new Blob([withTitle], { type: 'text/html;charset=utf-8' });
          break;
        }
      }

      return { blob };
    },
    [editor],
  );

  useEffect(() => {
    if (!onExportReady || !editor) return;
    onExportReady({ exportTo });
    return () => {
      onExportReady(null);
    };
  }, [onExportReady, exportTo, editor]);

  // Markdown preview content
  const markdownContent = editor
    ? turndown.turndown(editor.getHTML())
    : '';

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const url = await uploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }

      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [editor, uploadImage],
  );

  if (!editor) return null;

  return (
    <>
      <Box className={styles.editorContent}>
        {viewMode === 'editor' ? (
          <>
            <TiptapToolbar editor={editor} onImageUpload={handleImageUpload} />
            <EditorContent editor={editor} className={styles.tiptapContainer} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </>
        ) : (
          <div className={styles.markdownPreview}>
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
