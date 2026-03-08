import { useEffect, useState } from 'react';
import { IconButton, Divider, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import type { Editor } from '@tiptap/core';
import styles from './index.module.css';

interface TiptapToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

export const TiptapToolbar = ({ editor, onImageUpload }: TiptapToolbarProps) => {
  const { t } = useTranslation();

  // Force re-render on editor state changes so isActive() stays current
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  const handleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt(t('Editor.EnterUrl') || 'URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <Tooltip title={t('Editor.Heading1')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            color={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>H1</span>
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Heading2')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            color={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>H2</span>
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Heading3')}>
          <IconButton
            size="small"
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
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive('bold') ? 'primary' : 'default'}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Italic')} (Ctrl+I)`}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive('italic') ? 'primary' : 'default'}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={`${t('Editor.Underline')} (Ctrl+U)`}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            color={editor.isActive('underline') ? 'primary' : 'default'}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Strikethrough')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={editor.isActive('strike') ? 'primary' : 'default'}
          >
            <StrikethroughSIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.InlineCode')}>
          <IconButton
            size="small"
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
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
          >
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.OrderedList')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
          >
            <FormatListNumberedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Blockquote')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive('blockquote') ? 'primary' : 'default'}
          >
            <FormatQuoteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.CodeBlock')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            color={editor.isActive('codeBlock') ? 'primary' : 'default'}
          >
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.HorizontalRule')}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <HorizontalRuleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <Divider orientation="vertical" flexItem />

      <div className={styles.toolbarGroup}>
        <Tooltip title={editor.isActive('link') ? t('Editor.Unlink') : t('Editor.Link')}>
          <IconButton size="small" onClick={handleLink} color={editor.isActive('link') ? 'primary' : 'default'}>
            {editor.isActive('link') ? <LinkOffIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Editor.Image')}>
          <IconButton size="small" onClick={onImageUpload}>
            <ImageOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};
