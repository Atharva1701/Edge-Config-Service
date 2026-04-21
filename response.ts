import type { ApiResponse } from "../types";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
} as const;

/**
 * Creates a successful JSON response.
 */
export function ok<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Creates an error JSON response.
 */
export function err(message: string, status = 400): Response {
  const body: ApiResponse = { success: false, error: message };
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Creates a 404 Not Found response.
 */
export function notFound(resource = "Resource"): Response {
  return err(`${resource} not found`, 404);
}

/**
 * Creates a 204 No Content response.
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Creates a 401 Unauthorized response.
 */
export function unauthorized(message = "Unauthorized"): Response {
  return err(message, 401);
}

/**
 * Creates a 500 Internal Server Error response.
 */
export function serverError(message = "Internal server error"): Response {
  return err(message, 500);
}
