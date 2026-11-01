# PageatersAdmin

Angular 22 admin panel (standalone components, built-in control flow), upgraded stepwise from Angular 12.

## Development server

Run `pnpm --filter admin dev` (or `pnpm dev` from the repo root to run every app) for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Configuration

The admin needs no environment variables at runtime. The API base URL is baked in at build time:

- `src/environments/environment.ts` — development (`http://localhost:5005/api/v1`)
- `src/environments/environment.prod.ts` — production build (`https://api.demo.pageaters.com/api/v1`)

There are no secrets in the admin.

## Code scaffolding

Run `pnpm --filter admin ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `pnpm --filter admin build` for a production build (the default configuration). Output goes to `dist/pageaters-admin/browser`.

## Lint and tests

Run `pnpm --filter admin lint` (ESLint with angular-eslint; legacy rule breaches are warnings) and `pnpm --filter admin test` (Vitest on jsdom through Angular's unit-test builder; runs once and exits).

## Further help

To get more help on the Angular CLI use `pnpm --filter admin ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
