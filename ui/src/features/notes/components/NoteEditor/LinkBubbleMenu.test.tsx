import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { Editor } from '@tiptap/core';
import { LinkBubbleMenu } from './LinkBubbleMenu';
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

function renderBubble() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: buildEditorExtensions('Write'),
    content: '<p><a href="https://example.com/docs">Docs</a> tail</p>',
  });
  mounts.push({ editor, host });
  render(
    <ThemeProvider theme={theme}>
      <LinkBubbleMenu editor={editor} />
    </ThemeProvider>,
  );
  return { editor, host };
}

describe('LinkBubbleMenu', () => {
  afterEach(() => {
    for (const { editor, host } of mounts) {
      editor.destroy();
      host.remove();
    }
    mounts.length = 0;
  });

  it('does not throw when the editor view is not mounted yet', () => {
    const editor = new Editor({
      element: null,
      extensions: buildEditorExtensions('Write'),
      content: '<p><a href="https://example.com/docs">Docs</a> tail</p>',
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    mounts.push({ editor, host });

    expect(() =>
      render(
        <ThemeProvider theme={theme}>
          <LinkBubbleMenu editor={editor} />
        </ThemeProvider>,
      ),
    ).not.toThrow();
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();

    act(() => {
      editor.mount(host);
      editor.commands.setTextSelection(2);
    });
    const link = host.querySelector('a');
    act(() => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();
  });

  it('stays hidden while the caret is merely inside a link', () => {
    const { editor } = renderBubble();
    editor.commands.setTextSelection(2);
    expect(editor.isActive('link')).toBe(true);
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
  });

  it('opens on a click and closes again when the text changes', () => {
    const { editor, host } = renderBubble();
    editor.commands.setTextSelection(2);
    const link = host.querySelector('a');
    expect(link).not.toBeNull();
    act(() => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();
    expect(screen.getByText('example.com/docs')).toBeInTheDocument();

    act(() => {
      editor.commands.insertContent('!');
    });
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
  });
});
