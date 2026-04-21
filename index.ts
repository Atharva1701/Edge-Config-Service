/**
 * Edge Config Service — Cloudflare Worker Entry Point
 *
 * Exports the fetch handler consumed by the Cloudflare runtime.
 * All routing is delegated to router.ts to keep this file minimal.
 */

import type { Env } from "./types";
import { router } from "./router";
import { serverError } from "./utils/response";
import { logger } from "./utils/logger";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      // Add CORS headers for browser-based consumers
      const response = await router(request, env);
      return addCorsHeaders(request, response);
    } catch (error) {
      logger.error("Unhandled worker error", { error: String(error) });
      return serverError("An unexpected error occurred");
    }
  },
} satisfies ExportedHandler<Env>;

// ── CORS helpers ────────────────────────────────────────────

function addCorsHeaders(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin") ?? "*";

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    newHeaders.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Token",
    "Access-Control-Max-Age": "86400",
  };
}
