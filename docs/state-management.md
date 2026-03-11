# State Management

Claude Workspace uses Zustand for client-side state management. All state is reactive, persisted to localStorage where needed, and organized by domain.

## Overview

**Framework:** Zustand 5.x | **Persistence:** localStorage via `persist` middleware | **Scope:** Browser-only | **Total Stores:** 24

```
src/stores/
├── Task & Project Management (5)
│   ├── task-store.ts
│   ├── project-store.ts
│   ├── attempt-store.ts
│   ├── running-tasks-store.ts
│   └── questions-store.ts
├── UI Layout (5)
│   ├── panel-layout-store.ts
│   ├── sidebar-store.ts
│   ├── floating-windows-store.ts
│   ├── right-sidebar-store.ts
│   └── settings-ui-store.ts
├── Agent & AI (5)
│   ├── model-store.ts
│   ├── attachment-store.ts
│   ├── context-mention-store.ts
│   ├── workflow-store.ts
│   └── interactive-command-store.ts
├── Editor (1)
│   └── inline-edit-store.ts
├── Terminal & Shell (2)
│   ├── terminal-store.ts
│   └── shell-store.ts
├── Settings (4)
│   ├── auth-store.ts
│   ├── locale-store.ts
│   ├── project-settings-store.ts
│   └── tunnel-store.ts
└── Agent Factory (2)
    ├── agent-factory-store.ts
    └── agent-factory-ui-store.ts
```

---

## Core Patterns

### Basic Store Structure

```typescript
import { create } from 'zustand';

interface MyStore {
  count: number;
  increment: () => void;
  setCount: (n: number) => void;
}

export const useMyStore = create<MyStore>((set, get) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  setCount: (n) => set({ count: n }),
}));
```

### Store with Persistence

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useMyStore = create<MyStore>()(
  persist(
    (set, get) => ({ /* store implementation */ }),
    {
      name: 'my-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,  // Defer hydration to useEffect
    }
  )
);
```

### Using Stores in Components

```typescript
'use client';
import { useMyStore } from '@/stores/my-store';

export function Component() {
  const count = useMyStore((state) => state.count);
  const increment = useMyStore((state) => state.increment);
  return <button onClick={increment}>Count: {count}</button>;
}
```

### Selective Subscription (Performance)

```typescript
// Re-renders only when count changes
const count = useMyStore((state) => state.count);

