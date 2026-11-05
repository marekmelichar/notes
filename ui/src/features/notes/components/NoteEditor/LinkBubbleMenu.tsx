import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Button,
  Popper,
  Paper,
  Tooltip,
  ClickAwayListener,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditIcon from '@mui/icons-material/Edit';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Editor } from '@tiptap/core';
import { validateAndNormalizeUrl, truncateUrl } from './linkUtils';
import styles from './index.module.css';

/** The real ProseMirror DOM, or null while the editor is created but not mounted. */
function mountedEditorDom(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  try {
    const dom = editor.view.dom;
    return dom instanceof HTMLElement ? dom : null;
  } catch {
    return null;
  }
}

/**
 * href of the link mark under a rendered <a>, read from the document at that
 * element's position rather than from the selection (which may still be elsewhere).
 */
function hrefOfLinkElement(editor: Editor, linkEl: HTMLElement): string {
  try {
    const pos = editor.view.posAtDOM(linkEl, 0);
    const mark = editor.state.doc
      .nodeAt(pos)
      ?.marks.find((candidate) => candidate.type.name === 'link');
    const href: unknown = mark?.attrs.href;
    if (typeof href === 'string' && href) return href;
  } catch {
    // Fall through to the DOM attribute.
  }
  return linkEl.getAttribute('href') ?? '';
}

interface LinkBubbleMenuProps {
  editor: Editor;
  /** Hide while the keyboard link dialog is open so the two don't stack. */
  suspended?: boolean;
}

export const LinkBubbleMenu = ({ editor, suspended = false }: LinkBubbleMenuProps) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentHref, setCurrentHref] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editError, setEditError] = useState(false);
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const visibleRef = useRef(false);
  visibleRef.current = Boolean(anchorEl) && !suspended;

  const dismiss = useCallback(() => {
    setAnchorEl(null);
    setIsEditing(false);
    setEditError(false);
  }, []);

  // Show only after a plain click on a link. Arrowing through a sentence
  // or typing inside a link should not pop a menu over the next line.
  // The view does not exist until TipTap emits `mount` (useEditor creates the
  // editor before EditorContent attaches it). Reading view.dom earlier throws
  // and the editor error boundary replaces the whole note.
  useEffect(() => {
    let dom: HTMLElement | null = null;

    const show = (linkEl: HTMLElement) => {
      if (editor.isDestroyed || !dom?.contains(linkEl) || !editor.isActive('link')) return;
      const href = hrefOfLinkElement(editor, linkEl);
      setCurrentHref(href);
      setIsEditing(false);
      setEditError(false);
      setAnchorEl(linkEl);
    };

    const onClick = (event: MouseEvent) => {
      if (!dom || editor.isDestroyed) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const linkEl = target.closest('a');
      if (!(linkEl instanceof HTMLElement) || !dom.contains(linkEl)) return;
      // Always wait a turn: the caret has not moved into the clicked link yet, so
      // isActive/getAttributes may still describe the previous link, and the
      // ClickAwayListener's dismiss for this same click must run before we show.
      window.setTimeout(() => show(linkEl), 0);
    };

    const attach = () => {
      if (editor.isDestroyed) return;
      const next = mountedEditorDom(editor);
      if (!next || next === dom) return;
      dom?.removeEventListener('click', onClick);
      dom = next;
      dom.addEventListener('click', onClick);
    };

    const detach = () => {
      dom?.removeEventListener('click', onClick);
      dom = null;
    };

    editor.on('mount', attach);
    editor.on('unmount', detach);
    attach();

    return () => {
      editor.off('mount', attach);
      editor.off('unmount', detach);
      detach();
    };
  }, [editor]);

  useEffect(() => {
    const hideIfLeft = () => {
      if (!visibleRef.current || editor.isActive('link')) return;
      dismiss();
    };
    const hideOnType = () => {
      if (!visibleRef.current || isEditing) return;
      dismiss();
    };
    editor.on('selectionUpdate', hideIfLeft);
    editor.on('update', hideOnType);
    return () => {
      editor.off('selectionUpdate', hideIfLeft);
      editor.off('update', hideOnType);
    };
  }, [editor, dismiss, isEditing]);

  useEffect(() => {
    if (suspended) dismiss();
  }, [suspended, dismiss]);

  // Esc closes the bubble before anything else on the page hears it.
  // Capture phase on document, then stop propagation.
  // In edit mode the URL field handles Esc itself (back to view mode).
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;
  useEffect(() => {
    if (!anchorEl || suspended) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || isEditingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [anchorEl, suspended, dismiss]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleOpen = useCallback(() => {
    if (currentHref) {
      window.open(currentHref, '_blank', 'noopener,noreferrer');
    }
  }, [currentHref]);

  const handleCopy = useCallback(async () => {
    if (!currentHref) return;
    try {
      await navigator.clipboard.writeText(currentHref);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the URL stays visible in the bubble.
    }
  }, [currentHref]);

  const handleUnlink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    dismiss();
  }, [editor, dismiss]);

  const handleEditStart = useCallback(() => {
    setEditUrl(currentHref);
    setEditError(false);
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, [currentHref]);

  const handleEditSubmit = useCallback(() => {
    const href = validateAndNormalizeUrl(editUrl);
    if (!href) {
      setEditError(true);
      editInputRef.current?.focus();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    dismiss();
  }, [editor, editUrl, dismiss]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditError(false);
    editor.chain().focus().run();
  }, [editor]);

  if (suspended || !anchorEl) return null;

  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement="bottom-start"
      modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={dismiss}>
        <Paper elevation={4} className={styles.linkBubble}>
          {isEditing ? (
            <Box className={styles.linkBubbleEdit}>
              <TextField
                inputRef={editInputRef}
                size="small"
                placeholder="https://"
                value={editUrl}
                error={editError}
                helperText={editError ? t('Editor.InvalidLink') : undefined}
                onChange={(e) => {
                  setEditUrl(e.target.value);
                  if (editError) setEditError(false);
                }}
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
