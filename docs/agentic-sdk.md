# Agentic SDK Integration

The Agentic SDK is a headless Fastify backend that exposes the full Claude Workspace API without the React UI. It uses the same SQLite schema and services as the main app, enabling programmatic task execution, CI/CD automation, and custom integrations.

## What is it?

**Main App (claude-ws):** Next.js frontend + embedded API routes (REST) + Socket.io (WebSockets)
**Agentic SDK:** Standalone Fastify server (REST + SSE, no WebSockets, no UI)

Use Agentic SDK when you want to:
- Run Claude agents in headless environments (servers, CI/CD)
- Integrate Claude Workspace into automation scripts
- Build custom frontends or dashboards
- Programmatically create/manage tasks and stream results
- Run multiple isolated projects on the same hardware

## Setup & Installation

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Development

From the project root:
```bash
# Install all dependencies
pnpm install

# Start dev server with file watching
pnpm agentic-sdk:dev
```

Server listens on `http://localhost:3100` by default.

### Production

```bash
# Build (if needed)
pnpm build

# Start production server
pnpm agentic-sdk:start
```

## Environment Configuration

Read from **parent claude-ws `.env` file** in the working directory:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AGENTIC_SDK_PORT` | Server port | `3100` | — |
| `AGENTIC_SDK_DATA_DIR` | SQLite + uploads dir | `<project-root>/data` | — |
| `API_ACCESS_KEY` | x-api-key auth token | — | Recommended |
| `ANTHROPIC_BASE_URL` | Anthropic API endpoint | `https://api.anthropic.com` | — |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic API key | — | Required |
| `ANTHROPIC_MODEL` | Default Claude model | — | Required |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus tier model | Falls back to `ANTHROPIC_MODEL` | — |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet tier model | Falls back to `ANTHROPIC_MODEL` | — |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku tier model | Falls back to `ANTHROPIC_MODEL` | — |
| `LOG_LEVEL` | Pino logging level | `debug` | — |
| `CORS_ORIGIN` | CORS allowed origin (prod) | — | For custom domains |

### Example `.env`

```env
AGENTIC_SDK_PORT=3100
AGENTIC_SDK_DATA_DIR=/var/lib/claude-ws/data
API_ACCESS_KEY=sk-workspace-abc123xyz789
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_AUTH_TOKEN=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=info
CORS_ORIGIN=https://my-app.example.com
```

## Architecture

```
packages/agentic-sdk/
├── bin/
│   └── server-entrypoint.ts            # Entry point, dotenv loading, graceful shutdown
├── src/
│   ├── index.ts                        # Public module exports
│   ├── app-factory.ts                  # Wire services, routes, plugins, agent manager
│   ├── fastify-app-setup.ts            # CORS, multipart upload, request logging
│   ├── config/
│   │   └── env-config.ts               # Typed environment variable loading
│   ├── db/
│   │   ├── database-schema.ts          # Drizzle ORM schema (13 tables)
│   │   ├── database-connection.ts      # SQLite connection + WAL mode
│   │   └── database-init-tables.ts     # Runtime schema initialization
│   ├── plugins/
│   │   ├── fastify-auth-plugin.ts      # x-api-key authentication
│   │   └── fastify-error-handler-plugin.ts
│   ├── agent/
│   │   ├── claude-sdk-agent-provider.ts       # SDK agent creation + MCP config
│   │   ├── agent-lifecycle-manager.ts         # Start/cancel orchestration
│   │   ├── claude-sdk-message-to-output-adapter.ts
│   │   └── agent-start-options-and-event-types.ts
│   ├── services/                       # Database + filesystem operations
│   ├── routes/                         # Fastify route handlers (14 files)
│   └── lib/                            # Logger, ID generation, crypto
└── README.md
```

## Routes & Services

### Route Files

Fastify routes are organized by domain:

| File | Endpoints | Purpose |
|------|-----------|---------|
| `auth-routes.ts` | `/api/auth/verify` | API key verification |
| `project-routes.ts` | `/api/projects` CRUD | Project management |
| `task-routes.ts` | `/api/tasks` CRUD | Task management |
| `attempt-routes.ts` | `/api/attempts` CRUD | Attempt creation/status |
| `attempt-sse-routes.ts` | `/api/attempts/:id/stream` | SSE event streaming |
| `checkpoint-routes.ts` | `/api/checkpoints` | Conversation snapshots |
| `file-routes.ts` | `/api/files` | File read/write/search |
| `filesystem-routes.ts` | `/api/filesystem` | Dir listing, metadata |
| `shell-routes.ts` | `/api/shells` | Shell process tracking |
| `upload-routes.ts` | `/api/uploads` | File uploads (multipart) |
| `search-routes.ts` | `/api/search` | Content + file search |
| `command-routes.ts` | `/api/commands` | Slash command registry |
| `agent-factory-plugin-routes.ts` | `/api/agent-factory/plugins` | Plugin CRUD |
| `agent-factory-project-routes.ts` | `/api/agent-factory/projects/:id` | Plugin association |

### Services

