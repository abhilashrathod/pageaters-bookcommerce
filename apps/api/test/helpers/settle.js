const mongoose = require('mongoose');

// Tracks the database operations in flight, so a test file can wait for the writes the legacy code doesn't await
// before it closes the connection: a few services save without awaiting.
//
// Every query, aggregate and document save goes through Query#exec, Aggregate#exec, Model#save or Model#$save
// (`Model.create` and `insertOne` call `$save`, which Mongoose copies from `save` at load, so patching `save` alone
// misses them; the two never call each other, so nothing is counted twice), and the legacy
// code starts those calls synchronously before it answers, so by the time a test has its response the operation is
// already counted here. Counting operations (not rows) also covers upserts that change no row count.

let inFlight = 0;
let installed = false;

const track = (target, method) => {
  const original = target[method];
  target[method] = function tracked(...args) {
    inFlight += 1;
    let result;
    try {
      result = original.apply(this, args);
    } catch (e) {
      inFlight -= 1;
      throw e;
    }
    if (!result || typeof result.then !== 'function') {
      inFlight -= 1;
      return result;
    }
    // Hand the caller a promise that settles the same way, so a rejection nobody handles stays unhandled (the
    // tracker must not swallow it).
    return result.then(
      (value) => {
        inFlight -= 1;
        return value;
      },
      (error) => {
        inFlight -= 1;
        throw error;
      },
    );
  };
};

/** Starts counting in-flight operations on the process's mongoose (idempotent). */
const trackDbOperations = () => {
  if (installed) return;
  installed = true;
  track(mongoose.Query.prototype, 'exec');
  track(mongoose.Aggregate.prototype, 'exec');
  track(mongoose.Model.prototype, 'save');
  track(mongoose.Model.prototype, '$save');
};

/**
 * Waits until no tracked operation has been in flight for a few consecutive polls (a write may start another, e.g. a
 * lookup then a save), or until `timeout` passes.
 * @param {{ timeout?: number, interval?: number, quietPolls?: number }} [options]
 * @returns {Promise<void>}
 */
const settleDbOperations = async ({ timeout = 2000, interval = 10, quietPolls = 3 } = {}) => {
  const end = Date.now() + timeout;
  let quiet = 0;
  while (quiet < quietPolls && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    quiet = inFlight === 0 ? quiet + 1 : 0;
  }
};

module.exports = { settleDbOperations, trackDbOperations };
