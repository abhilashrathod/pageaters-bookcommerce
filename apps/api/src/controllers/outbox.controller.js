const { handleControllerError } = require('../helpers/appError.helper');
const outbox = require('../services/outbox.service');

module.exports.list = async (req, res) => {
  try {
    const data = await outbox.listFor(req.user.userId);
    return res.ok({ message: 'OUTBOX_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
