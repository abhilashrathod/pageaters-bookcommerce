const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { generateOneTimeToken, hashPassword, verifyPassword } = require('./../helpers/encryption.helper');

const { enums, models } = require('./../constants');

const HOUR = 60 * 60 * 1000;
const FORGOT_PASSWORD_TOKEN_TTL = HOUR;
const VERIFY_EMAIL_TOKEN_TTL = 24 * HOUR;

const schema = new Schema(
  {
    fullName: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },

    email: { type: String, default: '' },
    contactNo: { type: String, default: '' },
    role: { type: String, enum: Object.values(enums.USER_ROLES), default: enums.USER_ROLES.USER },

    // `password` is a scrypt hash with its own salt (helpers/encryption.helper.js); `salt` is set only for legacy
    // HMAC-SHA512 hashes, which are replaced at the next login.
    salt: { type: String, default: '' },
    password: { type: String, default: '' },
    status: { type: String, enum: Object.values(enums.USER_STATUS), default: enums.USER_STATUS.ACTIVE },

    isDeleted: { type: Boolean, default: false },

    // One-time tokens hold the SHA-256 of the token mailed in the link. Expiries, attempt counters and send limits
    // are `select: false`, so no projection exposes them by accident.
    verifyEmailToken: { type: String, default: '' },
    verifyEmailTokenExpiresAt: { type: Date, default: null, select: false },
    lastVerifyEmailSentOn: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },

    contactVerified: { type: Boolean, default: false },
    lastMessageSentOn: { type: String, default: '' },
    contactOtp: { type: String, default: '', select: false },
    contactOtpExpiresAt: { type: Date, default: null, select: false },
    contactOtpAttempts: { type: Number, default: 0, select: false },
    // Texts sent (send and resend) in the 24-hour window that started at `contactOtpSendWindowStart`.
    contactOtpSendCount: { type: Number, default: 0, select: false },
    contactOtpSendWindowStart: { type: Date, default: null, select: false },

    forgotPasswordToken: { type: String, default: '' },
    forgotPasswordTokenExpiresAt: { type: Date, default: null, select: false },
    lastForgotPasswordSentOn: { type: String, default: '' },

    lastPasswordSetAt: { type: String, default: '' },
    // Raised by every password set and revoke-all; a session JWT carries the value it was issued with and is refused
    // once they differ.
    sessionVersion: { type: Number, default: 0, select: false },
    lastLoginAt: { type: String, default: '' },

    razorPayCustId: { type: String, default: '' },
    storeCredit: { type: Number, default: 0 },

    __v: { type: Number, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
    },
  },
);

class User {
  static async isEmailAvailable(email) {
    const emailExists = await this.countDocuments({ email });

    return !(emailExists > 0);
  }

  static async getProfile(userId) {
    const user = await this.findById(userId).select(
      '-isDeleted -createdAt -updatedAt -role -salt -password -status -rental -forgotPasswordToken -verifyEmailToken -lastVerifyEmailSentOn -contactOtp -forgotPasswordToken -lastForgotPasswordSentOn -notifications -subscription -currentOrder -rewardPoints -wishlist -lastMessageSentOn -razorPayCustId',
    );

    return user;
  }

  /**
   * Checks a password against the stored hash (scrypt, or the legacy HMAC-SHA512) in constant time.
   * @param {string} password
   * @returns {Promise<{ valid: boolean, needsRehash: boolean }>}
   */
  checkPassword(password) {
    return verifyPassword(password, this.password, this.salt);
  }

  /**
   * Whether `password` is the account's password.
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  async isPasswordValid(password) {
    return (await this.checkPassword(password)).valid;
  }

  /**
   * Replaces the stored hash with a scrypt hash of `password` (not saved) and empties the legacy `salt`.
   * @param {string} password
   * @returns {Promise<void>}
   */
  async hashPassword(password) {
    this.password = await hashPassword(password);
    this.salt = '';
  }

  /**
   * Stores a new verification token (24 h, single use) and returns it; only its hash is kept.
   * @returns {Promise<string>} The token for the link.
   */
  async generateVerifyEmailToken() {
    const { token, hash } = generateOneTimeToken();

    this.verifyEmailToken = hash;
    this.verifyEmailTokenExpiresAt = new Date(Date.now() + VERIFY_EMAIL_TOKEN_TTL);
    this.lastVerifyEmailSentOn = new Date().toISOString();
    await this.save();

    return token;
  }

  /**
   * Stores a new password-reset token (1 h, single use) and returns it; only its hash is kept.
   * @returns {Promise<string>} The token for the link.
   */
  async generateForgotPasswordToken() {
    const { token, hash } = generateOneTimeToken();

    this.forgotPasswordToken = hash;
    this.forgotPasswordTokenExpiresAt = new Date(Date.now() + FORGOT_PASSWORD_TOKEN_TTL);
    this.lastForgotPasswordSentOn = new Date().toISOString();
    await this.save();

    return token;
  }

  /**
   * Sets a new password, clears any pending reset and raises `sessionVersion` (atomically, with `$inc`), which ends
   * every session JWT issued before; the caller also revokes the stored sessions (auth-session.service).
   * @param {string} password
   * @returns {Promise<void>}
   */
  async setPassword(password) {
    await this.hashPassword(password);
    this.$inc('sessionVersion', 1);
    this.forgotPasswordToken = '';
    this.forgotPasswordTokenExpiresAt = null;
    this.lastForgotPasswordSentOn = '';
    this.lastPasswordSetAt = new Date().toISOString();

    await this.save();
  }
}

schema.loadClass(User);

schema.plugin(mongoosePaginate);

module.exports = model(models.USER, schema);
