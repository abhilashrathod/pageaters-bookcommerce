// A vendor failure as adapters rethrow it: a fixed message plus the vendor's `code`/`status`, nothing else. Vendor
// errors can quote the recipient (Twilio: "The 'To' number +91… is not valid") or carry the request, so neither
// their message nor the original error (`cause`) is kept.

const isCode = (value) => typeof value === 'number' || (typeof value === 'string' && /^[A-Z0-9_]{1,40}$/i.test(value));

/**
 * @param {string} message Fixed text, e.g. 'Email send failed'.
 * @param {unknown} error The vendor's error.
 * @returns {Error & { code?: number | string, status?: number }}
 */
const vendorError = (message, error) => {
  const clean = new Error(message);
  if (isCode(error?.code)) clean.code = error.code;
  if (typeof error?.status === 'number') clean.status = error.status;
  return clean;
};

module.exports = { vendorError };
