import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FileEmbedView } from './FileEmbedView';

export interface FileEmbedAttributes {
  fileId: string;
  url: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileEmbed: {
      setFileEmbed: (attrs: FileEmbedAttributes) => ReturnType;
    };
  }
}

export const FileEmbedExtension = Node.create({
  name: 'fileEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileId: { default: '' },
      url: { default: '' },
      fileName: { default: '' },
      contentType: { default: '' },
      fileSize: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-embed]',
        getAttrs: (el) => {
          const dom = el as HTMLElement;
          return {
            fileId: dom.getAttribute('data-file-id') || '',
            url: dom.getAttribute('data-file-url') || '',
            fileName: dom.getAttribute('data-file-name') || '',
            contentType: dom.getAttribute('data-file-type') || '',
            fileSize: Number(dom.getAttribute('data-file-size')) || 0,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as FileEmbedAttributes;
    return [
      'div',
      mergeAttributes(
        {
          'data-file-embed': '',
          'data-file-id': attrs.fileId,
          'data-file-url': attrs.url,
          'data-file-name': attrs.fileName,
          'data-file-type': attrs.contentType,
          'data-file-size': String(attrs.fileSize),
        },
      ),
      [
        'a',
        { href: attrs.url, target: '_blank', rel: 'noopener noreferrer' },
        attrs.fileName || 'Download',
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileEmbedView);
  },

  addCommands() {
    return {
      setFileEmbed:
        (attrs: FileEmbedAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
