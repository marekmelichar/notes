import { useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { NodeViewProps } from '@tiptap/react';
import { filesApi } from '../../services/filesApi';
import type { FileEmbedAttributes } from './FileEmbedExtension';
import styles from './index.module.css';

function getFileIcon(contentType: string) {
  if (contentType === 'application/pdf') return PictureAsPdfIcon;
  if (contentType.includes('spreadsheet') || contentType.includes('excel'))
    return TableChartOutlinedIcon;
  if (contentType.includes('presentation') || contentType.includes('powerpoint'))
    return SlideshowOutlinedIcon;
  if (contentType.includes('wordprocessing') || contentType.includes('msword'))
    return DescriptionOutlinedIcon;
  if (contentType === 'application/zip') return FolderZipOutlinedIcon;
  return InsertDriveFileOutlinedIcon;
}

function getFileTypeLabel(contentType: string, fileName: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'Excel';
  if (contentType.includes('presentation') || contentType.includes('powerpoint'))
    return 'PowerPoint';
  if (contentType.includes('wordprocessing') || contentType.includes('msword')) return 'Word';
  if (contentType === 'application/zip') return 'ZIP';
  if (contentType === 'text/markdown') return 'Markdown';
  if (contentType === 'text/plain') return 'Text';

  const ext = fileName.split('.').pop()?.toUpperCase();
  return ext || 'File';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileEmbedView = ({ node, selected, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = node.attrs as FileEmbedAttributes;

  const FileIcon = getFileIcon(attrs.contentType);
  const typeLabel = getFileTypeLabel(attrs.contentType, attrs.fileName);
  const sizeLabel = formatFileSize(attrs.fileSize);

  const inlineUrl = `${attrs.url}?inline=true`;

  const handleOpen = useCallback(() => {
    window.open(inlineUrl, '_blank', 'noopener,noreferrer');
  }, [inlineUrl]);

  const handleDelete = useCallback(() => {
    if (attrs.fileId) {
      filesApi.delete(attrs.fileId).catch(() => {
        // File may already be deleted — still remove the node
      });
    }
    deleteNode();
  }, [attrs.fileId, deleteNode]);

  return (
    <NodeViewWrapper>
      <Box
        className={styles.fileEmbed}
        data-selected={selected || undefined}
        contentEditable={false}
      >
        <Box className={styles.fileEmbedCard}>
          <Box className={styles.fileEmbedIcon}>
            <FileIcon
              sx={{
                fontSize: '2rem',
                color: attrs.contentType === 'application/pdf' ? '#e53935' : 'text.secondary',
              }}
            />
          </Box>
          <Box className={styles.fileEmbedInfo}>
            <Typography variant="body2" className={styles.fileEmbedName} title={attrs.fileName}>
              {attrs.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[sizeLabel, typeLabel].filter(Boolean).join(' \u00B7 ')}
            </Typography>
          </Box>
          <Box className={styles.fileEmbedActions}>
            <Tooltip title={t('Editor.FileOpen')}>
              <IconButton size="small" onClick={handleOpen}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('Editor.FileDelete')}>
              <IconButton size="small" onClick={handleDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
