const { PUBLIC_PAGE_LIMIT } = require('@pageaters/shared');

const { isAdminSession } = require('./permissionVerification.middleware');

// Public list routes answer pages of at most PUBLIC_PAGE_LIMIT (50) rows. An authenticated ADMIN may ask for more, up
// to the paging helper's ceiling (MAX_PAGE_LIMIT, 1000); anyone else asking for more gets 400 INVALID_PAGING, the
// paging helper's answer. A missing or malformed `limit` is left to the paging helper.
module.exports = async (req, res, next) => {
  const limit = Number(req.allParams().limit);
  if (!(limit > PUBLIC_PAGE_LIMIT) || (await isAdminSession(req))) return next();
  return res.error('INVALID_PAGING');
};
