# Code Standards & Conventions

## File Naming & Organization

### Naming Convention
Use **kebab-case** for all file names. Make names descriptive and self-documenting so that file names alone convey purpose when listed by tools like Grep or Glob.

**Good Examples:**
- `use-git-actions.ts` — Custom hook for Git operations
- `conversation-view-utility-functions.ts` — Shared utilities for conversation display
- `file-tab-content-toolbar.tsx` — Toolbar sub-component for file tabs
- `git-panel-commit-form.tsx` — Commit form within git panel
- `timing-safe-compare.ts` — Utility for secure string comparison
- `plugin-detail-dialog-tab-sub-components.tsx` — Tab sub-components for plugin dialog
- `shell-manager-process-monitor.ts` — Process monitoring module within shell manager

**Bad Examples:**
- `utils.ts` — Too vague
- `helpers.ts` — Unclear purpose
- `index.ts` — Ambiguous
- `temp.ts` — Temporary naming is not acceptable

### File Size Limit
Keep individual files under **200 lines of code**. When approaching this limit, split into focused modules.

**Modularization Strategy:**
1. Identify logical boundaries (functions, classes, concerns)
2. Extract utilities into separate `*-utility-functions.ts` or `*-utils.ts` files
3. For large components, split into sub-components: `component-name-sub-section.tsx`
4. Extract custom hooks into `use-*.ts` files
5. Create service modules: `*-service.ts` or `create-*-service.ts`

**Examples of Proper Splitting:**
- Large component → `component-name.tsx` + `component-name-toolbar.tsx` + `use-component-state.ts`
- Modal with complex form → `modal-name.tsx` + `modal-name-form.tsx` + `modal-name-utils.ts`
- Service with many methods → `service-name-main.ts` + `service-name-helpers.ts`

---

## TypeScript Conventions

### Type Declarations
- Export types alongside implementations
- Use `interface` for object contracts; use `type` for unions and primitives
- Avoid `any`; use `unknown` and narrow types

```typescript
// Good
interface TaskState {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
}

type TaskStatus = 'todo' | 'in_progress' | 'done';

// Avoid
let data: any = { ... };  // Don't do this
```

### Import Aliases
Use `@/` for main app imports (configured in `tsconfig.json`):
```typescript
import { useStore } from '@/stores/my-store';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
```

For agentic-sdk imports, use the package name:
```typescript
import { createTaskService } from '@agentic-sdk/services/task-crud-and-reorder-service';
```

### Null Safety
Prefer optional chaining and nullish coalescing:
```typescript
const name = user?.profile?.name ?? 'Unknown';
if (object?.method?.()) { /* ... */ }
```

---

## React Component Patterns

### Component Structure (React 19)
All components are **functional components** with hooks. No class components.

```typescript
'use client';  // Add for client-side components

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  taskId: string;
  onSuccess?: () => void;
}

export function MyComponent({ taskId, onSuccess }: MyComponentProps) {
  const t = useTranslations();
  const [state, setState] = useState('');

  useEffect(() => {
    // Side effects here
  }, [taskId]);

  return (
    <div>
      <h2>{t('my_component.title')}</h2>
      <Button onClick={() => setState('clicked')}>{state}</Button>
    </div>
  );
}
```

### Props Pattern
Always define and export `Props` interface:
```typescript
interface CardProps {
  title: string;
  description?: string;
  onClick?: () => void;
}

export function Card({ title, description, onClick }: CardProps) {
  // ...
}
```

### Internationalization (i18n)
Use `next-intl` hook in all user-facing text:
```typescript
const t = useTranslations();
return <div>{t('namespace.key')}</div>;
```

Translation files: `./locales/{language}.json` (English, German, Spanish, French, Japanese, Korean, Vietnamese, Chinese)

### Composition Over Inheritance
Prefer splitting large components into smaller sub-components:
```typescript
// Instead of:
function ComplexPanel() {
  // 300 lines of rendering, state, effects...
}

// Do this:
function Panel() {
  return (
    <>
      <PanelHeader />
      <PanelContent />
      <PanelFooter />
    </>
  );
}
```

### Custom Hooks
Extract stateful logic into `use-*.ts` hooks:
```typescript
// use-git-actions.ts
export function useGitActions(projectPath: string) {
  const [status, setStatus] = useState('');

  const commit = async (message: string) => { /* ... */ };
  const stage = async (files: string[]) => { /* ... */ };

  return { status, commit, stage };
}

// Usage in component
const { status, commit } = useGitActions(projectId);
```

