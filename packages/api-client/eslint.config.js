import config from '@pageaters/config/eslint/base';
import { defineConfig } from 'eslint/config';

// The client runs in browsers, Angular, Next.js server components and Node 22, so source files may only use
// globals all of them share (fetch, Headers, AbortController, URLSearchParams, setTimeout…). Tests run in Node.
const browserOnly = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'XMLHttpRequest'];
const nodeOnly = ['process', 'Buffer', 'require', 'module', '__dirname', '__filename', 'global', 'setImmediate'];

export default defineConfig(config, {
  files: ['src/**/*.ts'],
  ignores: ['src/**/*.test.ts'],
  rules: {
    'no-restricted-globals': [
      'error',
      ...[...browserOnly, ...nodeOnly].map((name) => ({ name, message: 'Not available on every platform the client runs on.' })),
    ],
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: ['node:*', 'next', 'next/*', '@angular/*'], message: 'The client must stay platform-neutral.' }] },
    ],
  },
});
