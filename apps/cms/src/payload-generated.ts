import type { Config } from '@pageaters/cms-types';

// Types Payload's local API (`payload.find({ collection: 'users' })`…) with the generated config
// (packages/cms-types, written by `pnpm generate:types`).
declare module 'payload' {
  // An interface (not a type alias) is what merges into Payload's declaration.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GeneratedTypes extends Config {}
}