### Radix UI + shadcn/ui Pattern
Components built with Radix primitives and Tailwind styling:
```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function MyDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>
        <Input placeholder="Enter text" />
        <Button>Submit</Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Zustand Store Patterns

### Store Creation
Create a typed store with clear actions:
```typescript
import { create } from 'zustand';

interface MyStoreState {
  count: number;
  items: string[];
  increment: () => void;
  addItem: (item: string) => void;
  reset: () => void;
}

export const useMyStore = create<MyStoreState>((set) => ({
  count: 0,
  items: [],
  increment: () => set((state) => ({ count: state.count + 1 })),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  reset: () => set({ count: 0, items: [] }),
}));
```

### Usage in Components
```typescript
function Counter() {
  const { count, increment } = useMyStore();
  return <button onClick={increment}>{count}</button>;
}
```

### Store Organization
- Store per domain (e.g., `agent-factory-store.ts`, `sidebar-store.ts`)
- UI state separate from business state
- Avoid nested selectors; use flat structure
- Persist state to localStorage when needed:
```typescript
import { persist } from 'zustand/middleware';

export const useMyStore = create<State>(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'my-store-storage' }
  )
);
```

---

## API Route Conventions

### Next.js API Routes (src/app/api/)
Located in `src/app/api/[route]/route.ts`. Use standard HTTP methods:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createTaskService } from '@agentic-sdk/services/task-crud-and-reorder-service';

const taskService = createTaskService(db);

// GET /api/tasks/[id] - Fetch a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await taskService.getById(id);

    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await taskService.create(body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

### Response Format
Always return JSON with consistent structure:
```typescript
// Success
{ data: {...} }  or  { task: {...} }

