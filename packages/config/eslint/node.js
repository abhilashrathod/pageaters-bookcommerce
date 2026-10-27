import { defineConfig } from 'eslint/config';
import globals from 'globals';
import base from './base.js';

export default defineConfig(base, {
  languageOptions: { globals: globals.node },
  // Logging goes through pino.
  rules: { 'no-console': 'error' },
});
