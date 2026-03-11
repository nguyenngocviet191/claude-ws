# Database Schema

Claude Workspace uses SQLite for local-first data storage. The schema is defined via Drizzle ORM in `packages/agentic-sdk/src/db/database-schema.ts` and applies to both the main app and agentic-sdk.

## Schema Initialization Strategy

**Dual Migration Approach:**
- `Drizzle migrations` — Version-controlled, incremental schema changes
- `initDb()` function — Runtime initialization for existing databases (backwards compatible)

When you add columns, update **both locations**:
1. `src/lib/db/schema.ts` or `packages/agentic-sdk/src/db/database-schema.ts` (Drizzle schema)
2. `src/lib/db/index.ts` or `packages/agentic-sdk/src/db/database-init-tables.ts` (ALTER TABLE statements with try-catch)

This ensures fresh installs get typed migrations while existing databases don't break with "no such column" errors.

---

## Tables

### 1. Projects

Workspace projects — directories being managed by agents.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `name` | TEXT | NOT NULL | Display name |
| `path` | TEXT | NOT NULL, UNIQUE | Absolute filesystem path |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- Primary key on `id`

**Example:**
```json
{
  "id": "proj_abc123xyz",
  "name": "my-app",
  "path": "/home/user/my-app",
  "createdAt": 1710000000000
}
```

---

### 2. Tasks

Kanban cards within projects.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `projectId` | TEXT | NOT NULL, FK → projects.id | CASCADE delete |
| `title` | TEXT | NOT NULL | Task name |
| `description` | TEXT | | Markdown content |
| `status` | TEXT | NOT NULL, DEFAULT 'todo' | Enum: todo, in_progress, in_review, done, cancelled |
| `position` | INTEGER | NOT NULL | Board column ordering |
| `chatInit` | BOOLEAN | NOT NULL, DEFAULT false | Chat session initialized |
| `lastModel` | TEXT | | Last used Claude model |
| `rewindSessionId` | TEXT | | Session ID for rewinding |
| `rewindMessageUuid` | TEXT | | Message UUID for rewinding |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |
| `updatedAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_tasks_project` on `(projectId, status, position)`

**Foreign Keys:**
- `projectId` → `projects.id` (CASCADE delete)

**Example:**
```json
{
  "id": "task_xyz789",
  "projectId": "proj_abc123xyz",
  "title": "Implement JWT auth",
  "description": "Add JWT authentication to API",
  "status": "in_progress",
  "position": 0,
  "chatInit": true,
  "lastModel": "claude-sonnet-4-20250514",
  "createdAt": 1710000000000,
  "updatedAt": 1710000010000
}
```

---

### 3. Attempts

Agent execution records — one per prompt submission.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `taskId` | TEXT | NOT NULL, FK → tasks.id | CASCADE delete |
| `prompt` | TEXT | NOT NULL | Full prompt sent to agent |
| `displayPrompt` | TEXT | | Sanitized display version |
| `status` | TEXT | NOT NULL, DEFAULT 'running' | Enum: running, completed, failed, cancelled |
| `sessionId` | TEXT | | Claude SDK session ID |
| `branch` | TEXT | | Git branch at execution |
| `diffAdditions` | INTEGER | NOT NULL, DEFAULT 0 | Lines added in attempt |
| `diffDeletions` | INTEGER | NOT NULL, DEFAULT 0 | Lines deleted in attempt |
| `totalTokens` | INTEGER | NOT NULL, DEFAULT 0 | Input + output + cache tokens |
| `inputTokens` | INTEGER | NOT NULL, DEFAULT 0 | Tokens in prompt |
| `outputTokens` | INTEGER | NOT NULL, DEFAULT 0 | Tokens in response |
| `cacheCreationTokens` | INTEGER | NOT NULL, DEFAULT 0 | Tokens to create cache |
| `cacheReadTokens` | INTEGER | NOT NULL, DEFAULT 0 | Tokens from cache hit |
| `totalCostUSD` | TEXT | NOT NULL, DEFAULT '0' | Computed billing cost |
| `numTurns` | INTEGER | NOT NULL, DEFAULT 0 | Number of conversation turns |
| `durationMs` | INTEGER | NOT NULL, DEFAULT 0 | Execution time in milliseconds |
| `contextUsed` | INTEGER | NOT NULL, DEFAULT 0 | Tokens in conversation context |
| `contextLimit` | INTEGER | NOT NULL, DEFAULT 200000 | Max context window |
| `contextPercentage` | INTEGER | NOT NULL, DEFAULT 0 | Used / limit percentage |
| `baselineContext` | INTEGER | NOT NULL, DEFAULT 0 | System prompt baseline |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |
| `completedAt` | INTEGER | | When execution finished |
| `outputFormat` | TEXT | | 'json' or 'text' |
| `outputSchema` | TEXT | | Structured output schema |

