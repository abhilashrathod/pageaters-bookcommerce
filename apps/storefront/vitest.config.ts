import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Component tests (*.test.tsx); plain *.test.ts files run under node --test.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.tsx'] },
});
