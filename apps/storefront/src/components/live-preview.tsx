'use client';

import { useLivePreview } from '@payloadcms/live-preview-react';
import { useEffect, useState, type ReactNode } from 'react';

// Inside the CMS's live-preview iframe: the editor posts the document as it is edited; each change re-renders its
// layout on the server (`render`, a server action). Until the first message the server-rendered children show.
export function LivePreview({
  initialData,
  serverURL,
  render,
  children,
}: {
  initialData: { layout?: unknown };
  serverURL: string;
  render: (layout: unknown) => Promise<ReactNode>;
  children: ReactNode;
}) {
  const { data } = useLivePreview({ initialData, serverURL, depth: 2 });
  const [node, setNode] = useState<ReactNode>(children);
  useEffect(() => {
    if (data === initialData) return;
    let current = true;
    void render(data.layout).then((rendered) => current && setNode(rendered));
    return () => {
      current = false;
    };
  }, [data, initialData, render]);
  return node;
}
