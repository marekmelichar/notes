import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { Editor } from '@tiptap/core';
import { LinkDialog } from './LinkDialog';
import { buildEditorExtensions } from './editorExtensions';

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  };
});

const theme = createTheme();
const mounts: { editor: Editor; host: HTMLDivElement }[] = [];

function renderDialog(content = '<p>Hello</p>', prepare?: (editor: Editor) => void) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: buildEditorExtensions('Write'),
    content,
  });
  prepare?.(editor);
  mounts.push({ editor, host });
  const onClose = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <LinkDialog editor={editor} open onClose={onClose} />
    </ThemeProvider>,
  );
  return { editor, onClose };
}

describe('LinkDialog', () => {
  afterEach(() => {
    for (const { editor, host } of mounts) {
      editor.destroy();
      host.remove();
    }
    mounts.length = 0;
  });

  it('keeps the dialog open and shows an error for a dangerous url', async () => {
    const user = userEvent.setup();
    const { editor, onClose } = renderDialog('<p>Hello</p>', (instance) => {
      instance.commands.setTextSelection({ from: 1, to: 6 });
    });

    const url = screen.getByTestId('link-dialog-url-input').querySelector('input');
    expect(url).not.toBeNull();
    await user.type(url as HTMLInputElement, 'javascript:alert(1)');
    await user.click(screen.getByTestId('link-dialog-submit'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Editor.InvalidLink')).toBeInTheDocument();
    expect(editor.isActive('link')).toBe(false);
  });

  it('applies a normalized url to the current selection', async () => {
    const user = userEvent.setup();
    const { editor, onClose } = renderDialog('<p>Hello</p>', (instance) => {
      instance.commands.setTextSelection({ from: 1, to: 6 });
    });

    const url = screen.getByTestId('link-dialog-url-input').querySelector('input');
    await user.type(url as HTMLInputElement, 'example.com');
    await user.click(screen.getByTestId('link-dialog-submit'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(editor.getAttributes('link').href).toBe('https://example.com');
    expect(editor.getText()).toBe('Hello');
  });

  it('removes an existing link', async () => {
    const user = userEvent.setup();
    const { editor, onClose } = renderDialog(
      '<p><a href="https://example.com">Hello</a></p>',
      (instance) => {
        instance.commands.setTextSelection(2);
      },
    );

    await user.click(screen.getByTestId('link-dialog-unlink'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(editor.isActive('link')).toBe(false);
    expect(editor.getText()).toBe('Hello');
  });
});
