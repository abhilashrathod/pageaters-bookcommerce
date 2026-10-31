const { handleControllerError } = require('../helpers/appError.helper');
const demoCleanup = require('../services/demo-cleanup.service');

module.exports.cleanup = async (req, res) => {
  try {
    const data = await demoCleanup.runCleanup();
    return res.ok({ message: 'DEMO_CLEANUP_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