// Combine selectors to avoid multiple subscriptions
const { count, increment } = useMyStore(
  (state) => ({ count: state.count, increment: state.increment })
);
```

### Cross-Store Communication

```typescript
// Use getState() to access other stores from actions
const selectTask = (id) => {
  set({ selectedTaskId: id });
  useFloatingWindowsStore.getState().openWindow('details');
};
```

---

## Store Domains

### Task & Project Management

#### task-store.ts — Kanban board tasks for selected project(s)

| State | Type |
|-------|------|
| `tasks` | `Task[]` |
| `selectedTaskId` / `selectedTask` | `string \| null` / `Task \| null` |
| `isCreatingTask` | `boolean` |
| `pendingAutoStartTask` / `Prompt` / `FileIds` | `string \| null` / `string \| null` / `string[] \| null` |

**Actions:** `setTasks`, `addTask`, `updateTask`, `deleteTask`, `deleteTasksByStatus`, `selectTask`
**API:** `fetchTasks(projectIds)`, `createTask(projectId, title, desc)`, `reorderTasks(taskId, status, pos)`, `updateTaskStatus(taskId, status)`
**Persistence:** Yes (`task-storage`) | **Used by:** Kanban board, task list, task details

#### project-store.ts — Available projects

| State | Type |
|-------|------|
| `projects` | `Project[]` |
| `selectedProjectId` / `selectedProject` | `string \| null` / `Project \| null` |
| `isLoadingProjects` | `boolean` |

**Actions:** `setProjects`, `selectProject`, `updateProject`
**API:** `fetchProjects()`, `createProject(name, path)`, `deleteProject(id)`
**Persistence:** No | **Used by:** Project selector, project browser

#### attempt-store.ts — Current/recent attempt execution

| State | Type |
|-------|------|
| `currentAttemptId` | `string \| null` |
| `attempts` | `Record<string, Attempt>` |
| `attemptLogs` | `Record<string, string[]>` |

**Actions:** `setCurrentAttempt`, `addLog`, `updateAttempt`
**API:** `startAttempt(taskId, prompt)`, `cancelAttempt(id)`, `answerQuestion(qId, answer)`
**Persistence:** No | **Used by:** Attempt panel, output viewer, question handler

#### running-tasks-store.ts — All tasks currently executing

| State | Type |
|-------|------|
| `runningTasks` | `Record<string, RunningTask>` |

**Actions:** `addRunningTask`, `removeRunningTask`, `updateRunningTask`
**Persistence:** No | **Used by:** Task list status badges, project overview

#### questions-store.ts — Pending questions from agents

| State | Type |
|-------|------|
| `questions` | `Record<string, Question>` |

**Actions:** `addQuestion`, `removeQuestion`, `answerQuestion(id, answer)`
**Persistence:** No | **Used by:** Question dialog, notification system

---

### UI Layout

#### panel-layout-store.ts — Main layout panel dimensions and visibility

| State | Type |
|-------|------|
| `leftPanelWidth` / `rightPanelWidth` | `number` |
| `isLeftPanelVisible` / `isRightPanelVisible` | `boolean` |

**Actions:** `setLeftPanelWidth`, `setRightPanelWidth`, `toggleLeftPanel`, `toggleRightPanel`
**Persistence:** Yes (`panel-layout-storage`) | **Used by:** Main layout, resizable dividers

#### sidebar-store.ts — Left sidebar: project tree, search, expanded items

| State | Type |
|-------|------|
| `isExpanded` | `boolean` |
| `searchQuery` | `string` |
| `expandedProjects` | `Set<string>` |

**Actions:** `toggleSidebar`, `setSearchQuery`, `toggleProjectExpanded`
**Persistence:** Yes (`sidebar-storage`) | **Used by:** Sidebar component, navigation

#### floating-windows-store.ts — Floating window panels (task details, settings, etc.)

| State | Type |
|-------|------|
| `windows` | `FloatingWindow[]` (id, type, position, size, zIndex) |

**Actions:** `openWindow`, `closeWindow`, `bringToFront`, `moveWindow`
**Persistence:** Partial (positions saved) | **Used by:** Floating dialog system, task details panel

#### right-sidebar-store.ts — Right panel: AI chat, context panel, preview

| State | Type |
|-------|------|
| `isExpanded` | `boolean` |
| `activeTab` | `'chat' \| 'context' \| 'preview'` |

**Actions:** `toggleRightSidebar`, `setActiveTab`
**Persistence:** Yes (`right-sidebar-storage`) | **Used by:** Right sidebar, tab navigation

#### settings-ui-store.ts — Theme, editor preferences, font size

| State | Type |
|-------|------|
| `theme` | `'light' \| 'dark' \| 'system'` |
| `fontSize` | `number` |
| `editorWrapText` / `autoSave` | `boolean` |
| `autoSaveInterval` | `number` |

**Actions:** `setTheme`, `setFontSize`, `setAutoSave`
**Persistence:** Yes (`settings-ui-storage`) | **Used by:** Settings dialog, editor, theme switcher

---

### Agent & AI

#### model-store.ts — Selected Claude model and configuration

| State | Type |
|-------|------|
| `selectedModel` | `string` |
| `modelConfigs` | `Record<string, ModelConfig>` |

**Actions:** `setSelectedModel`, `updateModelConfig`
**Persistence:** Yes (`model-storage`) | **Used by:** Model selector, prompt engineering

#### attachment-store.ts — File attachments to include in prompts

| State | Type |
|-------|------|
| `attachments` | `Attachment[]` |

**Actions:** `addAttachment(file)`, `removeAttachment(id)`, `clearAttachments`
**Persistence:** No | **Used by:** File uploader, prompt builder

#### context-mention-store.ts — @-mentions for code/file context inclusion

| State | Type |
|-------|------|
| `mentions` | `ContextMention[]` |

**Actions:** `addMention`, `removeMention`, `updateMention`
**Persistence:** No | **Used by:** Context picker, mention dropdown

#### workflow-store.ts — Workflow/automation configuration and execution

| State | Type |
|-------|------|
| `workflows` | `Workflow[]` |
| `activeWorkflowId` | `string \| null` |
| `workflowResults` | `Record<string, WorkflowResult>` |

**Actions:** `createWorkflow`, `updateWorkflow`, `executeWorkflow`
**Persistence:** Partial (definitions only) | **Used by:** Workflow builder, automation panel

#### interactive-command-store.ts — Command bar state (`/ask`, `/code`)

| State | Type |
|-------|------|
| `isOpen` | `boolean` |
| `commandInput` | `string` |
| `suggestions` | `string[]` |
| `selectedSuggestion` | `number` |

**Actions:** `openCommand`, `closeCommand`, `setCommandInput`, `executeCommand`
**Persistence:** No | **Used by:** Command palette, prompt builder

---

### Editor

#### inline-edit-store.ts — Live code editing with server sync

| State | Type |
|-------|------|
| `sessions` | `Record<string, EditSession>` |

**Actions:** `startEdit(sessionId, filePath, range)`, `updateEdit`, `completeEdit`, `cancelEdit`
**Persistence:** No | **Used by:** Code editor, diff viewer

---

### Terminal & Shell

#### terminal-store.ts — Terminal/console output view state

| State | Type |
|-------|------|
| `isVisible` | `boolean` |
| `logs` | `string[]` |
| `selectedShellId` | `string \| null` |

**Actions:** `toggleTerminal`, `addLog`, `clearLogs`, `selectShell`
**Persistence:** Partial (visibility only) | **Used by:** Terminal panel, console viewer

#### shell-store.ts — Background shell process tracking

| State | Type |
|-------|------|
| `shells` | `Record<string, Shell>` |

**Actions:** `addShell`, `removeShell`, `updateShell`, `executeCommand(projectId, cmd)`
**Persistence:** No | **Used by:** Shell terminal, task execution

---

### Settings

#### auth-store.ts — Authentication and API key state

| State | Type |
|-------|------|
| `isAuthenticated` | `boolean` |
| `apiKey` | `string \| null` |
| `user` | `User \| null` |

**Actions:** `setApiKey`, `logout`, `verifyAuth`
**Persistence:** Yes (API key encrypted) | **Used by:** Login, API auth, settings

#### locale-store.ts — Current UI language selection

| State | Type |
|-------|------|
| `locale` | `Locale` |

**Actions:** `setLocale` (triggers page reload)
**Persistence:** Yes (`locale-storage`) | **Used by:** Language switcher, i18n

#### project-settings-store.ts — Per-project settings: environment, tooling, build config

| State | Type |
|-------|------|
| `settings` | `Record<string, ProjectSetting>` |

**Actions:** `getSetting`, `setSetting`, `updateProjectSettings`
**Persistence:** Yes | **Used by:** Project settings panel, build configuration

#### tunnel-store.ts — Public tunnel (ngrok, ctunnel) status

| State | Type |
|-------|------|
| `isActive` | `boolean` |
| `tunnelUrl` | `string \| null` |
| `tunnelStatus` | `'idle' \| 'starting' \| 'active' \| 'stopping'` |

**Actions:** `startTunnel`, `stopTunnel`
**Persistence:** No | **Used by:** Tunnel status indicator, sharing

---

### Agent Factory

#### agent-factory-store.ts — Skills, commands, agents registry

| State | Type |
|-------|------|
| `plugins` | `Record<string, AgentFactoryPlugin>` |
| `discoveredPlugins` | `AgentFactoryPlugin[]` |

**Actions:** `fetchPlugins`, `discoverPlugins(path)`, `installPlugin`, `uninstallPlugin`, `getPluginDependencies`
**Persistence:** No | **Used by:** Agent Factory UI, plugin marketplace

#### agent-factory-ui-store.ts — Agent Factory UI state

| State | Type |
|-------|------|
| `selectedPluginId` | `string \| null` |
| `isInstalling` | `Record<string, boolean>` |
| `installProgress` | `Record<string, number>` (0-100) |

**Actions:** `selectPlugin`, `markInstallingStart`, `updateInstallProgress`, `markInstallingComplete`
**Persistence:** No | **Used by:** Agent Factory panel, plugin details

---

## Persistence Strategy

### localStorage Keys

| Key | Store | Content |
|-----|-------|---------|
| `task-storage` | task-store | Task list, selected task |
| `panel-layout-storage` | panel-layout-store | Panel widths, visibility |
| `sidebar-storage` | sidebar-store | Sidebar expansion state |
| `right-sidebar-storage` | right-sidebar-store | Right panel active tab |
| `settings-ui-storage` | settings-ui-store | Theme, editor preferences |
| `model-storage` | model-store | Selected Claude model |
| `locale-storage` | locale-store | UI language |
| `auth-storage` | auth-store | API key (sensitive!) |

### Not Persisted

attempt-store, running-tasks-store, questions-store, floating-windows-store, terminal-store, shell-store, agent-factory-store, inline-edit-store, workflow-store — all temporary/live data fetched on mount or computed at runtime.

### Selective Persistence

project-settings-store (synced to API + local), attachment-store (files managed by API), context-mention-store (volatile references).

---

## Integration Patterns

### Fetch on Mount

```typescript
'use client';
import { useEffect } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';

