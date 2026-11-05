import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Popper, Paper, ClickAwayListener, type PopperProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/core';
import { validateAndNormalizeUrl } from './linkUtils';
import styles from './index.module.css';

interface LinkDialogProps {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

export const LinkDialog = ({ editor, open, onClose }: LinkDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [showTextField, setShowTextField] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  // State, not a ref: setting it must trigger the render that shows the popper,
  // even when every other field already holds the value we reset it to.
  const [anchor, setAnchor] = useState<PopperProps['anchorEl']>(null);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const isOnLink = editor.isActive('link');

    let needsTextField = false;
    setIsEditingLink(isOnLink);
    setInvalid(false);

    if (isOnLink) {
      // Editing an existing link — pre-fill with current URL
      const currentHref = (editor.getAttributes('link').href as string) || '';
      setUrl(currentHref);
      setText('');
      setShowTextField(false);
    } else if (hasSelection) {
      // Text selected — just ask for URL
      setUrl('');
      setText('');
      setShowTextField(false);
    } else {
      // No selection, no link — ask for both text and URL
      setUrl('');
      setText('');
      setShowTextField(true);
      needsTextField = true;
    }

    // Anchor the popper to the editor's cursor position
    const coords = editor.view.coordsAtPos(from);
    const rect = {
      top: coords.top,
      bottom: coords.bottom,
      left: coords.left,
      right: coords.left,
      width: 0,
      height: coords.bottom - coords.top,
      x: coords.left,
      y: coords.top,
      toJSON: () => ({}),
    };
    setAnchor({ getBoundingClientRect: () => rect });

    // Focus the appropriate input after mount
    setTimeout(() => {
      if (needsTextField) {
        textInputRef.current?.focus();
      } else {
        urlInputRef.current?.focus();
      }
    }, 0);
  }, [open, editor]);

  const handleSubmit = useCallback(() => {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const isOnLink = editor.isActive('link');

    // Clearing the URL of an existing link removes the link (keyboard-only unlink).
    if (isOnLink && !url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onClose();
      return;
    }

    const href = validateAndNormalizeUrl(url);
    if (!href) {
      // Keep the dialog open so the user can fix the URL instead of losing it.
      setInvalid(true);
      urlInputRef.current?.focus();
      return;
    }

    if (isOnLink) {
      // Update existing link's URL
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    } else if (hasSelection) {
      // Apply link to selected text
      editor.chain().focus().setLink({ href }).run();
    } else {
      // Insert new link with text
      const linkText = text.trim() || href;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href, target: '_blank' } }],
        })
        .run();
    }

    onClose();
  }, [editor, url, text, onClose]);

  if (!open || !anchor) return null;

  return (
    <Popper
      open
      anchorEl={anchor}
      placement="bottom-start"
      modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper elevation={4} className={styles.linkPopover}>
          <Box className={styles.linkPopoverContent} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
            {showTextField && (
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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <TextField
                inputRef={urlInputRef}
                size="small"
                placeholder="https://"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setInvalid(false);
                }}
                error={invalid}
                helperText={invalid ? t('Editor.InvalidLink') : undefined}
                slotProps={{ htmlInput: { 'aria-label': t('Editor.LinkUrl') } }}
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
              <Button
                size="small"
                variant="contained"
                sx={{ mt: '0.25rem', flexShrink: 0 }}
                onClick={handleSubmit}
                disabled={!url.trim() && !isEditingLink}
                data-testid="link-dialog-submit"
              >
                {isEditingLink && !url.trim() ? t('Editor.Unlink') : t('Common.Ok')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};
