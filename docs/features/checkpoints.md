# Checkpoints and Rewinding

Save conversation states and rewind to earlier points. Fork tasks from checkpoints to explore alternative paths without losing original work.

## What It Does

Checkpoint system enables non-destructive exploration:

| Feature | Purpose |
|---------|---------|
| **Auto-Capture** | Every successful attempt creates a checkpoint |
| **Fork from Checkpoint** | Create new task with all history up to that point |
| **Rewind to Checkpoint** | Delete later attempts, restore earlier state |
| **Session Isolation** | Each checkpoint has independent session context |
| **Backfill Support** | Restore files to checkpoint state even if SDK unavailable |
| **Attempt Grouping** | View attempt sequences and branching |

## Architecture

### Checkpoint Manager

Central checkpoint handler (`src/lib/checkpoint-manager.ts`):
- Captures checkpoint UUIDs from SDK user messages
- Saves checkpoints to database on successful completion
- Tracks in-memory UUID state per attempt
- Provides rewind helpers

### File Checkpointing

Uses Claude SDK's native file checkpoint system:
- `enableFileCheckpointing: true` in SDK options
- `replay-user-messages` flag captures UUIDs
- First user message UUID is restore point (pre-modification state)
- UUID stored in database's `gitCommitHash` field (repurposed as file checkpoint ID)

### Database Schema

```
Table: checkpoints
  id: string                  // nanoid
  attemptId: string           // Which attempt created this checkpoint
  taskId: string              // Parent task
  sessionId: string           // Session context at checkpoint
  gitCommitHash: string       // SDK checkpoint UUID (file state ID)
  messageCount: number        // Message count in conversation
  summary?: string            // User-provided or auto-generated summary
  createdAt: number          // Timestamp

Table: attempts
  (existing fields + checkpoint reference)
```

### Checkpoint UUID Tracking

In-memory map during active attempt:

```typescript
activeCheckpoints: Map<attemptId, checkpointUuid>

// Only FIRST UUID per attempt captured
// File checkpoints created before modifications
// First message = pre-modification state = restore point
```

## Data Flow

### Creating a Checkpoint

```
User Submits Prompt
  ↓
AgentManager.start(attemptId)
  ↓
SDK Emits User Message (uuid)
  ↓
CheckpointManager.captureCheckpointUuid(attemptId, uuid)
  ↓
Agent Executes
  ↓
Attempt Completes
  ↓
AgentManager.saveCheckpoint(attemptId, taskId, summary)
  ↓
Database Saves { checkpointUuid, taskId, attemptId }
```

### Forking from Checkpoint

```
User Selects Checkpoint → "Fork"
  ↓
API: POST /api/checkpoints/{checkpointId}/fork
  ↓
Create New Task
  ↓
Copy All Attempts Before Checkpoint
  ↓
Copy Attempt Logs (entire conversation history)
  ↓
Copy Checkpoints Before Fork Point
  ↓
Return New Task { id, name, createdAt }
```

New task has identical history up to fork point, ready for alternative prompts.

### Rewinding to Checkpoint

```
User Selects Checkpoint → "Rewind"
  ↓
API: DELETE /api/checkpoints/{checkpointId}/rewind
  ↓
Identify Attempts After Checkpoint
  ↓
Delete Their Logs
  ↓
Delete Attempts
  ↓
Restore File State via SDK (rewindFiles)
```

## API Endpoints

### Listing Checkpoints

```
GET /api/checkpoints?taskId={taskId}
  Returns: {
    checkpoints: [{
      id: string,
      attemptId: string,
      messageCount: number,
      summary?: string,
      createdAt: number,
      attempt: { prompt, status, createdAt } // Include metadata
    }]
  }
```

### Creating Checkpoint

Done automatically on attempt success. Can manually trigger:

```
POST /api/checkpoints
  Body: { taskId, attemptId, summary? }
  Returns: { checkpointId: string }
```

### Forking from Checkpoint

```
POST /api/checkpoints/{checkpointId}/fork
  Body: { newTaskName?: string }
  Returns: {
    newTaskId: string,
    copiedAttempts: number,
    summary: string
  }
```

### Rewinding to Checkpoint

```
POST /api/checkpoints/{checkpointId}/rewind
  Deletes attempts after checkpoint
  Restores file state via SDK
  Returns: { success: true }
```

### Backfill Checkpoints

For file restoration without SDK (fallback):

```
POST /api/checkpoints/{checkpointId}/backfill
  Restores files from checkpoint archives
  (Alternative to SDK's rewindFiles)
  Returns: { filesRestored: number }
```

## UI Components

### Checkpoint List

Shows attempts chronologically:
- Attempt number and timestamp
- Prompt preview (first 50 chars)
- Token usage (input, output, cache)
- Status (success, failed, cancelled)
- Actions: Fork, Rewind, Delete

### Fork Dialog

When user clicks "Fork":
1. Show summary of checkpoint
2. Prompt for new task name (auto-generated default)
3. Confirm fork operation
4. Show new task once created

### Rewind Confirmation

When user clicks "Rewind":
1. Show warning: "Delete N attempts after this checkpoint?"
2. Show affected attempts with tokens/duration
3. Confirm irreversible action
4. Perform rewind on confirmation

## Storage Structure

### Task Forking

Original task: `task-abc`
```
Attempt 1 (Checkpoint A) ✓
Attempt 2 (Checkpoint B) ✓
Attempt 3 (Checkpoint C) ✓
Attempt 4
```

Fork from Checkpoint B creates `task-xyz`:
```
Attempt 1 (Checkpoint A) ✓
Attempt 2 (Checkpoint B) ✓
  ↓ (new fork point)
Attempt 1 (new chain)
```

Both tasks share history up to fork point, then diverge.

### Checkpoint Archive

Optional: Store file snapshots for backfill:
```
data/checkpoints/{taskId}/{checkpointId}/
  files.tar.gz           // File snapshots
  metadata.json          // { fileList, hash }
```

## Session Isolation

Checkpoints include session context:

```typescript
checkpoint = {
  sessionId: "sess-xyz",      // SDK session from that attempt
  gitCommitHash: "uuid-...",  // File state checkpoint UUID
  messageCount: 42            // Message history length
}
```

When forking or rewinding:
- New session created for new task
- Old session preserved in checkpoint metadata
- Message replay uses captured UUID

## Key Scenarios

### Scenario 1: Explore Alternative

```
1. AI generates code (Checkpoint A)
2. User thinks "what if I ask differently?"
3. Fork from Checkpoint A → New task
4. Submit alternative prompt
5. Original task untouched
6. Compare results side-by-side
```

### Scenario 2: Undo Recent Changes

```
1. AI modified files (Attempt 5)
2. Files broken, want to undo
3. Rewind to Checkpoint B (Attempt 3)
4. Attempts 4-5 deleted
5. Files restored to state at Checkpoint B
```

### Scenario 3: Long Conversation Branch

```
1. 10 successful attempts (10 checkpoints)
2. Fork from Checkpoint 5
3. New task continues from Checkpoint 5
4. Original 1-10 preserved separately
5. New task gains 1-5, ready for attempt 6+
```

## Related Files

- Checkpoint manager: `src/lib/checkpoint-manager.ts`
- Fork helpers: `src/lib/checkpoint-fork-helpers.ts`
- API routes: `src/app/api/checkpoints/`
- Database schema: `src/lib/db/schema.ts` (checkpoints table)
- UI component: `src/components/task/interactive-command/checkpoint-list.tsx`
