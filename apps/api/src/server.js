// Local entry point (pnpm dev / pnpm start): validate the environment, connect to MongoDB, listen on PORT.
// Serverless platforms import src/app.js directly and never run this file.

// Validate the environment before anything else loads: bad config exits with one clear message, not a stack trace.
const config = require('./env');

try {
  void config.env;
} catch (error) {
  const { EnvError } = config;
  if (!(error instanceof EnvError)) throw error;
  // The logger reads its level from the environment that just failed to validate, so this one line is plain stderr.
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exit(1);
}

// Loading the app also installs the process-level error logging (helpers/logger.helper.js logProcessErrors).
const app = require('./app');
const connectToDb = require('./helpers/connectToDb.helper');
const { logger } = require('./helpers/logger.helper');
const { PORT } = require('./appConfig');

connectToDb().then(
  () => {
    app.listen(PORT, (error) => {
      if (error) {
        logger.fatal(`Could not listen on port ${PORT} (${error.code ?? error.name})`);
        process.exit(1);
      }
      logger.info(`Listening on port ${PORT}`);
    });
  },
  // connectToDb has already logged the reason without the URI.
  () => process.exit(1),
);
