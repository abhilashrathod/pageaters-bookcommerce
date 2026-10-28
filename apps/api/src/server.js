// Local entry point (pnpm dev / pnpm start): validate the environment, connect to MongoDB, listen on PORT.
// Serverless platforms import src/app.js directly and never run this file.

// Validate the environment before anything else loads: bad config exits with one clear message, not a stack trace.
const config = require('./env');

try {
  void config.env;
} catch (error) {
  const { EnvError } = config;
  if (!(error instanceof EnvError)) throw error;
  console.error(error.message);
  process.exit(1);
}

const app = require('./app');
const connectToDb = require('./helpers/connectToDb.helper');
const { PORT } = require('./appConfig');

connectToDb().then(
  () => {
    app.listen(PORT, (error) => {
      if (error) {
        console.error(`Could not listen on port ${PORT} (${error.code ?? error.message})`);
        process.exit(1);
      }
      console.log(`Listening on port ${PORT}`);
    });
  },
  // connectToDb has already logged the reason without the URI.
  () => process.exit(1),
);
