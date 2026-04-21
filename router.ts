import type { Env } from "./types";
import { authenticate } from "./middleware/auth";
import {
  handleGetConfig,
  handleListConfigs,
  handleSetConfig,
  handleDeleteConfig,
} from "./handlers/config";
import { err, notFound } from "./utils/response";
import { logger } from "./utils/logger";

/**
 * Central request router.
 *
 * Routes:
 *   GET    /config         → list all keys
 *   POST   /config         → create / update a key
 *   GET    /config/:key    → get a single value
 *   DELETE /config/:key    → delete a key
 *   GET    /health         → health check (no auth required)
 */
export async function router(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname, method } = { pathname: url.pathname, method: request.method };

  logger.info("Incoming request", { method, pathname, env: env.ENVIRONMENT });

  // ── Health check (no auth) ──────────────────────────
  if (pathname === "/health" && method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", environment: env.ENVIRONMENT }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Auth gate for all /config routes ────────────────
  const authError = authenticate(request, env);
  if (authError) return authError;

  // ── /config (collection) ────────────────────────────
  if (pathname === "/config") {
    if (method === "GET") return handleListConfigs(env);
    if (method === "POST") return handleSetConfig(request, env);
    return err(`Method ${method} not allowed on /config`, 405);
  }

  // ── /config/:key (single resource) ──────────────────
  const keyMatch = pathname.match(/^\/config\/(.+)$/);
  if (keyMatch) {
    const key = decodeURIComponent(keyMatch[1]);

    if (method === "GET") return handleGetConfig(key, env);
    if (method === "DELETE") return handleDeleteConfig(key, env);
    return err(`Method ${method} not allowed on /config/:key`, 405);
  }

  // ── 404 fallthrough ─────────────────────────────────
  return notFound("Route");
}
