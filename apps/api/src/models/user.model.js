const fs = require('fs');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { hashString, encrypt, generateRandomString, decrypt } = require('./../helpers/encryption.helper');

const { enums, models } = require('./../constants');

const schema = new Schema(
  {
    fullName: { type: String, default: '' },

    email: { type: String, default: '' },
    contactNo: { type: String, default: '' },
    role: { type: String, enum: Object.values(enums.USER_ROLES), default: enums.USER_ROLES.USER },

    salt: { type: String, default: '' },
    password: { type: String, default: '' },
    status: { type: String, enum: Object.values(enums.USER_STATUS), default: enums.USER_STATUS.ACTIVE },

    isDeleted: { type: Boolean, default: false },

    verifyEmailToken: { type: String, default: '' },
    lastVerifyEmailSentOn: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },

    contactVerified: { type: Boolean, default: false },
    lastMessageSentOn: { type: String, default: '' },
    contactOtp: { type: String, default: '' },

    forgotPasswordToken: { type: String, default: '' },
    lastForgotPasswordSentOn: { type: String, default: '' },
    lastPasswordSetAt: { type: String, default: '' },

    lastLoginAt: { type: String, default: '' },

    subscription: {
      isActive: { type: Boolean, default: false },
      plan: { type: Schema.Types.ObjectId, ref: models.SUBSCRIPTION_PLANS },
      razorPaySubId: { type: String, default: '' },
      razorPayPlanId: { type: String, default: '' },
      currentStatus: { type: String, enum: Object.values(enums.SUBSCRIPTION_STATUSES), default: enums.SUBSCRIPTION_STATUSES.NEW },
    },

    rental: [{
      currentlyRented: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
      lastRentDate: { type: String, default: '' },
    }],

    cart: { type: Schema.Types.ObjectId, ref: models.CART },

    wishlist: [
      { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    ],

    rewardPoints: {
      type: Number, default: 0,
    },

    notifications: {
      discounts: { type: Boolean, default: true },
      activities: { type: Boolean, default: true },
    },

    razorPayCustId: { type: 'String', default: '' },
    currentOrder: { type: Schema.Types.ObjectId, ref: models.ORDER },

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
      '-isDeleted -createdAt -updatedAt -role -salt -password -status -rental -forgotPasswordToken -verifyEmailToken -lastVerifyEmailSentOn -contactOtp -forgotPasswordToken -lastForgotPasswordSentOn -lastPasswordSetAt -lastLoginAt -notifications -razorPayCustId',
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

    console.log("user", JSON.stringify(user));
    console.log("tokenData", JSON.stringify(tokenData));

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
    user.lastVerifyEmailSentOn = '';
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
    const dataToEncrypt = {
      userId: this._id,
      createdAt: Date.now(),
      motive: 'VERIFY_EMAIL',
      email: this.email,
    };

    const token = encrypt(JSON.stringify(dataToEncrypt));

    this.verifyEmailToken = token;
    this.lastVerifyEmailSentOn = new Date().toISOString();
    await this.save();

    return token;
  }

  async generateForgotPasswordToken(user) {
    const dataToEncrypt = {
      userId: user._id,
      createdAt: Date.now(),
      motive: 'FORGOT_PASSWORD',
      email: user.email,
    };

    const token = encrypt(JSON.stringify(dataToEncrypt));

    user.forgotPasswordToken = token;
    user.lastForgotPasswordSentOn = new Date().toISOString();

    await user.save();

    return token;
  }

  generateAuthToken(id, email, role) {
    const dataToEncrypt = {
      userId: id,
      createdAt: Date.now(),
      role,
      motive: 'AUTH',
      email,
    };

    return encrypt(JSON.stringify(dataToEncrypt));
  }

  async setPassword(password) {
    this.salt = generateRandomString(16);
    this.password = hashString(password, this.salt);
    this.forgotPasswordToken = '';
    this.lastForgotPasswordSentOn = '';
    this.lastPasswordSetAt = new Date().toISOString();

    await this.save();
  }
}

schema.loadClass(User);

schema.plugin(mongoosePaginate);

module.exports = model(models.USER, schema);
