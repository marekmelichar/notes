import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { liftListItem, sinkListItem } from '@tiptap/pm/schema-list';
import { FileEmbedExtension } from './FileEmbedExtension';
import type { JSONContent } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';

function isInsideListItem(view: EditorView): boolean {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === 'listItem' || name === 'taskItem') return true;
  }
  return false;
}

interface UseTiptapEditorOptions {
  initialContent: JSONContent | undefined;
  placeholder: string;
  className: string;
  handlePaste: (view: EditorView, event: ClipboardEvent) => boolean;
  handleDrop: (view: EditorView, event: Event) => boolean;
  handleDragOver: (view: EditorView, event: Event) => boolean;
  onUpdate: () => void;
  onLinkShortcut?: () => void;
}

export function useTiptapEditor({
  initialContent,
  placeholder,
  className,
  handlePaste,
  handleDrop,
  handleDragOver,
  onUpdate,
  onLinkShortcut,
}: UseTiptapEditorOptions) {
  return useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      FileEmbedExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: className,
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
      handleDOMEvents: {
        drop: handleDrop,
        dragover: handleDragOver,
      },
      handlePaste,
      handleClick: (_view: EditorView, _pos: number, event: MouseEvent) => {
        // Ctrl+Click (or Cmd+Click on Mac) opens links in a new tab
        if ((event.ctrlKey || event.metaKey) && event.target instanceof HTMLElement) {
          const link = event.target.closest('a');
          if (link?.href) {
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
        // Ctrl+K / Cmd+K triggers link insertion
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          onLinkShortcut?.();
          return true;
        }
        // Tab / Shift+Tab indents/outdents list items (including task items)
        if (event.key === 'Tab' && isInsideListItem(view)) {
          event.preventDefault();
          const nodeType =
            view.state.schema.nodes.taskItem || view.state.schema.nodes.listItem;
          if (event.shiftKey) {
            liftListItem(nodeType)(view.state, view.dispatch);
          } else {
            sinkListItem(nodeType)(view.state, view.dispatch);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: () => {
      onUpdate();
    },
  });
}
