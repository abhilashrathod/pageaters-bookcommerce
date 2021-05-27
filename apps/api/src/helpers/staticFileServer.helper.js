const path = require('path');

module.exports.serveAASA = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.sendFile(path.join(__dirname, '..', '..', 'public', 'apple-app-site-association'));
};
