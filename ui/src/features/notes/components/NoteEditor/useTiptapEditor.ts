import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';

interface UseTiptapEditorOptions {
  initialContent: JSONContent | undefined;
  placeholder: string;
  className: string;
  handlePaste: (view: EditorView, event: ClipboardEvent) => boolean;
  handleDrop: (view: EditorView, event: DragEvent) => boolean;
  onUpdate: () => void;
}

export function useTiptapEditor({
  initialContent,
  placeholder,
  className,
  handlePaste,
  handleDrop,
  onUpdate,
}: UseTiptapEditorOptions) {
  return useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: className },
      handlePaste,
      handleDrop,
    },
    onUpdate: () => {
      onUpdate();
    },
  });
}
