import { describe, it, expect } from 'vitest';
import { migrateContent, extractTextFromContent } from './contentMigration';

describe('migrateContent', () => {
  it('should return undefined for empty input', () => {
    expect(migrateContent(undefined)).toBeUndefined();
    expect(migrateContent('')).toBeUndefined();
  });

  it('should return undefined for invalid JSON', () => {
    expect(migrateContent('not json')).toBeUndefined();
    expect(migrateContent('{broken')).toBeUndefined();
  });

  it('should return undefined for empty array', () => {
    expect(migrateContent('[]')).toBeUndefined();
  });

  it('should pass through TipTap doc format unchanged', () => {
    const tiptapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    };
    const result = migrateContent(JSON.stringify(tiptapDoc));
    expect(result).toEqual(tiptapDoc);
  });

  it('should migrate BlockNote paragraph to TipTap', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello world' }],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    });
  });

  it('should migrate BlockNote heading with level', () => {
    const blocknote = [
      {
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Title' }],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    });
  });

  it('should default heading level to 1 when missing', () => {
    const blocknote = [
      {
        type: 'heading',
        content: [{ type: 'text', text: 'Title' }],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0].attrs?.level).toBe(1);
  });

  it('should convert inline styles to marks', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'bold text',
            styles: { bold: true, italic: true },
          },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const textNode = result?.content?.[0].content?.[0];
    expect(textNode?.marks).toEqual(
      expect.arrayContaining([{ type: 'bold' }, { type: 'italic' }]),
    );
  });

  it('should ignore false style values', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'plain',
            styles: { bold: false, italic: false },
          },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const textNode = result?.content?.[0].content?.[0];
    expect(textNode?.marks).toBeUndefined();
  });

  it('should convert all supported styles', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'styled',
            styles: { bold: true, italic: true, underline: true, strike: true, code: true },
          },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const marks = result?.content?.[0].content?.[0].marks as { type: string }[];
    const markTypes = marks.map((m) => m.type).sort();
    expect(markTypes).toEqual(['bold', 'code', 'italic', 'strike', 'underline']);
  });

  it('should convert BlockNote link with inner content', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'link',
            href: 'https://example.com',
            content: [{ type: 'text', text: 'click here' }],
          },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const textNode = result?.content?.[0].content?.[0];
    expect(textNode?.text).toBe('click here');
    expect(textNode?.marks).toEqual(
      expect.arrayContaining([
        { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } },
      ]),
    );
  });

  it('should convert link with styled inner text', () => {
    const blocknote = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'link',
            href: 'https://x.com',
            content: [{ type: 'text', text: 'bold link', styles: { bold: true } }],
          },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const textNode = result?.content?.[0].content?.[0];
    const marks = textNode?.marks as { type: string }[];
    const markTypes = marks.map((m) => m.type);
    expect(markTypes).toContain('bold');
    expect(markTypes).toContain('link');
  });

  it('should group consecutive bullet list items into a bulletList', () => {
    const blocknote = [
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Item 1' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Item 2' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(1);
    const list = result?.content?.[0];
    expect(list?.type).toBe('bulletList');
    expect(list?.content).toHaveLength(2);
    expect(list?.content?.[0].type).toBe('listItem');
    expect(list?.content?.[0].content?.[0].content?.[0].text).toBe('Item 1');
  });

  it('should group consecutive numbered list items into an orderedList', () => {
    const blocknote = [
      { type: 'numberedListItem', content: [{ type: 'text', text: 'First' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'Second' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0].type).toBe('orderedList');
    expect(result?.content?.[0].content).toHaveLength(2);
  });

  it('should not group different list types together', () => {
    const blocknote = [
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Bullet' }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'Number' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(2);
    expect(result?.content?.[0].type).toBe('bulletList');
    expect(result?.content?.[1].type).toBe('orderedList');
  });

  it('should handle nested list children', () => {
    const blocknote = [
      {
        type: 'bulletListItem',
        content: [{ type: 'text', text: 'Parent' }],
        children: [
          { type: 'bulletListItem', content: [{ type: 'text', text: 'Child' }] },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const listItem = result?.content?.[0].content?.[0];
    // listItem should have paragraph + nested bulletList
    expect(listItem?.content).toHaveLength(2);
    expect(listItem?.content?.[0].type).toBe('paragraph');
    expect(listItem?.content?.[1].type).toBe('bulletList');
  });

  it('should convert image block', () => {
    const blocknote = [
      {
        type: 'image',
        props: { url: 'https://img.com/photo.jpg', caption: 'My photo', width: 400 },
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0]).toEqual({
      type: 'image',
      attrs: {
        src: 'https://img.com/photo.jpg',
        alt: 'My photo',
        title: 'My photo',
        width: 400,
      },
    });
  });

  it('should convert image block without optional props', () => {
    const blocknote = [
      {
        type: 'image',
        props: { url: 'https://img.com/photo.jpg' },
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0].attrs?.src).toBe('https://img.com/photo.jpg');
    expect(result?.content?.[0].attrs?.alt).toBeNull();
  });

  it('should convert codeBlock with language', () => {
    const blocknote = [
      {
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [{ type: 'text', text: 'const x = 1;' }],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content?.[0]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });

  it('should strip dangerous protocols from link hrefs', () => {
    const vectors = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:MsgBox'];
    for (const href of vectors) {
      const blocknote = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'link',
              href,
              content: [{ type: 'text', text: 'evil link' }],
            },
          ],
        },
      ];
      const result = migrateContent(JSON.stringify(blocknote));
      const textNode = result?.content?.[0].content?.[0];
      expect(textNode?.text).toBe('evil link');
      // Link mark should be stripped, text preserved
      expect(textNode?.marks).toBeUndefined();
    }
  });

  it('should convert checkListItem with checked state to bullet list with ☑ prefix', () => {
    const blocknote = [
      { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'Done task' }] },
      { type: 'checkListItem', props: { checked: false }, content: [{ type: 'text', text: 'Open task' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(1);
    const list = result?.content?.[0];
    expect(list?.type).toBe('bulletList');
    expect(list?.content).toHaveLength(2);

    // First item: checked
    const item1Text = list?.content?.[0].content?.[0].content;
    expect(item1Text?.[0].text).toBe('☑ ');
    expect(item1Text?.[1].text).toBe('Done task');

    // Second item: unchecked
    const item2Text = list?.content?.[1].content?.[0].content;
    expect(item2Text?.[0].text).toBe('☐ ');
    expect(item2Text?.[1].text).toBe('Open task');
  });

  it('should handle checkListItem with nested children', () => {
    const blocknote = [
      {
        type: 'checkListItem',
        props: { checked: false },
        content: [{ type: 'text', text: 'Parent' }],
        children: [
          { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'Child' }] },
        ],
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    const listItem = result?.content?.[0].content?.[0];
    // Should have paragraph + nested bulletList
    expect(listItem?.content).toHaveLength(2);
    expect(listItem?.content?.[0].type).toBe('paragraph');
    expect(listItem?.content?.[1].type).toBe('bulletList');
  });

  it('should not group checkListItem with bulletListItem', () => {
    const blocknote = [
      { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'Check' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Bullet' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(2);
    expect(result?.content?.[0].type).toBe('bulletList'); // checkListItem group
    expect(result?.content?.[1].type).toBe('bulletList'); // bulletListItem group
  });

  it('should convert table to paragraphs with pipe-separated cells', () => {
    const blocknote = [
      {
        type: 'table',
        content: {
          type: 'tableContent',
          rows: [
            { cells: [[{ type: 'text', text: 'Name' }], [{ type: 'text', text: 'Age' }]] },
            { cells: [[{ type: 'text', text: 'Alice' }], [{ type: 'text', text: '30' }]] },
          ],
        },
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(2);
    expect(result?.content?.[0].type).toBe('paragraph');
    // First row: "Name | Age"
    const row1 = result?.content?.[0].content;
    expect(row1?.[0].text).toBe('Name');
    expect(row1?.[1].text).toBe(' | ');
    expect(row1?.[2].text).toBe('Age');
  });

  it('should handle table with styled cell content', () => {
    const blocknote = [
      {
        type: 'table',
        content: {
          type: 'tableContent',
          rows: [
            {
              cells: [
                [{ type: 'text', text: 'bold', styles: { bold: true } }],
                [{ type: 'text', text: 'plain' }],
              ],
            },
          ],
        },
      },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(1);
    const row = result?.content?.[0].content;
    expect(row?.[0].marks).toEqual([{ type: 'bold' }]);
    expect(row?.[2].text).toBe('plain');
  });

  it('should handle empty table gracefully', () => {
    const blocknote = [
      { type: 'table', content: { type: 'tableContent', rows: [] } },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    // Empty table produces no paragraphs; fallback is a single empty paragraph
    expect(result?.content).toHaveLength(1);
    expect(result?.content?.[0].type).toBe('paragraph');
  });

  it('should handle table with missing content', () => {
    const blocknote = [{ type: 'table' }];
    const result = migrateContent(JSON.stringify(blocknote));
    // No rows → fallback empty paragraph
    expect(result?.content).toHaveLength(1);
    expect(result?.content?.[0].type).toBe('paragraph');
  });

  it('should handle mixed content (paragraph + list + heading)', () => {
    const blocknote = [
      { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'A' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'B' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'End' }] },
    ];
    const result = migrateContent(JSON.stringify(blocknote));
    expect(result?.content).toHaveLength(4);
    expect(result?.content?.[0].type).toBe('heading');
    expect(result?.content?.[1].type).toBe('paragraph');
    expect(result?.content?.[2].type).toBe('bulletList');
    expect(result?.content?.[3].type).toBe('paragraph');
  });
});

describe('extractTextFromContent', () => {
  it('should return empty string for empty array', () => {
    expect(extractTextFromContent('[]')).toBe('');
  });

  it('should extract text from BlockNote format', () => {
    const blocknote = [
      { content: [{ text: 'Hello' }, { text: ' world' }] },
      { content: [{ text: 'Second paragraph' }] },
    ];
    expect(extractTextFromContent(JSON.stringify(blocknote))).toBe(
      'Hello  world Second paragraph',
    );
  });

  it('should extract text from TipTap format', () => {
    const tiptap = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello TipTap' }],
        },
      ],
    };
    expect(extractTextFromContent(JSON.stringify(tiptap))).toBe('Hello TipTap');
  });

  it('should respect maxLength parameter', () => {
    const tiptap = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'A very long text that should be truncated' }],
        },
      ],
    };
    const result = extractTextFromContent(JSON.stringify(tiptap), 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should fallback to raw string slice on invalid JSON', () => {
    expect(extractTextFromContent('plain text', 5)).toBe('plain');
  });

  it('should handle nested TipTap nodes', () => {
    const tiptap = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item one' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractTextFromContent(JSON.stringify(tiptap))).toBe('Item one');
  });
});
