import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton, Divider, Tooltip } from '@mui/material';
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
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import type { Editor } from '@tiptap/core';
import { SHORTCUTS, shortcutLabel } from './shortcuts';
import styles from './index.module.css';

interface TiptapToolbarProps {
  editor: Editor;
  onFilePicker: () => void;
  /** Opens the shared link dialog (same one as Ctrl/Cmd+K). */
  onLinkClick: () => void;
}

interface ToolbarItem {
  id: string;
  label: string;
  shortcut?: { keys?: string; markdown?: string };
  icon: ReactNode;
  run: () => void;
  isActive?: () => boolean;
  isDisabled?: () => boolean;
}

const listItemType = (editor: Editor) => (editor.isActive('taskItem') ? 'taskItem' : 'listItem');

const Heading = ({ level }: { level: number }) => <span className={styles.headingButton}>H{level}</span>;

export const TiptapToolbar = ({ editor, onFilePicker, onLinkClick }: TiptapToolbarProps) => {
  const { t } = useTranslation();

  // Re-render on any editor state change so toolbar buttons stay in sync.
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

  const chain = () => editor.chain().focus();

  const groups: ToolbarItem[][] = [
    ([1, 2, 3] as const).map((level) => ({
      id: `heading${level}`,
      label: t(`Editor.Heading${level}`),
      shortcut: SHORTCUTS[`heading${level}`],
      icon: <Heading level={level} />,
      run: () => chain().toggleHeading({ level }).run(),
      isActive: () => editor.isActive('heading', { level }),
    })),
    [
      { id: 'bold', label: t('Editor.Bold'), shortcut: SHORTCUTS.bold, icon: <FormatBoldIcon fontSize="small" />, run: () => chain().toggleBold().run(), isActive: () => editor.isActive('bold') },
      { id: 'italic', label: t('Editor.Italic'), shortcut: SHORTCUTS.italic, icon: <FormatItalicIcon fontSize="small" />, run: () => chain().toggleItalic().run(), isActive: () => editor.isActive('italic') },
      { id: 'underline', label: t('Editor.Underline'), shortcut: SHORTCUTS.underline, icon: <FormatUnderlinedIcon fontSize="small" />, run: () => chain().toggleUnderline().run(), isActive: () => editor.isActive('underline') },
      { id: 'strikethrough', label: t('Editor.Strikethrough'), shortcut: SHORTCUTS.strike, icon: <StrikethroughSIcon fontSize="small" />, run: () => chain().toggleStrike().run(), isActive: () => editor.isActive('strike') },
      { id: 'inline-code', label: t('Editor.InlineCode'), shortcut: SHORTCUTS.code, icon: <CodeIcon fontSize="small" />, run: () => chain().toggleCode().run(), isActive: () => editor.isActive('code') },
      { id: 'link', label: t('Editor.Link'), shortcut: SHORTCUTS.link, icon: <LinkIcon fontSize="small" />, run: onLinkClick, isActive: () => editor.isActive('link') },
    ],
    [
      { id: 'bullet-list', label: t('Editor.BulletList'), shortcut: SHORTCUTS.bulletList, icon: <FormatListBulletedIcon fontSize="small" />, run: () => chain().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
      { id: 'ordered-list', label: t('Editor.OrderedList'), shortcut: SHORTCUTS.orderedList, icon: <FormatListNumberedIcon fontSize="small" />, run: () => chain().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
      { id: 'task-list', label: t('Editor.TaskList'), shortcut: SHORTCUTS.taskList, icon: <ChecklistIcon fontSize="small" />, run: () => chain().toggleTaskList().run(), isActive: () => editor.isActive('taskList') },
      // Disabled (not hidden) outside lists so the toolbar never shifts under the pointer.
      { id: 'indent', label: t('Editor.Indent'), shortcut: SHORTCUTS.indent, icon: <FormatIndentIncreaseIcon fontSize="small" />, run: () => chain().sinkListItem(listItemType(editor)).run(), isDisabled: () => !editor.can().sinkListItem(listItemType(editor)) },
      { id: 'outdent', label: t('Editor.Outdent'), shortcut: SHORTCUTS.outdent, icon: <FormatIndentDecreaseIcon fontSize="small" />, run: () => chain().liftListItem(listItemType(editor)).run(), isDisabled: () => !editor.can().liftListItem(listItemType(editor)) },
    ],
    [
      { id: 'blockquote', label: t('Editor.Blockquote'), shortcut: SHORTCUTS.blockquote, icon: <FormatQuoteIcon fontSize="small" />, run: () => chain().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
      { id: 'code-block', label: t('Editor.CodeBlock'), shortcut: SHORTCUTS.codeBlock, icon: <IntegrationInstructionsOutlinedIcon fontSize="small" />, run: () => chain().toggleCodeBlock().run(), isActive: () => editor.isActive('codeBlock') },
      { id: 'horizontal-rule', label: t('Editor.HorizontalRule'), shortcut: SHORTCUTS.horizontalRule, icon: <HorizontalRuleIcon fontSize="small" />, run: () => chain().setHorizontalRule().run() },
      // Images and other files share one picker — the upload path decides how to embed.
      { id: 'insert-file', label: t('Editor.InsertFile'), icon: <AttachFileOutlinedIcon fontSize="small" />, run: onFilePicker },
    ],
  ];

  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label={t('Editor.Toolbar')}
      data-testid="editor-toolbar"
      onMouseDown={(e) => {
        // Prevent toolbar clicks from stealing focus from the editor.
        // Without this, tapping a toolbar button on mobile blurs the editor
        // before the click fires, which can disable buttons mid-tap.
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
        }
      }}
    >
      {groups.map((group, index) => (
        <Fragment key={group[0].id}>
          {index > 0 && <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />}
          <div className={styles.toolbarGroup}>
            {group.map((item) => {
              const active = item.isActive?.() ?? false;
              const disabled = item.isDisabled?.() ?? false;
              const tooltip = shortcutLabel(item.label, item.shortcut?.keys, item.shortcut?.markdown);
              return (
                <Tooltip key={item.id} title={tooltip} enterDelay={400} enterNextDelay={200}>
                  {/* span keeps the tooltip working when the button is disabled */}
                  <span>
                    <IconButton
                      size="small"
                      aria-label={item.label}
                      aria-pressed={item.isActive ? active : undefined}
                      data-testid={`toolbar-${item.id}`}
                      className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ''}`}
                      onClick={item.run}
                      disabled={disabled}
                    >
                      {item.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
};
