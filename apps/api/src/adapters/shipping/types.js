// The shipping adapter contract (AGENTS.md §4.4). `delhivery.js` and `mock.js` implement it; `index.js` exports the
// one SHIPPING_ADAPTER selects. Application code (services/address.service.js, services/order-shipping.service.js)
// depends on this, never on Delhivery's HTTP API. The shapes are Delhivery's, so API answers stay the same with
// either adapter.

/**
 * The courier's record for a serviceable pincode (Delhivery's `delivery_codes[0]`), e.g.
 * `{ postal_code: { pin, cod, pre_paid, district, state_code, … } }`.
 * @typedef {{ postal_code?: Record<string, unknown> } & Record<string, unknown>} PincodeRecord
 */

/**
 * A forward shipment as Delhivery's create API takes it: one shipment (buyer, address, phone, order id, payment mode,
 * amounts, dimensions…) and the pickup location.
 * @typedef {{ shipments: object[], pickup_location: object }} ShipmentRequest
 */

/**
 * The courier's answer to a shipment request: `success` false when it refused one (with its remark), else the
 * waybill of each package.
 * @typedef {{ success: boolean, packages?: { waybill: string }[] } & Record<string, unknown>} ShipmentResponse
 */

/**
 * @typedef {object} ShippingAdapter
 * @property {'delhivery' | 'mock'} name
 * @property {(pincode: string) => Promise<PincodeRecord | undefined>} checkPincode The courier's record when it
 *   delivers to the pincode, undefined when it doesn't; rejects when the courier can't be asked.
 * @property {(shipment: ShipmentRequest) => Promise<ShipmentResponse>} createShipment Books a shipment; resolves with
 *   the courier's answer (also a refusal); rejects when the courier can't be asked.
 * @property {(waybill: string) => string} trackingUrl The public tracking page of a waybill.
 */

module.exports = {};
