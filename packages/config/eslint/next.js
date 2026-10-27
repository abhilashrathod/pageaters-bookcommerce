import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import base from './base.js';

// eslint-config-next registers its own copy of the typescript-eslint plugin; `base` already provides it.
const next = nextCoreWebVitals.map((config) => {
  if (!config.plugins?.['@typescript-eslint']) return config;
  const { '@typescript-eslint': _duplicate, ...plugins } = config.plugins;
  return { ...config, plugins };
});

export default defineConfig(next, base, {
  languageOptions: { globals: globals.browser },
});
