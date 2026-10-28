import node from '@pageaters/config/eslint/node';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['public/**', 'src/views/**', 'src/templates/**'] },
  node,
  {
    // The API is JavaScript and CommonJS (docs/adr/0001-api-stays-javascript.md).
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // `const crypto = require('crypto')` shadows the Node global on purpose in CommonJS modules.
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // The API still logs with console; pino replaces it in Phase 4.
    rules: { 'no-console': 'off' },
  },
  {
    // Legacy code patterns, reported as warnings until the Phase 4 services rewrite replaces this code.
    files: ['src/**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-async-promise-executor': 'warn',
      'no-empty-pattern': 'warn',
      'no-useless-escape': 'warn',
    },
  },
);
