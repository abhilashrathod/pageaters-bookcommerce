const { createRecorder } = require('../recorder');

// Mock email adapter (the default; the only one the demo uses, AGENTS.md §6). Nothing leaves the process: each
// message is recorded (before `send` resolves) in a bounded in-memory list, the newest 50, which tests read with
// list() and empty with clear(). Phase 5 replaces the list with the outbox collection the in-app outbox view reads.
// Never logs a recipient or a body.

/** @typedef {import('./types').EmailAdapter} EmailAdapter */
/** @typedef {import('./types').EmailMessage} EmailMessage */

const recorder = createRecorder();

/** @type {EmailAdapter & { list: () => EmailMessage[], clear: () => void }} */
module.exports = {
  name: 'mock',
  send: async ({ from, to, subject, html }) => {
    recorder.record({ from, to, subject, html });
  },
  list: recorder.list,
  clear: recorder.clear,
};
