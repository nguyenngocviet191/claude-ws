# API Reference

Claude Workspace (v0.3.100) REST API for task management, agent execution, and file operations. Available as embedded Next.js routes or standalone Fastify server (agentic-sdk).

## Authentication

All endpoints require `x-api-key` header when `API_ACCESS_KEY` env var is set. Uses timing-safe comparison.

- Header: `x-api-key: <API_ACCESS_KEY_VALUE>`
- Public endpoints: `/api/auth/verify`, `/api/tunnel/status`, `/api/settings/api-access-key`, `/api/uploads/:id` (GET)

---

## Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Get project (404 if not found) |
| `POST` | `/api/projects` | Create project |
| `PUT` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project (cascades to tasks, attempts, shells) |

**Project object:** `{ id, name, path, createdAt }`

**Create/Update body:** `{ name: string, path: string }` (both required on create, both optional on update)

---

## Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List tasks (query params below) |
| `GET` | `/api/tasks/:id` | Get single task |
| `POST` | `/api/tasks` | Create task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task (cascades to attempts, checkpoints, shells) |
| `PUT` | `/api/tasks/:id/compact` | Reorder task position |
| `GET` | `/api/tasks/:id/attempts` | Get task attempts |
| `GET` | `/api/tasks/:id/conversation` | Get checkpoints, attempts, and messages |
| `GET` | `/api/tasks/:id/stats` | Get token/cost stats |
| `GET` | `/api/tasks/:id/running-attempt` | Get currently running attempt or null |
| `GET` | `/api/tasks/:id/pending-question` | Get pending question or null |

**List query params:**
- `projectId` — Single project ID
- `projectIds` — Comma-separated project IDs
- `status` — Filter: `todo`, `in_progress`, `in_review`, `done`, `cancelled` (comma-separated)

**Task object:**
```json
{
  "id": "task_xyz", "projectId": "proj_abc", "title": "Implement auth",
  "description": "Add JWT authentication", "status": "in_progress",
  "position": 0, "chatInit": false, "lastModel": "claude-sonnet-4-20250514",
  "createdAt": 1710000000000, "updatedAt": 1710000000000
}
```

**Create body:** `{ projectId (required), title (required), description, status (default: "todo") }`

**Update body:** `{ title, description, status, lastModel }` (all optional)

**Reorder body:** `{ status: string (required), newPosition: number (required) }`

**Stats response:** `{ totalAttempts, completedAttempts, failedAttempts, totalTokens, totalCostUSD }`

---

## Attempts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/attempts` | Create attempt (start agent execution) |
| `GET` | `/api/attempts/:id` | Get attempt with logs and files |
| `GET` | `/api/attempts/:id/status` | Lightweight status check |
| `GET` | `/api/attempts/:id/stream` | SSE stream of attempt output |
| `POST` | `/api/attempts/:id/cancel` | Cancel running attempt |
| `POST` | `/api/attempts/:id/answer` | Answer pending question |
| `GET` | `/api/attempts/:id/alive` | Check if attempt process is alive |
| `GET` | `/api/attempts/:id/workflow` | Get workflow steps |
| `GET` | `/api/attempts/:id/pending-question` | Get pending question or null |

### Create Attempt

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskId` | string | yes | Target task |
| `prompt` | string | yes | Agent prompt |
| `displayPrompt` | string | no | UI display version of prompt |
| `force_create` | boolean | no | Auto-create task/project if missing |
| `projectName` | string | no | For force_create |
| `taskTitle` | string | no | For force_create |
| `projectRootPath` | string | no | Project root path |
| `request_method` | string | no | `queue` (default, async) or `sync` (wait for completion) |
| `output_format` | string | no | `json` or `text` |
| `output_schema` | string | no | JSON schema for structured output |
| `timeout` | number | no | Timeout in milliseconds |

**Response (201):** `{ id, taskId, prompt, status, createdAt, sessionId }`

### Get Attempt Response

```json
{
  "id": "atmp_123", "taskId": "task_xyz", "status": "completed",
  "sessionId": "sess_abc", "totalTokens": 50000,
  "inputTokens": 30000, "outputTokens": 20000,
  "totalCostUSD": "0.15", "numTurns": 3, "durationMs": 45000,
  "contextUsed": 65000, "contextLimit": 200000, "contextPercentage": 32,
  "logs": [{ "type": "stdout", "content": "...", "createdAt": 1710000000000 }],
  "files": [{ "id": "file_123", "filename": "output.txt", "mimeType": "text/plain", "size": 1024 }],
  "createdAt": 1710000000000, "completedAt": 1710000045000
}
```

### Stream Attempt (SSE)

Returns Server-Sent Events: `data: {"type":"stdout","content":"..."}` and `event: done` with `data: {"code":0}`.

### Answer Question

**Body:** `{ answer: string (required) }`

---

## Checkpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks/:taskId/checkpoints` | List checkpoints for task |
| `POST` | `/api/tasks/:taskId/checkpoints` | Create checkpoint |
| `POST` | `/api/checkpoints/:id/rewind` | Rewind to checkpoint (creates new attempt) |
| `POST` | `/api/checkpoints/backfill` | Bulk insert checkpoints |

**Create body:** `{ attemptId (required), messageCount (required), summary }`

**Rewind body:** `{ taskId: string (required) }`

**Backfill body:** `{ taskId (required), checkpoints: [...] }`

---

## Files & Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files` | List directory contents |
| `GET` | `/api/files/content` | Read file content (text/plain) |
| `POST` | `/api/files` | Write file |
| `DELETE` | `/api/files` | Delete file |
| `GET` | `/api/files/metadata` | Get file size, modified date, type |
| `POST` | `/api/files/operations` | Batch copy/move/delete operations |
| `GET` | `/api/search` | Search file contents |
| `GET` | `/api/search/files` | Search files by glob pattern |

