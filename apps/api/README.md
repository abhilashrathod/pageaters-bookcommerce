# api

Pageaters REST API — Node + Express + MongoDB (Mongoose).

Legacy JavaScript codebase, to be migrated to TypeScript in PLAN.md Phase 4.

## Structure

```
index.js          entry point
src/app.js        Express app setup and server start
src/routes/       route definitions
src/controllers/  request handlers
src/models/       Mongoose models
src/validators/   Joi request schemas
src/middlewares/  auth, validation, response helpers
src/helpers/      shared logic (orders, mail, encryption)
src/jobs/         scheduled jobs
src/libs/         search index, sitemap, Google product feed
src/templates/    email templates (EJS)
src/notes/        domain notes on orders, payments and refunds
```

## Response format

```js
{
  "statusCode": 200, // Matches the HTTP response status code sent
  "code": "REGISTRATION_SUCCESS", // Codes defined for success and failure. Useful for tests
  "message": "Registration Success", // Translated messages
  "data": {} // Any data that is to be returned by API
}
```
