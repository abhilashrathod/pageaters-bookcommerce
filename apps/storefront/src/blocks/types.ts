import type { CmsBlockOf, CmsBlockType } from '@pageaters/cms-types';
import type { ReactNode } from 'react';

// A block component is a Server Component that fetches its own data. It is called as a plain async function by
// renderBlock (to catch its failures), so it must not be a client component; render client leaves inside it.
export type BlockComponent<T extends CmsBlockType> = (props: { block: CmsBlockOf<T> }) => ReactNode | Promise<ReactNode>;

export type BlockRegistry = { [T in CmsBlockType]?: BlockComponent<T> };
