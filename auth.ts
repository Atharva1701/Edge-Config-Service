import type { Env } from "../types";
import { unauthorized } from "../utils/response";
import { logger } from "../utils/logger";

/**
 * Validates the incoming request against the configured API token.
 *
 * Clients must send one of:
 *   Authorization: Bearer <token>
 *   X-API-Token: <token>
 *
 * If API_TOKEN is not configured, auth is skipped (useful for local dev).
 */
export function authenticate(request: Request, env: Env): Response | null {
  // Skip auth if no token is configured (local dev convenience)
  if (!env.API_TOKEN) {
    logger.warn("API_TOKEN not set – authentication is disabled");
    return null;
  }

  const token =
    extractBearerToken(request.headers.get("Authorization")) ||
    request.headers.get("X-API-Token");

  if (!token) {
    logger.warn("Request missing auth token", {
      url: request.url,
      method: request.method,
    });
    return unauthorized("Missing API token. Provide Authorization: Bearer <token> or X-API-Token header.");
  }

  // Constant-time comparison to resist timing attacks
  if (!safeEqual(token, env.API_TOKEN)) {
    logger.warn("Invalid API token supplied", {
      url: request.url,
      method: request.method,
    });
    return unauthorized("Invalid API token.");
  }

  return null; // auth passed
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

/**
 * Constant-time string comparison to prevent timing side-channels.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
