import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, TextField, Button, Popper, Paper, Tooltip, ClickAwayListener } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditIcon from '@mui/icons-material/Edit';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Editor } from '@tiptap/core';
import { validateAndNormalizeUrl, truncateUrl } from './linkUtils';
import styles from './index.module.css';

interface LinkBubbleMenuProps {
  editor: Editor;
}

export const LinkBubbleMenu = ({ editor }: LinkBubbleMenuProps) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentHref, setCurrentHref] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const updateBubble = useCallback(() => {
    if (!editor.isActive('link')) {
      setAnchorEl(null);
      setIsEditing(false);
      return;
    }

    const href = (editor.getAttributes('link').href as string) || '';
    setCurrentHref(href);

    // Find the link DOM element at the current selection
    const { from } = editor.state.selection;
    const resolved = editor.state.doc.resolve(from);
    const domAtPos = editor.view.domAtPos(resolved.pos);
    const node = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
    const linkEl = node?.closest('a') ?? node?.querySelector('a');

    if (linkEl instanceof HTMLElement) {
      setAnchorEl(linkEl);
    } else {
      setAnchorEl(null);
    }
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updateBubble);
    editor.on('transaction', updateBubble);
    return () => {
      editor.off('selectionUpdate', updateBubble);
      editor.off('transaction', updateBubble);
    };
  }, [editor, updateBubble]);

  const handleOpen = useCallback(() => {
    if (currentHref) {
      window.open(currentHref, '_blank', 'noopener,noreferrer');
    }
  }, [currentHref]);

  const handleCopy = useCallback(async () => {
    if (currentHref) {
      await navigator.clipboard.writeText(currentHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [currentHref]);

  const handleUnlink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setAnchorEl(null);
    setIsEditing(false);
  }, [editor]);

  const handleEditStart = useCallback(() => {
    setEditUrl(currentHref);
    setIsEditing(true);
    // Focus will be set after render via onTransitionEnd-like approach
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, [currentHref]);

  const handleEditSubmit = useCallback(() => {
    const href = validateAndNormalizeUrl(editUrl);
    if (!href) {
      setIsEditing(false);
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href })
      .run();
    setIsEditing(false);
  }, [editor, editUrl]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    editor.chain().focus().run();
  }, [editor]);

  const handleClickAway = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
    }
  }, [isEditing]);

  if (!anchorEl) return null;

  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement="bottom-start"
      modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={handleClickAway}>
        <Paper elevation={4} className={styles.linkBubble}>
          {isEditing ? (
            <Box className={styles.linkBubbleEdit}>
              <TextField
                inputRef={editInputRef}
                size="small"
                placeholder="https://"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEditSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleEditCancel();
                  }
                }}
                fullWidth
                autoComplete="off"
                data-testid="link-bubble-url-input"
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleEditSubmit}
                disabled={!editUrl.trim()}
                data-testid="link-bubble-save"
              >
                {t('Common.Ok')}
              </Button>
            </Box>
          ) : (
            <Box className={styles.linkBubbleView}>
              <Tooltip title={currentHref}>
                <span
                  className={styles.linkBubbleUrl}
                  onClick={handleOpen}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOpen();
                  }}
                >
                  {truncateUrl(currentHref)}
                </span>
              </Tooltip>
              <Box className={styles.linkBubbleActions}>
                <Tooltip title={t('Editor.OpenLink')}>
                  <IconButton size="small" onClick={handleOpen} data-testid="link-bubble-open">
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={copied ? t('Editor.LinkCopied') : t('Editor.CopyLink')}>
                  <IconButton size="small" onClick={handleCopy} data-testid="link-bubble-copy">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('Editor.EditLink')}>
                  <IconButton size="small" onClick={handleEditStart} data-testid="link-bubble-edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('Editor.Unlink')}>
                  <IconButton size="small" onClick={handleUnlink} data-testid="link-bubble-unlink">
                    <LinkOffIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};