export function TaskBoard() {
  const { tasks, fetchTasks } = useTaskStore();
  const { selectedProject } = useProjectStore();

  useEffect(() => {
    if (selectedProject) fetchTasks([selectedProject.id]);
  }, [selectedProject?.id, fetchTasks]);

  return <div>{/* tasks list */}</div>;
}
```

### Optimistic Updates

```typescript
const updateTask = async (taskId: string, status: TaskStatus) => {
  const store = useTaskStore.getState();
  const original = store.tasks.find(t => t.id === taskId);
  store.updateTask(taskId, { status }); // Instant UI feedback

  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (!res.ok && original) store.updateTask(taskId, { status: original.status }); // Revert
  } catch { if (original) store.updateTask(taskId, { status: original.status }); }
};
```

### Socket.io Integration

```typescript
import { useSocket } from '@/hooks/use-socket';
import { useAttemptStore } from '@/stores/attempt-store';

export function TaskExecutor({ taskId }: { taskId: string }) {
  const socket = useSocket();
  const { setCurrentAttempt, addLog } = useAttemptStore();

  useEffect(() => {
    if (!socket) return;
    socket.on('attempt:output', (data) => addLog(data.attemptId, data.content));
    socket.on('attempt:finished', () => setCurrentAttempt(null));
    return () => { socket.off('attempt:output'); socket.off('attempt:finished'); };
  }, [socket]);
  return null;
}
```

---

## Performance Optimization

### Selector Specificity

```typescript
// Bad: Re-renders on ANY state change
const store = useMyStore();

