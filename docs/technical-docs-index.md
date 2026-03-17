# Technical Documentation Index

Claude Workspace v0.3.100 comprehensive technical documentation. Start here for navigation and overview.

---

## Quick Navigation

### 1. API Reference
**File:** [`docs/api-reference.md`](./api-reference.md) (1,248 lines)

Complete REST API specification for both Next.js and Fastify servers. Covers authentication, all 13 endpoint domains, request/response schemas, and error handling.

**Topics:**
- Authentication (x-api-key header, timing-safe comparison)
- Projects, Tasks, Attempts, Checkpoints CRUD
- Files, Search, Git operations
- Shells, Uploads, Agent Factory endpoints
- Settings, Auth, Tunnel, Filesystem endpoints
- Error codes and status handling

**Use When:** Integrating with Claude Workspace API, building custom clients

---

### 2. Database Schema
**File:** [`docs/database-schema.md`](./database-schema.md) (651 lines)

SQLite schema documentation with all 13 tables, columns, types, constraints, relationships, and indexes. Includes dual migration strategy for new and existing databases.

**Tables:**
- Projects, Tasks, Attempts, Attempt Logs, Attempt Files
- Checkpoints, Shells, Subagents
- Agent Factory Plugins, Project Plugins, Plugin Dependencies
- Plugin Dependency Cache, App Settings

**Topics:**
- Schema initialization (Drizzle + runtime ALTER TABLE)
- Foreign key constraints and cascades
- Composite indexes for query optimization
- Type definitions and backup/recovery

**Use When:** Understanding data model, designing migrations, querying database

---

### 3. Agentic SDK Integration
**File:** [`docs/agentic-sdk-integration.md`](./agentic-sdk-integration.md) (635 lines)

Headless Fastify backend setup and usage. Deploy Claude agents without UI in CI/CD pipelines, automation, or custom integrations.

**Topics:**
- What is it and why (headless deployment, automation)
- Setup: development and production modes
- Environment configuration (14 variables)
- Complete architecture (7 layers)
- Agent lifecycle: Create → Stream → Answer → Cancel
- 4 detailed usage examples
- SSE streaming format
- Deployment (Docker, systemd, PM2)
- Graceful shutdown and health checks

**Use When:** Running agents programmatically, CI/CD integration, custom frontends

---

### 4. Real-Time Events
**File:** [`docs/real-time-events.md`](./real-time-events.md) (753 lines)

Socket.io events for main app and SSE for agentic-sdk. Real-time bidirectional communication patterns.

**Topics:**
- Socket.io event families (attempts, questions, inline edits, shells)
- SSE stream format (stdout, stderr, json, done events)
- Client integration (React hooks, EventSource API)
- Room management (isolation patterns)
- Reconnection handling (5-minute state preservation)
- Event ordering guarantees

**Use When:** Building real-time features, streaming output, interactive workflows

---

### 5. Internationalization Guide
**File:** [`docs/i18n-guide.md`](./i18n-guide.md) (675 lines)

Complete i18n system with 8 supported languages. Locale detection, persistence, and adding new languages.

**Supported Languages:**
- de (German), en (English), es (Spanish)
- fr (French), ja (Japanese), ko (Korean)
- vi (Vietnamese), zh (Chinese)

**Topics:**
- Architecture (next-intl, middleware, Zustand store)
- useTranslations() hook patterns
- Locale detection priority (URL > localStorage > Accept-Language)
- Adding new language (5-step process)
- Translation file structure
- Client-side language switcher
- Testing and troubleshooting

**Use When:** Localizing UI, adding new languages, understanding locale detection

---

### 6. State Management
**File:** [`docs/state-management.md`](./state-management.md) (990 lines)

Zustand store architecture with all 24 stores organized by domain. Patterns, persistence, cross-store communication.

**Store Inventory:**
- Task & Project Management (5 stores)
- UI Layout (5 stores)
- Agent & AI (5 stores)
- Editor (1 store)
- Terminal & Shell (2 stores)
- Settings (4 stores)
- Agent Factory (2 stores)

**Topics:**
- Core Zustand patterns
- Persistence strategy (8 persisted, 14 temporary)
- Selective subscription (selector specificity)
- Cross-store coordination
- Socket.io integration
- Performance optimization
- Debugging and testing

**Use When:** Understanding state flow, adding features, optimizing performance

---

### 7. Troubleshooting
**File:** [`docs/troubleshooting/claude-cli.md`](./troubleshooting/claude-cli.md)

