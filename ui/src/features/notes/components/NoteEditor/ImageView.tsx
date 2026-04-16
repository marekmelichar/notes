import { useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { NodeViewProps } from '@tiptap/react';
import { filesApi } from '../../services/filesApi';
import styles from './index.module.css';

const FILE_ID_FROM_URL = /\/api\/v1\/files\/([0-9a-fA-F-]{36})/;

function resolveFileId(attrs: { fileId?: string; src?: string }): string | null {
  if (attrs.fileId) return attrs.fileId;
  const match = attrs.src?.match(FILE_ID_FROM_URL);
  return match ? match[1] : null;
}

export const ImageView = ({ node, selected, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = node.attrs as { src?: string; alt?: string; title?: string; fileId?: string };

  const handleDelete = useCallback(() => {
    const id = resolveFileId(attrs);
    if (id) {
      // Fire-and-forget — file may already be gone (e.g. another tab removed it).
      filesApi.delete(id).catch(() => {});
    }
    deleteNode();
  }, [attrs, deleteNode]);

  return (
    <NodeViewWrapper className={styles.imageWrapper} data-selected={selected || undefined}>
      <Box className={styles.imageBox} contentEditable={false}>
        <img src={attrs.src} alt={attrs.alt ?? ''} title={attrs.title ?? undefined} />
        <Box className={styles.imageOverlay}>
          <Tooltip title={t('Editor.FileDelete')}>
            <IconButton size="small" onClick={handleDelete} className={styles.imageDeleteBtn}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
