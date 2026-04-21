import type { Env, ConfigEntry } from "../types";
import { ok, err, notFound, noContent, serverError } from "../utils/response";
import { validateKey, validateConfigBody } from "../utils/validation";
import { logger } from "../utils/logger";

// ──────────────────────────────────────────────
// GET /config/:key  — retrieve a single value
// ──────────────────────────────────────────────
export async function handleGetConfig(
  key: string,
  env: Env
): Promise<Response> {
  const keyCheck = validateKey(key);
  if (!keyCheck.valid) return err(keyCheck.error!, 400);

  try {
    const entry = await env.CONFIG_KV.get<ConfigEntry>(key, "json");

    if (!entry) {
      logger.info("Config key not found", { key });
      return notFound(`Config key '${key}'`);
    }

    logger.info("Config key retrieved", { key });
    return ok(entry);
  } catch (e) {
    logger.error("KV read failed", { key, error: String(e) });
    return serverError("Failed to retrieve config value");
  }
}

// ──────────────────────────────────────────────
// GET /config  — list all keys
// ──────────────────────────────────────────────
export async function handleListConfigs(env: Env): Promise<Response> {
  try {
    const listed = await env.CONFIG_KV.list();

    const keys = listed.keys.map((k) => ({
      key: k.name,
      metadata: k.metadata,
    }));

    logger.info("Config keys listed", { count: keys.length });
    return ok({ keys, count: keys.length });
  } catch (e) {
    logger.error("KV list failed", { error: String(e) });
    return serverError("Failed to list config keys");
  }
}

// ──────────────────────────────────────────────
// POST /config  — create or update a key
// ──────────────────────────────────────────────
export async function handleSetConfig(
  request: Request,
  env: Env
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const validation = validateConfigBody(body);
  if (!validation.valid) return err(validation.error!, 400);

  const { key, value } = validation as { key: string; value: string };

  try {
    const now = new Date().toISOString();
    const existing = await env.CONFIG_KV.get<ConfigEntry>(key, "json");

    const entry: ConfigEntry = {
      key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await env.CONFIG_KV.put(key, JSON.stringify(entry));

    const isUpdate = !!existing;
    logger.info(isUpdate ? "Config key updated" : "Config key created", { key });

    return ok(entry, isUpdate ? 200 : 201);
  } catch (e) {
    logger.error("KV write failed", { key, error: String(e) });
    return serverError("Failed to save config value");
  }
}

// ──────────────────────────────────────────────
// DELETE /config/:key  — remove a key
// ──────────────────────────────────────────────
export async function handleDeleteConfig(
  key: string,
  env: Env
): Promise<Response> {
  const keyCheck = validateKey(key);
  if (!keyCheck.valid) return err(keyCheck.error!, 400);

  try {
    const existing = await env.CONFIG_KV.get(key);

    if (!existing) {
      logger.info("Delete attempted on missing key", { key });
      return notFound(`Config key '${key}'`);
    }

    await env.CONFIG_KV.delete(key);
    logger.info("Config key deleted", { key });

    return noContent();
  } catch (e) {
    logger.error("KV delete failed", { key, error: String(e) });
    return serverError("Failed to delete config key");
  }
}
