const { createRecorder } = require('../recorder');
const outbox = require('../../services/outbox.service');

// Mock SMS adapter (the default; the only one the demo uses, AGENTS.md §6). Nothing leaves the process: each text
// is saved to the outbox collection (GET /outbox, services/outbox.service.js) and recorded in a bounded in-memory
// list, the newest 50, which tests read with list() and empty with clear(), both before `send` resolves. Never logs
// a recipient or a body.

/** @typedef {import('./types').SmsAdapter} SmsAdapter */
/** @typedef {import('./types').SmsMessage} SmsMessage */

const recorder = createRecorder();

/** @type {SmsAdapter & { list: () => SmsMessage[], clear: () => void }} */
module.exports = {
  name: 'mock',
  send: async ({ to, body }) => {
    recorder.record({ to, body });
    await outbox.record({ channel: 'sms', to, body });
  },
  list: recorder.list,
  clear: recorder.clear,
};
