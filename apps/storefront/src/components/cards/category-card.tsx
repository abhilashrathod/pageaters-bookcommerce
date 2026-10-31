import type { CategoryListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';

// The legacy CategoryPortraitCard: portrait thumbnail, title and the number of titles.
export function CategoryCard({ category }: { category: Pick<CategoryListItem, 'categoryId' | 'title' | 'thumbnail' | 'numberOfBooks'> }) {
  return (
    <Link href={`/categories/${category.categoryId}`} className="block">
      <CoverImage src={category.thumbnail} alt={category.title} width={300} height={400} sizes="(min-width: 62rem) 12vw, 31vw" className="mb-2" />
      <span className="block font-semibold">{category.title}</span>
      <span className="text-sm text-muted-foreground">{category.numberOfBooks ?? 0} Titles</span>
    </Link>
  );
}
