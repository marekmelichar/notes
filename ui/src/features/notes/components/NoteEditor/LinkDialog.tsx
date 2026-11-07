import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Popper, Paper, ClickAwayListener } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/core';
import { validateAndNormalizeUrl } from './linkUtils';
import styles from './index.module.css';

interface LinkDialogProps {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

type LinkMode = 'edit' | 'apply' | 'insert';

export const LinkDialog = ({ editor, open, onClose }: LinkDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<LinkMode>('apply');
  const [urlError, setUrlError] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setAnchorEl(null);
      return;
    }

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const isOnLink = editor.isActive('link');
    selectionRef.current = { from, to };
    setUrlError(false);

    let nextMode: LinkMode = 'insert';
    if (isOnLink) {
      const currentHref = (editor.getAttributes('link').href as string) || '';
      setUrl(currentHref);
      setText('');
      nextMode = 'edit';
    } else if (hasSelection) {
      setUrl('');
      setText('');
      nextMode = 'apply';
    } else {
      setUrl('');
      setText('');
      nextMode = 'insert';
    }
    setMode(nextMode);

    // New object every open so React re-renders even when the field values
    // happen to match the previous ones (otherwise the popper never mounts).
    setAnchorEl(anchorAtCursor(editor, from));

    // Focus the appropriate input after mount
    const focusTimer = window.setTimeout(() => {
      if (nextMode === 'insert') {
        textInputRef.current?.focus();
      } else {
        urlInputRef.current?.focus();
      }
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, editor]);

  const handleSubmit = useCallback(() => {
    const href = validateAndNormalizeUrl(url);
    if (!href) {
      setUrlError(true);
      urlInputRef.current?.focus();
      return;
    }

    const saved = selectionRef.current;
    let chain = editor.chain().focus();
    if (saved) {
      chain = chain.setTextSelection(saved);
    }

    if (mode === 'edit') {
      chain.extendMarkRange('link').setLink({ href }).run();
    } else if (mode === 'apply') {
      chain.setLink({ href }).run();
    } else {
      const linkText = text.trim() || href;
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href, target: '_blank' } }],
        })
        .run();
    }

    onClose();
  }, [editor, url, text, mode, onClose]);

  const handleUnlink = useCallback(() => {
    const saved = selectionRef.current;
    let chain = editor.chain().focus();
    if (saved) {
      chain = chain.setTextSelection(saved);
    }
    chain.extendMarkRange('link').unsetLink().run();
    onClose();
  }, [editor, onClose]);

  if (!open || !anchorEl) return null;

  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement="bottom-start"
      modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper elevation={4} className={styles.linkPopover}>
          <Box
            className={styles.linkPopoverContent}
            sx={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            {mode === 'insert' && (
              <TextField
                inputRef={textInputRef}
                size="small"
                placeholder={t('Editor.LinkText')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    urlInputRef.current?.focus();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                  }
                }}
                fullWidth
                autoComplete="off"
                data-testid="link-dialog-text-input"
              />
            )}
            <Box className={styles.linkDialogRow}>
              <TextField
                inputRef={urlInputRef}
                size="small"
                placeholder="https://"
                value={url}
                error={urlError}
                helperText={urlError ? t('Editor.InvalidLink') : undefined}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                  }
                }}
                fullWidth
                autoComplete="off"
                data-testid="link-dialog-url-input"
              />
              {mode === 'edit' && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={handleUnlink}
                  data-testid="link-dialog-unlink"
                >
                  {t('Editor.Unlink')}
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={handleSubmit}
                disabled={!url.trim()}
                data-testid="link-dialog-submit"
              >
                {t('Common.Ok')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

function anchorAtCursor(editor: Editor, from: number): HTMLElement {
  try {
    const coords = editor.view.coordsAtPos(from);
    return {
      getBoundingClientRect: () => ({
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        right: coords.left,
        width: 0,
        height: coords.bottom - coords.top,
        x: coords.left,
        y: coords.top,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
  } catch {
    return editor.view.dom;
  }
}
