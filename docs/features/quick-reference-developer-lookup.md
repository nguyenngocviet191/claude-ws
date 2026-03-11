# Feature Quick Reference

Quick lookup table for Claude Workspace features. See individual feature docs for full details.

## Core Features Overview

| Feature | Purpose | Key Tech | Store | API Base |
|---------|---------|----------|-------|----------|
| [Kanban Board](./kanban-board.md) | Task management with 5 status columns | @dnd-kit/core, Zustand | taskStore | `/api/tasks/` |
| [Code Editor](./code-editor.md) | Tabbed editor with AI inline edits, 14 languages | CodeMirror 6, React | inlineEditStore | `/api/files/` |
| [Terminal](./terminal.md) | Multi-tab shell with persistence | xterm.js, Node-PTY | terminalStore | Socket.IO |
| [Git Integration](./git-integration.md) | Full git workflow with visual graph | CLI (child_process) | (hook) | `/api/git/` |

## Task Status Workflow

```
todo → in_progress → in_review → done
  ↓         ↓            ↓
  └─────────────────────────→ cancelled
```

## Editor Language Support (14 total)

JavaScript, TypeScript, HTML, CSS, JSON, Python, YAML, Markdown, PHP, Java, C/C++, Rust, SQL, XML

## Terminal Events (Socket.IO)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `terminal:create` | C→S | Create new PTY |
| `terminal:subscribe` | C→S | Connect to PTY stream |
| `terminal:input` | C→S | Send keyboard input |
| `terminal:data` | S→C | PTY output |
| `terminal:resize` | C→S | Resize PTY |
| `terminal:exit` | S→C | PTY process exited |

## Git API Endpoints

**Query params:** All endpoints require `projectPath` parameter

- `GET /git/status` — Working tree status
- `GET /git/log` — Commit history (limit 30)
- `GET /git/diff` — Unstaged changes
- `POST /git/stage` — Add files to index
- `POST /git/commit` — Create commit
- `POST /git/push` — Push commits
- `POST /git/pull` — Fetch + merge
- `POST /git/fetch` — Fetch only
- `POST /git/checkout` — Switch branch
- `GET /git/branch` — List branches
- `POST /git/branch` — Create branch
- `POST /git/generate-message` — AI commit message
- `POST /git/discard` — Discard changes

## State Management (Zustand)

All features use Zustand stores with persistence where needed:

```typescript
// Persist config
const store = create(
  persist(
    (set, get) => ({ /* store logic */ }),
    { name: 'store-name' } // localStorage key
  )
);
```

Terminal and project layout stores are persisted; others are ephemeral.

## Component File Patterns

```
src/components/
├── kanban/          # 9 files
├── editor/          # 20 files
├── terminal/        # 8 files
└── sidebar/git-changes/  # 8 files
```

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Task reorder | <100ms | ✓ ~50ms |
| Inline edit stream | Real-time | ✓ <2s typical |
| Terminal latency | <50ms | ✓ WebSocket bound |
| Git graph (30 commits) | <100ms | ✓ ~90ms |
| Editor syntax highlight | Incremental | ✓ Real-time |

## Mobile Support

| Feature | Mobile | Touch | Gestures |
|---------|--------|-------|----------|
| Kanban | Single column | Yes | Swipe tabs |
| Editor | Full | Yes | Pinch zoom |
| Terminal | Full | Yes | Swipe tabs, long-press |
| Git | Full | Yes | Long-press menu |

## Keyboard Shortcuts

| Feature | Shortcut | Action |
|---------|----------|--------|
| Editor | Ctrl+S | Save file |
| Editor | Ctrl+Z | Undo |
| Editor | Ctrl+Shift+E | Inline edit |
| Terminal | Ctrl+Shift+N | New tab |
| Terminal | Ctrl+Shift+W | Close tab |
| Terminal | Ctrl+L | Clear |
| Kanban | Ctrl+Enter | Quick create task |

## API Response Patterns

All APIs follow consistent patterns:

**Success (2xx):**
```json
{
  "data": { /* response data */ },
  "success": true
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Database Operations

Task CRUD endpoints handle optimistic updates:

1. **Optimistic**: Update UI immediately
2. **Try**: POST/PATCH/DELETE to API
3. **Fallback**: Revert state on API error

## Integration Points

### Task → Chat
- Task selection loads conversation
- Agent execution with task context
- Results update task status

### Git → Editor
- File modifications tracked in git status
- Conflict markers trigger resolver modal
- Staged diffs shown in editor

### Terminal → Project
- PTY starts in project root directory
- Commands run with project context
- Output links to editor files

## Common File Paths

```
src/
├── stores/          # Zustand stores
├── components/      # React components
├── app/api/         # API routes
├── lib/             # Utilities (git, shell, etc.)
├── types/           # TypeScript definitions
└── hooks/           # Custom React hooks
```

## Debugging Tips

### Kanban
- Check `taskStore` for task state
- Verify `reorderTasks` API call in Network tab
- Toggle column visibility in panel layout

### Editor
- Check `inlineEditStore` for edit session
- Monitor `/api/claude/messages` for stream
- Verify CodeMirror extensions in devtools

### Terminal
- Check WebSocket in Network (WS tab)
- Verify PTY process with `ps aux`
- Check `terminalStore` for tab state

### Git
- Verify `.git` directory exists
- Check `projectPath` parameter
- Monitor child_process in server logs
- Verify git CLI version (`git --version`)

## Limitations & Workarounds

| Issue | Limitation | Workaround |
|-------|-----------|-----------|
| Large files | >10MB not supported in editor | Use terminal to view |
| Terminal data | Sessions not persisted to disk | Use `script` command to record |
| Git speed | 100+ commits may lag | Fetch with limit parameter |
| Conflicts | Auto-merge limited | Manual three-way merge |

## Next Steps for Development

1. **Read** the relevant feature doc
2. **Explore** the component tree in devtools
3. **Trace** store actions in console
4. **Monitor** API calls in Network tab
5. **Test** on mobile viewport

See [index.md](./index.md) for architecture patterns and development workflow example.