Solutions for common issues related to Claude Code CLI detection and initialization.

**Topics:**
- Non-responsive chat (CLAUDECODE detection fix)
- `spawn EINVAL` on Windows (PATH and shell fixes)
- Reducing noise from Dotenv logs

**Use When:** Fixing CLI connection issues or cleaning up terminal output.

---

### 8. Preview Dev Server
**File:** [`docs/features/preview-dev-server.md`](./features/preview-dev-server.md)

Detailed documentation of the integrated dev server preview feature. Covers the proxy architecture, HTML manipulation, and integrated UI design.

**Topics:**
- Proxy architecture and Port handling
- Base Tag Injection for relative paths
- Referer Hijacking for framework assets
- Integrated Workspace UI (Portals & Full-bleed)
- Device simulation and Auto-start mechanism

**Use When:** Debugging preview issues, understanding proxy routing, extending UI features

## Quick Reference Tables

### API Domains
| Domain | Endpoints | File |
|--------|-----------|------|
| Projects | 5 (GET/POST/PUT/DELETE) | api-reference.md |
| Tasks | 8 (CRUD + stats + conversation) | api-reference.md |
| Attempts | 6 (create/get/status/stream/cancel) | api-reference.md |
| Checkpoints | 4 (list/create/rewind/backfill) | api-reference.md |
| Files & Search | 7 (list/read/write/search) | api-reference.md |
| Git | 12 (status/log/commit/push/pull/diff) | api-reference.md |
| Shells | 3 (list/create/update) | api-reference.md |
| Uploads | 4 (list/upload/get/delete) | api-reference.md |
| Agent Factory | 8 (plugins CRUD + discover) | api-reference.md |
| Settings | 4 (get/update/verify) | api-reference.md |

### Database Tables
| Table | Purpose | Rows |
|-------|---------|------|
| projects | Workspace directories | 1-N |
| tasks | Kanban cards | 1-N per project |
| attempts | Agent executions | 1-N per task |
| attemptLogs | Streaming output | 1-N per attempt |
| checkpoints | Conversation snapshots | 1-N per task |
| shells | Background processes | 1-N per project |
| agentFactoryPlugins | Skills/commands registry | 1-N |
| projectPlugins | Plugin-project association | 1-N |
| pluginDependencies | Package dependencies | 1-N per plugin |

### Stores by Persistence
| Persisted (localStorage) | Temporary (RAM) |
|-------------------------|-----------------|
| task-store | attempt-store |
| panel-layout-store | running-tasks-store |
| sidebar-store | questions-store |
| right-sidebar-store | floating-windows-store |
| settings-ui-store | terminal-store |
| model-store | shell-store |
| locale-store | agent-factory-store |
| auth-store | inline-edit-store |
| | workflow-store |
| | interactive-command-store |

---

## Architecture Diagrams

### Request Flow (API → Database)
```
Client → Middleware (x-api-key auth) → Route Handler → Service Layer → Drizzle ORM → SQLite
```

### Real-Time Flow (Agent Execution)
```
Client → Socket.io/HTTP → Server → AgentManager → Claude SDK → Logs/Questions
         ↓
       Socket.emit('attempt:output')
       SSE: data: {type, content}
```

### Locale Detection Flow
```
URL Locale Prefix (/fr/tasks) →
  or localStorage (persist) →
    or Accept-Language Header →
      or Default Locale (en)
```

### State Flow (Task Selection)
```
User selects task → TaskStore.selectTask()
  → Updates selectedTaskId, selectedTask
  → Notifies FloatingWindowsStore.openWindow()
  → Notifies RightSidebarStore.setActiveTab()
  → Components re-render via selectors
```

---

## Integration Paths

### Use Case: Build Custom Dashboard
1. Read **API Reference** for endpoints
2. Check **State Management** for UI state patterns
3. Reference **Real-Time Events** for live updates
4. Use **Agentic SDK** for programmatic access

### Use Case: Add New Language
1. Follow **I18n Guide** (5-step process)
2. Create `locales/{code}.json`
3. Update `src/i18n/config.ts`
4. Test with URL prefix

### Use Case: Deploy in CI/CD
1. Read **Agentic SDK Integration** setup
2. Configure environment variables
3. Use example curl commands
4. Stream SSE events for output

### Use Case: Debug Data Issues
1. Check **Database Schema** relationships
2. Verify CASCADE/SET NULL constraints
3. Query with indexes listed in schema
4. Read **API Reference** for data shape

