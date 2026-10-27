console.log('starting app...');

const { startServer } = require('./src/app');

(async () => {
  console.time('bootTime');
  await startServer();
  console.timeEnd('bootTime');
})();
