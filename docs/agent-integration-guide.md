# Agent Integration Guide - Claude Workspace

Hướng dẫn này giải thích cách các agent bên ngoài có thể tương tác với Claude Workspace (claude-ws) để quản lý và thực thi tasks.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Worktree Isolation](#worktree-isolation)
6. [Session Management](#session-management)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Agent / Client                       │
│                 (Your AI Agent / Script)                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Workspace Server                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Agentic SDK Layer                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              AgentManager                          │  │  │
│  │  │  Orchestrates agent lifecycle & event forwarding   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │              AgentProvider                         │  │  │
│  │  │  Wraps @anthropic-ai/claude-agent-sdk             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │  │
│  │                                                           │  │
│  │  Services:                                                │  │
│  │  ├── TaskService      - CRUD tasks + worktree management  │  │
│  │  ├── AttemptService   - CRUD attempts + logs              │  │
│  │  ├── FileService      - File operations (read/write/list)  │  │
│  │  ├── SearchService    - Content search                    │  │
│  │  └── ProjectService   - Project management                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/Drizzle)                    │
│  Tables: projects, tasks, attempts, attempt_logs, checkpoints   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Start Claude Workspace Server

```bash
# From your project directory
claude-ws

# Server starts at http://localhost:8556
```

### 2. Create a Project and Task

```bash
# Using CLI
claude-ws create my-project /path/to/project
claude-ws tasks create --project my-project "Fix login bug"

# Or using REST API
curl -X POST http://localhost:8556/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-project", "path": "/path/to/project"}'

curl -X POST http://localhost:8556/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId": "proj_xxx", "title": "Fix login bug"}'
```

### 3. Run an Agent Attempt

```bash
# Using CLI
claude-ws run-task task_xxx "Investigate the login issue"

# Or using REST API
curl -X POST http://localhost:8556/api/attempts \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task_xxx", "prompt": "Investigate the login issue"}'
```

---

## Core Concepts

### Project vs Task vs Attempt

| Entity | Description | Example |
|--------|-------------|---------|
| **Project** | A codebase directory | `/Users/dev/my-app` |
| **Task** | A unit of work to complete | "Fix authentication bug" |
| **Attempt** | A single agent run for a task | Agent run #1 with prompt "Fix the auth bug" |

### Task Statuses

```
todo → in_progress → in_review → done
                    ↓
                 cancelled
```

### Attempt Statuses

```
running → completed
running → cancelled
running → failed
```

---

## API Reference

### Base URL

```
http://localhost:8556
```

### Authentication

Set `API_ACCESS_KEY` in `.env` and include in headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8556/api/projects
```

---

## Projects API

### Create Project

```http
POST /api/projects
Content-Type: application/json

{
  "name": "my-app",
  "path": "/path/to/project"
}

Response: 201 Created
{
  "id": "proj_abc123",
  "name": "my-app",
  "path": "/path/to/project",
  "createdAt": 1234567890
}
```

### List Projects

```http
GET /api/projects

Response: 200 OK
[
  {
    "id": "proj_abc123",
    "name": "my-app",
    "path": "/path/to/project",
    "createdAt": 1234567890
  }
]
```

### Get Project

```http
GET /api/projects/:id

Response: 200 OK
{
  "id": "proj_abc123",
  "name": "my-app",
  "path": "/path/to/project",
  "createdAt": 1234567890
}
```

---

## Tasks API

### Create Task

```http
POST /api/tasks
Content-Type: application/json

{
  "projectId": "proj_abc123",
  "title": "Fix authentication bug",
  "description": "Users cannot login with SSO",
  "status": "todo",
  "useWorktree": true  // Optional: create isolated git worktree
}

Response: 201 Created
{
  "id": "task_xyz789",
  "projectId": "proj_abc123",
  "title": "Fix authentication bug",
  "description": "Users cannot login with SSO",
  "status": "todo",
  "position": 0,
  "useWorktree": true,
  "worktreePath": "/path/to/project/.claude/worktrees/task_xyz789",
  "createdAt": 1234567890
}
```

### List Tasks

```http
# All tasks
GET /api/tasks

# Filter by project
GET /api/tasks?projectId=proj_abc123

# Filter by multiple projects
GET /api/tasks?projectIds=proj_abc123,proj_def456

# Filter by status
GET /api/tasks?status=in_progress,in_review

# Combined filters
GET /api/tasks?projectIds=proj_abc123&status=in_progress

Response: 200 OK
[
  {
    "id": "task_xyz789",
    "projectId": "proj_abc123",
    "title": "Fix authentication bug",
    "status": "in_progress",
    "position": 0,
    "useWorktree": true,
    "worktreePath": "/path/to/project/.claude/worktrees/task_xyz789",
    "createdAt": 1234567890
  }
]
```

### Get Task

```http
GET /api/tasks/:id

Response: 200 OK
{
  "id": "task_xyz789",
  "projectId": "proj_abc123",
  "title": "Fix authentication bug",
  "status": "in_progress",
  ...
}
```

### Update Task

```http
PUT /api/tasks/:id
Content-Type: application/json

{
  "title": "Fix authentication bug (updated)",
  "status": "in_review",
  "description": "Fixed SSO login issue"
}

Response: 200 OK
{
  "id": "task_xyz789",
  "title": "Fix authentication bug (updated)",
  "status": "in_review",
  ...
}
```

### Reorder Task

```http
PUT /api/tasks/:id/reorder
Content-Type: application/json

{
  "position": 5,
  "status": "in_progress"  // Optional: also change status
}

Response: 200 OK
{
  "id": "task_xyz789",
  "position": 5,
  ...
}
```

### Get Task Attempts

```http
GET /api/tasks/:id/attempts

Response: 200 OK
[
  {
    "id": "atmp_001",
    "taskId": "task_xyz789",
    "prompt": "Fix the auth bug",
    "status": "completed",
    "createdAt": 1234567890
  }
]
```

### Get Task Conversation

```http
GET /api/tasks/:id/conversation

Response: 200 OK
[
  {
    "type": "json",
    "content": "{\"role\":\"assistant\",\"content\":\"...\"}",
    "createdAt": 1234567890
  }
]
```

### Delete Task

```http
DELETE /api/tasks/:id

Response: 204 No Content
```

### Remove Task Worktree

```http
DELETE /api/tasks/:id/worktree

Response: 200 OK
{
  "success": true,
  "message": "Worktree removed successfully"
}
```

---

## Attempts API

### Create Attempt (Start Agent)

```http
POST /api/attempts
Content-Type: application/json

{
  "taskId": "task_xyz789",
  "prompt": "Fix the authentication bug by checking the SSO config",
  "displayPrompt": "Fix auth bug",  // Optional: shorter display name
  "request_method": "queue",        // "queue" (async) or "sync" (wait)
  "timeout": 300000,               // Timeout for sync mode (ms)
  "output_format": "json",         // Optional: structured output
  "output_schema": "{...}"         // Optional: JSON schema for output
}

Response: 201 Created (queue mode)
{
  "id": "atmp_001",
  "taskId": "task_xyz789",
  "prompt": "Fix the authentication bug...",
  "status": "running",
  "createdAt": 1234567890
}

Response: 200 OK (sync mode - waits for completion)
{
  "id": "atmp_001",
  "status": "completed",
  "sessionId": "sess_abc123",
  "totalTokens": 12345,
  "completedAt": 1234567900,
  ...
}
```

### Force Create (Auto-create Project + Task)

```http
POST /api/attempts
Content-Type: application/json

{
  "force_create": true,
  "projectName": "my-new-project",
  "projectRootPath": "/path/to/project",
  "taskTitle": "Quick fix",
  "prompt": "Fix this bug"
}

# Automatically creates:
# 1. Project (if doesn't exist)
# 2. Task
# 3. Attempt and starts agent
```

### Get Attempt

```http
GET /api/attempts/:id

Response: 200 OK
{
  "id": "atmp_001",
  "taskId": "task_xyz789",
  "prompt": "Fix the authentication bug...",
  "status": "running",
  "sessionId": "sess_abc123",
  "logs": [
    {
      "type": "json",
      "content": "...",
      "createdAt": 1234567890
    }
  ]
}
```

### Get Attempt Status

```http
GET /api/attempts/:id/status

Response: 200 OK
{
  "id": "atmp_001",
  "status": "running"
}
```

### Stream Attempt Output (SSE)

```http
GET /api/attempts/:id/stream

Response: text/event-stream
data: {"type":"message","content":"..."}

data: {"type":"tool_use","tool":"Read",...}

event: done
data: {"code":0}
```

**SSE Events:**
- `data: {...}` - JSON output from agent
- `event: done` - Agent finished (includes exit code)

### Cancel Attempt

```http
POST /api/attempts/:id/cancel

Response: 200 OK
{
  "success": true
}
```

### Answer Agent Question

```http
POST /api/attempts/:id/answer
Content-Type: application/json

{
  "toolUseId": "ask-1234567890",
  "questions": [
    {
      "question": "Which approach?",
      "header": "Approach",
      "options": [...]
    }
  ],
  "answers": {
    "Approach": "Option 1"
  }
}

Response: 200 OK
{
  "success": true
}
```

---

## Files API

### List Files

```http
GET /api/files?projectPath=/path/to/project&subPath=src

Response: 200 OK
[
  {
    "name": "index.ts",
    "path": "src/index.ts",
    "type": "file",
    "size": 1024
  },
  {
    "name": "components",
    "path": "src/components",
    "type": "directory"
  }
]
```

### Read File Content

```http
GET /api/files/content?projectPath=/path/to/project&filePath=src/index.ts

Response: 200 OK
{
  "content": "export function main() {...}"
}
```

### Write File

```http
POST /api/files
Content-Type: application/json

{
  "projectPath": "/path/to/project",
  "filePath": "src/new-file.ts",
  "content": "export const foo = 'bar';"
}

Response: 201 Created
{
  "success": true
}
```

### Delete File

```http
DELETE /api/files?projectPath=/path/to/project&filePath=src/old-file.ts

Response: 204 No Content
```

---

## Search API

### Search Content

```http
GET /api/search?query=authentication&projectPath=/path/to/project

Response: 200 OK
{
  "results": [
    {
      "file": "src/auth.ts",
      "matches": [
        {
          "line": 42,
          "content": "export function authenticate() {..."
        }
      ]
    }
  ]
}
```

### Search Files

```http
GET /api/search/files?pattern=**/*.ts&projectPath=/path/to/project

Response: 200 OK
[
  "src/index.ts",
  "src/auth.ts",
  "src/utils.ts"
]
```

---

## Worktree Isolation

Worktree cho phép task chạy trong môi trường git isolated, tránh ảnh hưởng đến code chính.

### How It Works

```
project/                    # Main repository
├── .git/
├── src/
└── .claude/
    └── worktrees/
        └── task_xyz789/   # Worktree for task
            ├── .git/       # Separate git worktree
            └── src/        # Isolated copy of files
```

### Creating Task with Worktree

```http
POST /api/tasks
{
  "projectId": "proj_abc123",
  "title": "Experimental feature",
  "useWorktree": true  // Creates isolated worktree
}
```

### Worktree Benefits

| Benefit | Description |
|---------|-------------|
| **Isolation** | Changes don't affect main branch until merge |
| **Parallel** | Multiple agents can work on different features simultaneously |
| **Safe** | Easy to discard changes if experiment fails |
| **Traceable** | Each task has its own git history |

### Removing Worktree

```http
DELETE /api/tasks/:id/worktree
```

---

## Session Management

Claude Workspace supports session resumption for continuing previous conversations.

### Resume Session

```http
POST /api/attempts
{
  "taskId": "task_xyz789",
  "prompt": "Continue from where we left off",
  "sessionOptions": {
    "resume": "sess_abc123"  // Resume from previous session
  }
}
```

### Resume from Specific Turn

```http
POST /api/attempts
{
  "taskId": "task_xyz789",
  "prompt": "Let's revisit the earlier approach",
  "sessionOptions": {
    "resume": "sess_abc123",
    "resumeSessionAt": "5"  // Resume at turn 5
  }
}
```

### Max Turns

```http
POST /api/attempts
{
  "taskId": "task_xyz789",
  "prompt": "Quick fix",
  "maxTurns": 3  // Limit conversation to 3 turns
}
```

---

## Best Practices

### 1. Use Worktrees for Experimental Changes

```json
{
  "useWorktree": true,
  "title": "Experimental feature X"
}
```

### 2. Set Timeouts for Long-running Tasks

```json
{
  "request_method": "sync",
  "timeout": 600000  // 10 minutes
}
```

### 3. Use Structured Output for Parsing

```json
{
  "output_format": "json",
  "output_schema": "{\"type\":\"object\",\"properties\":{...}}"
}
```

### 4. Implement SSE Streaming for Real-time Updates

```javascript
const eventSource = new EventSource('http://localhost:8556/api/attempts/atmp_001/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent output:', data);
};

eventSource.addEventListener('done', (event) => {
  const { code } = JSON.parse(event.data);
  console.log('Agent finished with code:', code);
  eventSource.close();
});
```

### 5. Handle Questions Gracefully

```javascript
// Listen for question events via SSE
eventSource.addEventListener('question', (event) => {
  const { toolUseId, questions } = JSON.parse(event.data);
  // Present questions to user and collect answers
  // POST to /api/attempts/:id/answer
});
```

### 6. Clean Up Worktrees After Completion

```http
# After task is done
DELETE /api/tasks/:id/worktree
```

---

## Examples

### Example 1: Simple Task Execution

```javascript
async function runSimpleTask() {
  // 1. Create project
  const project = await fetch('http://localhost:8556/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'my-app',
      path: process.cwd()
    })
  }).then(r => r.json());

  // 2. Create task
  const task = await fetch('http://localhost:8556/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      title: 'Fix login bug'
    })
  }).then(r => r.json());

  // 3. Start agent
  const attempt = await fetch('http://localhost:8556/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task.id,
      prompt: 'Fix the SSO login issue'
    })
  }).then(r => r.json());

  console.log('Agent started:', attempt.id);

  // 4. Stream output
  const eventSource = new EventSource(`http://localhost:8556/api/attempts/${attempt.id}/stream`);
  eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
}
```

### Example 2: Parallel Tasks with Worktrees

```javascript
async function runParallelTasks() {
  const project = { id: 'proj_abc', path: '/path/to/project' };

  // Create multiple tasks with worktrees
  const tasks = await Promise.all([
    createTask(project.id, 'Feature A', true),
    createTask(project.id, 'Feature B', true),
    createTask(project.id, 'Feature C', true)
  ]);

  // Run agents in parallel
  const attempts = await Promise.all(
    tasks.map(task => startAgent(task.id, `Implement ${task.title}`))
  );

  console.log(`Started ${attempts.length} parallel agents`);
}
```

### Example 3: Resume Previous Session

```javascript
async function continueWork() {
  // Get previous attempts
  const attempts = await fetch(`http://localhost:8556/api/tasks/${taskId}/attempts`)
    .then(r => r.json());

  const lastAttempt = attempts[0];
  if (lastAttempt.sessionId) {
    // Resume from last session
    const newAttempt = await fetch('http://localhost:8556/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        prompt: 'Continue from where we left off',
        sessionOptions: {
          resume: lastAttempt.sessionId
        }
      })
    }).then(r => r.json());

    console.log('Resumed session:', newAttempt.id);
  }
}
```

---

## CLI Reference

```bash
# Projects
claude-ws projects list
claude-ws create <name> <path>

# Tasks
claude-ws tasks list --project <name>
claude-ws tasks in_progress
claude-ws tasks create --project <name> <title> [description]
claude-ws tasks stats <task-id>

# Attempts
claude-ws run-task <task-id> [prompt]
claude-ws attempts stream <attempt-id>
claude-ws attempts cancel <attempt-id>

# Files
claude-ws files read --project-path <path> <file>
claude-ws files list --project-path <path> [directory]

# Git
claude-ws git status --project-path <path>
claude-ws git log --project-path <path>
```

---

## Error Handling

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request (missing/invalid parameters) |
| 404 | Not Found (task/project/attempt doesn't exist) |
| 408 | Request Timeout (sync mode timeout) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "Task not found"
}
```

---

## SDK Integration

### TypeScript/JavaScript

```typescript
import { createApp } from '@agentic-sdk/core';

const app = createApp({
  anthropicAuthToken: process.env.ANTHROPIC_API_KEY,
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL
});

// Access services
const taskService = app.services.task;
const attemptService = app.services.attempt;

// Use AgentManager
app.agentManager.start({
  attemptId: 'atmp_001',
  projectPath: '/path/to/project',
  prompt: 'Fix the bug'
});
```

---

## Support

- **Issues**: https://github.com/Claude-Workspace/claude-ws/issues
- **Discord**: Join the community discord
- **Documentation**: https://github.com/Claude-Workspace/claude-ws
