// The typed API client (packages/api-client) for admin services. Cookie auth on the same base URL as HttpClient.
import { InjectionToken } from '@angular/core';
import { createApiClient, isApiError, type ApiClient } from '@pageaters/api-client';
import { environment } from '@env/environment';

export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT', {
  providedIn: 'root',
  factory: () => createApiClient({ baseUrl: environment.BASE_PATH }),
});

/** The message to show for a failed call: the API's own message, never "[object Object]". */
export function apiErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  const body = (error as { error?: { message?: unknown } } | null)?.error; // HttpErrorResponse from HttpClient calls
  if (typeof body?.message === 'string') return body.message;
  return error instanceof Error ? error.message : 'Something went wrong';
}
