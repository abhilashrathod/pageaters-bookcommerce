// URL building: path templates, query strings and the base URL.

export type QueryPrimitive = string | number | boolean;
// `undefined` and `null` mean "not sent"; an array sends the key once per item.
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
export type QueryParams = Readonly<Record<string, QueryValue>>;

export type PathParamValue = string | number;

// '/categories/unique/:id' → 'id'; '/a/:x/b/:y' → 'x' | 'y'. Mirrors Express's `:name` segments (the API uses no
// optional or regex params).
export type PathParamNames<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? Param | PathParamNames<`/${Rest}`>
  : Path extends `${string}:${infer Param}`
    ? Param
    : never;

export type PathParams<Path extends string> = { [Name in PathParamNames<Path>]: PathParamValue };

const PATH_PARAM = /:([A-Za-z0-9_]+)/g;

export function pathParamNames(path: string): string[] {
  return Array.from(path.matchAll(PATH_PARAM), (match) => match[1] ?? '');
}

// Fills `:name` segments with URI-encoded values. Types make a missing param a compile error; the runtime check
// covers untyped callers, and rejects '' too, which would silently hit a different route.
export function fillPath(path: string, params: Readonly<Record<string, unknown>>): string {
  return path.replace(PATH_PARAM, (_segment, name: string) => {
    const value = params[name];
    if ((typeof value !== 'string' && typeof value !== 'number') || value === '') {
      throw new TypeError(`Missing path parameter "${name}" for ${path}`);
    }
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

// String concatenation rather than `new URL()` so a relative base (`/api/v1` behind a same-origin proxy) works in
// the browser. Trailing slashes on the base are ignored; paths always start with '/'.
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}${serialiseQuery(query)}`;
}
