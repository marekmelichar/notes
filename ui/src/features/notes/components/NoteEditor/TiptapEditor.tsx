import { memo, forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { useFileUpload, isImageFile, FILE_ACCEPT } from './useFileUpload';
import { useEditorExport, type ExportFormat, type ExportResult } from './useEditorExport';
import { useTiptapEditor } from './useTiptapEditor';
import { TiptapToolbar } from './TiptapToolbar';
import { LinkBubbleMenu } from './LinkBubbleMenu';
import { LinkDialog } from './LinkDialog';
import styles from './index.module.css';

export type { ExportFormat, ExportResult } from './useEditorExport';

export interface EditorStats {
  wordCount: number;
  charCount: number;
}

export interface TiptapEditorHandle {
  getContent: () => Promise<string>;
  exportTo: (format: ExportFormat, title?: string) => Promise<ExportResult>;
  getStats: () => EditorStats;
}

interface TiptapEditorProps {
  initialContent: JSONContent | undefined;
  noteId?: string;
  onChange: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

const TiptapEditorInner = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  ({ initialContent, noteId, onChange, scrollRef }, ref) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);

    const { uploadFile, handlePaste, handleDrop, handleDragOver } = useFileUpload(noteId);

    const handleLinkShortcut = useCallback(() => {
      setLinkDialogOpen(true);
    }, []);

    const editor = useTiptapEditor({
      initialContent,
      placeholder: t('Editor.Placeholder') || 'Start writing...',
      className: `tiptap-editor ${styles.prose}`,
      handlePaste,
      handleDrop,
      handleDragOver,
      onUpdate: onChange,
      onLinkShortcut: handleLinkShortcut,
    });

    const { exportTo } = useEditorExport(editor);

    useImperativeHandle(
      ref,
      () => ({
        getContent: async () => {
          if (!editor) return '{}';
          return JSON.stringify(editor.getJSON());
        },
        exportTo,
        getStats: () => {
          const textContent = editor?.getText() || '';
          return {
            charCount: textContent.replace(/\s/g, '').length,
            wordCount: textContent.trim().split(/\s+/).filter(Boolean).length,
          };
        },
      }),
      [editor, exportTo],
    );

    const handleOpenFilePicker = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const response = await uploadFile(file);
        if (response) {
          if (isImageFile(file)) {
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'image',
                attrs: { src: response.url, fileId: response.id },
              })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .setFileEmbed({
                fileId: response.id,
                url: response.url,
                fileName: response.originalFilename || file.name,
                contentType: response.contentType || file.type,
                fileSize: response.size || file.size,
              })
              .run();
          }
        }

        e.target.value = '';
      },
      [editor, uploadFile],
    );

    if (!editor) return null;

    return (
      <>
        <TiptapToolbar
          editor={editor}
          onFilePicker={handleOpenFilePicker}
        />
        <Box ref={scrollRef} className={styles.editorContent}>
          <EditorContent editor={editor} className={styles.tiptapContainer} />
          <LinkBubbleMenu editor={editor} />
          <LinkDialog
            editor={editor}
            open={linkDialogOpen}
            onClose={() => {
              setLinkDialogOpen(false);
              editor.chain().focus().run();
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            onChange={handleFileInputChange}
            hidden
          />
        </Box>
      </>
    );
  },
);

TiptapEditorInner.displayName = 'TiptapEditor';

export const TiptapEditor = memo(TiptapEditorInner);
