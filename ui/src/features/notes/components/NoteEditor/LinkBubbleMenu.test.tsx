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

/** The bubble shows one turn after the click (the caret moves into the link first). */
async function clickLink(link: Element | null | undefined) {
  await act(async () => {
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function renderBubble(content = '<p><a href="https://example.com/docs">Docs</a> tail</p>') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: buildEditorExtensions('Write'),
    content,
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

  it('does not throw when the editor view is not mounted yet', async () => {
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
    await clickLink(host.querySelector('a'));
    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();
  });

  it('stays hidden while the caret is merely inside a link', () => {
    const { editor } = renderBubble();
    editor.commands.setTextSelection(2);
    expect(editor.isActive('link')).toBe(true);
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
  });

  it('opens on a click and closes again when the text changes', async () => {
    const { editor, host } = renderBubble();
    editor.commands.setTextSelection(2);
    const link = host.querySelector('a');
    expect(link).not.toBeNull();
    await clickLink(link);

    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();
    expect(screen.getByText('example.com/docs')).toBeInTheDocument();

    act(() => {
      editor.commands.insertContent('!');
    });
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
  });

  it('shows the clicked link, not the one the caret was in, and moves when another link is clicked', async () => {
    const { editor, host } = renderBubble(
      '<p><a href="https://a.example">Alpha</a> and <a href="https://b.example">Beta</a></p>',
    );
    const [first, second] = Array.from(host.querySelectorAll('a'));

    // Caret is still in Alpha when Beta's click arrives; the selection only
    // follows a turn later (as ProseMirror does after a real click).
    editor.commands.setTextSelection(2);
    await act(async () => {
      second.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      editor.commands.setTextSelection(14);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText('b.example')).toBeInTheDocument();

    // Bubble open on Beta; a click on Alpha moves it there instead of closing it.
    await act(async () => {
      first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      editor.commands.setTextSelection(2);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();
    expect(screen.getByText('a.example')).toBeInTheDocument();
  });

  it('closes on Escape before the editor-wide handler sees it', async () => {
    const { editor, host } = renderBubble();
    editor.commands.setTextSelection(2);
    await clickLink(host.querySelector('a'));
    expect(screen.getByTestId('link-bubble-open')).toBeInTheDocument();

    const pageHandler = vi.fn();
    document.addEventListener('keydown', pageHandler);
    act(() => {
      editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    document.removeEventListener('keydown', pageHandler);

    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
    expect(pageHandler).not.toHaveBeenCalled();
  });

  it('drops a pending show when the bubble unmounts before the next tick', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = new Editor({
      element: host,
      extensions: buildEditorExtensions('Write'),
      content: '<p><a href="https://example.com/docs">Docs</a> tail</p>',
    });
    mounts.push({ editor, host });
    const view = render(
      <ThemeProvider theme={theme}>
        <LinkBubbleMenu editor={editor} />
      </ThemeProvider>,
    );
    editor.commands.setTextSelection(2);
    const clearSpy = vi.spyOn(window, 'clearTimeout');

    host.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    view.unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId('link-bubble-open')).not.toBeInTheDocument();
  });
});
