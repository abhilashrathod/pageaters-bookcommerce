const mongoose = require('mongoose');
const axios = require('axios');
const {merge} = require('lodash');

const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models, enums } = require('../constants');
const Plan = mongoose.model(models.SUBSCRIPTION_PLANS);


module.exports.getAll = async (req, res) => {
  try {
    let { page = 0 , limit = 25 } = req.allParams();

    const query = { isDeleted: false };

    const options = {
      page,
      limit,
    };

    const plans = await Plan.paginate(query, options);

    return res.ok({ message: 'PLAN_LIST_SUCCESS', data: plans });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, planId, amount, currency, planDetails } = req.allParams();

    const payload = {
      title, description,
      planId,
      amount, currency,
      planDetails,
    };

    const planRes = await Plan.create(payload);

    return res.ok({ message: 'PLAN_CREATE_SUCCESS', data: planRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description } = req.allParams();

    const planRes = await Plan.findOne({ _id: id, isDeleted: false });

    if (!planRes) {
      return res.error('PLAN_NOT_EXIST');
    }

    const updatedPlanRes = await Plan.findOneAndUpdate({ _id: id }, { $set: { title, description } }, { new: true });

    return res.ok({ message: 'PLAN_UPDATE_SUCCESS', data: updatedPlanRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const planRes = await Plan.findOne({ _id: id, isDeleted: false });

    if (planRes) {
      // const razorPayPlanDetails = await razorPayInstance.plans.fetch(planRes.planId);
      return res.ok({ message: 'PLAN_LIST_SUCCESS', data: planRes});
    } else {
      return res.error('PLAN_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const planRes = await Plan.findOne({ _id: id, isDeleted: false });

    if (planRes) {
      planRes.isDeleted = true;
      planRes.deletedAt = new Date();
      await planRes.save();
      return res.ok('PLAN_DELETE_SUCCESS');
    } else {
      return res.error('PLAN_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
