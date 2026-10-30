// The bounded in-memory list behind every mock adapter. A warm serverless instance can live for many requests, so
// the list keeps only the newest LIMIT messages (oldest dropped first) and never grows without bound.

const LIMIT = 50;

/**
 * @template T
 * @returns {{ record: (message: T) => void, list: () => T[], clear: () => void }}
 */
const createRecorder = () => {
  const messages = [];
  return {
    /** Records a frozen message, dropping the oldest beyond LIMIT. */
    record: (message) => {
      messages.push(Object.freeze(message));
      if (messages.length > LIMIT) messages.splice(0, messages.length - LIMIT);
    },
    /** The newest LIMIT messages, oldest first (a copy). */
    list: () => [...messages],
    /** Forgets every recorded message. */
    clear: () => {
      messages.length = 0;
    },
  };
};

module.exports = { LIMIT, createRecorder };
