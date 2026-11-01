import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // rxjs 6 has no `exports` map, so Node can't resolve `rxjs/operators` from Angular's ESM bundles; let Vite do it.
    server: { deps: { inline: [/@angular/] } },
  },
});
