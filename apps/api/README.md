# nodejs-express-boilerplate

Boilerplate for NodeJS + Express + MongoDB + Mongoose

## Tech Stack

- Node - 12.15.0
- NPM - 6.14.2
- MongoDB - 4.x (tested on 4.2.0)

## Key features

- REST API (express)
- MongoDB (mongoose)
- Environment specific config (config)
- Encryption/Decryption (crypto)
- Validation (joi)
- Localization (i18n)
- Push Notification (FCM)
- Mail Sender (Sendgrid)
- CronJobs (cron)

## Use this template

- Clone this repo.
- Remove git folder with `rm -r .git`.
- Search and replace `nodejs-express-boilerplate` with your project name.
- Initialize git using `git init`.

## Structure

```bash
.
├── bitbucket-pipelines.yml
├── config # Environment specific config are here
│   ├── default.js
├── index.js # entry point
├── package.json
├── package-lock.json
├── public # static file served from here
│   └── foo.json
├── README.md
└── src
    ├── app.js # Express app is loaded here
    ├── config.js # Config variables should be imported from here
    ├── controllers
    │   └── auth.controller.js
    ├── cron
    │   ├── index.js # cron jobs are loaded from here
    │   └── logTime.js
    ├── helpers
    │   ├── connectToDb.helper.js
    │   ├── excryption.helper.js
    │   ├── pushNotification.helper.js
    │   └── sendMail.helper.js
    ├── locales # locales are generated here
    │   ├── de.json
    │   └── en.json
    ├── middlewares
    │   ├── extendReq.middleware.js
    │   └── requestValidator.middleware.js
    ├── models
    │   ├── index.js # models are loaded from here
    │   └── user.model.js
    ├── routes
    │   ├── auth.routes.js
    │   └── index.js # routes are loaded from here
    └── validators
        └── auth.validator.js
```

## Response Format

```js
{
  "statusCode": 200, // Matches the HTTP response status code sent
  "code": "REGISTRATION_SUCCESS", // Codes defined for success and failure. Useful for tests
  "message": "Registration Success", // Translated messages
  "data": {} // Any data that is to be returned by API
}
```

## Recommended Tools

- VSCode
  - Eslint
  - Prettier - Code formatter
- NoSQL Booster
- Postman

## Todo
