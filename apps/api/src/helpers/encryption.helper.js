const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const { ENCRYPTION_KEY } = require('./../appConfig');
const { USER_ROLES } = require('../constants/enums');

// Keys, password hashes and one-time tokens.
//
// Keys: ENCRYPTION_KEY is only the root secret. Each purpose gets its own subkey derived from it with HKDF-SHA256
// (label `pageaters:<purpose>`), so a key used for one thing never doubles as another. Today the only keyed use is
// signing session JWTs (`jwt`).
//
// Passwords: scrypt with a random 16-byte salt per password, stored as `scrypt$N$r$p$<salt>$<hash>` (base64), so the
// cost can be raised later; hashes made with lower parameters are redone at the next login. Legacy accounts (and the
// seed) hold an HMAC-SHA512 hex digest keyed by the user's `salt` field; those still verify and are upgraded at the
// next login. Every comparison is constant-time.
//
// One-time tokens (password reset, email verification): 32 random bytes, base64url, sent by mail; only the SHA-256 of
// the token is stored.

const scrypt = promisify(crypto.scrypt);

const deriveKey = (purpose) => Buffer.from(crypto.hkdfSync('sha256', ENCRYPTION_KEY, '', `pageaters:${purpose}`, 32));

const JWT_KEY = deriveKey('jwt');

// OWASP's scrypt option with N = 2^15: 32 MiB of memory, ~0.2 s per hash.
const SCRYPT_PARAMS = Object.freeze({ N: 2 ** 15, r: 8, p: 3 });
const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = 'scrypt';
// Stored parameters above these are refused rather than run (at most 256 MiB, a corrupt record must not cost more).
const SCRYPT_MAX = Object.freeze({ N: 2 ** 17, r: 16, p: 16 });

// maxmem: exactly what OpenSSL's scrypt needs for these parameters (128·r·(N + p + 2) bytes).
const scryptHash = (password, salt, { N, r, p }) =>
  scrypt(String(password), salt, SCRYPT_KEYLEN, { N, r, p, maxmem: 128 * r * (N + p + 2) });

// A wrong password must cost one scrypt whatever the stored hash (legacy, malformed or none), so timing does not tell
// account kinds apart.
const spendScrypt = async (password) => {
  await scryptHash(password, crypto.randomBytes(16), SCRYPT_PARAMS);
};

const INVALID = Object.freeze({ valid: false, needsRehash: false });

/**
 * Compares two strings or buffers in constant time (for equal lengths; a length mismatch answers false at once).
 * @param {string | Buffer} a
 * @param {string | Buffer} b
 * @returns {boolean}
 */
const safeEqual = (a, b) => {
  const left = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const right = Buffer.isBuffer(b) ? b : Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/**
 * Hashes a password with scrypt and a fresh random salt.
 * @param {string} password
 * @returns {Promise<string>} `scrypt$N$r$p$<salt base64>$<hash base64>`.
 */
const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const hash = await scryptHash(password, salt, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return [SCRYPT_PREFIX, N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
};

const parseScrypt = (stored) => {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== SCRYPT_PREFIX) return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  const valid = [N, r, p].every(Number.isSafeInteger) && N > 1 && (N & (N - 1)) === 0 && r > 0 && p > 0;
  if (!valid || N > SCRYPT_MAX.N || r > SCRYPT_MAX.r || p > SCRYPT_MAX.p) return null;
  return { params: { N, r, p }, salt: Buffer.from(parts[4], 'base64'), hash: Buffer.from(parts[5], 'base64') };
};

const legacyHash = (password, salt) => crypto.createHmac('sha512', salt).update(String(password)).digest();

/**
 * Checks a password against a stored hash: the scrypt format, or the legacy HMAC-SHA512 hex digest keyed by `salt`.
 * @param {string} password
 * @param {string} stored The user's `password` field.
 * @param {string} [legacySalt] The user's `salt` field (legacy hashes only).
 * @returns {Promise<{ valid: boolean, needsRehash: boolean }>} `needsRehash` when the password matched but the hash
 *   is legacy or uses weaker parameters than today's.
 */
const verifyPassword = async (password, stored, legacySalt = '') => {
  if (typeof password !== 'string') return INVALID;

  if (typeof stored === 'string' && stored.startsWith(`${SCRYPT_PREFIX}$`)) {
    const parsed = parseScrypt(stored);
    if (!parsed || !parsed.hash.length) {
      await spendScrypt(password);
      return INVALID;
    }
    const candidate = await scryptHash(password, parsed.salt, parsed.params);
    const valid = safeEqual(candidate, parsed.hash);
    const weaker = ['N', 'r', 'p'].some((key) => parsed.params[key] < SCRYPT_PARAMS[key]);
    return { valid, needsRehash: valid && weaker };
  }

  const legacy = typeof stored === 'string' && legacySalt && /^[0-9a-f]{128}$/i.test(stored);
  const valid = legacy && safeEqual(legacyHash(password, legacySalt), Buffer.from(stored, 'hex'));
  if (!valid) {
    await spendScrypt(password);
    return INVALID;
  }
  return { valid: true, needsRehash: true };
};

/**
 * A new one-time token for an e-mailed link, and the hash to store.
 * @returns {{ token: string, hash: string }}
 */
const generateOneTimeToken = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashOneTimeToken(token) };
};

/**
 * The stored form of a one-time token (SHA-256, hex).
 * @param {string} token
 * @returns {string}
 */
const hashOneTimeToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/**
 * The stored form of a session JWT in access_tokens (SHA-256, hex), so a database read does not yield live sessions.
 * @param {string} token
 * @returns {string}
 */
const hashSessionToken = hashOneTimeToken;

/**
 * Signs a session JWT (7 days; 30 for admins) with the `jwt` subkey. It carries the account's `sessionVersion`: a
 * password set or a revoke-all raises it, which ends every JWT issued before (even one a racing login was signing).
 * @param {{ id: string, role: string, email: string, sessionVersion?: number }} account
 * @param {string} ipAddress
 * @returns {{ token: string, payload: object }} The token and the claims it carries (stored with it in access_tokens).
 */
const generateJwtToken = (account, ipAddress) => {
  const data = {
    userId: account.id,
    role: account.role,
    email: account.email,
    createdAt: Date.now(),
    motive: 'AUTH',
    createdByIp: ipAddress,
    sessionVersion: account.sessionVersion ?? 0,
  };
  return {
    token: jwt.sign(data, JWT_KEY, { algorithm: 'HS256', expiresIn: account.role === USER_ROLES.ADMIN ? '30d' : '7d' }),
    payload: data,
  };
};

/**
 * Verifies a session JWT's signature and expiry.
 * @param {string} token
 * @returns {object} The claims.
 * @throws when the token is invalid or expired.
 */
const verifyJwtToken = (token) => jwt.verify(token, JWT_KEY, { algorithms: ['HS256'] });

module.exports = {
  generateJwtToken,
  generateOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  hashSessionToken,
  safeEqual,
  verifyJwtToken,
  verifyPassword,
};
