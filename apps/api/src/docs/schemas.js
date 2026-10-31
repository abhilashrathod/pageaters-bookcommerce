const { z } = require('zod');
const shared = require('@pageaters/shared');

// zod → JSON Schema (OpenAPI 3.1 uses JSON Schema 2020-12, zod 4's default target), with nothing written twice:
//
// - Responses become components. Every zod schema `@pageaters/shared` exports is registered under its export name
//   (`bookDetailResponseSchema` → `BookDetailResponse`), so an entity used by many responses (`Book`, `Address`…) is
//   one component that the others `$ref`. Components no operation reaches are pruned in build.js.
// - Requests stay inline (they are small), converted as their input type: what a client sends, before defaults and
//   coercion.

const isZod = (value) => Boolean(value && typeof value === 'object' && value._zod);

const componentName = (exportName) => exportName.replace(/Schema$/, '').replace(/^./, (c) => c.toUpperCase());

/** Every zod schema exported by @pageaters/shared, by identity → its component name (the first export wins). */
const sharedNames = new Map();
for (const [exportName, value] of Object.entries(shared)) {
  if (exportName.endsWith('Schema') && isZod(value) && !sharedNames.has(value)) sharedNames.set(value, componentName(exportName));
}

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

/** Drops the per-schema `$schema`/`$id` keys zod adds; the document is one JSON Schema dialect throughout. */
const clean = (schema) => {
  const out = { ...schema };
  delete out.$schema;
  delete out.$id;
  return out;
};

// zod gives every `.int()` the safe-integer range as bounds; they say nothing to a reader, so they are left out.
const override = ({ jsonSchema }) => {
  if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
  if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
};
const OPTIONS = { unrepresentable: 'any', override };

/**
 * Builds the response components: every shared schema plus `extra` ({ name: zodSchema }) for the few responses that
 * are not JSON envelopes from shared (health, root). Returns `refFor(schema)`, which names a schema's component.
 * @param {Record<string, import('zod').ZodType>} extra
 */
const responseComponents = (extra) => {
  const registry = z.registry();
  const names = new Map(sharedNames);
  for (const [name, schema] of Object.entries(extra)) names.set(schema, name);
  for (const [schema, name] of names) registry.add(schema, { id: name });

  const { schemas } = z.toJSONSchema(registry, {
    ...OPTIONS,
    io: 'output',
    uri: (id) => `#/components/schemas/${id}`,
  });

  const refFor = (schema) => {
    const name = names.get(schema);
    if (!name) throw new Error('docs: a response schema must be exported by @pageaters/shared (or listed as extra)');
    return ref(name);
  };

  return { schemas: Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, clean(schema)])), refFor };
};

/**
 * A request schema, inline, as its input type.
 * @param {import('zod').ZodType} schema
 */
const inputSchema = (schema) => clean(z.toJSONSchema(schema, { ...OPTIONS, io: 'input' }));

module.exports = { inputSchema, ref, responseComponents };
