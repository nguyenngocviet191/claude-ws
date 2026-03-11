# Kanban Board Feature

## What & Why

The Kanban board provides drag-and-drop task management with five status columns (Todo, In Progress, In Review, Done, Cancelled). Each task maintains full conversation history, enabling developers to track context and progress across AI-assisted workflows. Tasks automatically move between columns when AI agents execute them, keeping the board current without manual updates.

## Core Architecture

### Status Columns

Tasks flow through these statuses in a typical workflow:

| Status | Purpose | Automation |
|--------|---------|-----------|
| **todo** | Unstarted tasks | Manual creation |
| **in_progress** | Currently being worked on | Auto-moves when agent starts |
| **in_review** | Awaiting feedback/validation | Manual move or agent action |
| **done** | Completed and accepted | Manual move when reviewed |
| **cancelled** | Abandoned or invalid | Manual move or cleanup |

Column visibility is toggleable per user, allowing focus on active statuses.

### Data Model

Located in `src/types/index.ts`:

```typescript
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;        // Order within status column
  chatInit: boolean;        // Chat conversation initialized
  createdAt: number;
  updatedAt: number;
}
```

Tasks include a position field for ordering within columns, enabling drag-reorder while preserving manual sort order.

## Drag-and-Drop Implementation

### DnD Kit Setup

Uses `@dnd-kit/core` and `@dnd-kit/sortable` for accessible drag interactions (`src/components/kanban/board.tsx`):

- **PointerSensor**: Desktop drag with 8px activation distance
- **TouchSensor**: Mobile drag with 120ms delay and 25px tolerance (optimized for Samsung S25)
- **Custom Collision Detector**: Mobile status tabs use left-edge detection for intuitive drag-to-tab transitions

### Reorder Operations

Task reordering persists via `POST /api/tasks/reorder`:

```
{
  taskId: string,
  status: TaskStatus,
  position: number
}
```

Uses optimistic updates with fallback on API failure. When moving to a new column, the task moves to position 0 (top) by default.

## Layout Modes

### Desktop Layout

Multi-column view with all visible columns displayed horizontally. Columns can be hidden/shown via the column visibility filter icon (located in board header).

**File**: `src/components/kanban/column.tsx` — renders single column with task cards

### Mobile Layout

Single-column view with horizontal status tabs at the top. Swipe gestures navigate between columns. The active column displays after each swipe, maintaining focus on one workflow stage at a time.

**File**: `src/components/kanban/board-mobile-status-tabs.tsx` — touch-optimized tab navigation

## Task Operations

### Create Task

`POST /api/tasks`

```json
{
  "projectId": "string",
  "title": "string",
  "description": "string | null"
}
```

New tasks start in **todo** status. Uses `CreateTaskDialog` component for user input.

### Update Task

`PATCH /api/tasks/:id`

- **rename**: Update title
- **description**: Update description content
- **chatInit**: Mark conversation as initialized

### Delete Task

`DELETE /api/tasks/:id`

Can be batch-deleted by status via store action `deleteTasksByStatus(status)`.

### Bulk Operations

**File**: `src/stores/task-store.ts` — contains all CRUD operations

- `reorderTasks()` — drag-drop persistence
- `updateTaskStatus()` — change column, moves to position 0
- `duplicateTask()` — create copy with same project/title

## Context Menus & Actions

**File**: `src/components/kanban/task-card-context-menu.tsx`

Right-click or long-press a task card to access:

- Rename task
- Edit description
- Duplicate task
- Delete task
- Move to specific status (quick shortcuts)

Context menu is keyboard-accessible on desktop (Enter to open).

## AI Conversation Integration

### Task-Conversation Link

Each task maintains a separate conversation thread. When a task is selected, its conversation history displays in the chat panel.

**Store**: `src/stores/task-store.ts`

- `selectedTaskId` — current task being edited in sidebar
- `selectedTask` — full task object with history ready for chat
- `pendingAutoStartTask` — task to auto-start attempt when moved in_progress
- `setTaskChatInit()` — marks task conversation as ready

### Auto-start Workflow

When a task moves from **todo** to **in_progress**:

1. If newly created, user sees inline prompt to start conversation
2. `pendingAutoStartTask` stores taskId + description
3. Clicking "Start" executes first agent attempt with task description as context
4. Conversation continues in chat panel

**File**: `src/components/kanban/create-task-dialog.tsx` — includes "Start Immediately" option

## Search & Filtering

Tasks are filtered by:

1. **Title/Description match** — substring search (case-insensitive)
2. **Chat history match** — search queries matched against task conversation history

Filtered view applies across all columns. Hidden columns remain hidden even when containing matches.

**Hook**: `src/hooks/use-chat-history-search.ts` — searches task conversations

## Column Visibility Filter

**File**: `src/components/kanban/board-column-visibility-filter.tsx`

Toggle icon in board header. Persists per user in `usePanelLayoutStore`:

- `hiddenColumns` — array of TaskStatus values to hide
- `toggleColumn(status)` — show/hide a column

Mobile: hidden columns are skipped when navigating status tabs.

## State Management

**File**: `src/stores/task-store.ts` (Zustand store)

| Action | Sync | Optimistic | Fallback |
|--------|------|-------------|----------|
| Create | Async (POST) | Immediate add | Remove on 4xx |
| Rename | Async (PATCH) | Immediate update | Revert title |
| Reorder | Async (PUT) | Immediate move | Revert positions |
| Delete | Async (DELETE) | Immediate remove | Restore on error |

### Initialization

Tasks are fetched on app load:

```typescript
const fetchTasks = async (projectIds: string[]) => {
  // projectIds = [] means fetch all
  // Otherwise fetch tasks filtered by projects
}
```

Called from main layout when project store initializes.

## Accessibility

- Keyboard navigation via Tab through cards
- Context menu triggers via Shift+F10 or Ctrl+\ (depending on browser)
- Drag labels announce to screen readers via aria-live regions
- Touch targets sized for mobile (>44px minimum)
- Drag overlay shows dragged card during motion (visual feedback)

## Performance Considerations

- Tasks grouped by status in memory, sorted by position
- Drag reorder uses array mutation + re-sort, not full re-render
- Column visibility filter is memoized to prevent cascade renders
- Chat history search debounced 300ms to reduce lookup frequency

## Related Files

| Path | Purpose |
|------|---------|
| `src/components/kanban/` | All board UI components |
| `src/stores/task-store.ts` | Task state & API calls |
| `src/stores/project-store.ts` | Project filtering context |
| `src/app/api/tasks/` | Backend task endpoints |
| `src/hooks/use-chat-history-search.ts` | Search implementation |

## Typical User Flow

1. User creates task from board header + button
2. Task lands in **todo** column, position 0
3. User drags task to **in_progress** or double-clicks to rename
4. Conversation chat initializes when task is selected
5. Agent executes attempt with task description
6. Task auto-moves to **in_review** when review is requested
7. User moves to **done** after acceptance
8. Old done tasks can be bulk-deleted from **Done** column
