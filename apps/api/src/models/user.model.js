const fs = require('fs');
const { Schema, model } = require('mongoose');

const { API_URL } = require('./../appConfig');
const { hashString, encrypt, generateRandomString, decrypt } = require('./../helpers/encryption.helper');

const { enums, models } = require('./../constants');

const schema = new Schema(
  {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    salt: { type: String, default: '' },
    password: { type: String, default: '' },
    status: { type: String, enum: Object.values(enums.USER_STATUS), default: enums.USER_STATUS.PENDING_REGISTRATION },
    role: { type: String, enum: Object.values(enums.USER_ROLES), default: enums.USER_ROLES.USER },
    isDeleted: { type: Boolean, default: false },
    telephone: { type: String, default: '' },
    avatar: {
      src: {
        type: String,
        default: '',
        get: function(value) {
          const relativePath = `./resources/${this._id}/avatar/${value}`;

          if (fs.existsSync(relativePath)) {
            return `${API_URL}/resources/${this._id}/avatar/${value}`;
          }

          return '';
        },
      },
      mimeType: { type: String, default: '' },
    },
    lastViewedAt: { type: String, default: '' },
    __v: { type: Number, select: false },
    verifyEmailToken: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    forgotPasswordToken: { type: String, default: '' },
    lastPasswordSetAt: { type: String, default: '' },
    allowAuthTokenGeneratedAfter: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      transform: function(doc, ret) {
        delete ret.id;
      },
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
      '-isDeleted -createdAt -updatedAt -salt -password -forgotPasswordToken -verifyEmailToken',
    );

    return user;
  }

  static async verifyEmail(email, token) {
    email = email.replace(/\s/g, '+');

    let tokenData;

    try {
      tokenData = decrypt(token);
      tokenData = JSON.parse(tokenData);
    } catch (e) {
      return { success: false, message: 'INVALID_TOKEN', helper: 'INVALID_TOKEN' };
    }

    const user = await this.findOne({ email: tokenData.email, verifyEmailToken: { $ne: '' }, isDeleted: false });

    if (!user) {
      return { success: false, message: 'INVALID_TOKEN', helper: 'USER_NOT_FOUND' };
    } else if (user._id.toString() !== tokenData.userId) {
      return { success: false, message: 'INVALID_TOKEN', helper: 'TOKEN_OF_OTHER_USER' };
    } else if (user.email !== email) {
      return { success: false, message: 'INVALID_TOKEN', helper: 'EMAIL_DOES_NOT_MATCH' };
    } else if (tokenData.motive !== 'VERIFY_EMAIL') {
      return { success: false, message: 'INVALID_TOKEN', helper: 'INCORRECT_MOTIVE' };
    }

    user.verifyEmailToken = '';
    user.emailVerified = true;
    user.status = enums.USER_STATUS.ACTIVE;

    await user.save();

    return { success: true };
  }

  isPasswordValid(password) {
    try {
      const hashedPassword = hashString(password, this.salt);

      return hashedPassword === this.password;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async generateVerifyEmailToken() {
    const datatToEncrypt = {
      userId: this._id,
      createdAt: Date.now(),
      motive: 'VERIFY_EMAIL',
      email: this.email,
    };

    const token = encrypt(JSON.stringify(datatToEncrypt));

    this.verifyEmailToken = token;
    this.lastverifyEmailSentOn = new Date().toISOString();
    await this.save();

    return token;
  }

  async generateForgotPasswordToken() {
    const datatToEncrypt = {
      userId: user._id,
      createdAt: Date.now(),
      motive: 'FORGOT_PASSWORD',
      email: this.email,
    };

    const token = encrypt(JSON.stringify(datatToEncrypt));

    this.forgotPasswordToken = token;
    this.lastForgotPasswordSentOn = new Date().toISOString();
    await this.save();

    return token;
  }

  generateAuthToken() {
    const datatToEncrypt = {
      userId: this._id,
      createdAt: Date.now(),
      motive: 'AUTH',
      email: this.email,
    };

    const token = encrypt(JSON.stringify(datatToEncrypt));

    return token;
  }

  async setPassword(password) {
    this.salt = generateRandomString(16);
    this.password = hashString(password, this.salt);
    this.forgotPasswordToken = '';
    this.allowAuthTokenGeneratedAfter = new Date().toISOString();
    this.lastPasswordSetAt = new Date().toISOString();

    await this.save();
  }
}

schema.loadClass(User);

module.exports = model(models.USER, schema);
