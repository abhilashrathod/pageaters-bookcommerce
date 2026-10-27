const mongoose = require('mongoose');

const ApiClient = mongoose.model('apiClient');

const client = async (req, res, next) => {
  const clientid = req.get('x-client-id');
  const clientsecret = req.get('x-client-secret');
  const clientdevice = req.get('x-client-device');

  if (!clientid || !clientsecret || !clientdevice) {
    return res.unauthorized('HEADERS_MISSING');
  }

  const apiClient = await ApiClient.findOne({
    clientId: clientid,
    clientSecret: clientsecret,
    name: clientdevice.toLowerCase(),
  });

  if (!apiClient) {
    return res.unauthorized('INVALID_HEADERS');
  }

  if (apiClient && !apiClient.enabled) {
    return res.unauthorized('CLIENT_DISABLED');
  }

  if (apiClient.name.toLowerCase() !== clientdevice.toLowerCase()) {
    return res.unauthorized('INVALID_DEVICE');
  }

  return next();
};

module.exports = {
  client,
};
