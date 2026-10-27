/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'repo',
        'config',
        'deps',
        'ci',
        'docs',
        'plan',
        'adr',
        'agents',
        'seed',
        'shared',
        'api-client',
        'cms-types',
        'api',
        'storefront',
        'admin',
        'cms',
      ],
    ],
  },
};
