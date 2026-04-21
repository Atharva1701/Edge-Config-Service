/**
 * Cloudflare Worker environment bindings and type definitions.
 * These match the bindings declared in wrangler.toml.
 */

export interface Env {
  /** KV namespace for storing config key-value pairs */
  CONFIG_KV: KVNamespace;

  /** API token for authentication (set via: wrangler secret put API_TOKEN) */
  API_TOKEN: string;

  /** Current deployment environment */
  ENVIRONMENT: "development" | "production";
}

export interface ConfigEntry {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
