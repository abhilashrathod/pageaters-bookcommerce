// Validate the environment before anything else loads: bad config exits with one clear message, not a stack trace.
const config = require('./src/env');

try {
  void config.env;
} catch (error) {
  const { EnvError } = config;
  if (!(error instanceof EnvError)) throw error;
  console.error(error.message);
  process.exit(1);
}

console.log('starting app...');

const { startServer } = require('./src/app');

(async () => {
  console.time('bootTime');
  await startServer();
  console.timeEnd('bootTime');
})();
