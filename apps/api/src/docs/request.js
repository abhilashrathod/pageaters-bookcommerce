const { adminPageQuerySchema, paginationQuerySchema } = require('@pageaters/shared');

const { inputSchema } = require('./schemas');

// An operation's input (parameters and request body) from a registry entry; the entry's keys are described in
// build.js. validate() merges params, query and body, so a `request` schema's keys are split: path keys become path
// parameters, the rest query parameters (GET, DELETE) or the JSON body (POST, PUT, PATCH).

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const pathKeys = (path) => [...path.matchAll(/:(\w+)/g)].map((match) => match[1]);

const fileField = { type: 'string', contentMediaType: 'application/octet-stream', description: 'The image file.' };

const requestBody = (route, bodyProps, bodyRequired) => {
  if (route.body) return { 'application/json': { schema: inputSchema(route.body) } };
  if (route.multipart) {
    const fields = inputSchema(route.multipart);
    const schema = { ...fields, properties: { ...fields.properties, file: fileField }, required: [...(fields.required ?? []), 'file'] };
    return { 'multipart/form-data': { schema } };
  }
  if (route.rawBody) return { 'application/json': { schema: route.rawBody } };
  if (Object.keys(bodyProps).length) {
    return { 'application/json': { schema: { type: 'object', properties: bodyProps, required: bodyRequired } } };
  }
  return undefined;
};

/**
 * @param {object} route A registry entry.
 * @returns {{ parameters: object[], body?: Record<string, { schema: object }> }}
 */
const requestParts = (route) => {
  const keys = pathKeys(route.path);
  const parameters = [];
  const pathSchemas = {};
  const bodyProps = {};
  const bodyRequired = [];

  const addParam = (param) => {
    if (!parameters.some((other) => other.name === param.name && other.in === param.in)) parameters.push(param);
  };
  const addQuery = (schema) => {
    const json = inputSchema(schema);
    for (const [name, prop] of Object.entries(json.properties ?? {})) {
      if (!keys.includes(name)) addParam({ name, in: 'query', required: (json.required ?? []).includes(name), schema: prop });
    }
  };

  if (route.request) {
    const json = inputSchema(route.request);
    for (const [name, prop] of Object.entries(json.properties ?? {})) {
      const required = (json.required ?? []).includes(name);
      if (keys.includes(name)) pathSchemas[name] = prop;
      else if (!BODY_METHODS.has(route.method)) addParam({ name, in: 'query', required, schema: prop });
      else if (!route.body) {
        bodyProps[name] = prop;
        if (required) bodyRequired.push(name);
      }
    }
  }
  if (route.paged) addQuery(route.paged === 'page' ? adminPageQuerySchema : paginationQuerySchema);
  if (route.query) addQuery(route.query);
  for (const [name, filter] of Object.entries(route.filters ?? {})) {
    const schema = filter.schema ? inputSchema(filter.schema) : { type: 'string' };
    addParam({ name, in: 'query', required: Boolean(filter.required), description: filter.description, schema });
  }
  for (const [name, description] of Object.entries(route.headers ?? {})) {
    addParam({ name, in: 'header', required: true, description, schema: { type: 'string' } });
  }

  const pathParams = keys.map((name) => ({
    name,
    in: 'path',
    required: true,
    ...(route.params?.[name] && { description: route.params[name] }),
    schema: pathSchemas[name] ?? { type: 'string' },
  }));

  return { parameters: [...pathParams, ...parameters], body: requestBody(route, bodyProps, bodyRequired) };
};

module.exports = { requestParts };
