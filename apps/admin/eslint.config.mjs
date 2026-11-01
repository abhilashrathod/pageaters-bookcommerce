import base from '@pageaters/config/eslint/base';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['.angular/**', 'out-tsc/**'] },
  {
    files: ['**/*.ts'],
    extends: [base, angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      // `import type` would strip classes Angular needs at runtime for DI.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  // Legacy code still fails these; warn until the admin is migrated (PLAN.md Phase 8), then flip back to error.
  {
    files: ['src/app/**/*.ts'],
    rules: Object.fromEntries(
      [
        '@angular-eslint/no-empty-lifecycle-method',
        '@angular-eslint/no-input-rename',
        '@angular-eslint/no-output-on-prefix',
        '@angular-eslint/prefer-inject',
        '@angular-eslint/prefer-on-push-component-change-detection',
        '@angular-eslint/prefer-standalone',
        '@typescript-eslint/no-explicit-any',
        '@typescript-eslint/no-floating-promises',
        '@typescript-eslint/no-unnecessary-type-assertion',
        '@typescript-eslint/no-unsafe-argument',
        '@typescript-eslint/no-unsafe-assignment',
        '@typescript-eslint/no-unsafe-call',
        '@typescript-eslint/no-unsafe-member-access',
        '@typescript-eslint/no-unsafe-return',
        '@typescript-eslint/no-unused-vars',
        '@typescript-eslint/no-wrapper-object-types',
        '@typescript-eslint/unbound-method',
        'no-empty',
        'prefer-const',
      ].map((rule) => [rule, 'warn']),
    ),
  },
  {
    files: ['src/app/**/*.html'],
    rules: Object.fromEntries(
      [
        '@angular-eslint/template/alt-text',
        '@angular-eslint/template/click-events-have-key-events',
        '@angular-eslint/template/eqeqeq',
        '@angular-eslint/template/interactive-supports-focus',
        '@angular-eslint/template/label-has-associated-control',
        '@angular-eslint/template/prefer-control-flow',
      ].map((rule) => [rule, 'warn']),
    ),
  },
);