**Indexes:**
- `idx_attempts_task` on `(taskId, createdAt)`

**Foreign Keys:**
- `taskId` → `tasks.id` (CASCADE delete)

**Example:**
```json
{
  "id": "atmp_001",
  "taskId": "task_xyz789",
  "prompt": "Implement JWT authentication",
  "status": "completed",
  "sessionId": "sess_abc",
  "totalTokens": 45000,
  "inputTokens": 30000,
  "outputTokens": 15000,
  "totalCostUSD": "0.135",
  "numTurns": 3,
  "durationMs": 42000,
  "contextUsed": 65000,
  "contextPercentage": 32,
  "createdAt": 1710000000000,
  "completedAt": 1710000042000
}
```

---

### 4. Attempt Logs

Streaming output chunks from agents.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-incremented |
| `attemptId` | TEXT | NOT NULL, FK → attempts.id | CASCADE delete |
| `type` | TEXT | NOT NULL | Enum: stdout, stderr, json |
| `content` | TEXT | NOT NULL | Log content |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_logs_attempt` on `(attemptId, createdAt)`

**Foreign Keys:**
- `attemptId` → `attempts.id` (CASCADE delete)

**Example:**
```json
{
  "id": 1,
  "attemptId": "atmp_001",
  "type": "stdout",
  "content": "Installing dependencies...",
  "createdAt": 1710000000500
}
```

---

### 5. Attempt Files

File attachments uploaded during attempts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `attemptId` | TEXT | NOT NULL, FK → attempts.id | CASCADE delete |
| `filename` | TEXT | NOT NULL | Stored filename |
| `originalName` | TEXT | NOT NULL | Original uploaded name |
| `mimeType` | TEXT | NOT NULL | MIME type |
| `size` | INTEGER | NOT NULL | File size in bytes |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_attempt_files_attempt` on `(attemptId)`

**Foreign Keys:**
- `attemptId` → `attempts.id` (CASCADE delete)

**Example:**
```json
{
  "id": "file_123",
  "attemptId": "atmp_001",
  "filename": "design-spec-20250311.pdf",
  "originalName": "Design Specification.pdf",
  "mimeType": "application/pdf",
  "size": 204800,
  "createdAt": 1710000000000
}
```

---

### 6. Checkpoints

