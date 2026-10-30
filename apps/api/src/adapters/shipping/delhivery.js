const { vendorError } = require('../vendor-error');

// Real shipping adapter: Delhivery's HTTP API over Node's fetch. Loaded only when SHIPPING_ADAPTER=delhivery
// (src/env.js then requires DELHIVERY_API_TOKEN). The token travels only in the `Authorization: Token …` header,
// never in a URL, and no request, response or vendor error is logged: they carry the token and the buyer's name,
// address and phone.

/** @typedef {import('./types').ShippingAdapter} ShippingAdapter */

// Every call is bounded so a slow vendor can't hold a request (and a serverless invocation) open.
const TIMEOUT_MS = 10_000;

const TRACKING_URL = 'https://www.delhivery.com/track/package/';

/**
 * Builds the Delhivery adapter.
 * @param {{ baseUrl?: string, token?: string, fetch?: typeof fetch }} config `baseUrl` without a trailing slash
 *   (DELHIVERY_BASE_URL); `fetch` defaults to the global one (tests pass a fake).
 * @returns {ShippingAdapter} Calls reject with `Error('Shipping request failed')` carrying only an HTTP `status` or
 *   a network error `code`. An unexpected answer carries neither — a 2xx that isn't JSON included (the legacy axios
 *   call resolved with the text; the shipment route now answers 500 instead).
 * @throws {Error} naming each missing variable (never a value).
 */
const create = ({ baseUrl, token, fetch: fetchImpl = globalThis.fetch } = {}) => {
  const missing = [!baseUrl && 'DELHIVERY_BASE_URL', !token && 'DELHIVERY_API_TOKEN'].filter(Boolean);
  if (missing.length > 0) throw new Error(`The Delhivery shipping adapter needs ${missing.join(', ')}`);

  // One request, bounded; resolves with the parsed JSON body of a 2xx answer.
  const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
    let res;
    let data;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: `Token ${token}`, ...headers },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) data = await res.json();
    } catch (error) {
      // fetch wraps network errors (`cause.code`, e.g. ECONNRESET); a timeout is a TimeoutError.
      throw vendorError('Shipping request failed', { code: error?.cause?.code ?? (error?.name === 'TimeoutError' ? 'ETIMEDOUT' : undefined) });
    }
    if (!res.ok) throw vendorError('Shipping request failed', { status: res.status });
    return data;
  };

  return {
    name: 'delhivery',
    checkPincode: async (pincode) => {
      const data = await request(`/c/api/pin-codes/json?filter_codes=${encodeURIComponent(pincode)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!Array.isArray(data?.delivery_codes)) throw vendorError('Shipping request failed', {});
      return data.delivery_codes[0] || undefined;
    },
    // Delhivery's documented form `format=json&data=<JSON>`, properly encoded (the legacy code sent the JSON raw, so
    // an `&`, `+` or `%` in an address or a title broke the form or added fields).
    createShipment: ({ shipments, pickup_location }) =>
      request('/api/cmu/create.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ format: 'json', data: JSON.stringify({ shipments, pickup_location }) }).toString(),
      }),
    trackingUrl: (waybill) => `${TRACKING_URL}${waybill}`,
  };
};

module.exports = { TIMEOUT_MS, create };