// Error
{ error: 'Error message', details?: {...} }
```

### Status Codes
- `200` — OK (GET, PUT, PATCH)
- `201` — Created (POST)
- `204` — No Content (DELETE)
- `400` — Bad Request (invalid input)
- `401` — Unauthorized (missing/invalid API key)
- `404` — Not Found
- `500` — Server Error

---

## Database Conventions

### Dual-Update Pattern (CRITICAL)
When modifying the database schema, **always update both locations**:

1. **`src/lib/db/schema.ts`** — Drizzle ORM schema (source of truth):
```typescript
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  newColumn: integer('new_column').notNull().default(0),
});
```

2. **`src/lib/db/index.ts`** — Runtime `initDb()` function (for existing databases):
```typescript
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks ( /* ... */ );

    // Add new column to existing tables
    try {
      sqlite.exec('ALTER TABLE tasks ADD COLUMN new_column INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column already exists, ignore
    }
  `);
}
```

### Query Patterns
Use Drizzle ORM for type-safe queries:
```typescript
import { eq } from 'drizzle-orm';

// Select
const task = await db.query.tasks.findFirst({
  where: eq(schema.tasks.id, taskId),
});

// Insert
await db.insert(schema.tasks).values({ id, title, status: 'todo' });

// Update
await db.update(schema.tasks)
  .set({ status: 'done' })
  .where(eq(schema.tasks.id, taskId));

// Delete
await db.delete(schema.tasks)
  .where(eq(schema.tasks.id, taskId));
```

### Indexes
Add indexes on frequently queried columns:
```typescript
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
```

### Transactions
Use transactions for multi-step operations:
```typescript
const result = db.transaction(() => {
  const task = db.insert(schema.tasks).values({ /* ... */ });
  const attempt = db.insert(schema.attempts).values({ /* ... */ });
  return { task, attempt };
})();
```

---

## Error Handling Patterns

### Try-Catch in Async Functions
Wrap all async operations:
```typescript
export async function fetchData(id: string) {
  try {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;  // Re-throw or return fallback
  }
}
```

### API Error Responses
Return proper HTTP status codes with detailed messages:
```typescript
if (!task) {
  return NextResponse.json(
    { error: 'Task not found', taskId },
    { status: 404 }
  );
}

if (apiKey && !safeCompare(providedKey, apiKey)) {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Valid API key required' },
    { status: 401 }
  );
}
```

### Logging Errors
Use Pino logger with context:
```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('MyModule');

try {
  // operation
} catch (error) {
  log.error({ error }, 'Operation failed');
}
```

---

## Logging Standards

### Logger Creation
Create per-module loggers with descriptive names:
```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentManager');
const log = createLogger('TaskService');
const log = createLogger('GitPanel');
```

### Log Levels
- **debug** — Detailed info for development (default in dev mode)
- **info** — General information (startup events, config)
- **warn** — Warning conditions (deprecated features, unusual states)
- **error** — Error conditions (exceptions, failures)

```typescript
log.debug({ taskId, status }, 'Task status updated');
log.info({ port, hostname }, 'Server started');
log.warn({ path }, 'Path traversal detected, rejecting');
log.error({ error }, 'Database connection failed');
```

### Environment Configuration
```bash
# Development (default)
LOG_LEVEL=debug

# Production
LOG_LEVEL=warn
```

---

## Security Standards

### Path Validation
Prevent path traversal attacks:
```typescript
import path from 'path';

function validatePath(userPath: string, baseDir: string): boolean {
  const resolved = path.resolve(baseDir, userPath);
  const relative = path.relative(baseDir, resolved);
  // Ensure relative path doesn't escape baseDir
  return !relative.startsWith('..');
}
```

### Timing-Safe Comparison
Use `safeCompare()` for sensitive string matching:
```typescript
import { safeCompare } from '@/lib/timing-safe-compare';

if (!safeCompare(providedKey, apiAccessKey)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Command Injection Prevention
Never use shell interpolation for user input:
```typescript
// Bad
exec(`git commit -m "${userMessage}"`);  // Vulnerable to injection

// Good
spawn('git', ['commit', '-m', userMessage]);  // Safe - no shell interpretation
```

### ZIP File Safety
Validate archive paths to prevent Zip Slip:
```typescript
for (const entry of zip.getEntries()) {
  const entryPath = path.join(extractDir, entry.entryName);
  if (!entryPath.startsWith(extractDir)) {
    throw new Error('Zip Slip attack detected');
  }
}
```

### CORS Configuration
Use explicit allowlist (not wildcard):
```typescript
// Bad
cors({ origin: '*' });  // Allows any origin

// Good
cors({
  origin: ['http://localhost:3000', 'https://example.com'],
});
```

---

## Git & Commit Conventions

### Commit Message Format
Follow **Conventional Commits**:
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`

**Examples:**
```
feat(editor): add multi-tab support
fix(git): handle merge conflicts correctly
refactor(components): split file-tab-content into sub-modules
docs(api): update endpoint documentation
test(tasks): add integration tests for task creation
chore(deps): update typescript to 5.9
```

### Pre-commit Checklist
1. Run linting: `pnpm eslint src/ --fix`
2. Run tests: `pnpm test` (ensure all pass)
3. Verify file size limits (no file >200 LOC)
4. Check for sensitive data (no .env, API keys, credentials)
5. Write clear, focused commit message

---

## Dependencies Management

### Critical Rule: NO devDependencies
**All production code imports MUST come from `dependencies` only.** DevDependencies are not installed when users install this package via npm.

```json
{
  "dependencies": {
    "react": "^19.2.3",
    "next": "^16.1.6",
    "typescript": "^5.9.3"
  },
  "devDependencies": {}  // Keep empty
}
```

### Validation
Script `scripts/check-dependencies.sh` validates this rule before builds. All imports from packages must be in `dependencies`.

### When Adding Packages
```bash
pnpm add package-name          # Adds to dependencies
pnpm add --save package-name   # Same as above
pnpm add -D package-name       # NEVER USE - adds to devDependencies
```

---

## Code Quality Checklist

Before submitting code:
- [ ] File names use kebab-case and are self-documenting
- [ ] No file exceeds 200 lines (split if needed)
- [ ] All TypeScript types properly annotated
- [ ] All `any` types replaced with `unknown` or specific types
- [ ] Error handling with try-catch and proper HTTP status codes
- [ ] Database schema changes update both schema.ts and initDb()
- [ ] Path validation prevents traversal attacks
- [ ] API keys use timing-safe comparison
- [ ] Commands use spawn, not exec with interpolation
- [ ] All user-facing text uses i18n translation
- [ ] Zustand stores properly typed with actions
- [ ] Components split into <200 LOC modules
- [ ] Custom hooks extracted for complex state
- [ ] Logging includes context and appropriate levels
- [ ] No devDependencies in production code imports
- [ ] Conventional commit message format
- [ ] Tests pass locally before push

---

## Related Documentation

- [Project Overview](./project-overview-pdr.md) — Features, tech stack, requirements
- [System Architecture](./system-architecture.md) — Component design, API routes, database schema
- [Project Roadmap](./project-roadmap.md) — Version history, planned features

