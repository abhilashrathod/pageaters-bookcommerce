const CronJob = require('cron').CronJob;

const { ENABLE_CRON } = require('./../appConfig');

const runImmediately = false;

// Require functions from different file here.
// Note that each of this function should return a promise in order to be use
// here. Also each of this job should have first parameters as options.
const { logTime } = require('./logTime');
const { deleteAccount } = require('./deleteAccount');
const { clearResources } = require('./clearResources');

// schedule cron time for each day here.
// json values:
// {
//   when: ''         // description for when the cron job should run. describing the cron time.
//   CRON_TIME: '',   // valid cron time format
//   JOBS_TO_RUN: [{  // array of jobs to be executed.
//     func: func,    // Function returning a promise; takes params as its first argument.
//     params: '',    // Parameters to pass if any.
//     blocked: false,// Set to true if want to block this notification.
//   }],
// }

const SCHEDULES = [
  {
    when: 'Every Minute.',
    CRON_TIME: '*/1 * * * *',
    JOBS_TO_RUN: [{ func: logTime, params: {}, blocked: true }],
  },
  {
    when: 'Every 30 Minutes.',
    CRON_TIME: '*/30 * * * *',
    JOBS_TO_RUN: [{ func: clearResources, params: {}, blocked: false }],
  },
  {
    when: 'Every day at 0005.',
    CRON_TIME: '5 0 * * *',
    JOBS_TO_RUN: [{ func: deleteAccount, params: {} }],
  },
];

module.exports.schedule = async () => {
  // enable cron jobs only if set true in env file.
  if (ENABLE_CRON) {
    console.log('CRON Jobs enabled.');

    // loop over each individual schedule.
    for (const schedule of SCHEDULES) {
      // set new cron job for each schedule.
      new CronJob(
        schedule.CRON_TIME,
        async () => {
          // loop over each jobs that needs to be run at scheduled time.
          for (const job of schedule.JOBS_TO_RUN) {
            const { func, params = {}, blocked = false } = job;

            // execute the job.
            try {
              // execute function only if not blocked.
              if (!blocked) {
                await func(params);
              }
            } catch (e) {
              // eslint-disable-next-line no-undef -- legacy bug (undefined logError), fixed in the PLAN.md Phase 4 legacy-bugs step
              logError(e);
            }
          } // end of loop over schedule.JOBS_TO_RUN
        },
        null,
        true, // "start" - if set to false, then need to execute job.start()- refer to https://www.npmjs.com/package/cron#api
        null,
        null,
        false, // run cron jobs immediately.
      );

      if (runImmediately) {
        for (const job of schedule.JOBS_TO_RUN) {
          const { func, params = {}, blocked = false } = job;

          try {
            if (!blocked) {
              await func(params);
            }
          } catch (e) {
            // eslint-disable-next-line no-undef -- legacy bug (undefined logError), fixed in the PLAN.md Phase 4 legacy-bugs step
            logError(e);
          }
        }
      }
    }
  } else {
    // log a message if cron job are disabled.
    console.log('Not running cron jobs. To enable, set ENABLE_CRON to true in config.');
  }
};