### Use Case: Optimize Performance
1. Check **State Management** selector specificity
2. Review **Real-Time Events** connection pooling
3. Reference **Database Schema** indexes
4. Use Zustand DevTools to trace re-renders

---

## Key Concepts Explained

### Timing-Safe Comparison
Prevents timing attacks on API key validation. Both Next.js middleware and Fastify use constant-time comparison instead of standard equality.
**Files:** `src/lib/api-auth.ts`, `middleware.ts`

### Dual Migration Strategy
- **Drizzle migrations** — Version-controlled schema changes
- **Runtime initDb()** — ALTER TABLE statements with try-catch for existing DBs
Ensures both fresh installs and upgraded databases work without errors.
**File:** `database-schema.md`

### Shared Code Strategy
Agentic SDK reuses 100% of database schema and services from main app. Single source of truth for data layer.
**Files:** `packages/agentic-sdk/src/db/`, `packages/agentic-sdk/src/services/`

### Event Isolation via Rooms
Socket.io rooms limit broadcast scope. Attempt output only sent to clients subscribed to `attempt:{attemptId}` room.
**File:** `real-time-events.md`

### Locale Detection Chain
Automatic detection with priority order: URL > localStorage > Accept-Language > default. Fully transparent to users.
**File:** `i18n-guide.md`

### Selector Specificity
Zustand subscriptions are granular. Component only re-renders when specifically selected state changes.
**File:** `state-management.md`

---

## File Statistics

| File | Lines | Size | Sections | Tables | Examples |
|------|-------|------|----------|--------|----------|
| api-reference.md | 1,248 | 19 KB | 15 domains | 12+ | 8+ |
| database-schema.md | 651 | 19 KB | 13 tables | 11 | 5 |
| agentic-sdk-integration.md | 635 | 16 KB | 14+ | 8+ | 12+ |
| real-time-events.md | 753 | 14 KB | 8 families | 5 | 15+ |
| i18n-guide.md | 675 | 14 KB | 12 sections | 4 | 18+ |
| state-management.md | 990 | 23 KB | 6 domains | 4 | 20+ |
| **TOTAL** | **4,952** | **105 KB** | **60+** | **44+** | **78+** |

---

## Standards & Best Practices

✓ **Markdown Format** — Consistent h1-h6 hierarchy, tables, code blocks
✓ **Naming Convention** — kebab-case with descriptive names
✓ **Line Limits** — All files under 1,250 lines (scannable)
✓ **Scannable Content** — Tables, bullet lists, code examples
✓ **Verification** — All patterns verified against source code
✓ **Examples** — Practical curl, TypeScript, React code samples
✓ **Cross-References** — Relative links between documentation files

---

## Contributing & Maintenance

### When Adding Features
- **New API endpoints** → Update `api-reference.md`
- **New database columns** → Update both `database-schema.md` AND migration code
- **New Socket events** → Update `real-time-events.md`
- **New Zustand store** → Update `state-management.md`
- **New language** → Update `i18n-guide.md`

### Documentation Review Checklist
- [ ] Code patterns verified against source
- [ ] All external references accurate
- [ ] Examples syntactically correct
- [ ] Tables properly formatted
- [ ] Cross-links valid
- [ ] No broken references

---

## Troubleshooting & Support

**Can't find API endpoint?**
→ Check `api-reference.md` (domains sorted alphabetically)

**Database migration failing?**
→ Read `database-schema.md` "Migration Workflow" section

**Real-time events not working?**
→ Check `real-time-events.md` "Troubleshooting" section

**Language switching broken?**
→ Review `i18n-guide.md` "Troubleshooting" section

**State not updating?**
→ See `state-management.md` "Common Mistakes" section

---

## Additional Resources

- **Main README:** `/README.md` — Project overview
- **Development Rules:** `$HOME/.claude/rules/development-rules.md` — Coding standards
- **API Auth Implementation:** `src/lib/api-auth.ts` — Timing-safe comparison
- **Socket.io Events:** `server.ts` (lines 130-700) — Event handlers
- **Translation Files:** `locales/*.json` — Language content
- **Store Implementations:** `src/stores/*.ts` — Zustand patterns

---

## Document Version

| Field | Value |
|-------|-------|
| Documentation Version | 1.0 |
| Claude Workspace Version | 0.3.100 |
| Last Updated | March 11, 2025 |
| Framework Versions | Next.js 16, React 19, Zustand 5, next-intl 4.8 |

---

**Start with the Quick Navigation section above, then dive into specific files based on your needs.**
