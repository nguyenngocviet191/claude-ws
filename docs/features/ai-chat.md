# AI Chat

Real-time AI agent interaction with Claude models. Send prompts, get AI responses with file attachments, context mentions, and structured output formats. Powered by Claude SDK and CLI providers with streaming over Socket.io.

## What It Does

Enables two-way communication between workspace and Claude AI:

| Feature | Purpose |
|---------|---------|
| **Agent Orchestration** | AgentManager delegates to SDK or CLI providers |
| **Model Selection** | Choose from Opus, Sonnet, Haiku with task-specific overrides |
| **File Attachments** | Upload files as context for AI analysis |
| **Context Mentions** | Reference other tasks/files in prompts (@file syntax) |
| **Pending Questions** | AI asks user questions, capture responses mid-attempt |
| **Slash Commands** | Interactive commands while chat is active |
| **Streaming Output** | Real-time responses via Socket.io |
| **Structured Output** | Define JSON schemas for responses |
| **Multi-Turn Prompts** | Specify max turns for iterative refinement |

## Architecture

### Agent Manager

Central orchestrator (`src/lib/agent-manager.ts`):
- Maintains active agents per attempt ID
- Routes to providers (SDK or CLI based on availability)
- Handles checkpoint UUIDs and session management
- Wires provider events to UI via Socket.io
- Tracks pending questions and persistent state

### Providers

Two execution paths:

| Provider | When | Features |
|----------|------|----------|
| **Claude SDK** | Default, SDK installed | Fast, Native streaming, File checkpoints |
| **Claude CLI** | SDK unavailable | Full CLI experience, Bash tool, Code interpreter |

Both implement same event interface, transparently swappable.

### Socket.io Streaming

Real-time event delivery via WebSocket:
- User connects to `SocketProvider` on client
- AgentManager emits events on server
- Events streamed to UI for live updates
- Survives HMR via singleton socket instance

### Model Selection

Available models stored in `useModelStore`:

```typescript
interface Model {
  id: string;           // claude-3-5-sonnet-20241022
  name: string;         // Claude 3.5 Sonnet
  description: string;
  group?: string;       // "Recommended", "Advanced"
}
```

Task can override default model: `setModel(modelId, taskId)`

## Data Flow

### Prompt Submission

```
User Input
  ↓
Prompt + Files + Mentions → AgentManager.start()
  ↓
Provider Selection (SDK or CLI)
  ↓
Session Creation (resume or new)
  ↓
Prompt + Context + Output Format → Provider.query()
  ↓
Streaming Events → Socket.io → UI Update
```

### File Attachments

When user attaches files:
1. Files stored in `attachmentStore`
2. File paths included in prompt context
3. Provider reads files during execution
4. File references preserved in attempt logs

### Context Mentions

@mentions syntax parsed in prompt:
- `@{taskId}` - Reference another task's output
- `@{filename}` - Include file from workspace
- Resolved to full text before sending to AI
- Tracked in `contextMentionStore`

### Pending Questions

When AI asks user questions:
1. `question` event emitted with tool_use_id
2. UI shows question UI, captures response
3. User submits answer
4. Answer sent via `POST /api/attempts/{attemptId}/question-response`
5. Provider resumes with answer
6. `questionResolved` event confirms completion

## API Endpoints

### Session Management

```
POST /api/attempts
  Body: { taskId, prompt, displayPrompt?, model?, filePaths?, outputFormat?, maxTurns? }
  Returns: { attemptId: string }

GET /api/attempts/{attemptId}
  Returns attempt with status, tokens, duration

POST /api/attempts/{attemptId}/cancel
  Cancels active attempt, cleans up session
```

### Question Handling

```
POST /api/attempts/{attemptId}/question-response
  Body: { answer: unknown }
  Resumes attempt with answer
  Returns: { success: true }

GET /api/attempts/{attemptId}/pending-questions
  Returns: { questions: PendingQuestion[] }
```

### Attachment Management

```
GET /api/attempts/{attemptId}/attachments
  Returns: { attachments: Attachment[] }

POST /api/attempts/{attemptId}/attachments
  Body: { filePath: string }
  Returns: { attachment: Attachment }

DELETE /api/attempts/{attemptId}/attachments/{fileId}
```

