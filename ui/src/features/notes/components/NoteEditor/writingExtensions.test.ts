import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildEditorExtensions } from './editorExtensions';

function mountEditor(content = '<p></p>') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: buildEditorExtensions('Write'),
    content,
  });
  return { editor, host };
}

function typeText(editor: Editor, value: string) {
  for (const char of value) {
    const { view } = editor;
    const { from, to } = view.state.selection;
    const handled = view.someProp('handleTextInput', (fn) =>
      fn(view, from, to, char, () => view.state.tr) ? true : null,
    );
    if (!handled) {
      view.dispatch(view.state.tr.insertText(char, from, to));
    }
  }
}

function textRuns(editor: Editor) {
  const runs: { text: string; marks: { type: string; href?: string }[] }[] = [];
  editor.state.doc.descendants((node) => {
    if (!node.isText || !node.text) return;
    runs.push({
      text: node.text,
      marks: node.marks.map((mark) => ({
        type: mark.type.name,
        href: typeof mark.attrs.href === 'string' ? mark.attrs.href : undefined,
      })),
    });
  });
  return runs;
}

describe('editor writing shortcuts', () => {
  const mounts: { editor: Editor; host: HTMLDivElement }[] = [];

  afterEach(() => {
    for (const { editor, host } of mounts) {
      editor.destroy();
      host.remove();
    }
    mounts.length = 0;
  });

  function editorWith(content?: string) {
    const mounted = mountEditor(content);
    mounts.push(mounted);
    return mounted.editor;
  }

  it('turns "# " into a heading and Ctrl+Alt+1 toggles it', () => {
    const editor = editorWith();
    typeText(editor, '# ');
    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(1);

    editor.commands.setContent('<p>Hello</p>');
    editor.commands.keyboardShortcut('Mod-Alt-2');
    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(2);
  });

  it('turns "- " and "1. " into lists', () => {
    const bullets = editorWith();
    typeText(bullets, '- ');
    expect(bullets.isActive('bulletList')).toBe(true);

    const numbered = editorWith();
    typeText(numbered, '1. ');
    expect(numbered.isActive('orderedList')).toBe(true);
  });

  it('applies bold and italic from markdown markers', () => {
    const editor = editorWith();
    typeText(editor, '**bold** and *italic*');
    expect(textRuns(editor)).toEqual([
      { text: 'bold', marks: [{ type: 'bold', href: undefined }] },
      { text: ' and ', marks: [] },
      { text: 'italic', marks: [{ type: 'italic', href: undefined }] },
    ]);
  });

  it('converts [label](url) into a validated link and leaves the next word alone', () => {
    const editor = editorWith();
    typeText(editor, 'See [Docs](example.com) next');

    expect(textRuns(editor)).toEqual([
      { text: 'See ', marks: [] },
      { text: 'Docs', marks: [{ type: 'link', href: 'https://example.com' }] },
      { text: ' next', marks: [] },
    ]);
  });

  it('does not link a dangerous markdown url or an autolinked javascript: url', () => {
    const markdown = editorWith();
    typeText(markdown, '[Nope](javascript:alert(1))');
    expect(textRuns(markdown).some((run) => run.marks.some((mark) => mark.type === 'link'))).toBe(
      false,
    );
    expect(markdown.getText()).toContain('javascript:alert(1)');

    const typed = editorWith();
    typeText(typed, 'javascript:alert(1) ');
    expect(textRuns(typed).some((run) => run.marks.some((mark) => mark.type === 'link'))).toBe(
      false,
    );
  });

  it('autolinks a url on space and does not swallow the following word', () => {
    const editor = editorWith();
    typeText(editor, 'https://example.com tail');
    expect(textRuns(editor)).toEqual([
      { text: 'https://example.com', marks: [{ type: 'link', href: 'https://example.com' }] },
      { text: ' tail', marks: [] },
    ]);
  });

  it('toggles lists from the keyboard', () => {
    const bullets = editorWith('<p>Item</p>');
    expect(bullets.commands.keyboardShortcut('Mod-Shift-8')).toBe(true);
    expect(bullets.isActive('bulletList')).toBe(true);

    const numbered = editorWith('<p>Item</p>');
    expect(numbered.commands.keyboardShortcut('Mod-Shift-7')).toBe(true);
    expect(numbered.isActive('orderedList')).toBe(true);

    const tasks = editorWith('<p>Item</p>');
    expect(tasks.commands.keyboardShortcut('Mod-Shift-9')).toBe(true);
    expect(tasks.isActive('taskList')).toBe(true);
  });

  it('turns "[ ] " into a task list', () => {
    const editor = editorWith();
    typeText(editor, '[ ] ');
    expect(editor.isActive('taskList')).toBe(true);
  });
});
