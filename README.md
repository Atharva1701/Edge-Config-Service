# Edge Config Service

A production-ready, globally distributed key-value configuration service built on **Cloudflare Workers** and **KV**, with a typed **Node.js CLI** for easy management.

Store and retrieve configuration values (feature flags, connection strings, environment settings) from anywhere in the world with sub-millisecond latency at the edge.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Clients                           │
│                                                          │
│   ┌─────────────────┐        ┌────────────────────────┐  │
│   │   CLI Tool      │        │   Any HTTP Client      │  │
│   │  (Node.js/TS)   │        │  (curl, fetch, etc.)   │  │
│   └────────┬────────┘        └───────────┬────────────┘  │
└────────────┼──────────────────────────── ┼ ──────────────┘
             │  HTTPS + Bearer Token        │
             ▼                             ▼
┌──────────────────────────────────────────────────────────┐
│                 Cloudflare Edge Network                  │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │              Cloudflare Worker                 │     │
│   │                                                │     │
│   │   index.ts  (fetch handler + CORS)             │     │
│   │       │                                        │     │
│   │   router.ts (method + path dispatch)           │     │
│   │       │                                        │     │
│   │   middleware/auth.ts  (Bearer token check)     │     │
│   │       │                                        │     │
│   │   handlers/config.ts  (CRUD logic)             │     │
│   │       │                                        │     │
│   │   utils/ (response, validation, logger)        │     │
│   └────────────────────┬───────────────────────────┘     │
│                        │                                 │
│   ┌────────────────────▼───────────────────────────┐     │
│   │            Cloudflare KV Store                 │     │
│   │   { key → { key, value, createdAt, updatedAt}} │     │
│   └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```



---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine)
- **Wrangler CLI**: `npm install -g wrangler`

---

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/Atharva1701/edge-config-service.git
cd edge-config-service

# Install worker deps
cd worker && npm install && cd ..

# Install CLI deps
cd cli && npm install && cd ..
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create KV namespaces

```bash
# Development namespace
wrangler kv:namespace create "CONFIG_KV"

# Preview namespace (used by `wrangler dev`)
wrangler kv:namespace create "CONFIG_KV" --preview
```

Copy the output IDs into `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONFIG_KV"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_PREVIEW_NAMESPACE_ID"
```

For production, create a separate namespace:

```bash
wrangler kv:namespace create "CONFIG_KV" --env production
```

And update the `[env.production]` section in `wrangler.toml`.

### 4. Set the API token secret

```bash
# Development
wrangler secret put API_TOKEN
# Enter a strong random token when prompted, e.g.: openssl rand -hex 32

# Production
wrangler secret put API_TOKEN --env production
```

> **Tip:** Generate a token with `openssl rand -hex 32`

### 5. Configure the CLI

```bash
cd cli
cp .env.example .env
```

Edit `.env`:

```env
EDGE_CONFIG_URL=http://localhost:8787   # Change to your Worker URL after deploy
EDGE_CONFIG_TOKEN=your-secret-token     # Must match the secret set in step 4
```

---

## Running Locally

Start the Worker locally with Wrangler:

```bash
cd worker
npm run dev
# Worker available at http://localhost:8787
```

In a separate terminal, use the CLI:

```bash
cd cli

# Using ts-node directly during development
npm run dev -- config set MY_KEY "hello world"
npm run dev -- config get MY_KEY
npm run dev -- config list

# Or build first and run the compiled binary
npm run build
node dist/index.js config set MY_KEY "hello world"
```

---

## Deploying to Cloudflare

### Deploy to development

```bash
cd worker
npm run deploy
# Deploys to: https://edge-config-worker.<your-account>.workers.dev
```

### Deploy to production

```bash
cd worker
npm run deploy:prod
# Deploys to: https://edge-config-worker-prod.<your-account>.workers.dev
```

After deploying, update `EDGE_CONFIG_URL` in your CLI `.env` to the deployed Worker URL.

---

## CLI Usage

### Global help

```bash
config --help
config --version
```

### Commands

#### `config set <key> <value>`

Create or update a configuration key.

```bash
config config set DATABASE_URL "postgres://user:pass@host/db"
config config set MAX_CONNECTIONS "100"
config config set FEATURE_FLAGS '{"darkMode":true,"beta":false}'
```

#### `config get <key>`

Retrieve the value of a key.

```bash
config config get DATABASE_URL