Shared business logic (used by both Next.js routes and Fastify):

```typescript
// Task management
createTaskService(db) → { create, list, update, delete, reorder }

// Project operations
createProjectService(db) → { create, list, get, update, delete }

// Attempt execution
createAttemptService(db) → { create, get, listByTask, cancel }

// File operations
createFileService() → { read, write, delete, list, search }

// Plugin management
createAgentFactoryService(db) → { discover, install, uninstall }
```

## Agent Lifecycle

### 1. Create Attempt

```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: sk-workspace-..." \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_xyz",
    "prompt": "Implement authentication",
    "request_method": "queue"
  }'
```

Response:
```json
{
  "id": "atmp_001",
  "taskId": "task_xyz",
  "status": "running",
  "sessionId": "sess_abc",
  "createdAt": 1710000000000
}
```

**Request Options:**
- `taskId` (required) — Target task
- `prompt` (required) — Agent instruction
- `request_method` — `queue` (return immediately) or `sync` (wait for completion)
- `force_create` — Auto-create project/task if missing
- `output_format` — `json` or `text`
- `timeout` — Max execution milliseconds

### 2. Start Agent (queue mode)

Agent starts in background. Check status or stream output.

### 3. Stream Output (SSE)

```bash
curl -N http://localhost:3100/api/attempts/atmp_001/stream \
  -H "x-api-key: sk-workspace-..."
```

Returns Server-Sent Events stream:
```
data: {"type":"stdout","content":"Running..."}

data: {"type":"json","content":{...}}

event: done
data: {"code":0}
```

### 4. Answer Questions

If agent asks for input:

```bash
curl -X POST http://localhost:3100/api/attempts/atmp_001/answer \
  -H "x-api-key: sk-workspace-..." \
  -H "Content-Type: application/json" \
  -d '{"answer": "yes"}'
```

### 5. Check Status

```bash
curl http://localhost:3100/api/attempts/atmp_001/status \
  -H "x-api-key: sk-workspace-..."
```

Response:
```json
{
  "id": "atmp_001",
  "status": "completed",
  "totalTokens": 45000,
  "durationMs": 42000
}
```

### 6. Cancel Attempt

```bash
curl -X POST http://localhost:3100/api/attempts/atmp_001/cancel \
  -H "x-api-key: sk-workspace-..."
```

## Usage Examples

### Example 1: Queue Task & Stream Results

```bash
#!/bin/bash
KEY="sk-workspace-abc123"

# Create project
PROJECT=$(curl -s -X POST http://localhost:3100/api/projects \
  -H "x-api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-app","path":"/path/to/app"}' | jq -r .id)

# Create task
TASK=$(curl -s -X POST http://localhost:3100/api/tasks \
  -H "x-api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"title\":\"Add auth\"}" | jq -r .id)

# Start attempt
ATTEMPT=$(curl -s -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK\",\"prompt\":\"Implement JWT authentication\"}" | jq -r .id)

# Stream output
curl -N http://localhost:3100/api/attempts/$ATTEMPT/stream \
  -H "x-api-key: $KEY"
```

### Example 2: Synchronous Execution

```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: sk-workspace-..." \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_xyz",
    "prompt": "Fix the login bug",
    "request_method": "sync",
    "timeout": 300000
  }' | jq .
```

Returns full attempt with logs when complete:
```json
{
  "id": "atmp_001",
  "status": "completed",
  "totalTokens": 45000,
  "logs": [...],
  "completedAt": 1710000042000
}
```

### Example 3: Auto-Create Project & Task

```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: sk-workspace-..." \
  -H "Content-Type: application/json" \
  -d '{
    "force_create": true,
    "projectName": "new-project",
    "projectRootPath": "/path/to/new-project",
    "taskTitle": "Initial setup",
    "prompt": "Generate project structure"
  }' | jq .
```

### Example 4: Search & List

```bash
# List projects
curl http://localhost:3100/api/projects \
  -H "x-api-key: sk-workspace-..."

# List tasks for project
curl "http://localhost:3100/api/tasks?projectId=proj_abc&status=in_progress" \
  -H "x-api-key: sk-workspace-..."

# Search files
curl "http://localhost:3100/api/search/files?projectPath=/path/to/app&pattern=*.ts" \
  -H "x-api-key: sk-workspace-..."
```

## SSE Stream Format

Server-Sent Events emitted during attempt execution:

| Event | Data | Notes |
|-------|------|-------|
| `data` (default) | `{"type":"stdout","content":"..."}` | Standard output |
| `data` | `{"type":"stderr","content":"..."}` | Error output |
| `data` | `{"type":"json","content":{...}}` | Structured data |
| `done` | `{"code":0}` | Execution finished (code = exit code) |

**Client-side SSE handling:**

```javascript
const eventSource = new EventSource(
  '/api/attempts/atmp_001/stream',
  { headers: { 'x-api-key': 'sk-workspace-...' } }
);

eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'stdout') {
    console.log(data.content);
  }
};

eventSource.addEventListener('done', (e) => {
  const { code } = JSON.parse(e.data);
  console.log(`Finished with exit code ${code}`);
  eventSource.close();
});
```

