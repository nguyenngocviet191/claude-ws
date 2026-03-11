# Full-Text Search and Discovery

Search across workspace files and chat history with fuzzy matching and real-time results. Find code, conversations, and context in seconds.

## What It Does

Three independent search modes:

| Search Mode | Scope | Algorithm | Use Case |
|-------------|-------|-----------|----------|
| **File Search** | Filenames in project tree | Fuzzy matching | "Find that config file" |
| **Content Search** | File contents (text/code) | Regex/substring | "Find function definition" |
| **Chat History Search** | Prompts and AI responses | Substring matching | "Find when we discussed this" |

All three support:
- Real-time as-you-type results
- Configurable result limits
- Project filtering
- Keyboard shortcuts (Cmd+P, Cmd+Shift+F)

## Architecture

### Search Modes

#### 1. File Search (Fuzzy)

Searches filesystem for filename matches:

```
GET /api/search/files?q=config&basePath=/project
  Returns: [
    { name: "config.ts", path: "src/config.ts", score: 95 },
    { name: "app.config.js", path: "config/app.config.js", score: 88 }
  ]
```

**Algorithm**: Fuzzy matching with scoring
- Higher score for consecutive character matches
- Penalties for gaps
- Case-insensitive

**Exclusions**: `node_modules`, `.git`, `.next`, `dist`, `__pycache__`, `.DS_Store`

#### 2. Content Search (Text)

Searches file contents for text patterns:

```
GET /api/search/content?q=function&project=src&filetype=.ts
  Returns: [
    { file: "utils.ts", line: 42, content: "function parseConfig()" },
    { file: "helpers.ts", line: 88, content: "function validate()" }
  ]
```

**Algorithm**: Regex or substring matching
- Extracts context around match (line + surrounding code)
- Respects file type filters
- Limits to text files (excludes binaries)

**Index**: Filesystem-based (no pre-built index, searches on demand)

#### 3. Chat History Search (Substring)

Searches task attempts and logs:

```
GET /api/search/chat-history?q=benchmark&projectIds=proj1,proj2
  Returns: [
    {
      taskId: "task-abc",
      matchedText: "...performance benchmark...",
      source: "prompt",
      attemptId: "attempt-123"
    }
  ]
```

**Algorithm**: Case-insensitive substring matching
- Searches both user prompts and AI responses
- Extracts snippet with context (40 chars before/after match)
- Prioritizes one match per task (avoids duplicates)

**Search Scope**:
- Prompts: `attempts.prompt` and `attempts.displayPrompt`
- Responses: `attemptLogs.content` (JSON parsed for text blocks)
- Optional project filtering

## Data Flow

### File Search Flow

```
User Types in Search Box
  ↓
SearchProvider.toggleSearch() (Cmd+P triggers)
  ↓
Input value → debounce 300ms
  ↓
GET /api/search/files?q=query&basePath=/project
  ↓
Server:
  1. collectFiles() - Recursively list all files
  2. fuzzyMatch() each file name and full path
  3. Score and sort by relevance
  4. Return top 50 results
  ↓
Client:
  1. Display results in dropdown
  2. Highlight match positions
  3. Show file icons and paths
  4. Click to open file
```

### Content Search Flow

```
User Opens Search → "Content" Tab
  ↓
Input query
  ↓
GET /api/search/content?q=query&project=src
  ↓
Server:
  1. Walk directory tree
  2. Read text files only
  3. Search for regex/substring matches
  4. Extract lines with context
  5. Return top 100 matches
  ↓
Client:
  1. Group results by file
  2. Show line numbers
  3. Highlight match in context
  4. Click to jump to line in editor
```

### Chat History Search Flow

```
User Opens Search → "Chat" Tab
  ↓
Input query (min 2 chars)
  ↓
useChatHistorySearch() hook
  ↓
Debounce 300ms
  ↓
GET /api/search/chat-history?q=query&projectIds=proj1,proj2
  ↓
Server:
  1. Get task list for projects
  2. Query attempts table (prompts)
  3. Query attemptLogs table (responses)
  4. Extract match snippets
  5. Keep first match per task
  ↓
Client:
  1. Display task matches
  2. Show which source (prompt/response)
  3. Click to open task
  4. Scroll to matched attempt
```

## API Endpoints

### File Search

```
GET /api/search/files?q={query}&basePath={path}&limit={50}

Query params:
  q: string           // Fuzzy search query
  basePath: string    // Root path to search (required)
  limit?: number      // Max results (default 50)

Returns: {
  results: [{
    name: string,
    path: string,      // Relative path
    type: "file" | "directory",
    score: number,     // Fuzzy match score
    matches: number[]  // Character positions of match
  }],
  total: number
}

Status codes:
  200: Success
  400: Missing basePath
  404: Path not found
```

