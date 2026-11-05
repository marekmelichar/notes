import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
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
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { Editor } from '@tiptap/core';
import { formatShortcut, joinHints, withHints } from './shortcutLabel';
import styles from './index.module.css';

interface TiptapToolbarProps {
  editor: Editor;
  onFilePicker: () => void;
  onLink: () => void;
}

const HEADING_LEVELS = [1, 2, 3] as const;

export const TiptapToolbar = ({ editor, onFilePicker, onLink }: TiptapToolbarProps) => {
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

  const [headingAnchor, setHeadingAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const headingLevel = HEADING_LEVELS.find((level) => editor.isActive('heading', { level }));
  const inTask = editor.isActive('taskItem');
  const canIndent = inTask
    ? editor.can().sinkListItem('taskItem')
    : editor.can().sinkListItem('listItem');
  const canOutdent = inTask
    ? editor.can().liftListItem('taskItem')
    : editor.can().liftListItem('listItem');
  const moreActive =
    editor.isActive('underline') ||
    editor.isActive('strike') ||
    editor.isActive('code') ||
    editor.isActive('codeBlock');

  const run = (command: () => void) => {
    setHeadingAnchor(null);
    setMoreAnchor(null);
    command();
  };

  const indent = () => {
    if (inTask) editor.chain().focus().sinkListItem('taskItem').run();
    else editor.chain().focus().sinkListItem('listItem').run();
  };

  const outdent = () => {
    if (inTask) editor.chain().focus().liftListItem('taskItem').run();
    else editor.chain().focus().liftListItem('listItem').run();
  };

  return (
    <div
      className={styles.toolbar}
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
      <div className={styles.toolbarGroup}>
        <Tooltip title={t('Editor.Heading')}>
          <IconButton
            size="small"
            aria-label={t('Editor.Heading')}
            aria-haspopup="menu"
            aria-expanded={Boolean(headingAnchor)}
            data-testid="toolbar-heading"
            onClick={(e) => setHeadingAnchor(e.currentTarget)}
            color={headingLevel ? 'primary' : 'default'}
          >
            <span className={styles.headingButton}>{headingLevel ? `H${headingLevel}` : 'H'}</span>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={headingAnchor}
          open={Boolean(headingAnchor)}
          onClose={() => setHeadingAnchor(null)}
        >
          <MenuItem
            selected={!headingLevel}
            data-testid="toolbar-paragraph"
            onClick={() => run(() => editor.chain().focus().setParagraph().run())}
          >
            <ListItemText>{t('Editor.Paragraph')}</ListItemText>
          </MenuItem>
          {HEADING_LEVELS.map((level) => (
            <MenuItem
              key={level}
              selected={headingLevel === level}
              data-testid={`toolbar-heading${level}`}
              onClick={() => run(() => editor.chain().focus().toggleHeading({ level }).run())}
            >
              <ListItemText>{t(`Editor.Heading${level}`)}</ListItemText>
              <Typography variant="caption" className={styles.menuShortcut}>
                {joinHints(formatShortcut(['Mod', 'Alt', String(level)]), '#'.repeat(level))}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
        <ToolButton
          label={t('Editor.Bold')}
          shortcut={formatShortcut(['Mod', 'B'])}
          markdown="**text**"
          testId="toolbar-bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          label={t('Editor.Italic')}
          shortcut={formatShortcut(['Mod', 'I'])}
          markdown="*text*"
          testId="toolbar-italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </ToolButton>
      </div>

      <div className={styles.toolbarGroup}>
        <ToolButton
          label={t('Editor.BulletList')}
          shortcut={formatShortcut(['Mod', 'Shift', '8'])}
          markdown="-"
          testId="toolbar-bullet-list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          label={t('Editor.OrderedList')}
          shortcut={formatShortcut(['Mod', 'Shift', '7'])}
          markdown="1."
          testId="toolbar-ordered-list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          label={t('Editor.TaskList')}
          shortcut={formatShortcut(['Mod', 'Shift', '9'])}
          markdown="[ ]"
          testId="toolbar-task-list"
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ChecklistIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          label={t('Editor.Blockquote')}
          shortcut={formatShortcut(['Mod', 'Shift', 'B'])}
          markdown=">"
          testId="toolbar-blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <FormatQuoteIcon fontSize="small" />
        </ToolButton>
      </div>

      <div className={styles.toolbarGroup}>
        <ToolButton
          label={editor.isActive('link') ? t('Editor.EditLink') : t('Editor.Link')}
          shortcut={formatShortcut(['Mod', 'K'])}
          markdown="[text](url)"
          testId="toolbar-link"
          active={editor.isActive('link')}
          onClick={onLink}
        >
          <LinkIcon fontSize="small" />
        </ToolButton>
        <ToolButton label={t('Editor.InsertFile')} testId="toolbar-insert" onClick={onFilePicker}>
          <AttachFileOutlinedIcon fontSize="small" />
        </ToolButton>
        <Tooltip title={t('Editor.MoreFormatting')}>
          <IconButton
            size="small"
            aria-label={t('Editor.MoreFormatting')}
            aria-haspopup="menu"
            aria-expanded={Boolean(moreAnchor)}
            data-testid="toolbar-more"
            onClick={(e) => setMoreAnchor(e.currentTarget)}
            color={moreActive ? 'primary' : 'default'}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
          <MoreItem
            testId="toolbar-underline"
            label={t('Editor.Underline')}
            shortcut={formatShortcut(['Mod', 'U'])}
            selected={editor.isActive('underline')}
            icon={<FormatUnderlinedIcon fontSize="small" />}
            onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
          />
          <MoreItem
            testId="toolbar-strikethrough"
            label={t('Editor.Strikethrough')}
            shortcut={formatShortcut(['Mod', 'Shift', 'S'])}
            markdown="~~text~~"
            selected={editor.isActive('strike')}
            icon={<StrikethroughSIcon fontSize="small" />}
            onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
          />
          <MoreItem
            testId="toolbar-inline-code"
            label={t('Editor.InlineCode')}
            shortcut={formatShortcut(['Mod', 'E'])}
            markdown="`code`"
            selected={editor.isActive('code')}
            icon={<CodeIcon fontSize="small" />}
            onClick={() => run(() => editor.chain().focus().toggleCode().run())}
          />
          <MoreItem
            testId="toolbar-code-block"
            label={t('Editor.CodeBlock')}
            shortcut={formatShortcut(['Mod', 'Alt', 'C'])}
            markdown="```"
            selected={editor.isActive('codeBlock')}
            icon={<IntegrationInstructionsOutlinedIcon fontSize="small" />}
            onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}
          />
          <MoreItem
            testId="toolbar-indent"
            label={t('Editor.Indent')}
            shortcut="Tab"
            disabled={!canIndent}
            icon={<FormatIndentIncreaseIcon fontSize="small" />}
            onClick={() => run(indent)}
          />
          <MoreItem
            testId="toolbar-outdent"
            label={t('Editor.Outdent')}
            shortcut="Shift+Tab"
            disabled={!canOutdent}
            icon={<FormatIndentDecreaseIcon fontSize="small" />}
            onClick={() => run(outdent)}
          />
          <MoreItem
            testId="toolbar-horizontal-rule"
            label={t('Editor.HorizontalRule')}
            markdown="---"
            icon={<HorizontalRuleIcon fontSize="small" />}
            onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())}
          />
        </Menu>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  label: string;
  testId: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
  /** What to type instead, e.g. `**text**`. */
  markdown?: string;
  children: ReactNode;
}

function ToolButton({ label, testId, onClick, active, shortcut, markdown, children }: ToolButtonProps) {
  return (
    <Tooltip title={withHints(label, shortcut, markdown)}>
      <IconButton
        size="small"
        aria-label={label}
        aria-pressed={active}
        data-testid={testId}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        color={active ? 'primary' : 'default'}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

interface MoreItemProps {
  testId: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  shortcut?: string;
  markdown?: string;
  selected?: boolean;
  disabled?: boolean;
}

function MoreItem({ testId, label, onClick, icon, shortcut, markdown, selected, disabled }: MoreItemProps) {
  const hints = joinHints(shortcut, markdown);
  return (
    <MenuItem data-testid={testId} selected={selected} disabled={disabled} onClick={onClick}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText>{label}</ListItemText>
      {hints && (
        <Typography variant="caption" className={styles.menuShortcut}>
          {hints}
        </Typography>
      )}
    </MenuItem>
  );
}
