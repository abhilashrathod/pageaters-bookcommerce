import type { CmsBlockOf } from '@pageaters/cms-types';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type LinkFields, linkHref } from './rich-text-links.ts';

// Lexical JSON as stored by the CMS (only the fields read here).
interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number | string;
  tag?: string;
  listType?: string;
  fields?: LinkFields;
}

// Lexical's text format bit flags.
const BOLD = 1;
const ITALIC = 2;
const STRIKE = 4;
const UNDERLINE = 8;
const CODE = 16;

const HEADINGS = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' } as const;

function renderText(node: LexicalNode): ReactNode {
  const format = typeof node.format === 'number' ? node.format : 0;
  let out: ReactNode = node.text ?? '';
  if (format & CODE) out = <code className="rounded-sm bg-muted px-1">{out}</code>;
  if (format & BOLD) out = <strong>{out}</strong>;
  if (format & ITALIC) out = <em>{out}</em>;
  if (format & UNDERLINE) out = <u>{out}</u>;
  if (format & STRIKE) out = <s>{out}</s>;
  return out;
}

function renderNodes(nodes: LexicalNode[] | undefined): ReactNode {
  return (nodes ?? []).map((node, index) => <RenderNode key={index} node={node} />);
}

// Node types the CMS editor offers; anything else renders its children (or nothing), never raw HTML.
function RenderNode({ node }: { node: LexicalNode }): ReactNode {
  const children = renderNodes(node.children);
  switch (node.type) {
    case 'text':
      return renderText(node);
    case 'linebreak':
      return <br />;
    case 'tab':
      return '\t';
    case 'paragraph':
      return <p>{children}</p>;
    case 'heading': {
      const Tag = HEADINGS[node.tag as keyof typeof HEADINGS] ?? 'h2';
      return <Tag>{children}</Tag>;
    }
    case 'quote':
      return <blockquote>{children}</blockquote>;
    case 'list':
      return node.listType === 'number' ? <ol>{children}</ol> : <ul>{children}</ul>;
    case 'listitem':
      return <li>{children}</li>;
    case 'horizontalrule':
      return <hr />;
    case 'link': {
      const href = linkHref(node.fields);
      if (!href) return children;
      const external = href.startsWith('https://');
      return (
        <Link href={href} {...((node.fields?.newTab || external) && { target: '_blank', rel: 'noopener noreferrer' })}>
          {children}
        </Link>
      );
    }
    default:
      return node.children ? children : null;
  }
}

// Rich text from the CMS (help pages, notes on landing pages), styled like the legacy content pages.
export function RichTextBlock({ block }: { block: CmsBlockOf<'richText'> }) {
  return (
    <section className="page-container my-8 max-w-3xl space-y-4 leading-relaxed [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
      {renderNodes(block.content.root.children)}
    </section>
  );
}
