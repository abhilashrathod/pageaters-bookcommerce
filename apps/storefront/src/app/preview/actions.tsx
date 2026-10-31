'use server';

import type { CmsBlock } from '@pageaters/cms-types';
import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';

import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import { isPageType, type PageType } from '@/lib/content.ts';
import { sampleItem } from '@/lib/sample-item.ts';

// Renders a live-preview layout (the CMS editor's unsaved blocks) on the server, with a template's sample item.
// Draft mode only, i.e. after /api/draft checked the preview secret. Blocks still go through the safe renderer.
export async function renderPreview(type: PageType | null, layout: unknown): Promise<ReactNode> {
  if (!(await draftMode()).isEnabled || !Array.isArray(layout)) return null;
  const item = type && isPageType(type) ? await sampleItem(type) : undefined;
  return <RenderBlocks blocks={layout as CmsBlock[]} context={{ item }} />;
}
