// The route registry behind /openapi.json: one entry per mounted route, split by area. The entry format is described
// in ../build.js; test/openapi.test.js fails when a mounted route is missing here or an entry has no route.

const platform = require('./platform');

module.exports = {
  routes: [
    ...require('./account'),
    ...require('./catalog'),
    ...require('./shopper'),
    ...require('./admin-catalog'),
    ...require('./admin-commerce'),
    ...platform.routes,
  ],
  extraResponseSchemas: platform.extraResponseSchemas,
};
