import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SafeLink } from './LinkExtension';
import { LinkDialog } from './LinkDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let editor: Editor;

const setup = (content: string, selection: number | { from: number; to: number }) => {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit.configure({ link: false }), SafeLink],
    content,
  });
  // jsdom has no layout; the dialog only needs a rect to anchor to.
  editor.view.coordsAtPos = () => ({ top: 0, bottom: 10, left: 0, right: 0 });
  editor.commands.setTextSelection(selection);
  const onClose = vi.fn();
  render(<LinkDialog editor={editor} open onClose={onClose} />);
  return { onClose };
};

const urlInput = () => screen.getByTestId('link-dialog-url-input').querySelector('input') as HTMLInputElement;

const hrefs = () => {
  const out: string[] = [];
  editor.state.doc.descendants((node) => {
    const link = node.marks.find((m) => m.type.name === 'link');
    if (link) out.push(link.attrs.href as string);
  });
  return out;
};

afterEach(() => {
  cleanup();
  editor.destroy();
});

describe('LinkDialog', () => {
  it('links the selected text with a normalized URL', async () => {
    const { onClose } = setup('<p>hello world</p>', { from: 1, to: 6 });
    await screen.findByTestId('link-dialog-url-input');

    fireEvent.change(urlInput(), { target: { value: 'example.com' } });
    fireEvent.keyDown(urlInput(), { key: 'Enter' });

    expect(hrefs()).toEqual(['https://example.com']);
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the dialog open with an error for a dangerous URL', async () => {
    const { onClose } = setup('<p>hello world</p>', { from: 1, to: 6 });
    await screen.findByTestId('link-dialog-url-input');

    fireEvent.change(urlInput(), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByTestId('link-dialog-submit'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Editor.InvalidLink')).toBeInTheDocument();
    expect(urlInput()).toHaveAttribute('aria-invalid', 'true');
    expect(hrefs()).toEqual([]);

    // Typing clears the error.
    fireEvent.change(urlInput(), { target: { value: 'ok.io' } });
    expect(screen.queryByText('Editor.InvalidLink')).not.toBeInTheDocument();
  });

  it('prefills an existing link and removes it when the URL is cleared', async () => {
    const { onClose } = setup('<p>go <a href="https://a.io">site</a> now</p>', 6);
    await screen.findByTestId('link-dialog-url-input');
    expect(urlInput().value).toBe('https://a.io');

    fireEvent.change(urlInput(), { target: { value: '' } });
    const submit = screen.getByTestId('link-dialog-submit');
    expect(submit).toBeEnabled();
    expect(submit).toHaveTextContent('Editor.Unlink');

    fireEvent.click(submit);

    expect(hrefs()).toEqual([]);
    expect(editor.getText()).toBe('go site now');
    expect(onClose).toHaveBeenCalled();
  });
});
