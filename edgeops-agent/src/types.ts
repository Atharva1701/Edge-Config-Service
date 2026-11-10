export interface Env {
  AI: Ai;
  EdgeOpsAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
  CONFIG_API_URL: string;
  CONFIG_API_TOKEN: string;
  ENVIRONMENT: "development" | "production" | string;
}

export interface ConfigEntry {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigList {
  keys: Array<{ key: string; metadata?: unknown }>;
  count: number;
}

export interface PendingChange {
  id: string;
  key: string;
  value: string;
  expectedUpdatedAt: string | null;
  previousValue: string | null;
  reason: string;
  createdAt: string;
  status: "pending" | "applied" | "expired" | "stale";
}