// Good: Re-renders only when count changes
const count = useMyStore((state) => state.count);

// Good: Custom memoized selector
const selectTaskById = (id: string) => (state) => state.tasks.find(t => t.id === id);
const task = useMyStore(selectTaskById(taskId));
```

### Batch Updates

```typescript
// Bad: Multiple re-renders
state.updateTask(id, { status: 'done' });
state.updateTask(id, { updatedAt: Date.now() });

// Good: Single state update
state.updateTask(id, { status: 'done', updatedAt: Date.now() });
```

---

## Debugging

```typescript
// DevTools middleware
import { devtools } from 'zustand/middleware';
export const useMyStore = create<MyStore>()(
  devtools((set) => ({ /* store */ }), { name: 'MyStore' })
);

// Subscribe to changes
useMyStore.subscribe((state) => state.count, (count) => console.log('Count:', count));

// Console inspection
useMyStore.getState()        // Entire store state
useMyStore.getState().count  // Specific value
```

---

## Best Practices

1. **Keep stores focused** — One concern per store
2. **Flat state** — Avoid deeply nested state; use IDs
3. **Use selectors** — Prevent unnecessary re-renders
4. **Persist sparingly** — Only user preferences, not temp data
5. **Handle hydration** — Use `skipHydration: true` for persisted stores
6. **Type everything** — Full TypeScript interfaces for all stores
7. **Clean up listeners** — Remove Socket.io listeners on unmount
8. **Error handling** — Wrap API calls in try-catch
9. **Cross-store via `.getState()`** — Never use circular imports
10. **Test stores in isolation** — Mock API, verify state mutations

---

## Common Mistakes

```typescript
// Direct mutation (breaks reactivity)
state.tasks.push(newTask);
// Fix: set((state) => ({ tasks: [...state.tasks, newTask] }))

// Using hooks outside components
const count = useMyStore((state) => state.count);
// Fix: useMyStore.getState().count in non-React contexts

// Missing hydration (causes flash)
// Fix: Use skipHydration: true, hydrate in layout

// Circular store dependencies (Store A imports B, B imports A)
// Fix: Use event emitter or pub-sub pattern
```

---

## File Organization

All stores in `src/stores/`:
- **Naming:** `{domain}-store.ts`
- **Export:** Named export `use{Domain}Store`
- **Types:** Defined inline or in `src/types/`
- **Tests:** Colocated in `*.test.ts` or `__tests__/`

Keep stores under 300 lines. For larger stores, split by feature.
