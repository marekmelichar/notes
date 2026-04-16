import ImageExtension from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageView } from './ImageView';

/**
 * Extends the default TipTap image node with:
 *  - a `fileId` attribute so we can delete the uploaded file server-side when the
 *    node is removed via the trash button (fallback: parsed from `src` URL).
 *  - a React NodeView that renders the image with a hover delete button.
 */
export const CustomImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-file-id'),
        renderHTML: (attrs) =>
          attrs.fileId ? { 'data-file-id': attrs.fileId as string } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
