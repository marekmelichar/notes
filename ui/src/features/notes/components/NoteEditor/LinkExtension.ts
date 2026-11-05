import Link from '@tiptap/extension-link';
import { InputRule } from '@tiptap/core';
import { isSafeLinkHref, validateAndNormalizeUrl } from './linkUtils';

/** `[text](url)` typed at the start of a line or after whitespace. */
export const MARKDOWN_LINK_INPUT_REGEX = /(?:^|\s)\[([^[\]]+)\]\(([^()\s]+)\)$/;

/**
 * Link mark tuned for writing:
 * - not inclusive, so typing right after a link doesn't extend it
 *   (upstream makes the mark inclusive whenever `autolink` is on);
 * - every href also passes our dangerous-protocol check, on top of
 *   TipTap's default validation;
 * - `[text](url)` becomes a link as soon as the closing `)` is typed.
 */
export const SafeLink = Link.extend({
  inclusive: () => false,

  addInputRules() {
    const type = this.type;
    return [
      new InputRule({
        find: MARKDOWN_LINK_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const [full, text, rawUrl] = match;
          const href = validateAndNormalizeUrl(rawUrl);
          if (!href || !text) return null;

          // The optional leading whitespace is part of the match; keep it.
          const start = range.from + full.indexOf('[');
          state.tr
            .replaceWith(start, range.to, state.schema.text(text, [type.create({ href })]))
            .removeStoredMark(type);
        },
      }),
    ];
  },
}).configure({
  autolink: true,
  linkOnPaste: true,
  openOnClick: false,
  HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
  isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isSafeLinkHref(url),
});
