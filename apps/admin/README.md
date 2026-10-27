# PageatersAdmin

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.1.3.

## Development server

Run `pnpm --filter admin dev` (or `pnpm dev` from the repo root to run every app) for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

The scripts start the Angular CLI with `node --openssl-legacy-provider`: this legacy Angular 12 / webpack 4 toolchain hashes with MD4, which OpenSSL 3 on Node 22 rejects. The flag is a stopgap until the Angular upgrade.

## Configuration

The admin needs no environment variables at runtime. The API base URL is baked in at build time:

- `src/environments/environment.ts` — development (`http://localhost:5005/api/v1`)
- `src/environments/environment.prod.ts` — production build (`https://api.demo.pageaters.com/api/v1`)

There are no secrets in the admin.

## Code scaffolding

Run `pnpm --filter admin ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `pnpm --filter admin build` for a development build, or `pnpm --filter admin build:prod` for a production build (`--configuration production`). The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `pnpm --filter admin test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `pnpm --filter admin e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `pnpm --filter admin ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
