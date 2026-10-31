const { createRecorder } = require('../recorder');
const outbox = require('../../services/outbox.service');

// Mock email adapter (the default; the only one the demo uses, AGENTS.md §6). Nothing leaves the process: each
// message is saved to the outbox collection (GET /outbox, services/outbox.service.js) and recorded in a bounded
// in-memory list, the newest 50, which tests read with list() and empty with clear(), both before `send` resolves.
// Never logs a recipient or a body.

/** @typedef {import('./types').EmailAdapter} EmailAdapter */
/** @typedef {import('./types').EmailMessage} EmailMessage */

const recorder = createRecorder();

/** @type {EmailAdapter & { list: () => EmailMessage[], clear: () => void }} */
module.exports = {
  name: 'mock',
  send: async ({ from, to, subject, html }) => {
    recorder.record({ from, to, subject, html });
    await outbox.record({ channel: 'email', to, subject, body: html });
  },
  list: recorder.list,
  clear: recorder.clear,
};
