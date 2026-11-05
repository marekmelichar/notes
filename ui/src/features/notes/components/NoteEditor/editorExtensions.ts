import { InputRule } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Link, { isAllowedUri as tiptapIsAllowedUri } from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { CustomImageExtension } from './CustomImageExtension';
import { FileEmbedExtension } from './FileEmbedExtension';
import { validateAndNormalizeUrl } from './linkUtils';

/**
 * Markdown link at the cursor: `[label](url)`.
 * The leading whitespace (when present) is part of the match so it isn't eaten,
 * and `$` anchors the match to the character just typed.
 */
const MARKDOWN_LINK_INPUT = /(?:^|\s)\[([^[\]]+)\]\(([^)\s]+)\)$/;

/**
 * Link mark that keeps the editor's URL rules and adds `[label](url)`.
 *
 * `inclusive: false` matters: with autolink on, TipTap's default link mark is
 * inclusive, so the next characters you type after a finished link stay linked.
 */
export const SafeLink = Link.extend({
  inclusive: false,

  addInputRules() {
    const type = this.type;
    const protocols = this.options.protocols;

    return [
      new InputRule({
        find: MARKDOWN_LINK_INPUT,
        handler: ({ state, range, match }) => {
          const label = match[1];
          const href = validateAndNormalizeUrl(match[2] ?? '');
          if (!label || !href || !tiptapIsAllowedUri(href, protocols)) {
            return null;
          }

          const lead = /^\s/.test(match[0]) ? match[0][0] : '';
          const linkText = state.schema.text(label, [type.create({ href })]);
          const nodes = lead ? [state.schema.text(lead), linkText] : [linkText];

          const { tr } = state;
          tr.replaceWith(range.from, range.to, Fragment.from(nodes));
          tr.removeStoredMark(type);
        },
      }),
    ];
  },
});

export function buildEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    SafeLink.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
      // Match validateAndNormalizeUrl, which prefixes https — not TipTap's http default.
      defaultProtocol: 'https',
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      isAllowedUri: (url, { defaultValidate }) =>
        validateAndNormalizeUrl(url) !== null && defaultValidate(url),
    }),
    CustomImageExtension.configure({
      allowBase64: false,
      HTMLAttributes: { class: 'editor-image' },
    }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    FileEmbedExtension,
    Placeholder.configure({ placeholder }),
  ];
}