# Print raw value only (useful for shell scripts)
config config get DATABASE_URL --value-only
```

#### `config delete <key>`

Delete a configuration key. Aliases: `del`, `rm`

```bash
config config delete OLD_KEY
config config del OLD_KEY    # alias
config config rm OLD_KEY     # alias
```

#### `config list`

List all stored keys. Alias: `ls`

```bash
config config list
config config ls    # alias
```

#### `health`

Check if the Worker is reachable.

```bash
config health
```

---

## API Documentation

All endpoints require an `Authorization: Bearer <token>` header (or `X-API-Token: <token>`), except `GET /health`.

### Base URL

```
https://edge-config-worker.<your-account>.workers.dev
```

---

### `GET /health`

Health check. No authentication required.

**Response `200`:**
```json
{
  "status": "ok",
  "environment": "production"
}
```

---

### `GET /config`

List all config keys.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "keys": [
      { "key": "DATABASE_URL" },
      { "key": "MAX_CONNECTIONS" }
    ],
    "count": 2
  }
}
```

---

### `POST /config`

Create or update a config key.

**Request body:**
```json
{
  "key": "DATABASE_URL",
  "value": "postgres://localhost/mydb"
}
```

**Response `201` (created) / `200` (updated):**
```json
{
  "success": true,
  "data": {
    "key": "DATABASE_URL",
    "value": "postgres://localhost/mydb",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

---

### `GET /config/:key`

Retrieve a single config value.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "key": "DATABASE_URL",
    "value": "postgres://localhost/mydb",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Response `404`:**
```json
{
  "success": false,
  "error": "Config key 'DATABASE_URL' not found"
}
```

---

### `DELETE /config/:key`

Delete a config key.

**Response `204`:** No content (success)

**Response `404`:**
```json
{
  "success": false,
  "error": "Config key 'OLD_KEY' not found"
}
```

---

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

| Status | Meaning                                  |
|--------|------------------------------------------|
| 400    | Bad request / validation error           |
| 401    | Missing or invalid API token             |
| 404    | Key or route not found                   |
| 405    | HTTP method not allowed on this route    |
| 500    | Internal server error                    |

---

### Example: Using `curl`

```bash
BASE="https://edge-config-worker.your-account.workers.dev"
TOKEN="your-secret-token"

# Set a key
curl -X POST "$BASE/config" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"APP_ENV","value":"production"}'

# Get a key
curl "$BASE/config/APP_ENV" \
  -H "Authorization: Bearer $TOKEN"

# List all keys
curl "$BASE/config" \
  -H "Authorization: Bearer $TOKEN"

# Delete a key
curl -X DELETE "$BASE/config/APP_ENV" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Key Naming Rules

- Letters, numbers, and: `_` `.` `-` `:` `/`
- Maximum **128 characters**
- No spaces or special characters beyond the list above

**Valid keys:** `database.url`, `feature/dark-mode`, `MAX_CONNECTIONS`, `api:key:v2`

**Invalid keys:** `my key`, `key@domain`, `key!`

---

## Security

- **Authentication** is enforced via a secret API token stored as a Cloudflare Worker secret (never in code or `wrangler.toml`).
- Token comparison uses **constant-time equality** to resist timing attacks.
- **CORS** is enabled but you should restrict `Access-Control-Allow-Origin` to your own domains in production.
- Cloudflare Workers run in V8 isolates — no shared memory between requests.

---

## Environment Support

| Environment | Worker Name                  | KV Namespace     |
|-------------|------------------------------|------------------|
| Development | `edge-config-worker`         | `CONFIG_KV`      |
| Production  | `edge-config-worker-prod`    | `CONFIG_KV` (prod) |

Deploy to a specific environment:

```bash
# Dev
wrangler deploy

# Production
wrangler deploy --env production
```

---

## License

MIT