### Chat History

```
GET /api/attempts?taskId={taskId}&limit={50}
  List attempts for task
  Returns: { attempts: Attempt[] }
```

## Socket.io Events

### Server → Client Events

| Event | Payload | When |
|-------|---------|------|
| `attempt:started` | `{ attemptId, taskId }` | Agent begins |
| `attempt:json` | `{ attemptId, data: ClaudeOutput }` | Structured data received |
| `attempt:stderr` | `{ attemptId, content: string }` | Error/warning output |
| `attempt:exit` | `{ attemptId, code: number \| null }` | Agent completes |
| `attempt:question` | `{ attemptId, toolUseId, questions: [] }` | User input needed |
| `attempt:questionResolved` | `{ attemptId }` | Question answered |
| `attempt:background-shell` | `{ attemptId, shell: BackgroundShellInfo }` | Background shell started |
| `attempt:tracked-process` | `{ attemptId, pid, command, logFile? }` | Process spawned |
| `attempt:prompt-too-long` | `{ attemptId }` | Context limit warning |

### Client → Server Events

Handled via API endpoints (REST preferred over Socket.io for request/response pattern).

## Stores

### Model Store
```typescript
useModelStore()
  .availableModels    // List of available models
  .currentModel(taskId) // Get task's selected model
  .setModel(modelId, taskId) // Override model for task
```

### Attachment Store
```typescript
useAttachmentStore()
  .attachments(attemptId)  // Files for attempt
  .addAttachment(file)     // Upload file
  .removeAttachment(fileId) // Remove file
```

### Context Mention Store
```typescript
useContextMentionStore()
  .mentions(attemptId)  // Resolved @mentions
  .addMention(reference) // Add @file or @task reference
```

### Workflow Store
Tracks workflow execution state across multi-turn attempts.

### Interactive Command Store
Stores active slash commands and their state.

## Slash Commands

Interactive commands while chat is active:

| Command | Effect |
|---------|--------|
| `/continue` | Resume with follow-up prompt |
| `/simplify` | Refactor code for clarity |
| `/optimize` | Improve performance |
| `/explain` | Add detailed comments |
| `/test` | Generate test cases |

Commands are custom per workspace configuration.

## Structured Output

Define expected response format:

```typescript
POST /api/attempts
  {
    outputFormat: "json",
    outputSchema: {
      type: "object",
      properties: {
        analysis: { type: "string" },
        score: { type: "number" }
      }
    }
  }
```

AI responds with JSON matching schema. Stored in attempt logs for type safety.

## Key Implementation Details

### File Checkpointing

Integrated with Claude SDK's file checkpoint system:
- Enabled via `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING=1`
- Checkpoint UUIDs captured from user messages
- Enables rewind-files() to restore file state
- Checkpoint manager stores UUID in database

### Provider Selection Logic

1. Check if SDK installed and initialized
2. Check if CLI available in PATH
3. Fall back to whichever is available
4. Error if neither available

### Context Limits

Tracks prompt + context consumption:
- `contextUsed` - Tokens actually used
- `contextLimit` - Model's max tokens
- `contextPercentage` - Used/Limit ratio
- Warns if approaching limit

### Token Accounting

Separate tracking for cost analysis:
- `inputTokens` - Prompt tokens
- `outputTokens` - Response tokens
- `cacheCreationTokens` - Cache-created tokens (charged at 50%)
- `cacheReadTokens` - Cache-hit tokens (charged at 90%)
- `totalCostUSD` - Calculated cost

## Related Files

- Agent manager: `src/lib/agent-manager.ts`
- Event wiring: `src/lib/agent-event-wiring.ts`
- Output handler: `src/lib/agent-output-handler.ts`
- Chat UI: `src/components/task/conversation-view.tsx`
- Prompt input: `src/components/task/prompt-input.tsx`
- Model selector: `src/components/task/chat-model-selector.tsx`
- Socket service: `src/lib/socket-service.ts`
- Socket provider: `src/components/providers/socket-provider.tsx`
