/**
 * Typed HTTP client for the Edge Config Worker API.
 */

export interface ConfigEntry {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListResult {
  keys: Array<{ key: string; metadata?: unknown }>;
  count: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ConfigApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  // ── GET /config/:key ──────────────────────────────────
  async get(key: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>(`/config/${encodeURIComponent(key)}`, "GET");
  }

  // ── GET /config ───────────────────────────────────────
  async list(): Promise<ListResult> {
    return this.request<ListResult>("/config", "GET");
  }

  // ── POST /config ──────────────────────────────────────
  async set(key: string, value: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>("/config", "POST", { key, value });
  }

  // ── DELETE /config/:key ───────────────────────────────
  async delete(key: string): Promise<void> {
    await this.request<null>(`/config/${encodeURIComponent(key)}`, "DELETE");
  }

  // ── Health ────────────────────────────────────────────
  async health(): Promise<{ status: string; environment: string }> {
    return this.request("/health", "GET");
  }

  // ── Core fetch ────────────────────────────────────────
  private async request<T>(
    path: string,
    method: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const init: RequestInit = {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (e) {
      throw new ApiError(
        `Network error: Could not reach ${this.baseUrl}. Is the worker running?`,
        0
      );
    }

    // 204 No Content — success, no body
    if (response.status === 204) {
      return null as T;
    }

    let json: ApiResponse<T>;
    try {
      json = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(
        `Unexpected response from server (status ${response.status})`,
        response.status
      );
    }

    if (!response.ok || !json.success) {
      throw new ApiError(
        json.error ?? `Request failed with status ${response.status}`,
        response.status
      );
    }

    return json.data as T;
  }
}
