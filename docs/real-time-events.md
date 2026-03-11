# Real-Time Events

Claude Workspace uses Socket.io for real-time bidirectional communication in the UI and Server-Sent Events (SSE) in the agentic-sdk for streaming agent output.

## Overview

**Socket.io** (Main App):
- Bidirectional WebSocket + polling fallback
- Events for task/attempt lifecycle, questions, inline edits, shells
- Connection-based rooms for attempt/shell isolation
- Reconnection handling with auto-resubscribe

**SSE** (Agentic SDK):
- Unidirectional server→client event stream
- Simpler deployment (no WebSocket upgrade negotiation)
- Suitable for CI/CD and headless environments
- HTTP long-polling compatible

---

## Socket.io Events (Main App)

### Connection & Auth

Server listens for connections on default Socket.io namespace (`/`).

```typescript
io.on('connection', (socket) => {
  // socket.id available
  // socket.handshake.auth available
  // socket.join(room) to subscribe
  // socket.leave(room) to unsubscribe
});
```

**Configuration:**
```typescript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', process.env.CORS_ORIGIN],
  },
  pingInterval: 10000,        // Heartbeat every 10s
  pingTimeout: 10000,         // Timeout if no pong after 10s
});
```

---

## Attempt Events

### attempt:start

**Emitted by:** Client (socket.emit)

Start a new agent execution.

```typescript
socket.emit('attempt:start', {
  taskId: string,                    // Task to run
  prompt: string,                    // User instruction
  displayPrompt?: string,            // Sanitized display version
  projectId?: string,                // For auto-project creation
  projectName?: string,              // For auto-project creation
  projectRootPath?: string,          // Working directory
  taskTitle?: string,                // For auto-task creation
  fileIds?: string[],                // File attachments
  outputFormat?: 'json' | 'text',    // Structured output format
  outputSchema?: string,             // JSON schema for output
});
```

**Server Response:**
```
attempt:started → {
  attemptId: string,
  taskId: string,
  outputFormat?: string,
  outputSchema?: string
}
```

### attempt:subscribe

Subscribe to attempt output stream.

```typescript
socket.emit('attempt:subscribe', {
  attemptId: string,
});
```

**Server Responses:**

On subscribe, receives pending questions + output:
```
question:ask → {
  id: string,
  attemptId: string,
  type: 'user_input' | 'confirmation' | 'code_review',
  content: string,
  createdAt: number
}
```

During execution:
```
attempt:output → {
  attemptId: string,
  type: 'stdout' | 'stderr' | 'json',
  content: string,
  createdAt: number
}
```

On completion:
```
attempt:finished → {
  attemptId: string,
  taskId: string,
  status: 'completed' | 'failed' | 'cancelled',
  totalTokens: number,
  totalCostUSD: string,
  durationMs: number,
  completedAt: number
}
```

### attempt:unsubscribe

Stop listening to attempt output.

```typescript
socket.emit('attempt:unsubscribe', {
  attemptId: string,
});
```

### attempt:cancel

Cancel a running attempt.

```typescript
socket.emit('attempt:cancel', {
  attemptId: string,
});
```

**Server Response:**
```
attempt:finished → {
  attemptId: string,
  status: 'cancelled'
}
```

### question:answer

Answer an agent question (e.g., user confirmation, code review).

```typescript
socket.emit('question:answer', {
  questionId: string,
  answer: string,
});
```

**Server Response:**
```
question:answered → {
  questionId: string,
  attemptId: string
}
```

### attempt:auto-retry

Auto-retry a failed attempt from the last checkpoint.

```typescript
socket.emit('attempt:auto-retry', {
  attemptId: string,
});
```

**Server Response:**
```
attempt:started → {
  attemptId: string (new),
  taskId: string
}
```

### attempt:compact

Compact long conversation context by summarizing history.

```typescript
socket.emit('attempt:compact', {
  taskId: string,
});
```

**Server Response:**
```
attempt:started → {
  attemptId: string,
  taskId: string
}

context:compacting → {
  attemptId: string,
  taskId: string
}
```

---

## Question Events

### question:ask

**Emitted by:** Server (agent needs input)

Agent is waiting for user input.

```typescript
{
  id: string,                    // Question ID
  attemptId: string,             // Related attempt
  type: string,                  // 'user_input', 'confirmation', etc.
  content: string,               // Question text
  createdAt: number              // Unix milliseconds
}
```

