# Database Runtime Guide

This document explains how SQLite is used at runtime in this repository, why you may see multiple database files, and why their table lists can differ.

## Summary

There are currently multiple SQLite entry points in the codebase:

- `claude-ws` web app / Next.js server uses `claude-ws.db`
- `agentic-sdk` headless Fastify backend uses `agentic-sdk.db`
- legacy CLI database helper also uses `claude-ws.db`, but only initializes a partial schema

This means two things are true at the same time:

- The codebase is moving toward a shared schema definition
- The actual runtime database files are still not fully unified

## Database Files By Runtime

### 1. Next.js web app

Main runtime:

- [server.ts](/mnt/f/Project/claude-ws/server.ts)
- [src/lib/db/index.ts](/mnt/f/Project/claude-ws/src/lib/db/index.ts)

Database path logic:

- `DATA_DIR` if set
- otherwise `{CLAUDE_WS_USER_CWD or process.cwd()}/data`

Database filename:

- `claude-ws.db`

Relevant code:

- [src/lib/db/index.ts:13](/mnt/f/Project/claude-ws/src/lib/db/index.ts#L13)
- [src/lib/db/index.ts:14](/mnt/f/Project/claude-ws/src/lib/db/index.ts#L14)

Typical result when running from this repository:

```text
<project-root>/data/claude-ws.db
```

### 2. Headless `agentic-sdk`

Main runtime:

- [packages/agentic-sdk/src/app-factory.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/app-factory.ts)
- [packages/agentic-sdk/src/db/database-connection.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-connection.ts)

Database path logic:

- `AGENTIC_SDK_DATA_DIR` if set
- otherwise `DATA_DIR` if set
- otherwise `<project-root>/data`

Database filename:

- `agentic-sdk.db`

Relevant code:

- [packages/agentic-sdk/src/config/env-config.ts:28](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/config/env-config.ts#L28)
- [packages/agentic-sdk/src/config/env-config.ts:30](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/config/env-config.ts#L30)
- [packages/agentic-sdk/src/db/database-connection.ts:22](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-connection.ts#L22)

Typical result:

```text
<project-root>/data/agentic-sdk.db
```

### 3. Legacy CLI / daemon helper

Main runtime:

- [bin/lib/config.js](/mnt/f/Project/claude-ws/bin/lib/config.js)
- [bin/lib/db.js](/mnt/f/Project/claude-ws/bin/lib/db.js)

Database path logic:

- CLI flags
- or `DATA_DIR`
- or config file
- or default `~/.claude-ws/data`

Database filename:

- `claude-ws.db`

Relevant code:

- [bin/lib/config.js:20](/mnt/f/Project/claude-ws/bin/lib/config.js#L20)
- [bin/lib/db.js:19](/mnt/f/Project/claude-ws/bin/lib/db.js#L19)

Typical result:

```text
~/.claude-ws/data/claude-ws.db
```

On Windows this usually becomes:

```text
C:\Users\<user>\.claude-ws\data\claude-ws.db
```

## Why Table Lists Can Differ

If you inspect two files and see very different tables, that is expected with the current runtime split.

### Full schema in `agentic-sdk.db`

The headless backend initializes a broad schema, including:

- `projects`
- `tasks`
- `attempts`
- `attempt_logs`
- `attempt_files`
- `checkpoints`
- `shells`
- `subagents`
- `agent_factory_plugins`
- `project_plugins`
- `plugin_dependencies`
- `plugin_dependency_cache`
- `app_settings`

Relevant code:

- [packages/agentic-sdk/src/db/database-init-tables.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-init-tables.ts)

### Partial schema in some `claude-ws.db` files

Some `claude-ws.db` files only contain a subset of tables, especially when they were created by the legacy CLI helper.

The legacy initializer in [bin/lib/db.js](/mnt/f/Project/claude-ws/bin/lib/db.js) only creates:

- `projects`
- `tasks`

Relevant code:

- [bin/lib/db.js:29](/mnt/f/Project/claude-ws/bin/lib/db.js#L29)

So if you inspect:

```text
C:\Users\<user>\.claude-ws\data\claude-ws.db
```

and only see `projects` and `tasks`, that usually means the file was created by the legacy CLI path, not by the newer shared runtime path.

## Shared Schema vs Real Database

This repository currently has a split between schema definition and runtime initialization.

### Shared schema definition

[src/lib/db/schema.ts](/mnt/f/Project/claude-ws/src/lib/db/schema.ts) is a shim that re-exports the schema from:

- [packages/agentic-sdk/src/db/database-schema.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-schema.ts)

That means the TypeScript/Drizzle schema is intended to be shared.

### Runtime initialization is still separate

The actual database creation and migration logic still lives in separate places:

- web app: [src/lib/db/index.ts](/mnt/f/Project/claude-ws/src/lib/db/index.ts)
- headless backend: [packages/agentic-sdk/src/db/database-init-tables.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-init-tables.ts)
- legacy CLI helper: [bin/lib/db.js](/mnt/f/Project/claude-ws/bin/lib/db.js)

This is the main reason the real SQLite files can diverge.

## Common Inspection Scenarios

### Scenario 1: `agentic-sdk.db` has many tables, `claude-ws.db` has only two

Interpretation:

- `agentic-sdk.db` was initialized by the headless Fastify backend
- `claude-ws.db` was initialized by the old CLI helper

This is the most common explanation when you see:

- `agentic-sdk.db` with full schema
- `claude-ws.db` with only `projects` and `tasks`

### Scenario 2: both DBs are in the same folder, but still differ

Interpretation:

- they are different files
- they are not auto-synchronized
- they may have been created by different runtimes at different times

Sharing a directory does not mean sharing one database.

### Scenario 3: app behavior looks inconsistent across UI and headless mode

Interpretation:

- one runtime may be reading from `claude-ws.db`
- another may be reading from `agentic-sdk.db`

In that case, project/task/attempt data will appear inconsistent because the data is actually stored separately.

## Current Source Of Truth

For schema shape, the intended source of truth is:

- [packages/agentic-sdk/src/db/database-schema.ts](/mnt/f/Project/claude-ws/packages/agentic-sdk/src/db/database-schema.ts)

For runtime behavior, there is not yet a single unified source of truth because database bootstrap is still split across multiple entry points.

## Recommended Interpretation For Maintainers

When debugging database issues, answer these questions first:

1. Which runtime created this file?
2. What exact path is being used?
3. Is the file `claude-ws.db` or `agentic-sdk.db`?
4. Was it initialized by the legacy CLI helper or by the newer runtime code?

Without those answers, table-list comparisons are often misleading.

## Practical Guidance

If you want consistent behavior during development:

- decide which runtime you are testing
- make sure you know its `DATA_DIR`
- inspect the exact file that runtime opens
- avoid assuming `claude-ws.db` and `agentic-sdk.db` contain the same data

If you want a single database architecture in the future, the codebase should be refactored so that:

- both web and headless runtimes use one shared DB bootstrap module
- both runtimes agree on one database filename
- the legacy `bin/lib/db.js` initializer is removed or upgraded

## Related Documents

- [docs/database-schema.md](/mnt/f/Project/claude-ws/docs/database-schema.md)
- [docs/system-architecture.md](/mnt/f/Project/claude-ws/docs/system-architecture.md)
- [docs/agentic-sdk.md](/mnt/f/Project/claude-ws/docs/agentic-sdk.md)
