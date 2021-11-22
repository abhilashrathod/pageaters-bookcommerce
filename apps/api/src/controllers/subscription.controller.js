const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment');
const Razorpay = require('razorpay');
const colors = require('colors');
const Amplitude = require('@amplitude/node');
const { get } = require('lodash');

const { returnUnixTimestamp } = require('../helpers/utils.helper');

const { models, enums } = require('../constants');
const { RAZOR_PAY, RAZOR_PAY_WEBHOOKS } = require('../appConfig');

const Plan = mongoose.model(models.SUBSCRIPTION_PLANS);
const User = mongoose.model(models.USER);

const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

module.exports.create = async (req, res) => {
  try {
    const { planId } = req.allParams();
    const userId = get(req, 'user.userId', '');
    const today = new Date();

    const userRes = await User.findOne({ _id: userId, isDeleted: false });

    if (userRes.subscription.isActive && !userRes.subscription.currentStatus) {
      return res.ok('SUBSCRIPTION_EXISTS');
    }

    const subscriptionPlanRes = await Plan.findOne({ _id: planId, isDeleted: false });

    if (!subscriptionPlanRes) return res.error('PLAN_NOT_EXIST');

    const planRes = await razorPayInstance.plans.fetch(subscriptionPlanRes.planId);

    if (!planRes) return res.error('PLAN_NOT_EXIST');

    const isActive = get(planRes, 'item.active', false);

    if (!isActive) return res.error('PLAN_NOT_ACTIVE');

    let isEarlyAccess = false;

    let payload = {
      plan_id: subscriptionPlanRes.planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId,
        portalPlanId: planId,
        subscriptionStartedOn: new Date().toISOString(),
      },
    };

    if (isEarlyAccess) {
      let trialPeriodEndTime = moment().add(1, 'month').toDate();
      payload.start_at = returnUnixTimestamp(trialPeriodEndTime);
    }

    const subRes = await razorPayInstance.subscriptions.create(payload);
    userRes.subscription = {
      isActive: false,
      plan: planId,
      razorPaySubId: subRes.id,
      razorPayPlanId: subscriptionPlanRes.planId,
      currentStatus: enums.SUBSCRIPTION_STATUSES.CREATED,
    };
    await userRes.save();


    return res.created({ message: 'SUBSCRIPTION_CREATE_SUCCESS', data: { id: subRes.id } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.verify = async (req, res) => {
  try {
    const { payload } = req.allParams();
    const signature = req.get('x-razorpay-signature');
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.json({ status: 'ok' });
    }

    const isValid = Razorpay.validateWebhookSignature(body, signature, RAZOR_PAY_WEBHOOKS.SUBSCRIPTION_AUTHORIZED);

    if (isValid) {
      const subDetails = get(payload, 'subscription.entity', {});

      const query = {
        _id: subDetails.notes.userId,
        'subscription.razorPayPlanId': subDetails.plan_id,
        'subscription.plan': subDetails.notes.portalPlanId,
        'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.CREATED,
      };

      const update = {
        'subscription.isActive': true,
        'subscription.razorPayPlanId': subDetails.plan_id,
        'subscription.razorPaySubId': subDetails.id,
        'subscription.plan': subDetails.notes.portalPlanId,
        'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.AUTHENTICATED,
      };

      await User.findOneAndUpdate(query, { $set: update });

      return res.json({ status: 'ok' });
    }

    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.activate = async (req, res) => {
  try {
    const { payload } = req.allParams();
    const signature = req.get('x-razorpay-signature');
    const body = JSON.stringify(req.body);

    console.log(colors.red('before inside activate'));

    if (!signature) {
      return res.json({ status: 'ok' });
    }

    const isValid = Razorpay.validateWebhookSignature(body, signature, RAZOR_PAY_WEBHOOKS.SUBSCRIPTION_ACTIVATED);

    if (isValid) {
      const subDetails = get(payload, 'subscription.entity', {});

      console.log(colors.red('subDetails'), subDetails);

      const query = {
        _id: subDetails.notes.userId,
        'subscription.razorPayPlanId': subDetails.plan_id,
        'subscription.plan': subDetails.notes.portalPlanId,
        $or: [
          {'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.AUTHENTICATED},
          {'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.NEW},
        ],
      };

      const update = {
        'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.ACTIVE,
      };

      const userRes = await User.findOne(query);
      userRes.subscription.currentStatus = enums.SUBSCRIPTION_STATUSES.ACTIVE;
      await userRes.save();

      console.log(colors.yellow('userRes'), userRes);


      return res.json({ status: 'ok' });
    }

    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};


module.exports.cancel = async (req, res) => {
  try {
    const { payload } = req.allParams();


    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.resume = async (req, res) => {
  try {
    const { payload } = req.allParams();

    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};