Conversation state snapshots for rewinding.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `taskId` | TEXT | NOT NULL, FK → tasks.id | CASCADE delete |
| `attemptId` | TEXT | NOT NULL, FK → attempts.id | CASCADE delete |
| `sessionId` | TEXT | NOT NULL | SDK session identifier |
| `gitCommitHash` | TEXT | | Associated git commit |
| `messageCount` | INTEGER | NOT NULL | Messages in checkpoint |
| `summary` | TEXT | | Human-readable summary |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_checkpoints_task` on `(taskId, createdAt)`

**Foreign Keys:**
- `taskId` → `tasks.id` (CASCADE delete)
- `attemptId` → `attempts.id` (CASCADE delete)

**Example:**
```json
{
  "id": "ckpt_abc",
  "taskId": "task_xyz789",
  "attemptId": "atmp_001",
  "sessionId": "sess_abc",
  "gitCommitHash": "abc123def456",
  "messageCount": 12,
  "summary": "Authentication module implemented",
  "createdAt": 1710000042000
}
```

---

### 7. Shells

Background shell processes per project.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `projectId` | TEXT | NOT NULL, FK → projects.id | CASCADE delete |
| `attemptId` | TEXT | FK → attempts.id, nullable | SET NULL on delete |
| `command` | TEXT | NOT NULL | Shell command |
| `cwd` | TEXT | NOT NULL | Working directory |
| `pid` | INTEGER | | OS process ID |
| `status` | TEXT | NOT NULL, DEFAULT 'running' | Enum: running, stopped, crashed |
| `exitCode` | INTEGER | | Process exit code |
| `exitSignal` | TEXT | | SIGTERM, SIGKILL, etc. |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |
| `stoppedAt` | INTEGER | | When process stopped |

**Indexes:**
- `idx_shells_project` on `(projectId, status)`

**Foreign Keys:**
- `projectId` → `projects.id` (CASCADE delete)
- `attemptId` → `attempts.id` (SET NULL delete)

**Example:**
```json
{
  "id": "shell_001",
  "projectId": "proj_abc123xyz",
  "attemptId": "atmp_001",
  "command": "npm run build",
  "cwd": "/home/user/my-app",
  "pid": 12345,
  "status": "completed",
  "exitCode": 0,
  "createdAt": 1710000000000,
  "stoppedAt": 1710000010000
}
```

---

### 8. Subagents

Workflow agent tracking per attempt.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `attemptId` | TEXT | NOT NULL | FK to attempts.id |
| `type` | TEXT | NOT NULL | Agent type/category |
| `name` | TEXT | | Display name |
| `parentId` | TEXT | | Parent agent ID for hierarchy |
| `teamName` | TEXT | | Team/group name |
| `status` | TEXT | NOT NULL | Enum: in_progress, completed, failed, orphaned |
| `error` | TEXT | | Error message if failed |
| `startedAt` | INTEGER | | Unix milliseconds |
| `completedAt` | INTEGER | | Unix milliseconds |
| `durationMs` | INTEGER | | Execution duration |
| `depth` | INTEGER | NOT NULL, DEFAULT 0 | Nesting level in hierarchy |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_subagents_attempt` on `(attemptId)`

**Example:**
```json
{
  "id": "subagent_001",
  "attemptId": "atmp_001",
  "type": "researcher",
  "name": "Code analyzer",
  "status": "completed",
  "startedAt": 1710000000000,
  "completedAt": 1710000030000,
  "durationMs": 30000,
  "depth": 1,
  "createdAt": 1710000000000
}
```

---

### 9. Agent Factory Plugins

