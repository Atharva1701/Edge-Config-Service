# EdgeOps Agent extension

An AI-assisted control plane for the existing Edge Config Service. This is an **add-on**, not a replacement for the original Worker or CLI.

## What it does

- Chat interface powered by Cloudflare Workers AI and the Agents SDK.
- Durable chat history through `AIChatAgent` and Durable Object SQLite.
- Read-only tools to list and inspect config entries.
- `proposeConfigChange` reads the current value and stores a pending proposal.
- `applyConfigChange` is approval-gated. Before writing, it re-reads the key and rejects stale proposals.
- Deterministic key/value validation is performed in code, not delegated to the model.

The extension intentionally does not implement delete, arbitrary code execution, shell access, or unapproved writes.

## Architecture

```text
Browser (React chat)
       |
       | WebSocket /agents/edgeopsagent/<instance>
       v
EdgeOps Agent Worker
  - AIChatAgent + Durable Object SQLite
  - Workers AI: Llama 3.3 70B
  - read / propose / approval-gated apply tools
       |
       | HTTPS + server-side bearer token
       v
Existing Edge Config Service
  GET /config
  GET /config/:key
  POST /config
```

Use one agent instance per operator or conversation. The instance name is part of the agent URL; do not use a shared `default` instance for multiple authenticated users in production.

## Important prerequisite: repair the original repository layout

The supplied repository ZIP has root-level TypeScript files, but its `wrangler.toml` and `tsconfig.json` point to `src/index.ts` / `src/**/*.ts`, while `router.ts` imports modules from `handlers/`, `middleware/`, and `utils/` that are not in the ZIP. The `quick start.txt` also describes `worker/` and `cli/` folders that are not present.

This extension is isolated under `edgeops-agent/` so it does not silently rewrite the original service. A focused repair patch is included at `patches/repair-original-worker.patch`. From the original repository root, apply it with:

```bash
git apply edgeops-agent/patches/repair-original-worker.patch
```

The patch corrects the root-level imports and points Wrangler/TypeScript at the files that actually exist. It intentionally excludes the orphaned CLI presentation file from the Worker type-check. Review the diff before applying it. The extension assumes the original service exposes the API contract described above.

## Requirements

- Node.js 20 or newer
- npm
- Cloudflare account with Workers AI enabled
- Existing Edge Config Service deployed and reachable over HTTPS
- A Cloudflare API token is **not** used by this application. The extension uses the existing service's `API_TOKEN`.

## Install

From this directory:

```bash
npm install
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:

```dotenv
CONFIG_API_URL=https://YOUR-EDGE-CONFIG-WORKER.workers.dev
CONFIG_API_TOKEN=the_existing_service_API_TOKEN
```

Do not commit `.dev.vars`. It is ignored by `.gitignore`.

For local development, run the original config service on port `8788` after fixing its layout, then set `CONFIG_API_URL=http://127.0.0.1:8788`.

## Run locally

Terminal 1, from `edgeops-agent/`:

```bash
npm run dev
```

This starts the Agent Worker on `http://127.0.0.1:8787` and the Vite UI on `http://127.0.0.1:5173`. Vite proxies `/agents` WebSocket traffic to the Worker.

Open `http://127.0.0.1:5173`.

## Deploy

1. Build the browser UI:

   ```bash
   npm run build
   ```

2. Add the downstream API token as a Worker secret:

   ```bash
   npx wrangler secret put CONFIG_API_TOKEN
   ```

3. Set `CONFIG_API_URL` in `wrangler.toml` to the deployed Edge Config Service URL, or set it as a Worker variable in the Cloudflare dashboard.

4. Deploy:

   ```bash
   npx wrangler deploy
   ```

5. Put the deployed Agent Worker behind **Cloudflare Access** (or an equivalent identity-aware access layer) before exposing it publicly. The browser does not receive `CONFIG_API_TOKEN`; it remains a server-side secret. Local development does not enforce an operator identity.

6. In production, use a distinct, non-guessable agent instance name per authenticated operator/conversation. Configure the UI's `VITE_AGENT_INSTANCE` build variable if you want to change the default instance.

## Example prompts

- "List the configuration keys."
- "Show me the current value for `payment.timeout`."
- "Propose changing `payment.timeout` to `30`."
- "Apply proposal `<proposal-id>`."

The model may prepare a proposal, but it cannot apply it without the explicit approval control in the chat UI. Applying also checks that the key has not changed since the proposal was created.

## API contract used

The existing service's `POST /config` accepts `{ "key": string, "value": string }` and returns an envelope:

```json
{ "success": true, "data": { "key": "...", "value": "...", "createdAt": "...", "updatedAt": "..." } }
```

`GET /config/:key` returns the same envelope. `GET /config` returns `{ "success": true, "data": { "keys": [...], "count": n } }`.

## Security notes

- The downstream API token is read only from Worker environment secrets.
- No tool writes automatically. `applyConfigChange` uses `needsApproval`.
- A proposal is single-use and expires after 15 minutes.
- A proposal is rejected if the target key changed after it was prepared.
- All writes pass deterministic validation.
- Protect the deployed Worker with Cloudflare Access. The included starter does not implement Access JWT verification itself.
- The original Edge Config Service currently reflects a single KV namespace binding per deployment. It does not implement a first-class environment parameter in its config routes. This extension therefore does not pretend it can switch between staging and production. Deploy separate service instances / URLs and select the intended API URL through trusted server configuration if you need environment isolation.

## Tests and verification

The ZIP is an implementation scaffold based on the source files supplied. Dependencies were not installed and no live Cloudflare account or config Worker was available in this environment, so a full `wrangler dev`, type-check, or end-to-end deployment test has **not** been run. After `npm install`, run:

```bash
npm run type-check
npm run build
```

Then test read-only operations against a non-production config service before enabling any production write path.
