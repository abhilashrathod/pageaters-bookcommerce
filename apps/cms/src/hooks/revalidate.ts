import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload';

import { notifyStorefront, revalidationTags } from '../storefront.ts';
import type { Doc } from '../storefront.ts';

// Publish → storefront revalidation. A draft save changes nothing public, so only a publish, an unpublish, a change
// to a published document or a delete notifies; a published previous version's tags go too (a renamed slug drops
// the old page). No target (REVALIDATE_SECRET unset) → nothing is sent. Known extra: the first draft save after a
// publish also notifies (its previous version is the published one); it only costs one needless revalidation.

export type RevalidateTarget = { url: string; secret: string } | undefined;

const isPublished = (doc: Doc) => doc?._status === 'published';

export const revalidateOnChange =
  (target: RevalidateTarget): CollectionAfterChangeHook =>
  async ({ collection, doc, previousDoc, req }) => {
    const [current, previous] = [doc as Doc, previousDoc as Doc];
    if (target && (isPublished(current) || isPublished(previous))) {
      const tags = [
        ...revalidationTags(collection.slug, current),
        ...(isPublished(previous) ? revalidationTags(collection.slug, previous) : []),
      ];
      await notifyStorefront(target, tags, req.payload.logger);
    }
    return current;
  };

export const revalidateOnDelete =
  (target: RevalidateTarget): CollectionAfterDeleteHook =>
  async ({ collection, doc, req }) => {
    const deleted = doc as Doc;
    if (target) await notifyStorefront(target, revalidationTags(collection.slug, deleted), req.payload.logger);
    return deleted;
  };

export const revalidateGlobal =
  (target: RevalidateTarget): GlobalAfterChangeHook =>
  async ({ global, doc, req }) => {
    const saved = doc as Doc;
    if (target) await notifyStorefront(target, revalidationTags(global.slug, saved), req.payload.logger);
    return saved;
  };
