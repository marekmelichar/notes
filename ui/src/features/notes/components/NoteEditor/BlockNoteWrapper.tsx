import { useCallback, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
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

interface BlockNoteWrapperProps {
  initialContent: PartialBlock[] | undefined;
  noteId?: string;
  onChange: () => void;
  isMobile: boolean;
  lastSaved: Date | null;
  lastSavedLabel: string;
  autoSaveCountdown: number | null;
  autoSaveLabel: string;
  onContentGetterReady: (getter: (() => string) | null) => void;
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
}: BlockNoteWrapperProps) => {
  const { t } = useTranslation();
  const { mode } = useColorMode();
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

  const textContent = getTextFromBlocks(editor.document);
  const charCount = textContent.replace(/\s/g, '').length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  const handleChange = useCallback(() => {
    onChange();
  }, [onChange]);

  // Expose content getter to parent via callback
  const getContent = useCallback(() => JSON.stringify(editor.document), [editor]);
  useEffect(() => {
    onContentGetterReady(getContent);
    return () => {
      onContentGetterReady(null);
    };
  }, [onContentGetterReady, getContent]);

  return (
    <>
      <Box className={`${styles.editorContent} ${isMobile ? styles.editorContentMobile : ''}`}>
        <BlockNoteView editor={editor} theme={mode} onChange={handleChange} sideMenu={false} />
      </Box>
      <Box className={styles.footer}>
        <Typography variant="caption">
          {wordCount} {t('Notes.Words')} | {charCount} {t('Notes.Characters')}
        </Typography>
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
