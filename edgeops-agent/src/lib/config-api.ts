import type { ConfigEntry, ConfigList, Env } from "../types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ConfigApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ConfigApiError";
  }
}

/**
 * Server-side client for the existing Edge Config Service.
 * The token is never sent to the browser.
 */
export class ConfigApiClient {
  private readonly baseUrl: string;

  constructor(private readonly env: Env) {
    if (!env.CONFIG_API_URL) throw new Error("CONFIG_API_URL is not configured");
    if (!env.CONFIG_API_TOKEN) throw new Error("CONFIG_API_TOKEN secret is not configured");

    const parsed = new URL(env.CONFIG_API_URL);
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(local && env.ENVIRONMENT !== "production")) {
      throw new Error("CONFIG_API_URL must use HTTPS outside local development");
    }
    this.baseUrl = env.CONFIG_API_URL.replace(/\/+$/, "");
  }

  async list(): Promise<ConfigList> {
    return this.request<ConfigList>("/config", "GET");
  }

  async get(key: string): Promise<ConfigEntry | null> {
    try {
      return await this.request<ConfigEntry>(`/config/${encodeURIComponent(key)}`, "GET");
    } catch (error) {
      if (error instanceof ConfigApiError && error.status === 404) return null;
      throw error;
    }
  }

  async set(key: string, value: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>("/config", "POST", { key, value });
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.env.CONFIG_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch {
      throw new ConfigApiError("Could not reach the configured Edge Config Service", 0);
    }

    if (response.status === 204) return undefined as T;

    let payload: ApiEnvelope<T>;
    try {
      payload = await response.json() as ApiEnvelope<T>;
    } catch {
      throw new ConfigApiError(`Invalid response from config service (${response.status})`, response.status);
    }

    if (!response.ok || !payload.success) {
      throw new ConfigApiError(payload.error ?? `Config API request failed (${response.status})`, response.status);
    }
    if (payload.data === undefined) {
      throw new ConfigApiError("Config API returned no data", response.status);
    }
    return payload.data;
  }
}
