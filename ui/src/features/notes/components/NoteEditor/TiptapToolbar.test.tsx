import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { Editor } from '@tiptap/core';
import { TiptapToolbar } from './TiptapToolbar';
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

function renderToolbar(content = '<p>Hello</p>') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: buildEditorExtensions('Write'),
    content,
  });
  mounts.push({ editor, host });
  const onLink = vi.fn();
  const onFilePicker = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <TiptapToolbar editor={editor} onLink={onLink} onFilePicker={onFilePicker} />
    </ThemeProvider>,
  );
  return { editor, onLink, onFilePicker };
}

describe('TiptapToolbar', () => {
  afterEach(() => {
    for (const { editor, host } of mounts) {
      editor.destroy();
      host.remove();
    }
    mounts.length = 0;
  });

  it('keeps everyday controls visible and tucks the rest into More', async () => {
    const user = userEvent.setup();
    renderToolbar();

    expect(screen.getByTestId('toolbar-bold')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-link')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-insert')).toBeInTheDocument();
    expect(screen.queryByTestId('toolbar-underline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toolbar-image')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('toolbar-more'));
    expect(screen.getByTestId('toolbar-underline')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-code-block')).toBeInTheDocument();
    // Menu items show the key chord and the markdown you can type instead.
    expect(screen.getByTestId('toolbar-strikethrough')).toHaveTextContent('~~text~~');
    expect(screen.getByTestId('toolbar-horizontal-rule')).toHaveTextContent('---');
  });

  it('opens the link dialog instead of removing an existing link', async () => {
    const user = userEvent.setup();
    const { editor, onLink } = renderToolbar('<p><a href="https://example.com">Hello</a></p>');
    editor.commands.setTextSelection(2);
    expect(editor.isActive('link')).toBe(true);

    await user.click(screen.getByTestId('toolbar-link'));

    expect(onLink).toHaveBeenCalledOnce();
    expect(editor.isActive('link')).toBe(true);
  });

  it('applies a heading from the heading menu', async () => {
    const user = userEvent.setup();
    const { editor } = renderToolbar();

    await user.click(screen.getByTestId('toolbar-heading'));
    await user.click(screen.getByTestId('toolbar-heading1'));

    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(1);
  });

  it('keeps the heading when the current level is picked again', async () => {
    const user = userEvent.setup();
    const { editor } = renderToolbar('<h2>Hello</h2>');

    await user.click(screen.getByTestId('toolbar-heading'));
    await user.click(screen.getByTestId('toolbar-heading2'));

    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(2);
  });

  it('inserts a file from the single insert button', async () => {
    const user = userEvent.setup();
    const { onFilePicker } = renderToolbar();

    await user.click(screen.getByTestId('toolbar-insert'));
    expect(onFilePicker).toHaveBeenCalledOnce();
  });

  it('moves numbered list and quote into More on a phone-width screen', async () => {
    const user = userEvent.setup();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes('max-width: 48rem'),
    })) as typeof window.matchMedia;
    try {
      const { editor } = renderToolbar();
      expect(screen.queryByTestId('toolbar-ordered-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('toolbar-blockquote')).not.toBeInTheDocument();
      expect(screen.getByTestId('toolbar-bullet-list')).toBeInTheDocument();

      await user.click(screen.getByTestId('toolbar-more'));
      await user.click(screen.getByTestId('toolbar-ordered-list'));
      expect(editor.isActive('orderedList')).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
});
