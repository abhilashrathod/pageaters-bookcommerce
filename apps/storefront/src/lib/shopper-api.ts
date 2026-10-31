import { createApiClient, isApiError } from '@pageaters/api-client';

// The shopper's API client, for the browser only: the API authenticates with httpOnly cookies on its own origin,
// which the storefront's server never sees, so cart, checkout and order calls run in client components.
// NEXT_PUBLIC_API_URL is inlined at build time (validated on the server by src/env.ts).
export const shopperApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api/v1',
  credentials: 'include',
});

// A message to show the shopper for a failed call: the API's message when it sent one.
export const errorMessage = (error: unknown) =>
  isApiError(error) && error.statusCode > 0 ? error.message : 'Something went wrong. Please try again.';
