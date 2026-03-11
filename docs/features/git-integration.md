# Git Integration Feature

## What & Why

Full Git workflow is embedded in the workspace, enabling developers to stage files, create commits, push/pull branches, and visualize commit history without opening a terminal. Visual commit graph with automatic lane calculation shows branch structure. AI-powered commit message generation suggests changes based on staged diffs. Conflict resolution helpers guide users through merge conflicts.

## CLI-Based Git Operations

All git operations use the system `git` CLI, invoked via Node.js child process on the server. No git library bindings or custom implementations.

### Git API Endpoints

Located in `src/app/api/git/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Get working tree and index status |
| `/log` | GET | Fetch commit history with graph data |
| `/diff` | GET | Show unstaged changes (working tree diff) |
| `/show` | GET | Show specific commit details |
| `/show-file-diff` | GET | Show staged diff for file |
| `/stage` | POST | Add files to index (git add) |
| `/commit` | POST | Create commit (git commit) |
| `/push` | POST | Push commits to remote |
| `/pull` | POST | Fetch + merge from remote |
| `/fetch` | POST | Fetch from remote (no merge) |
| `/checkout` | POST | Switch branches or discard changes |
| `/branch` | GET | List branches |
| `/branch` | POST | Create new branch |
| `/generate-message` | POST | AI-generate commit message |
| `/discard` | POST | Discard unstaged changes |
| `/gitignore` | GET | Get .gitignore patterns |

All endpoints require `projectPath` query/body parameter (working directory for git commands).

## Status & Diff Operations

### Repository Status

`GET /api/git/status?path=/project/path`

Returns:

```json
{
  "branch": "main",
  "ahead": 3,
  "behind": 0,
  "untracked": ["file.txt"],
  "unstaged": [
    {
      "path": "src/app.ts",
      "status": "modified",
      "staged": false
    }
  ],
  "staged": [
    {
      "path": "docs/README.md",
      "status": "added",
      "staged": true
    }
  ]
}
```

Status codes:
- `modified` — changed but not staged
- `added` — new file, staged
- `deleted` — removed file
- `renamed` — file renamed
- `untracked` — not in .git

### File Diffs

`GET /api/git/diff?path=/project&file=src/app.ts`

Shows unstaged changes in unified diff format:

```diff
@@ -10,5 +10,6 @@
 export function App() {
-  return <div>Hello</div>;
+  return <div>Hello World!</div>;
+  // New comment
```

`GET /api/git/show-file-diff?path=/project&file=docs/README.md`

Shows staged changes (diff between HEAD and index).

## Stage & Commit Operations

### Stage Files

`POST /api/git/stage`

```json
{
  "projectPath": "/path/to/project",
  "files": ["src/app.ts", "docs/README.md"]
}
```

Equivalent to `git add <files>`. If `files` empty, stages all changes (`git add .`).

### Create Commit

`POST /api/git/commit`

```json
{
  "projectPath": "/path/to/project",
  "message": "feat: add user authentication",
  "amend": false
}
```

Creates new commit or amends HEAD if `amend: true`.

Returns commit hash and updated status.

### AI-Generated Messages

`POST /api/git/generate-message`

```json
{
  "projectPath": "/path/to/project"
}
```

Analyzes staged changes and calls Claude API to generate a descriptive commit message following conventional commits format:

```
feat: add login form validation
- Validate email format
- Enforce password requirements
- Show inline error messages
```

Returns generated message as string; user can accept or edit before committing.

## Remote Operations

### Push

`POST /api/git/push`

```json
{
  "projectPath": "/path/to/project",
  "branch": "main",
  "force": false
}
```

Pushes commits to remote. If `force: true`, uses `git push --force-with-lease` (safer than force).

### Pull

`POST /api/git/pull`

```json
{
  "projectPath": "/path/to/project",
  "rebase": false
}
```

Fetches and merges (or rebases if `rebase: true`).

If conflicts occur, returns:

```json
{
  "success": false,
  "conflict": true,
  "conflictedFiles": ["src/app.ts", "docs/README.md"]
}
```

### Fetch

`POST /api/git/fetch`

```json
{
  "projectPath": "/path/to/project"
}
```

Fetches all branches from remote without merging. Updates remote tracking branches.

### Checkout

`POST /api/git/checkout`

```json
{
  "projectPath": "/path/to/project",
  "target": "feature/auth",
  "discardChanges": false
}
```

Switches to branch or commit. If `discardChanges: true`, stashes work-in-progress.

## Branch Management

### List Branches

`GET /api/git/branch?path=/project`

Returns:

```json
{
  "current": "feature/auth",
  "branches": [
    {
      "name": "main",
      "remote": false,
      "isHead": false
    },
    {
      "name": "origin/main",
      "remote": true,
      "isHead": false
    },
    {
      "name": "feature/auth",
      "remote": false,
      "isHead": true
    }
  ]
}
```

### Create Branch

`POST /api/git/branch`

```json
{
  "projectPath": "/path/to/project",
  "name": "feature/new-feature",
  "from": "main"
}
```

Creates new branch from `from` (default: HEAD).

## Commit History & Visualization

### Commit Log

`GET /api/git/log?path=/project&limit=30&filter=current`

Returns commits with parent hashes for graph calculation:

```json
{
  "commits": [
    {
      "hash": "abc123def456...",
      "shortHash": "abc123d",
      "message": "feat: add login form",
      "author": "Alice <alice@example.com>",
      "date": "2025-03-11T10:30:00Z",
      "parents": ["parent-hash"],
      "refs": ["HEAD", "main"]
    }
  ],
  "head": "abc123def456..."
}
```

**Filter options:**
- `current` — commits on current branch only
- `all` — all branches

**Limit**: max 30 commits per request (pagination via offset if needed).

### Lane Calculation

**File**: `src/lib/git/lane-calculator.ts`

Arranges commits in vertical lanes to visualize branch structure:

```typescript
function calculateLanes(commits: GitCommit[]): {
  lanes: Map<string, number>;  // commit hash -> lane number
  maxLane: number;              // highest lane used
}
```

Algorithm:
1. Iterate commits (newest first)
2. Assign lane to commit (0 by default)
3. If commit has 2+ parents (merge), merge-in parent lanes
4. Track max lane used

### Path Generation

**File**: `src/lib/git/path-generator.ts`

Generates SVG paths connecting commits in graph:

```typescript
function generatePaths(
  lanes: Map<string, number>,
  commits: GitCommit[]
): Array<{ fromCommit: string; toCommit: string; path: string }>
```

Outputs SVG path strings like:

```
M 100 10 L 150 50 Q 175 60 200 100
```

Paths are bezier curves connecting parent-child commits across lanes.

### Visual Graph Display

**File**: `src/components/sidebar/git-changes/git-graph.tsx`

Renders:

1. **SVG canvas** — shows commit lanes and connecting paths
2. **Commit dots** — circles at commit positions, colored by status
3. **Ref badges** — labels for HEAD, main, feature branches
4. **Timestamps** — relative dates (e.g., "2 hours ago")

Interactive:
- Hover commit → highlight it + parent chain
- Click commit → open details modal
- Click branch ref → checkout branch

**Graph constants** (GRAPH_CONSTANTS):

```typescript
{
  DOT_RADIUS: 6,
  LANE_WIDTH: 30,
  ROW_HEIGHT: 50,
  SVG_PADDING: 20,
}
```

## File Changes Display

### Status Badges

**File**: `src/components/sidebar/git-changes/git-status-badge.tsx`

Visual indicators for file state:

| Status | Color | Icon |
|--------|-------|------|
| Modified | Blue | M |
| Added | Green | A |
| Deleted | Red | D |
| Renamed | Purple | R |
| Untracked | Gray | ? |

### File Item Component

**File**: `src/components/sidebar/git-changes/git-file-item.tsx`

Each file shows:

- Status badge
- File path
- Size (bytes)
- Diff summary (e.g., "+10, -3 lines")

Click to show diff, double-click to open in editor.

### Git Sections

**File**: `src/components/sidebar/git-changes/git-section.tsx`

Organizes files by status:

- **Staged Changes** — ready to commit (checked icon)
- **Unstaged Changes** — modified but not staged
- **Untracked Files** — new files not in git

Sections can be collapsed/expanded. Each section has "Stage All" / "Unstage All" buttons.

## Commit Form & Message Generation

### Commit Dialog

**File**: `src/components/sidebar/git-changes/git-commit-form.tsx`

Fields:

- **Message input** — multiline text field
- **Generate AI message** button → calls `/api/git/generate-message`
- **Commit button** → creates commit or shows errors

On submit:

1. If no message, show error
2. POST to `/api/git/commit`
3. Refresh status on success
4. Show error toast on failure

### Commit History Display

**File**: `src/components/sidebar/git-changes/git-commit-item.tsx`

Each commit in history shows:

- Short hash (clickable → details modal)
- Commit message (first line)
- Author name
- Timestamp (relative, e.g., "3 hours ago")
- Ref badges if branch/tag

## Conflict Resolution

### Conflict Detection

During merge/pull/rebase with conflicts, API returns:

```json
{
  "success": false,
  "conflict": true,
  "conflictedFiles": ["src/app.ts"]
}
```

UI displays conflict banner with option to "Resolve Conflicts".

### Conflict Modal

**File**: `src/components/editor/file-diff-resolver-modal.tsx`

Shows three-way diff:

| Panel | Content |
|-------|---------|
| **Left** | Current branch version (HEAD) |
| **Middle** | Merge result (editable) |
| **Right** | Incoming branch version |

Conflict markers are parsed:

```
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch-name
```

### Resolution Actions

- **Accept Current** (yours) — discards incoming
- **Accept Incoming** (theirs) — accepts remote
- **Accept Both** — concatenates both
- **Manual Edit** — edit middle panel directly
- **Resolve** — stages resolved file, removes markers

After resolving all files, user clicks "Commit Merge" to finish merge.

## Discard Changes

### Discard File

`POST /api/git/discard`

```json
{
  "projectPath": "/path/to/project",
  "file": "src/app.ts"
}
```

Restores file to HEAD state (discards working tree changes). Equivalent to `git checkout -- <file>`.

### Discard All

Called on all unstaged files, often via "Discard All Changes" button.

## Git Panel Integration

**File**: `src/components/sidebar/git-changes/git-panel.tsx`

Main UI orchestrating all git operations:

1. **Status header** — branch + tracking info
2. **Graph section** — commit visualization
3. **Changes section** — staged/unstaged files
4. **Commit form** — message input + buttons
5. **Actions bar** — push/pull/fetch buttons

Auto-refreshes after every operation (status, log, diffs).

## State Management

**Hook**: `src/components/sidebar/git-changes/use-git-actions.ts`

Encapsulates all git API calls:

```typescript
const {
  status,              // Current repository status
  commits,             // Commit history
  loading,             // API call in progress
  error,               // Last error message
  refreshStatus,       // Refetch status
  stage,               // Stage files
  commit,              // Create commit
  push,                // Push to remote
  pull,                // Pull from remote
  fetch,               // Fetch from remote
  generateMessage,     // AI message generation
  discardChanges,      // Discard unstaged
} = useGitActions(projectPath);
```

## Performance Considerations

### Command Execution

- Each git operation spawns a new process (no persistent shell)
- Timeout: 30 seconds per command
- Large repos may timeout on log fetch (limited to 30 commits per request)

### Diff Computation

- Unified diff generation is fast (<100ms) for most files
- Recursive merge conflicts may need manual resolution (auto-merge limited)

### Graph Rendering

- Lane calculation O(commits × max_parents), typically <50ms
- SVG path generation O(commits), <20ms
- Large histories (100+ commits) may feel slow; pagination recommended

## Related Files

| Path | Purpose |
|------|---------|
| `src/components/sidebar/git-changes/` | Git UI components |
| `src/app/api/git/` | Backend git endpoints |
| `src/lib/git/` | Lane calc, path generation |
| `src/hooks/use-git-actions.ts` | Git actions hook |
| `src/lib/shell-manager.ts` | Git command execution |

## Typical User Flow

1. User opens Git panel in sidebar
2. Sees "On branch main, 3 commits behind origin/main"
3. Clicks Fetch → remote tracking updated
4. Modifies `src/app.ts` file in editor
5. Git panel shows "Unstaged Changes: 1 file"
6. Clicks file → diff viewer shows changes
7. Clicks "Stage" → file moved to Staged section
8. Types commit message or clicks "Generate AI Message"
9. AI generates "fix: update app component styling"
10. Clicks "Commit" → commit created locally
11. Sees new commit in graph with HEAD→main
12. Clicks "Push" → commits sent to origin/main
13. Later, tries to pull → conflict in same file
14. Sees conflict banner, opens resolver
15. Manually merges the three sections
16. Clicks "Resolve" → stages file
17. Completes merge → conflict resolved
18. Graph updates to show merged state