### Content Search

```
GET /api/search/content?q={query}&project={path}&filetype={ext}

Query params:
  q: string           // Search term or regex
  project?: string    // Subdirectory to search
  filetype?: string   // File extension filter (.ts, .js, .md)
  limit?: number      // Max results (default 100)

Returns: {
  results: [{
    file: string,
    line: number,
    content: string,   // Line with context
    matchStart: number // Char offset in line
  }],
  total: number
}
```

### Chat History Search

```
GET /api/search/chat-history?q={query}&projectId={id}

Query params:
  q: string           // Search term (min 2 chars)
  projectId?: string  // Single project
  projectIds?: string // Comma-separated list

Returns: {
  matches: [{
    taskId: string,
    matchedText: string,    // Snippet with ellipsis
    source: "prompt" | "assistant",
    attemptId: string
  }],
  query: string
}
```

### Files from Search (File Browser Integration)

```
GET /api/files/search?q={query}&basePath={path}

Specialized endpoint for file browser:
  Returns files for browsing/opening
  Same format as /api/search/files
```

## UI Components

### Unified Search Provider

Global search context (`src/components/search/search-provider.tsx`):
- Manages search modal state
- Keyboard shortcut handling (Cmd+P, Cmd+K, Cmd+Shift+F)
- Delegates to specific search components

```typescript
useSearch()
  .toggleSearch() // Open/close search
```

### File Browser Search

Tab in file sidebar (`src/components/sidebar/file-browser/unified-search.tsx`):
- Fuzzy search for files by name
- Results grouped by directory
- Click to open in editor
- Shows relative paths

### Chat History Search Hook

Hook for task-level search (`src/hooks/use-chat-history-search.ts`):
- Debounced query input
- Returns matches for current task
- Tracks loading state
- Aborts previous requests

## Keyboard Shortcuts

| Shortcut | Action | Platform |
|----------|--------|----------|
| Cmd+P | Open file search | macOS |
| Cmd+K | Open file search | macOS |
| Cmd+Shift+F | Search chat history | macOS |
| Ctrl+P | Open file search | Windows/Linux |
| Ctrl+K | Open file search | Windows/Linux |
| Ctrl+Shift+F | Search chat history | Windows/Linux |

In search modal:
- **Arrow Up/Down** - Navigate results
- **Enter** - Select result
- **Escape** - Close search
- **Tab** - Switch between search modes

## Search Algorithms

### Fuzzy Matching

Scoring algorithm for filename matches:

```
For each file:
  1. Match query characters in order
  2. Calculate score based on:
     - Consecutive matches (high score)
     - Gaps between matches (penalty)
     - Query position in string (earlier = higher)
  3. Return score 0-100

Example:
  Query: "cfg" in "src/config.ts"
  Path match: c-o-n-f-i-g ✓ (found in order)
  Filename match: c-o-nf-i-g ✓ (consecutive = higher score)
```

Results sorted by score descending, then alphabetically.

### Excluded Directories

Files in these dirs never appear in results:

```
node_modules    // Dependencies
.git            // Version control
.next           // Next.js build
dist, build     // Compiled output
.turbo          // Turbo cache
__pycache__     // Python cache
.cache          // Various caches
```

Also skips dotfiles (`.env`, `.DS_Store`, etc.)

### Chat History Matching

Substring matching with context extraction:

```
Match found: "benchmark" in "performance benchmark test"
Context chars: 40 before + 40 after
Result: "...performance benchmark test..."

If truncated:
  Start: "...text before"
  End: "text after..."
```

## Performance Considerations

### Real-Time as-You-Type

- 300ms debounce prevents excessive API calls
- Requests cancelled when new query typed
- Results cached in component state
- Incremental rendering

### Large Codebases

File search with excluded dirs:
- Skips `node_modules`, `.git`, `.next`
- Reduces scan time from minutes to seconds
- Filesystem-based (no pre-built index needed)

Content search limits:
- Max 100 results returned
- Can be filtered by project/filetype
- Regex support for power users

Chat history efficiency:
- Indexed queries via Drizzle ORM
- Uses `LIKE` operator for substring match
- Optional project filtering reduces table scans
- First match per task (no duplicates)

## Related Files

- Search provider: `src/components/search/search-provider.tsx`
- File search API: `src/app/api/search/files/route.ts`
- Content search API: `src/app/api/search/content/route.ts`
- Chat history search API: `src/app/api/search/chat-history/route.ts`
- File browser search: `src/app/api/files/search/route.ts`
- Chat search hook: `src/hooks/use-chat-history-search.ts`
- File tab search: `src/components/sidebar/file-browser/use-file-tab-search.ts`
- Fuzzy match lib: `src/lib/fuzzy-match.ts`
