import type { ComponentProps } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './index.module.css';

const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;

const markdownComponents: ComponentProps<typeof Markdown>['components'] = {
  a: ({ children, href, ...props }) => {
    const safeHref = href && DANGEROUS_PROTOCOL.test(href.trim()) ? undefined : href;
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview = ({ content }: MarkdownPreviewProps) => (
  <div className={styles.markdownPreview}>
    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </Markdown>
  </div>
);
