// Pure (no app imports) so node tests can load it.
/** A Payload REST query for one published document: `/pages?where[slug][equals]=home&…`. */
export const cmsQuery = (collection: string, where: Record<string, string>): `/${string}` => {
  const params = new URLSearchParams({ depth: '2', limit: '1' });
  for (const [field, value] of Object.entries({ ...where, _status: 'published' })) params.set(`where[${field}][equals]`, value);
  return `/${collection}?${params.toString()}`;
};
