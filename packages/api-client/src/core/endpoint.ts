import type { z } from 'zod';

import type { CallOptions, HttpMethod, Requester, ResponseSchema } from './http.ts';
import { fillPath, pathParamNames } from './url.ts';
import type { PathParams, QueryParams, QueryValue } from './url.ts';

// Declarative endpoints. An endpoint is data (method, path template, schemas); `bindEndpoints` turns a tree of
// them into functions. A call takes one flat object, as the API reads one merged object (`req.allParams()`):
// the path template's params are taken out by name, and the rest is sent as the query or the JSON body,
// whichever the endpoint declares. Request schemas give types only (the API validates); the response schema is
// used for the result type and, when validation is on, to parse `data`.

const ENDPOINT = Symbol.for('@pageaters/api-client/Endpoint');

type InputLocation = 'none' | 'query' | 'body';

export interface Endpoint<Method extends HttpMethod, Path extends string, Input, Output> {
  readonly [ENDPOINT]: true;
  readonly method: Method;
  readonly path: Path;
  readonly input: InputLocation;
  readonly response: ResponseSchema<Output>;
  // Phantom: carries the call's input type. Never set at runtime.
  readonly _input?: Input;
}

// Any endpoint, whatever its types.
export type AnyEndpoint = Endpoint<HttpMethod, string, unknown, unknown>;

// Preprocessed fields in the shared query schemas (`z.preprocess`) have an `unknown` input type; narrow those
// to what a query string can carry so callers still get checked.
export type QueryInput<Shape> = { [Key in keyof Shape]: unknown extends Shape[Key] ? QueryValue : Shape[Key] };

// Intersections flattened, so editors and the emitted declarations show one object type.
type Simplify<T> = { [Key in keyof T]: T[Key] } & {};

interface BaseConfig<Method extends HttpMethod, Path extends string, Response extends z.ZodType> {
  method: Method;
  path: Path;
  // The schema of the envelope's `data` (for a shared `fooResponseSchema`, its `.shape.data`).
  response: Response;
}

type QuerySchema = z.ZodType<unknown, Record<string, unknown>>;
type BodySchema = z.ZodType<unknown, Record<string, unknown>>;

export function defineEndpoint<const Method extends HttpMethod, const Path extends string, Response extends z.ZodType>(
  config: BaseConfig<Method, Path, Response> & { query?: undefined; body?: undefined },
): Endpoint<Method, Path, Simplify<PathParams<Path>>, z.output<Response>>;
export function defineEndpoint<
  const Method extends HttpMethod,
  const Path extends string,
  Response extends z.ZodType,
  Query extends QuerySchema,
>(
  config: BaseConfig<Method, Path, Response> & { query: Query; body?: undefined },
): Endpoint<Method, Path, Simplify<PathParams<Path> & QueryInput<z.input<Query>>>, z.output<Response>>;
export function defineEndpoint<
  const Method extends HttpMethod,
  const Path extends string,
  Response extends z.ZodType,
  Body extends BodySchema,
>(
  config: BaseConfig<Method, Path, Response> & { body: Body; query?: undefined },
): Endpoint<Method, Path, Simplify<PathParams<Path> & z.input<Body>>, z.output<Response>>;
export function defineEndpoint(
  config: BaseConfig<HttpMethod, string, z.ZodType> & { query?: QuerySchema; body?: BodySchema },
): Endpoint<HttpMethod, string, unknown, unknown> {
  return {
    [ENDPOINT]: true,
    method: config.method,
    path: config.path,
    input: config.query ? 'query' : config.body ? 'body' : 'none',
    response: config.response,
  };
}

export function isEndpoint(value: unknown): value is AnyEndpoint {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[ENDPOINT] === true;
}

// A resource is a (nestable) group of endpoints: `{ categories: { list, detail }, admin: { … } }`.
export interface EndpointTree {
  readonly [name: string]: AnyEndpoint | EndpointTree;
}

// The call signature of one endpoint: the input may be left out when every field is optional.
export type EndpointCall<E> =
  E extends Endpoint<HttpMethod, string, infer Input, infer Output>
    ? Partial<Input> extends Input
      ? (input?: Input, options?: CallOptions) => Promise<Output>
      : (input: Input, options?: CallOptions) => Promise<Output>
    : never;

export type BoundTree<Tree> = {
  readonly [Name in keyof Tree]: Tree[Name] extends AnyEndpoint ? EndpointCall<Tree[Name]> : BoundTree<Tree[Name]>;
};

function bindEndpoint(endpoint: AnyEndpoint, request: Requester) {
  const names = pathParamNames(endpoint.path);
  return (input: Readonly<Record<string, unknown>> = {}, options?: CallOptions) => {
    const path = fillPath(endpoint.path, input);
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) if (!names.includes(key)) rest[key] = value;
    return request(
      {
        method: endpoint.method,
        path,
        response: endpoint.response,
        ...(endpoint.input === 'query' ? { query: rest as QueryParams } : {}),
        ...(endpoint.input === 'body' ? { body: rest } : {}),
      },
      options,
    );
  };
}

export function bindEndpoints<const Tree extends EndpointTree>(tree: Tree, request: Requester): BoundTree<Tree> {
  const bound: Record<string, unknown> = {};
  for (const [name, node] of Object.entries(tree)) {
    bound[name] = isEndpoint(node) ? bindEndpoint(node, request) : bindEndpoints(node, request);
  }
  return bound as BoundTree<Tree>;
}
