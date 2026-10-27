# @pageaters/config

Shared tooling presets for every workspace.

| Export                  | Use                                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| `tsconfig/base.json`    | Strict TypeScript defaults                                                |
| `tsconfig/node.json`    | Node apps (`apps/api`); needs `@types/node`                               |
| `tsconfig/nextjs.json`  | Next.js apps (`apps/storefront`, `apps/cms`)                              |
| `tsconfig/library.json` | Internal packages (`packages/*`)                                          |
| `eslint/base`           | ESLint flat config: JS + type-checked typescript-eslint + Prettier compat |
| `eslint/node`           | `base` + Node globals, no `console`                                       |
| `eslint/next`           | `base` + `eslint-config-next/core-web-vitals`                             |
| `prettier`              | Prettier options                                                          |
| `prettier/tailwind`     | `prettier` + class sorting                                                |
| `tailwind/theme.css`    | Tailwind v4 theme: brand tokens as CSS variables, original breakpoints    |

```jsonc
// tsconfig.json
{ "extends": "@pageaters/config/tsconfig/node.json", "include": ["src"] }
```

```js
// eslint.config.js
import config from '@pageaters/config/eslint/node';
export default config;
```

```css
/* app.css */
@import 'tailwindcss';
@import '@pageaters/config/tailwind/theme.css';
```

Angular (`apps/admin`) keeps its CLI-generated tsconfig and angular-eslint setup; it uses only the Prettier preset.
