const crypto = require('node:crypto');

const { createRecorder } = require('../recorder');

// Mock shipping adapter (the default; what the demo uses, AGENTS.md §6). Nothing leaves the process.
//
// Serviceability rule (deterministic): every well-formed Indian pincode (6 digits, not starting with 0) is
// serviceable, cash on delivery and prepaid, except the ones in UNSERVICEABLE_PINCODES, kept for tests and demos of
// the "we don't deliver there" path. The record is Delhivery-shaped with a fixed district and state.
//
// Shipments: always accepted, with one package whose fake waybill is `MOCK` + 10 digits derived from the order id
// and this instance's shipment count (the same calls give the same waybills; shipping the same order again gives a
// new one). Tracking links point at a reserved `.invalid` host, so they can never reach a real courier.
//
// Each request (pincode check or shipment) is recorded (before the call resolves) in a bounded list, the newest 50:
// list() / clear(). A shipment holds the buyer's name, address and phone, so the mock never logs anything.

/** @typedef {import('./types').ShippingAdapter} ShippingAdapter */

const UNSERVICEABLE_PINCODES = Object.freeze(['999000', '999999']);
const TRACKING_URL = 'https://tracking.shipping.mock.invalid/package/';

const recorder = createRecorder();
let shipmentCount = 0;

const isServiceable = (pincode) => /^[1-9]\d{5}$/.test(pincode) && !UNSERVICEABLE_PINCODES.includes(pincode);

const waybillFor = (orderId) => {
  shipmentCount += 1;
  const digest = crypto.createHash('sha256').update(`${orderId}:${shipmentCount}`).digest();
  return `MOCK${(digest.readBigUInt64BE(0) % 10_000_000_000n).toString().padStart(10, '0')}`;
};

/** @type {ShippingAdapter & { list: () => object[], clear: () => void }} */
module.exports = {
  name: 'mock',
  UNSERVICEABLE_PINCODES,
  checkPincode: async (pincode) => {
    const code = String(pincode);
    recorder.record({ type: 'pincode', pincode: code });
    if (!isServiceable(code)) return undefined;
    return { postal_code: { pin: Number(code), cod: 'Y', pre_paid: 'Y', district: 'Mock District', state_code: 'MK' } };
  },
  createShipment: async ({ shipments, pickup_location }) => {
    const waybill = waybillFor(shipments?.[0]?.order);
    recorder.record({ type: 'shipment', shipment: structuredClone({ shipments, pickup_location }), waybill });
    return { success: true, packages: [{ waybill }] };
  },
  trackingUrl: (waybill) => `${TRACKING_URL}${waybill}`,
  list: recorder.list,
  clear: recorder.clear,
};
