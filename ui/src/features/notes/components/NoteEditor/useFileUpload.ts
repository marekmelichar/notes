import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import type { EditorView } from '@tiptap/pm/view';
import { DOMParser as ProsemirrorDOMParser } from '@tiptap/pm/model';
import { getApiErrorMessage } from '@/lib';
import { filesApi, type FileUploadResponse } from '../../services/filesApi';
import { isMarkdownFile, readFileAsText, markdownToHtml } from '../../utils/markdownImport';

const MAX_FILE_SIZE = 104_857_600; // 100 MB

const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  // SVG excluded — can contain embedded JavaScript (stored XSS risk)
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.conf': 'text/plain',
};

const ACCEPTED_EXTENSIONS = Object.keys(EXTENSION_TO_MIME);
const ACCEPTED_MIME_TYPES = [...new Set(Object.values(EXTENSION_TO_MIME))];

export const FILE_ACCEPT = [...ACCEPTED_MIME_TYPES, ...ACCEPTED_EXTENSIONS].join(',');
export const IMAGE_ACCEPT = 'image/*';

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function findPlaceholder(
  view: EditorView,
  placeholderText: string,
): { pos: number; size: number } | null {
  let result: { pos: number; size: number } | null = null;
  view.state.doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name === 'paragraph' && node.textContent === placeholderText) {
      result = { pos, size: node.nodeSize };
      return false;
    }
    return true;
  });
  return result;
}

function removePlaceholder(view: EditorView, placeholderText: string): void {
  const found = findPlaceholder(view, placeholderText);
  if (found) {
    view.dispatch(view.state.tr.delete(found.pos, found.pos + found.size));
  }
}

export function useFileUpload(noteId?: string) {
  const { t } = useTranslation();
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  const uploadFile = useCallback(
    async (file: File): Promise<FileUploadResponse | null> => {
      if (!navigator.onLine) {
        enqueueSnackbar(t('Files.OfflineError'), { variant: 'error' });
        return null;
      }
      if (file.size > MAX_FILE_SIZE) {
        enqueueSnackbar(t('Files.TooLarge'), { variant: 'error' });
        return null;
      }
      try {
        return await filesApi.upload(file, noteIdRef.current);
      } catch (err) {
        const detail = getApiErrorMessage(err, t('Files.UploadError'));
        enqueueSnackbar(detail, { variant: 'error' });
        return null;
      }
    },
    [t],
  );

  const insertUploadResult = useCallback(
    (
      view: EditorView,
      file: File,
      response: FileUploadResponse,
      placeholderText: string,
    ) => {
      const found = findPlaceholder(view, placeholderText);

      if (isImageFile(file)) {
        const imageNode = view.state.schema.nodes.image.create({ src: response.url });
        if (found) {
          view.dispatch(view.state.tr.replaceWith(found.pos, found.pos + found.size, imageNode));
        } else {
          view.dispatch(view.state.tr.insert(view.state.doc.content.size, imageNode));
        }
      } else {
        const linkMark = view.state.schema.marks.link.create({
          href: response.url,
          target: '_blank',
        });
        const linkText = view.state.schema.text(
          response.originalFilename || file.name,
          [linkMark],
        );
        const linkParagraph = view.state.schema.nodes.paragraph.create({}, linkText);
        if (found) {
          view.dispatch(
            view.state.tr.replaceWith(found.pos, found.pos + found.size, linkParagraph),
          );
        } else {
          view.dispatch(view.state.tr.insert(view.state.doc.content.size, linkParagraph));
        }
      }
    },
    [],
  );

  const insertMarkdownContent = useCallback(
    (view: EditorView, file: File, insertPos: number) => {
      readFileAsText(file)
        .then((text) => {
          if (!view.dom.isConnected) return;
          const html = markdownToHtml(text);
          const container = document.createElement('div');
          container.innerHTML = html;
          const parser = ProsemirrorDOMParser.fromSchema(view.state.schema);
          const slice = parser.parseSlice(container);
          view.dispatch(view.state.tr.insert(insertPos, slice.content));
        })
        .catch(() => {
          enqueueSnackbar(t('Files.UploadError'), { variant: 'error' });
        });
    },
    [t],
  );

  const insertMarkdownContentRef = useRef(insertMarkdownContent);
  insertMarkdownContentRef.current = insertMarkdownContent;

  const handleFileUpload = useCallback(
    (view: EditorView, file: File, insertPos: number) => {
      const placeholderText = isImageFile(file)
        ? t('Files.Uploading') || 'Uploading image...'
        : t('Files.UploadingFile', { name: file.name }) || `Uploading ${file.name}...`;
      const placeholderNode = view.state.schema.nodes.paragraph.create(
        {},
        view.state.schema.text(placeholderText),
      );
      view.dispatch(view.state.tr.insert(insertPos, placeholderNode));

      const currentNoteId = noteIdRef.current;
      uploadFile(file)
        .then((response) => {
          if (!view.dom.isConnected || noteIdRef.current !== currentNoteId) return;
          if (response) {
            insertUploadResult(view, file, response, placeholderText);
          } else {
            removePlaceholder(view, placeholderText);
          }
        })
        .catch(() => {
          if (!view.dom.isConnected) return;
          removePlaceholder(view, placeholderText);
        });
    },
    [uploadFile, insertUploadResult, t],
  );

  // Stable refs so TipTap editorProps never go stale
  const handleFileUploadRef = useRef(handleFileUpload);
  handleFileUploadRef.current = handleFileUpload;

  const handlePaste = useCallback(
    (view: EditorView, event: ClipboardEvent): boolean => {
      const items = event.clipboardData?.items;
      if (!items) return false;

      let handled = false;
      for (const item of Array.from(items)) {
        const file = item.getAsFile();
        if (file && (item.type.startsWith('image/') || item.kind === 'file')) {
          if (!handled) event.preventDefault();
          if (isMarkdownFile(file)) {
            insertMarkdownContentRef.current(view, file, view.state.selection.from);
          } else {
            handleFileUploadRef.current(view, file, view.state.selection.from);
          }
          handled = true;
        }
      }
      return handled;
    },
    [],
  );

  const handleDrop = useCallback(
    (view: EditorView, event: DragEvent): boolean => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!coords) return false;

      let handled = false;
      let offset = 0;
      for (const file of Array.from(files)) {
        if (file.size > 0) {
          if (!handled) event.preventDefault();
          if (isMarkdownFile(file)) {
            insertMarkdownContentRef.current(view, file, coords.pos + offset);
          } else {
            const sizeBefore = view.state.doc.content.size;
            handleFileUploadRef.current(view, file, coords.pos + offset);
            // view.state updates synchronously after dispatch
            offset += view.state.doc.content.size - sizeBefore;
          }
          handled = true;
        }
      }
      return handled;
    },
    [],
  );

  return { uploadFile, handlePaste, handleDrop };
}
