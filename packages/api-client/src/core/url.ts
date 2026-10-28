// URL building: path templates, query strings and the base URL.

export type QueryPrimitive = string | number | boolean;
// `undefined` and `null` mean "not sent"; an array sends the key once per item.
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
export type QueryParams = Readonly<Record<string, QueryValue>>;

export type PathParamValue = string | number;

// Path param names follow one rule: a whole segment `:name` with `name` matching `[A-Za-z0-9_]+`, as every route
// in the API does (no optional, regex or mid-segment params). `defineEndpoint` rejects any other `:` segment, so
// this type-level parser (which takes everything up to the next '/') and the runtime `PATH_PARAM` always agree.
// '/categories/unique/:id' → 'id'; '/a/:x/b/:y' → 'x' | 'y'.
export type PathParamNames<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? Param | PathParamNames<`/${Rest}`>
  : Path extends `${string}:${infer Param}`
    ? Param
    : never;

export type PathParams<Path extends string> = { [Name in PathParamNames<Path>]: PathParamValue };

const PATH_PARAM = /:([A-Za-z0-9_]+)/g;
const PARAM_SEGMENT = /^:[A-Za-z0-9_]+$/;

export function pathParamNames(path: string): string[] {
  return Array.from(path.matchAll(PATH_PARAM), (match) => match[1] ?? '');
}

// A path template must start with a single '/' and use only whole-segment `:name` params.
export function assertPathTemplate(path: string): void {
  assertRelativePath(path);
  for (const segment of path.split('/')) {
    if (segment.includes(':') && !PARAM_SEGMENT.test(segment)) {
      throw new TypeError(`Invalid path parameter segment "${segment}" in ${path}`);
    }
  }
}

// Fills `:name` segments with URI-encoded values. Types make a missing param a compile error; the runtime check
// covers untyped callers and rejects values that would silently reach another route: '' (drops the segment),
// '.' and '..' (resolved away by URL parsing), and NaN/Infinity.
export function fillPath(path: string, params: Readonly<Record<string, unknown>>): string {
  return path.replace(PATH_PARAM, (_segment, name: string) => {
    const value = params[name];
    const valid =
      (typeof value === 'string' && value !== '' && value !== '.' && value !== '..') ||
      (typeof value === 'number' && Number.isFinite(value));
    if (!valid) throw new TypeError(`Missing or invalid path parameter "${name}" for ${path}`);
    return encodeURIComponent(String(value));
  });
}

// Express parses repeated keys (`categories=a&categories=b`) into an array through `qs`, and the one list filter
// that takes several values (`/product-sets?categories=`) accepts an array or a comma-separated string, so arrays
// go out as repeated keys: values may then contain commas.
export function serialiseQuery(query: QueryParams | undefined): string {
  if (!query) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value as readonly QueryPrimitive[]) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : '';
}

function assertRelativePath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new TypeError(`Path must start with a single "/": ${path}`);
  }
}

// Only used to resolve a relative base for the origin check below; never requested.
const RELATIVE_ORIGIN = 'http://relative.invalid';

// String concatenation rather than `new URL(path, base)` so a relative base (`/api/v1` behind a same-origin proxy)
// works in the browser, and so the base's path is kept. Trailing slashes on the base are ignored. The result is then
// checked to stay on the base's origin and under its path, so no path (raw `request` calls included) can send the
// cookies elsewhere: `https://api.example.test` + `.evil.test/x` or `@evil.test/x` is rejected.
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  assertRelativePath(path);
  const base = baseUrl.replace(/\/+$/, '');
  const url = `${base}${path}${serialiseQuery(query)}`;

  const parsedBase = new URL(base || '/', RELATIVE_ORIGIN);
  const parsed = new URL(url, RELATIVE_ORIGIN);
  const basePath = parsedBase.pathname.replace(/\/+$/, '');
  if (parsed.origin !== parsedBase.origin || !parsed.pathname.startsWith(`${basePath}/`)) {
    throw new TypeError(`Path ${path} leaves the API base URL`);
  }
  return url;
}
