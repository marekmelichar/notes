import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SafeLink, MARKDOWN_LINK_INPUT_REGEX } from './LinkExtension';

let editor: Editor | null = null;

const createEditor = (content: string | object = '<p></p>') => {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit.configure({ link: false }), SafeLink],
    content,
  });
  return editor;
};

/** Simulates the user typing `text` at the cursor, so input rules fire. */
const type = (ed: Editor, text: string) => {
  for (const char of text) {
    const { from, to } = ed.state.selection;
    const handled = ed.view.someProp('handleTextInput', (f) =>
      f(ed.view, from, to, char, () => ed.state.tr.insertText(char, from, to)),
    );
    if (!handled) ed.view.dispatch(ed.state.tr.insertText(char, from, to));
  }
};

const linkMarks = (ed: Editor) => {
  const marks: { text: string; href: string }[] = [];
  ed.state.doc.descendants((node) => {
    const link = node.marks.find((m) => m.type.name === 'link');
    if (node.isText && link) marks.push({ text: node.text ?? '', href: link.attrs.href as string });
  });
  return marks;
};

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('MARKDOWN_LINK_INPUT_REGEX', () => {
  it('matches [text](url) at line start or after whitespace', () => {
    expect('[Docs](example.com)').toMatch(MARKDOWN_LINK_INPUT_REGEX);
    expect('see [Docs](https://x.io/a?b=1)').toMatch(MARKDOWN_LINK_INPUT_REGEX);
  });

  it('does not match image syntax or URLs with spaces', () => {
    expect('![alt](img.png)').not.toMatch(MARKDOWN_LINK_INPUT_REGEX);
    expect('[Docs](exa mple.com)').not.toMatch(MARKDOWN_LINK_INPUT_REGEX);
    expect('[](example.com)').not.toMatch(MARKDOWN_LINK_INPUT_REGEX);
  });
});

describe('SafeLink', () => {
  it('turns typed [text](url) into a link with a normalized href', () => {
    const ed = createEditor();
    type(ed, 'Read [the docs](example.com)');

    expect(ed.getText()).toBe('Read the docs');
    expect(linkMarks(ed)).toEqual([{ text: 'the docs', href: 'https://example.com' }]);
  });

  it('keeps typing after a markdown link outside the link', () => {
    const ed = createEditor();
    type(ed, '[Docs](example.com) next');

    expect(ed.getText()).toBe('Docs next');
    expect(linkMarks(ed)).toEqual([{ text: 'Docs', href: 'https://example.com' }]);
  });

  it('leaves dangerous markdown links as plain text', () => {
    const ed = createEditor();
    // No parens in the URL so the rule matches and validation is what rejects it.
    type(ed, '[x](javascript:void)');

    expect(linkMarks(ed)).toEqual([]);
    expect(ed.getText()).toBe('[x](javascript:void)');
  });

  it('is not inclusive — text typed at the end of a link is not linked', () => {
    const ed = createEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://a.io' } }] }],
        },
      ],
    });
    ed.commands.focus('end');
    type(ed, '!');

    expect(linkMarks(ed)).toEqual([{ text: 'site', href: 'https://a.io' }]);
    expect(ed.getText()).toBe('site!');
  });

  it('rejects dangerous hrefs from setLink and parsed HTML', () => {
    const ed = createEditor('<p><a href="javascript:alert(1)">bad</a> <a href="https://ok.io">ok</a></p>');
    expect(linkMarks(ed)).toEqual([{ text: 'ok', href: 'https://ok.io' }]);

    ed.commands.setTextSelection({ from: 1, to: 4 });
    ed.commands.setLink({ href: 'data:text/html,<script>' });
    expect(linkMarks(ed)).toEqual([{ text: 'ok', href: 'https://ok.io' }]);
  });
});
