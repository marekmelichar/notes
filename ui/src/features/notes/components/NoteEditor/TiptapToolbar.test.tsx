import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { SafeLink } from './LinkExtension';
import { TiptapToolbar } from './TiptapToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let editor: Editor;

const setup = (content: string) => {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit.configure({ link: false }), SafeLink, TaskList, TaskItem.configure({ nested: true })],
    content,
  });
  const onFilePicker = vi.fn();
  const onLinkClick = vi.fn();
  render(<TiptapToolbar editor={editor} onFilePicker={onFilePicker} onLinkClick={onLinkClick} />);
  return { onFilePicker, onLinkClick };
};

afterEach(() => {
  cleanup();
  editor.destroy();
});

describe('TiptapToolbar', () => {
  it('opens the shared link dialog instead of unlinking, even on an existing link', () => {
    const { onLinkClick } = setup('<p><a href="https://a.io">site</a></p>');
    editor.commands.setTextSelection(2);

    fireEvent.click(screen.getByTestId('toolbar-link'));

    expect(onLinkClick).toHaveBeenCalledTimes(1);
    expect(editor.isActive('link')).toBe(true);
  });

  it('has a single insert button that opens the file picker', () => {
    const { onFilePicker } = setup('<p>x</p>');
    fireEvent.click(screen.getByTestId('toolbar-insert-file'));
    expect(onFilePicker).toHaveBeenCalledTimes(1);
  });

  it('disables indent/outdent outside lists and enables them inside', async () => {
    setup('<p>plain</p><ul><li><p>one</p></li><li><p>two</p></li></ul>');
    expect(screen.getByTestId('toolbar-indent')).toBeDisabled();
    expect(screen.getByTestId('toolbar-outdent')).toBeDisabled();

    // Cursor into the second list item — it can be sunk under the first.
    const pos = editor.state.doc.content.size - 3;
    await act(async () => {
      editor.commands.setTextSelection(pos);
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByTestId('toolbar-indent')).toBeEnabled();
    expect(screen.getByTestId('toolbar-outdent')).toBeEnabled();
  });

  it('reflects active marks via aria-pressed and toggles them', async () => {
    setup('<p>hello</p>');
    editor.commands.selectAll();
    const bold = screen.getByTestId('toolbar-bold');
    expect(bold).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(bold);

    expect(editor.isActive('bold')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('toolbar-bold')).toHaveAttribute('aria-pressed', 'true'));
  });

  it('shows keyboard and markdown hints in tooltips', async () => {
    setup('<p>x</p>');
    fireEvent.mouseOver(screen.getByTestId('toolbar-heading1'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Editor\.Heading1 \((Ctrl\+Alt\+1|⌘⌥1) · #\)/);
  });
});
