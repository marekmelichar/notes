import type { JSONContent } from '@tiptap/core';

/**
 * Migrates BlockNote JSON (array of blocks) to TipTap JSON (ProseMirror doc).
 *
 * BlockNote format:  [{type, content: [{type:"text", text, styles}], props, children}]
 * TipTap format:     {type:"doc", content: [{type, attrs, content: [{type:"text", text, marks}]}]}
 */

interface BlockNoteInline {
  type: string;
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: BlockNoteInline[];
}

interface BlockNoteBlock {
  type: string;
  content?: BlockNoteInline[] | Record<string, unknown>;
  props?: Record<string, unknown>;
  children?: BlockNoteBlock[];
}

const STYLE_TO_MARK: Record<string, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
};

interface MarkDef {
  type: string;
  attrs?: Record<string, unknown>;
}

function convertInlineContent(content: BlockNoteInline[] | undefined): JSONContent[] {
  if (!content || !Array.isArray(content)) return [];

  const result: JSONContent[] = [];

  for (const item of content) {
    if (item.type === 'text' && item.text) {
      const marks: MarkDef[] = [];

      if (item.styles) {
        for (const [style, value] of Object.entries(item.styles)) {
          if (value && STYLE_TO_MARK[style]) {
            marks.push({ type: STYLE_TO_MARK[style] });
          }
        }
      }

      const node: JSONContent = { type: 'text', text: item.text };
      if (marks.length > 0) node.marks = marks;
      result.push(node);
    } else if (item.type === 'link' && item.href) {
      // Link wraps inner content with a link mark
      const innerNodes = convertInlineContent(item.content);
      for (const inner of innerNodes) {
        const linkMark: MarkDef = { type: 'link', attrs: { href: item.href, target: '_blank' } };
        const existingMarks = (inner.marks || []) as MarkDef[];
        inner.marks = [...existingMarks, linkMark];
        result.push(inner);
      }
    }
  }

  return result;
}

function convertBlock(block: BlockNoteBlock): JSONContent {
  switch (block.type) {
    case 'heading': {
      const level = (block.props?.level as number) || 1;
      return {
        type: 'heading',
        attrs: { level },
        content: convertInlineContent(block.content as BlockNoteInline[]),
      };
    }

    case 'image': {
      const url = block.props?.url as string;
      const caption = block.props?.caption as string;
      const width = block.props?.width as number;
      return {
        type: 'image',
        attrs: {
          src: url || '',
          alt: caption || null,
          title: caption || null,
          ...(width ? { width } : {}),
        },
      };
    }

    case 'codeBlock': {
      const language = block.props?.language as string;
      const text = Array.isArray(block.content)
        ? block.content.map((c) => c.text || '').join('')
        : '';
      return {
        type: 'codeBlock',
        attrs: { language: language || null },
        content: text ? [{ type: 'text', text }] : [],
      };
    }

    case 'paragraph':
    default:
      return {
        type: 'paragraph',
        content: convertInlineContent(block.content as BlockNoteInline[]),
      };
  }
}

/**
 * Groups consecutive list items (bulletListItem / numberedListItem)
 * into proper TipTap list structures (bulletList / orderedList > listItem).
 */
function convertBlocks(blocks: BlockNoteBlock[]): JSONContent[] {
  const result: JSONContent[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
      const listType = block.type === 'bulletListItem' ? 'bulletList' : 'orderedList';
      const items: BlockNoteBlock[] = [];

      while (i < blocks.length && blocks[i].type === block.type) {
        items.push(blocks[i]);
        i++;
      }

      result.push({
        type: listType,
        content: items.map((item) => {
          const listItemContent: JSONContent[] = [
            {
              type: 'paragraph',
              content: convertInlineContent(item.content as BlockNoteInline[]),
            },
          ];

          // Nested children become sub-lists
          if (item.children && item.children.length > 0) {
            listItemContent.push(...convertBlocks(item.children));
          }

          return { type: 'listItem', content: listItemContent };
        }),
      });
    } else {
      result.push(convertBlock(block));
      i++;
    }
  }

  return result;
}

/**
 * Detects whether content is BlockNote format and migrates to TipTap if needed.
 * - BlockNote: top-level JSON is an array
 * - TipTap: top-level JSON is an object with type: "doc"
 */
export function migrateContent(raw: string | undefined): JSONContent | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);

    // Already TipTap format
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type === 'doc') {
      return parsed as JSONContent;
    }

    // BlockNote format (array of blocks)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const content = convertBlocks(parsed as BlockNoteBlock[]);
      // Filter out empty paragraphs at the end, but keep at least one node
      return {
        type: 'doc',
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract plain text from content JSON (handles both BlockNote and TipTap formats).
 * Used by SearchDialog for snippet extraction.
 */
export function extractTextFromContent(raw: string, maxLength = 100): string {
  try {
    const parsed = JSON.parse(raw);

    // TipTap format
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return extractTextFromTiptapNode(parsed, maxLength);
    }

    // BlockNote format (legacy)
    if (Array.isArray(parsed)) {
      let text = '';
      for (const block of parsed) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.text) {
              text += item.text + ' ';
            }
          }
        }
        if (text.length >= maxLength) break;
      }
      return text.trim().slice(0, maxLength);
    }

    return '';
  } catch {
    return raw.slice(0, maxLength);
  }
}

function extractTextFromTiptapNode(node: JSONContent, maxLength: number): string {
  let text = '';

  if (node.type === 'text' && node.text) {
    return node.text;
  }

  if (node.content) {
    for (const child of node.content) {
      text += extractTextFromTiptapNode(child, maxLength) + ' ';
      if (text.length >= maxLength) break;
    }
  }

  return text.trim().slice(0, maxLength);
}