---

## Inline Edit Events

### inline-edit:subscribe

Subscribe to inline edit notifications for a session.

```typescript
socket.emit('inline-edit:subscribe', {
  sessionId: string,
}, (ok: boolean) => {
  // Ack callback
});
```

### inline-edit:start

Start an inline code edit.

```typescript
socket.emit('inline-edit:start', {
  sessionId: string,
  filePath: string,
  startLine: number,
  endLine: number,
  replacement: string,
});
```

**Server Response:**
```
inline-edit:started → {
  sessionId: string,
  filePath: string,
  startLine: number,
  endLine: number
}
```

### inline-edit:cancel

Cancel a pending inline edit.

```typescript
socket.emit('inline-edit:cancel', {
  sessionId: string,
});
```

**Server Response:**
```
inline-edit:cancelled → {
  sessionId: string
}
```

### inline-edit:*

**Emitted by:** Server during edit

Edit lifecycle events:
```
inline-edit:started
inline-edit:progress
inline-edit:completed
inline-edit:failed
```

---

## Shell Events

### shell:subscribe

Subscribe to shell process output.

```typescript
socket.emit('shell:subscribe', {
  projectId: string,
});
```

**Server Response:**
```
shell:output → {
  shellId: string,
  type: 'stdout' | 'stderr',
  content: string,
  createdAt: number
}

shell:exited → {
  shellId: string,
  exitCode: number,
  exitSignal: string | null
}
```

### shell:unsubscribe

Stop listening to shell output.

```typescript
socket.emit('shell:unsubscribe', {
  projectId: string,
});
```

### shell:stop

Stop a background shell process.

```typescript
socket.emit('shell:stop', {
  shellId: string,
}, (result: { success: boolean; error?: string }) => {
  // Ack callback
});
```

### shell:getLogs

Retrieve shell output history.

```typescript
socket.emit('shell:getLogs', {
  shellId: string,
  limit?: number,
  offset?: number,
}, (logs: any[]) => {
  // Ack callback
});
```

---

## Error Events

### error

**Emitted by:** Server (validation or runtime error)

```typescript
{
  message: string,
  code?: string,
  details?: Record<string, any>
}
```

**Examples:**
```
{ message: 'Task not found' }
{ message: 'projectId required' }
{ message: 'Failed to create project folder: EACCES' }
```

---

## Task Events (Broadcast)

### task:started

**Emitted by:** Server (broadcast to all clients)

```
task:started → { taskId: string }
```

Sent when task transitions to `in_progress`.

### task:finished

**Emitted by:** Server (broadcast to all clients)

```
task:finished → {
  taskId: string,
  status: 'completed' | 'failed' | 'cancelled'
}
```

Sent when task execution completes.

---

## Context Events

### context:compacting

**Emitted by:** Server (during context compression)

```
context:compacting → {
  attemptId: string,
  taskId: string
}
```

---

## SSE Stream Format (Agentic SDK)

Server-Sent Events streamed via `GET /api/attempts/:id/stream`:

```
GET /api/attempts/atmp_001/stream
x-api-key: sk-workspace-...
```

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format:**

Standard data events:
```
data: {"type":"stdout","content":"Running npm install..."}

data: {"type":"stderr","content":"Warning: deprecated package"}

data: {"type":"json","content":{"key":"value"}}
```

Completion event:
```
event: done
data: {"code":0}
```

**Examples:**

Agent output:
```
data: {"type":"stdout","content":"$ npm install\n"}

data: {"type":"stdout","content":"added 256 packages\n"}

data: {"type":"json","content":{"action":"install","completed":true}}

event: done
data: {"code":0}
```

Error scenario:
```
data: {"type":"stderr","content":"Error: ENOENT: no such file"}

event: done
data: {"code":1}
```

---

## Client-Side Integration

### Socket.io Client (React Hook)

```typescript
// src/hooks/use-socket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  return socketRef.current;
}
```

### Listen to Attempt Output