**Common query params:** `projectPath` (required on all), `filePath` or `subPath` (varies by endpoint)

### List Directory

Query: `projectPath` (required), `subPath` (optional)

Response: `{ files: [{ name, path, type, size, modified }], directories: [{ name, path }] }`

### Read/Delete File

Query: `projectPath` (required), `filePath` (required)

### Write File

Body: `{ projectPath, filePath, content }` (all required)

### File Operations

Body: `{ projectPath, operations: [{ type: "copy|move|delete", from, to }] }`

### Search Content

Query: `projectPath` (required), `query` (required)

Response: `{ results: [{ file, line, content }] }`

### Search Files

Query: `projectPath` (required), `pattern` (required)

Response: `{ files: ["path1", "path2"] }`

---

## Git

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/git/status` | Branch, modified, untracked, staged files |
| `GET` | `/api/git/log` | Commit history (query: `limit`, default 20) |
| `POST` | `/api/git/stage` | Stage files |
| `POST` | `/api/git/commit` | Create commit |
| `POST` | `/api/git/push` | Push to remote |
| `POST` | `/api/git/pull` | Pull from remote |
| `GET` | `/api/git/branches` | List branches |
| `POST` | `/api/git/checkout` | Checkout branch |
| `GET` | `/api/git/diff` | Get unified diff |
| `GET` | `/api/git/show-file-diff` | File-specific diff (query: `filePath`, `revision`) |
| `POST` | `/api/git/generate-message` | AI-generated commit message |
| `POST` | `/api/git/discard` | Discard file changes |

All GET endpoints require `projectPath` query param. All POST endpoints require `projectPath` in body.

**Stage body:** `{ projectPath, files: ["path1", "path2"] }`

**Commit body:** `{ projectPath, message }`

**Push body:** `{ projectPath, branch (optional) }`

**Pull body:** `{ projectPath }`

**Checkout body:** `{ projectPath, branch }`

**Generate message body:** `{ projectPath, diff (optional) }` — Response: `{ message: "feat: ..." }`

**Discard body:** `{ projectPath, files: ["path1", "path2"] }`

---

## Shells

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shells` | List shells (query: `projectId`) |
| `POST` | `/api/shells` | Create shell |
| `PUT` | `/api/shells/:id` | Update shell status |

**Create body:** `{ projectId, command, cwd }` (all required)

**Update body:** `{ status: "running|stopped|crashed", exitCode (optional) }`

---

## Uploads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/uploads` | List uploads (query: `attemptId`) |
| `POST` | `/api/uploads` | Upload file (multipart/form-data: `file`, `attemptId`) |
| `GET` | `/api/uploads/:id` | Download file (public endpoint) |
| `DELETE` | `/api/uploads/:id` | Delete upload |

**Upload response:** `{ id, filename, mimeType, size }`

---

## Agent Factory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agent-factory/plugins` | List all plugins |
| `GET` | `/api/agent-factory/plugins/:id` | Get plugin details |
| `POST` | `/api/agent-factory/plugins` | Create plugin |
| `PUT` | `/api/agent-factory/plugins/:id` | Update plugin |
| `DELETE` | `/api/agent-factory/plugins/:id` | Delete plugin |
| `GET` | `/api/agent-factory/plugins/:id/dependencies` | Get plugin dependencies |
| `POST` | `/api/agent-factory/discover` | Discover plugins at path |
| `GET` | `/api/agent-factory/projects/:projectId/plugins` | List project plugins |
| `POST` | `/api/agent-factory/projects/:projectId/plugins` | Associate plugin to project |
| `DELETE` | `/api/agent-factory/projects/:projectId/plugins/:pluginId` | Disassociate plugin |

**Create body:** `{ type: "skill|command|agent|agent_set" (required), name (required), description, sourcePath }`

**Update body:** `{ name, description }` (both optional)

**Discover body:** `{ path: string (required) }`

**Associate body:** `{ pluginId: string (required) }`

---

## Settings & Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get app settings (locale, theme, etc.) |
| `PUT` | `/api/settings` | Update settings |
| `GET` | `/api/settings/api-access-key` | Get API key status: `{ enabled, keyPrefix }` |
| `GET` | `/api/settings/provider` | Get provider config: `{ baseUrl, model }` |
| `GET` | `/api/auth/verify` | Check if auth required: `{ authRequired }` |
| `POST` | `/api/auth/verify` | Verify API key: body `{ apiKey }`, response `{ valid, authRequired }` |

---

## Tunnel & Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tunnel/status` | Tunnel status: `{ active, url }` |
| `POST` | `/api/tunnel/start` | Start tunnel |
| `POST` | `/api/tunnel/stop` | Stop tunnel |
| `GET` | `/api/filesystem` | Get homeDir and cwd |
| `GET` | `/api/commands` | List available slash commands |
| `GET` | `/api/models` | List models: `[{ id, name, contextWindow }]` |
| `GET` | `/api/language/definition` | Language syntax definition (query: `lang`) |
| `POST` | `/api/code/inline-edit` | Edit file lines |

**Inline edit body:** `{ projectPath, filePath, startLine, endLine, replacement }` (all required)

---

## Error Handling

All endpoints return: `{ error: "Error type", message: "Human-readable description" }`

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No content (delete success) |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (missing/invalid API key) |
| `404` | Not found |
| `500` | Server error |

---

## Notes

- **Rate Limiting:** None built-in. Implement at reverse proxy level (Nginx, Cloudflare).
- **Pagination:** Large list endpoints support cursor-based pagination where documented.
- **API Stability:** Stable for v0.3.x. Breaking changes trigger major version bump.
