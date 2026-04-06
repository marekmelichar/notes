import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton, Divider, Tooltip, Popover, TextField, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import type { Editor } from '@tiptap/core';
import { validateAndNormalizeUrl } from './linkUtils';
import styles from './index.module.css';

interface TiptapToolbarProps {
  editor: Editor;
  onFilePicker: () => void;
}

export const TiptapToolbar = ({ editor, onFilePicker }: TiptapToolbarProps) => {
  const { t } = useTranslation();

  // Re-render on any editor state change so toolbar buttons stay in sync
  // (e.g. toggling a list must enable/disable indent buttons immediately).
  const [, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const update = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTick((n) => n + 1);
      });
    };
    editor.on('transaction', update);
    return () => {
      cancelAnimationFrame(rafRef.current);
      editor.off('transaction', update);
    };
  }, [editor]);

  // Link popover state
  const [linkAnchor, setLinkAnchor] = useState<HTMLElement | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isInsertingNewLink, setIsInsertingNewLink] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
      }

      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      setLinkUrl('');
      setLinkText('');
      setIsInsertingNewLink(!hasSelection);
      setLinkAnchor(event.currentTarget);
    },
    [editor],
  );

  const handleLinkSubmit = useCallback(() => {
    const href = validateAndNormalizeUrl(linkUrl);
    if (!href) {
      setLinkAnchor(null);
      setLinkUrl('');
      setLinkText('');
      return;
    }

    if (isInsertingNewLink) {
      // No selection — insert link text + URL as a new inline link
      const text = linkText.trim() || href;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href, target: '_blank' } }],
        })
        .run();
    } else {
      editor.chain().focus().setLink({ href }).run();
    }

    setLinkAnchor(null);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText, isInsertingNewLink]);

  const handleLinkClose = useCallback(() => {
    setLinkAnchor(null);
    setLinkUrl('');
    setLinkText('');
    editor.chain().focus().run();
  }, [editor]);

  const inListItem = editor.isActive('listItem') || editor.isActive('taskItem');

  return (
    <div
      className={styles.toolbar}
      onMouseDown={(e) => {
        // Prevent toolbar clicks from stealing focus from the editor.
        // Without this, tapping a toolbar button on mobile blurs the editor
        // before the click fires, which can disable buttons mid-tap.
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
        }
      }}
    >
      <div className={styles.toolbarGroup}>
        <Tooltip title={t('Editor.Heading1')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Heading1')}
            data-testid="toolbar-heading1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            color={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>H1</span>
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Heading2')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Heading2')}
            data-testid="toolbar-heading2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            color={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>H2</span>
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Heading3')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Heading3')}
            data-testid="toolbar-heading3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            color={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>H3</span>
          </IconButton>
        </Tooltip>
      </div>

      <Divider orientation="vertical" flexItem />

      <div className={styles.toolbarGroup}>
        <Tooltip title={`${t('Editor.Bold')} (Ctrl+B)`}>
          <IconButton
            size="small"
            aria-label={t('Editor.Bold')}
            data-testid="toolbar-bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive('bold') ? 'primary' : 'default'}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Italic')} (Ctrl+I)`}>
          <IconButton
            size="small"
            aria-label={t('Editor.Italic')}
            data-testid="toolbar-italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive('italic') ? 'primary' : 'default'}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Underline')} (Ctrl+U)`}>
          <IconButton
            size="small"
            aria-label={t('Editor.Underline')}
            data-testid="toolbar-underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            color={editor.isActive('underline') ? 'primary' : 'default'}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Strikethrough')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Strikethrough')}
            data-testid="toolbar-strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={editor.isActive('strike') ? 'primary' : 'default'}
          >
            <StrikethroughSIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.InlineCode')}>
          <IconButton
            size="small"
            aria-label={t('Editor.InlineCode')}
            data-testid="toolbar-inline-code"
            onClick={() => editor.chain().focus().toggleCode().run()}
            color={editor.isActive('code') ? 'primary' : 'default'}
          >
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <Divider orientation="vertical" flexItem />

      <div className={styles.toolbarGroup}>
        <Tooltip title={t('Editor.BulletList')}>
          <IconButton
            size="small"
            aria-label={t('Editor.BulletList')}
            data-testid="toolbar-bullet-list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
          >
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.OrderedList')}>
          <IconButton
            size="small"
            aria-label={t('Editor.OrderedList')}
            data-testid="toolbar-ordered-list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
          >
            <FormatListNumberedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.TaskList')}>
          <IconButton
            size="small"
            aria-label={t('Editor.TaskList')}
            data-testid="toolbar-task-list"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            color={editor.isActive('taskList') ? 'primary' : 'default'}
          >
            <ChecklistIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Indent')} (Tab)`}>
          <IconButton
            size="small"
            aria-label={t('Editor.Indent')}
            data-testid="toolbar-indent"
            disabled={!inListItem}
            onClick={() => {
              if (editor.isActive('taskItem')) {
                editor.chain().focus().sinkListItem('taskItem').run();
              } else {
                editor.chain().focus().sinkListItem('listItem').run();
              }
            }}
          >
            <FormatIndentIncreaseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Outdent')} (Shift+Tab)`}>
          <IconButton
            size="small"
            aria-label={t('Editor.Outdent')}
            data-testid="toolbar-outdent"
            disabled={!inListItem}
            onClick={() => {
              if (editor.isActive('taskItem')) {
                editor.chain().focus().liftListItem('taskItem').run();
              } else {
                editor.chain().focus().liftListItem('listItem').run();
              }
            }}
          >
            <FormatIndentDecreaseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Blockquote')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Blockquote')}
            data-testid="toolbar-blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive('blockquote') ? 'primary' : 'default'}
          >
            <FormatQuoteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.CodeBlock')}>
          <IconButton
            size="small"
            aria-label={t('Editor.CodeBlock')}
            data-testid="toolbar-code-block"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            color={editor.isActive('codeBlock') ? 'primary' : 'default'}
          >
            <IntegrationInstructionsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.HorizontalRule')}>
          <IconButton
            size="small"
            aria-label={t('Editor.HorizontalRule')}
            data-testid="toolbar-horizontal-rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <HorizontalRuleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <Divider orientation="vertical" flexItem />

      <div className={styles.toolbarGroup}>
        <Tooltip title={editor.isActive('link') ? t('Editor.Unlink') : `${t('Editor.Link')} (Ctrl+K)`}>
          <IconButton
            size="small"
            aria-label={editor.isActive('link') ? t('Editor.Unlink') : t('Editor.Link')}
            data-testid="toolbar-link"
            onClick={handleLinkClick}
            color={editor.isActive('link') ? 'primary' : 'default'}
          >
            {editor.isActive('link') ? <LinkOffIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Popover
          open={Boolean(linkAnchor)}
          anchorEl={linkAnchor}
          onClose={handleLinkClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: { className: styles.linkPopover },
          }}
          onTransitionEnd={() => {
            if (linkAnchor) {
              if (isInsertingNewLink) {
                // Focus the text field first when inserting a new link
                const textInput = document.querySelector<HTMLInputElement>(
                  '[data-testid="toolbar-link-text-input"] input',
                );
                textInput?.focus();
              } else {
                linkInputRef.current?.focus();
              }
            }
          }}
        >
          <Box className={styles.linkPopoverContent} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
            {isInsertingNewLink && (
              <TextField
                size="small"
                placeholder={t('Editor.LinkText')}
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    linkInputRef.current?.focus();
                  } else if (e.key === 'Escape') {
                    handleLinkClose();
                  }
                }}
                fullWidth
                autoComplete="off"
                data-testid="toolbar-link-text-input"
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TextField
                inputRef={linkInputRef}
                size="small"
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLinkSubmit();
                  } else if (e.key === 'Escape') {
                    handleLinkClose();
                  }
                }}
                fullWidth
                autoComplete="off"
                data-testid="toolbar-link-url-input"
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim()}
                data-testid="toolbar-link-submit"
              >
                {t('Common.Ok')}
              </Button>
            </Box>
          </Box>
        </Popover>
        <Tooltip title={t('Editor.Image')}>
          <IconButton size="small" aria-label={t('Editor.Image')} data-testid="toolbar-image" onClick={onFilePicker}>
            <ImageOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.AttachFile')}>
          <IconButton size="small" aria-label={t('Editor.AttachFile')} data-testid="toolbar-attach-file" onClick={onFilePicker}>
            <AttachFileOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};