## Authentication

**Timing-safe comparison** prevents timing attacks:

```typescript
// x-api-key header (required if API_ACCESS_KEY set)
const key = request.headers.get('x-api-key');

// Compared with constant-time function
function safeCompare(a: string, b: string): boolean {
  let mismatch = a.length !== b.length ? 1 : 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}
```

**Public Endpoints** (no auth required):
- `GET /health`
- `GET /api/auth/verify`

## Health Check

```bash
curl http://localhost:3100/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1710000000000
}
```

Always responds with 200 OK. Use for load balancer / monitoring.

## Error Handling

All errors return JSON with `error` and `message` fields:

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

**Status Codes:**
- `200` — Success
- `201` — Created
- `204` — No content
- `400` — Bad request
- `401` — Unauthorized (invalid API key)
- `404` — Not found
- `500` — Server error

## Shared Code Strategy

Agentic SDK reuses code from main app:

| Code | Location | Usage |
|------|----------|-------|
| Database schema | `packages/agentic-sdk/src/db/database-schema.ts` | Both apps |
| Services | `packages/agentic-sdk/src/services/` | Both apps |
| Types | `packages/agentic-sdk/src/types/` | Both apps |
| Main app routes | `src/app/api/` | Re-export from SDK services |
| Agent manager | `packages/agentic-sdk/src/agent/` | Both apps |

**Import pattern:**
```typescript
// Main app imports from SDK
import { createTaskService } from '@agentic-sdk/services/task-crud-and-reorder-service';
import { projects, tasks } from '@agentic-sdk/db/database-schema';
```

This reduces duplication and ensures feature parity.

## Logging

Structured logging via Pino:

```bash
LOG_LEVEL=debug pnpm agentic-sdk:start
```

Log levels:
- `debug` — Verbose request/response logging
- `info` — Important events
- `warn` — Warnings
- `error` — Errors only

Output in JSON format suitable for log aggregation (ELK, Datadog, etc.).

## Performance Tuning

### SQLite Configuration

WAL mode enabled for concurrent reads:
```typescript
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
```

### Connection Pooling

Fastify uses single SQLite connection (SQLite doesn't support true pooling):
```typescript
const db = new Database(dbPath);
// Single connection shared across all requests
```

### Multipart Uploads

Fastify multipart configured with:
- Max file size: Configurable
- Memory threshold: 1MB (larger files spilled to disk)

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

RUN pnpm install --prod
ENV NODE_ENV=production

EXPOSE 3100

CMD ["pnpm", "agentic-sdk:start"]
```

### systemd Service

```ini
[Unit]
Description=Claude Workspace Agentic SDK
After=network.target

[Service]
Type=simple
User=claude-ws
WorkingDirectory=/opt/claude-ws
EnvironmentFile=/etc/claude-ws/env
ExecStart=/usr/bin/pnpm agentic-sdk:start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Environment Variables File (`/etc/claude-ws/env`)

```env
NODE_ENV=production
AGENTIC_SDK_PORT=3100
AGENTIC_SDK_DATA_DIR=/var/lib/claude-ws/data
API_ACCESS_KEY=sk-workspace-...
ANTHROPIC_AUTH_TOKEN=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=info
```

### PM2

```bash
pm2 start packages/agentic-sdk/bin/server-entrypoint.ts \
  --name claude-ws-sdk \
  --env production \
  --instances 1 \
  --log /var/log/claude-ws-sdk.log
```

## Graceful Shutdown

Server listens for SIGTERM and SIGINT:

```typescript
process.on('SIGTERM', async () => {
  log.info('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});
```

Current requests complete before shutdown. New requests return 503.

## Monitoring & Observability

### Pino Logging

JSON structured logs:
```json
{
  "timestamp": 1710000000000,
  "level": 30,
  "name": "Attempt",
  "msg": "Attempt created",
  "attemptId": "atmp_001",
  "taskId": "task_xyz"
}
```

### Prometheus Metrics (Optional)

Can be added via `fastify-prometheus` plugin:
```typescript
import prom from 'fastify-prometheus';

await fastify.register(prom, {
  routePrefix: '/metrics',
  logErrorsOnly: true
});
```

Access metrics at `/metrics` (Prometheus format).

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3100

# Kill it
kill -9 <pid>

# Or use different port
AGENTIC_SDK_PORT=3101 pnpm agentic-sdk:start
```

### Database Locked

SQLite with WAL mode handles concurrent access. If locked:
```bash
# Remove WAL files and restart
rm -f data/app.db-wal data/app.db-shm
pnpm agentic-sdk:start
```

### Authentication Failures

Check API key:
```bash
# Verify key is set
echo $API_ACCESS_KEY

# Test endpoint
curl -v -H "x-api-key: $API_ACCESS_KEY" http://localhost:3100/api/projects
```

### Agent Timeout

Increase timeout in attempt request:
```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: ..." \
  -d '{
    "taskId": "task_xyz",
    "prompt": "...",
    "timeout": 600000
  }'
```

## License

MIT