```typescript
const socket = useSocket();
const [output, setOutput] = useState<string[]>([]);

useEffect(() => {
  if (!socket) return;

  socket.emit('attempt:subscribe', { attemptId });

  socket.on('attempt:output', (data) => {
    setOutput((prev) => [...prev, data.content]);
  });

  socket.on('attempt:finished', (data) => {
    console.log('Attempt finished:', data.status);
  });

  socket.on('question:ask', (question) => {
    // Handle user question
  });

  return () => {
    socket.off('attempt:output');
    socket.off('attempt:finished');
    socket.off('question:ask');
  };
}, [socket, attemptId]);
```

### SSE Stream (agentic-sdk)

```javascript
const attemptId = 'atmp_001';
const apiKey = 'sk-workspace-...';

const eventSource = new EventSource(
  `/api/attempts/${attemptId}/stream`,
  {
    headers: {
      'x-api-key': apiKey,
    },
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`[${data.type}]`, data.content);
};

eventSource.addEventListener('done', (event) => {
  const { code } = JSON.parse(event.data);
  console.log(`Process exited with code ${code}`);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

---

## Room Management

### Attempt Room

Connected clients receive attempt output:
```typescript
socket.join(`attempt:${attemptId}`);
// Receives: attempt:output, question:ask, attempt:finished
io.to(`attempt:${attemptId}`).emit('attempt:finished', {...});
```

### Shell Room

Clients listening to project shells:
```typescript
socket.join(`shell:${projectId}`);
// Receives: shell:output, shell:exited
```

### Task Room (Implicit)

All clients implicitly in task room:
```typescript
io.emit('task:started', { taskId });    // All clients
io.emit('task:finished', { taskId });   // All clients
```

---

## Reconnection & State Sync

### Automatic Resubscribe

On reconnect, client should:
1. Re-emit `attempt:subscribe` for active attempts
2. Re-emit `shell:subscribe` for watched shells
3. Re-emit `inline-edit:subscribe` for active edits

### Server Cleanup

Connection timers (disconnectTimers):
- Client disconnects → start 5-minute timer
- Reconnect within timer → restore state
- Timer expires → clean up attempt listeners

```typescript
const disconnectTimers = new Map<string, NodeJS.Timeout>();

socket.on('disconnect', () => {
  disconnectTimers.set(attemptId, setTimeout(() => {
    agentManager.removeAllListeners();
    disconnectTimers.delete(attemptId);
  }, 5 * 60 * 1000)); // 5 minutes
});

socket.on('attempt:subscribe', () => {
  if (disconnectTimers.has(attemptId)) {
    clearTimeout(disconnectTimers.get(attemptId)!);
    disconnectTimers.delete(attemptId);
  }
});
```

---

## Performance Considerations

### Message Rate Limiting

For high-frequency events (stdout), consider:
- Batching small chunks
- Throttling at client (max 100ms between renders)
- Compressing verbose output

### Memory Usage

Attempt listeners held in `agentManager`:
```typescript
agentManager.on('json', onJson);
agentManager.on('exit', onExit);
```

Clean up on disconnect:
```typescript
function cleanup() {
  agentManager.removeListener('json', onJson);
  agentManager.removeListener('exit', onExit);
}
```

### Connection Limits

Socket.io with default config supports ~1000 concurrent connections per process. For higher:
- Use Socket.io adapter (Redis)
- Scale horizontally with load balancer

---

## Troubleshooting

### Events Not Received

1. Check client is subscribed:
   ```typescript
   socket.emit('attempt:subscribe', { attemptId });
   ```

2. Verify socket is connected:
   ```typescript
   if (socket.connected) { /* ... */ }
   ```

3. Check browser console for errors

### SSE Connection Closed

```javascript
eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // Retry after delay
  setTimeout(() => {
    eventSource = new EventSource(`/api/attempts/${attemptId}/stream`);
  }, 1000);
};
```

### Reconnection Timeout

Increase timeout:
```typescript
const socket = io({
  reconnectionDelay: 3000,
  reconnectionDelayMax: 10000,
});
```

---

## Event Ordering Guarantees

**Socket.io:**
- Events from single sender are ordered
- Events may reorder across network
- Server broadcasts are ordered to all recipients

**SSE:**
- Events strictly ordered (single connection)
- No event loss (TCP delivery)
- Better for sequential output (logs, code diffs)

---

## Examples

See `src/hooks/` for client integration patterns:
- `use-socket.ts` — Connection setup
- `use-attempt-socket.ts` — Attempt listening
- `use-attempt-stream.ts` — SSE streaming
