const mongoose = require('mongoose');
const { generateRandomNumber } = require('../helpers/utils.helper');

const { models } = require('../constants');

const MysteryBox = mongoose.model(models.MYSTERY_BOX);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = { isDeleted: false };

    const options = {
      page,
      limit,
      sort: {
        books: 'asc',
      },
    };

    const mysteryBoxRes = await MysteryBox.paginate(query, options);

    return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data: mysteryBoxRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, images, books, currentDiscount, weight, price } = req.allParams();

    let boxId = `SET-${generateRandomNumber(10)}`;

    const payload = {
      boxId,
      title,
      description,
      tags,
      images,
      books,
      currentDiscount,
      weight,
      price
    };

    const mysteryBoxRes = await MysteryBox.create(payload);

    return res.ok({ message: 'MYSTERY_BOX_CREATE_SUCCESS', data: mysteryBoxRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, tags, books, images, currentDiscount, weight, price } = req.allParams();

    let mysteryBoxRes = await MysteryBox.findOne({ _id: id, isDeleted: false });

    if (!mysteryBoxRes) {
      return res.error('MYSTERY_BOX_NOT_EXIST');
    }

    const payload = {
      title,
      description,
      tags,
      images,
      books,
      currentDiscount,
      weight,
      price
    };

    mysteryBoxRes = await MysteryBox.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'MYSTERY_BOX_UPDATE_SUCCESS', data: mysteryBoxRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    if (!id) return res.ok();

    let mysteryBoxRes = await MysteryBox.findOne({ _id: id, isDeleted: false });

    if (mysteryBoxRes) {
      return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data: mysteryBoxRes });
    } else {
      return res.error('MYSTERY_BOX_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    if (!id) return res.ok();

    let mysteryBoxRes = await MysteryBox.findOne({ boxId: id, isDeleted: false });

    if (mysteryBoxRes) {
      return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data: mysteryBoxRes });
    } else {
      return res.error('MYSTERY_BOX_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    if (!id) return res.ok();

    const mysteryBoxRes = await MysteryBox.findOne({ _id: id, isDeleted: false });

    if (mysteryBoxRes) {
      mysteryBoxRes.isDeleted = true;
      mysteryBoxRes.deactivatedAt = new Date();
      await mysteryBoxRes.save();
      return res.ok('MYSTERY_BOX_DELETE_SUCCESS');
    } else {
      return res.error('MYSTERY_BOX_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