Skills, commands, agents, and agent sets registry.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `type` | TEXT | NOT NULL | Enum: skill, command, agent, agent_set |
| `name` | TEXT | NOT NULL | Plugin name |
| `description` | TEXT | | Plugin description |
| `sourcePath` | TEXT | | Filesystem path to source |
| `storageType` | TEXT | NOT NULL, DEFAULT 'local' | Enum: local, imported, external |
| `agentSetPath` | TEXT | | Path to agent set file |
| `metadata` | TEXT | | JSON metadata |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |
| `updatedAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- Primary key on `id`

**Example:**
```json
{
  "id": "plugin_auth_jwt",
  "type": "skill",
  "name": "JWT Authentication",
  "description": "JWT token generation and validation",
  "sourcePath": "/home/user/.claude/skills/auth-jwt",
  "storageType": "local",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

---

### 10. Project Plugins

Many-to-many: projects to plugins relationship.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `projectId` | TEXT | NOT NULL, FK → projects.id | CASCADE delete |
| `pluginId` | TEXT | NOT NULL, FK → agentFactoryPlugins.id | CASCADE delete |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | Whether plugin is active |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_project_plugins` on `(projectId, pluginId)`

**Foreign Keys:**
- `projectId` → `projects.id` (CASCADE delete)
- `pluginId` → `agentFactoryPlugins.id` (CASCADE delete)

**Example:**
```json
{
  "id": "pp_001",
  "projectId": "proj_abc123xyz",
  "pluginId": "plugin_auth_jwt",
  "enabled": true,
  "createdAt": 1710000000000
}
```

---

### 11. Plugin Dependencies

Track package and plugin dependencies.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `pluginId` | TEXT | NOT NULL, FK → agentFactoryPlugins.id | CASCADE delete |
| `dependencyType` | TEXT | NOT NULL | Enum: python, npm, system, skill, agent |
| `spec` | TEXT | NOT NULL | Version spec or package name |
| `pluginDependencyId` | TEXT | FK → agentFactoryPlugins.id, nullable | For plugin-on-plugin deps |
| `installed` | BOOLEAN | NOT NULL, DEFAULT false | Installation status |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_plugin_deps` on `(pluginId)`
- `idx_plugin_depends_on` on `(pluginDependencyId)`

**Foreign Keys:**
- `pluginId` → `agentFactoryPlugins.id` (CASCADE delete)
- `pluginDependencyId` → `agentFactoryPlugins.id` (SET NULL delete)

**Example:**
```json
{
  "id": "dep_001",
  "pluginId": "plugin_auth_jwt",
  "dependencyType": "npm",
  "spec": "jsonwebtoken@^9.0.0",
  "installed": true,
  "createdAt": 1710000000000
}
```

---

### 12. Plugin Dependency Cache

Cache resolved dependency trees and install scripts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | nanoid generated |
| `pluginId` | TEXT | FK → agentFactoryPlugins.id, nullable | CASCADE delete |
| `sourcePath` | TEXT | | Path to plugin source |
| `sourceHash` | TEXT | | Content hash of source |
| `type` | TEXT | NOT NULL | Enum: skill, command, agent |
| `libraryDeps` | TEXT | | JSON array of library deps |
| `pluginDeps` | TEXT | | JSON array of plugin deps |
| `installScriptNpm` | TEXT | | npm install command |
| `installScriptPnpm` | TEXT | | pnpm install command |
| `installScriptYarn` | TEXT | | yarn install command |
| `installScriptPip` | TEXT | | pip install command |
| `installScriptPoetry` | TEXT | | poetry install command |
| `installScriptCargo` | TEXT | | cargo install command |
| `installScriptGo` | TEXT | | go install command |
| `dockerfile` | TEXT | | Generated Dockerfile |
| `depth` | INTEGER | NOT NULL, DEFAULT 0 | Max nesting depth |
| `hasCycles` | BOOLEAN | NOT NULL, DEFAULT false | Circular dependency detected |
| `resolvedAt` | INTEGER | NOT NULL | When cache was generated |
| `createdAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- `idx_cache_plugin` on `(pluginId)`
- `idx_cache_source` on `(sourcePath)`

**Foreign Keys:**
- `pluginId` → `agentFactoryPlugins.id` (CASCADE delete)

**Example:**
```json
{
  "id": "cache_001",
  "pluginId": "plugin_auth_jwt",
  "sourcePath": "/home/user/.claude/skills/auth-jwt",
  "sourceHash": "abc123def456",
  "type": "skill",
  "libraryDeps": "[\"jsonwebtoken\"]",
  "pluginDeps": "[]",
  "installScriptNpm": "npm install jsonwebtoken@^9.0.0",
  "hasCycles": false,
  "resolvedAt": 1710000000000,
  "createdAt": 1710000000000
}
```

---

### 13. App Settings

Global application settings.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `key` | TEXT | PRIMARY KEY | Setting identifier |
| `value` | TEXT | NOT NULL | Setting value (JSON serialized) |
| `updatedAt` | INTEGER | NOT NULL, DEFAULT `Date.now()` | Unix milliseconds |

**Indexes:**
- Primary key on `key`

**Common Keys:**
- `locale` — UI language (en, de, es, etc.)
- `theme` — light or dark mode
- `autoSaveInterval` — Save delay in milliseconds

**Example:**
```json
{
  "key": "locale",
  "value": "\"en\"",
  "updatedAt": 1710000000000
}
```

---

## Relationships Diagram

```
projects
  ├─ tasks
  │  ├─ attempts
  │  │  ├─ attemptLogs
  │  │  ├─ attemptFiles
  │  │  ├─ checkpoints
  │  │  └─ subagents
  │  └─ checkpoints
  └─ shells
  └─ projectPlugins

agentFactoryPlugins
  ├─ projectPlugins → projects
  ├─ pluginDependencies
  │  └─ pluginDependencyId (self-ref)
  └─ pluginDependencyCache

appSettings (singleton table)
```

---

## Constraints & Cascades

| Relationship | On Delete |
|--------------|-----------|
| project → tasks | CASCADE |
| tasks → attempts | CASCADE |
| tasks → checkpoints | CASCADE |
| tasks → shells | CASCADE |
| attempts → attemptLogs | CASCADE |
| attempts → attemptFiles | CASCADE |
| attempts → checkpoints | CASCADE |
| attempts → subagents | CASCADE |
| attempts → shells | SET NULL |
| projects → projectPlugins | CASCADE |
| plugins → projectPlugins | CASCADE |
| plugins → pluginDependencies | CASCADE |
| plugins → pluginDependencyCache | CASCADE |
| pluginDependencies → self-ref | SET NULL |

---

## Indexes Summary

**Composite Indexes** (for query optimization):
- `idx_tasks_project` — Query tasks by project/status/position
- `idx_attempts_task` — Query attempts by task/date
- `idx_logs_attempt` — Stream logs from attempt
- `idx_checkpoints_task` — List checkpoints chronologically
- `idx_shells_project` — Query shells by project/status
- `idx_subagents_attempt` — Trace subagent hierarchy
- `idx_project_plugins` — Check active plugins per project
- `idx_plugin_deps` — Resolve plugin dependencies
- `idx_plugin_depends_on` — Find dependent plugins
- `idx_cache_plugin` — Lookup cache by plugin
- `idx_cache_source` — Lookup cache by source path

---

## Type Definitions

All tables export TypeScript types via `typeof table.$inferSelect` and `typeof table.$inferInsert`.

**Example Usage:**
```typescript
import type { Task, NewTask, Attempt } from '@/lib/db/schema';

const task: Task = {
  id: 'task_123',
  projectId: 'proj_abc',
  // ... all fields required
};

const newTask: NewTask = {
  projectId: 'proj_abc',
  title: 'My task'
  // ... only required fields
};
```

---

## Migration Workflow

When adding a column:

1. **Edit Drizzle Schema** (`src/lib/db/schema.ts` or agentic-sdk equivalent):
   ```typescript
   myNewColumn: integer('my_new_column').notNull().default(0),
   ```

2. **Generate Drizzle Migration**:
   ```bash
   pnpm db:generate
   ```

3. **Add ALTER TABLE in initDb()** (with try-catch for existing DBs):
   ```typescript
   try {
     sqlite.exec('ALTER TABLE my_table ADD COLUMN my_new_column INTEGER NOT NULL DEFAULT 0');
   } catch (e: any) {
     if (!e.message?.includes('duplicate column')) throw e;
   }
   ```

4. **Test** with both fresh install and existing database restore.

---

## Backup & Recovery

SQLite database file: `./data/app.db` (or path in `AGENTIC_SDK_DATA_DIR`)

**Backup:**
```bash
cp data/app.db data/app.db.backup
```

**WAL Mode** — Enabled for concurrent access:
- `app.db` — Main file
- `app.db-wal` — Write-ahead log
- `app.db-shm` — Shared memory for locking

Keep all three files when backing up.
