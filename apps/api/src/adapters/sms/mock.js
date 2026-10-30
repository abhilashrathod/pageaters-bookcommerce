const { createRecorder } = require('../recorder');

// Mock SMS adapter (the default; the only one the demo uses, AGENTS.md §6). Nothing leaves the process: each text
// is recorded (before `send` resolves) in a bounded in-memory list, the newest 50, which tests read with list() and
// empty with clear(). Phase 5 replaces the list with the outbox collection the in-app outbox view reads. Never logs
// a recipient or a body.

/** @typedef {import('./types').SmsAdapter} SmsAdapter */
/** @typedef {import('./types').SmsMessage} SmsMessage */

const recorder = createRecorder();

/** @type {SmsAdapter & { list: () => SmsMessage[], clear: () => void }} */
module.exports = {
  name: 'mock',
  send: async ({ to, body }) => {
    recorder.record({ to, body });
  },
  list: recorder.list,
  clear: recorder.clear,
};
