# Code Editor Feature

## What & Why

The tabbed CodeMirror editor provides syntax-highlighted code viewing and AI-powered inline editing. Developers can edit multiple files simultaneously, preview diffs before applying AI-generated changes, and navigate code definitions. Markdown files render as preview or edit mode. File conflicts during git operations are resolved with inline diff viewer and merge helpers.

## CodeMirror 6 Setup

### Core Configuration

Located in `src/components/editor/code-mirror-editor.tsx`:

```typescript
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
```

**Editor features:**
- Responsive height via ResizeObserver (auto-expands to container)
- Theme detection (dark/light mode from next-themes)
- Line number display + gutter
- Syntax folding for supported languages
- Cursor position tracking for inline edits

### Language Support

Located in `src/components/editor/languages.ts`:

**14 language syntaxes supported:**

| Language | Extensions | Provider |
|----------|-----------|----------|
| JavaScript/TypeScript | js, jsx, ts, tsx, mjs, cjs | @codemirror/lang-javascript |
| HTML | html, htm | @codemirror/lang-html |
| CSS | css, scss, sass, less | @codemirror/lang-css |
| JSON | json | @codemirror/lang-json |
| Python | py, python | @codemirror/lang-python |
| YAML | yaml, yml | @codemirror/lang-yaml |
| Markdown | md, mdx | @codemirror/lang-markdown |
| PHP | php | @codemirror/lang-php |
| Java | java | @codemirror/lang-java |
| C/C++ | c, cpp, cc, h, hpp | @codemirror/lang-cpp |
| Rust | rs, rust | @codemirror/lang-rust |
| SQL | sql | @codemirror/lang-sql |
| XML | xml | @codemirror/lang-xml |

Language detection via file extension:

```typescript
getLanguageFromPath(filePath: string): string | null
getLanguageFromFileName(fileName: string): string | null
isBinaryFile(fileName: string): boolean
```

Binary file detection prevents attempting to syntax-highlight images, archives, compiled files.

## Inline Edit Overlays

### Edit Session Lifecycle

**Store**: `src/stores/inline-edit-store.ts` (Zustand, ephemeral)

Edit sessions have 4 states:

| State | User Action | Duration |
|-------|-------------|----------|
| **prompting** | User types edit instruction | Until "Generate" click |
| **generating** | AI generates replacement code | Streaming in real-time |
| **preview** | User reviews diff | Until Accept or Reject |
| **applying** | Applying change to editor | Milliseconds |

### Session Data

```typescript
interface EditSession {
  sessionId: string;
  filePath: string;
  selection: CodeSelection;        // from/to char offset, line numbers
  instruction: string;              // User's edit prompt
  originalCode: string;             // Before change
  generatedCode: string;            // AI output (streamed)
  diff: DiffResult | null;          // Unified diff for preview
  status: EditSessionStatus;
  error: string | null;
  createdAt: number;
}
```

One session per file (opening a new edit replaces prior session).

### Inline Edit Dialog

**File**: `src/components/editor/inline-edit-dialog.tsx`

Overlay floating dialog with:

1. **Instruction input** — text field for edit prompt
2. **Generate button** — submit to API and stream response
3. **Diff viewer** — shows before/after with added/removed lines colored
4. **Accept/Reject buttons** — apply or discard

Dialog positioned near selection on desktop, centered on mobile.

### Edit API Integration

Calls Claude API via Anthropic SDK to generate code edits:

```
POST /api/claude/messages
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Edit instruction" },
        { "type": "text", "text": "Original code:\n{originalCode}" }
      ]
    }
  ],
  "max_tokens": 4096,
  "stream": true
}
```

Streams `text_delta` events, accumulating into `generatedCode` state.

### Diff Preview

**File**: `src/components/editor/diff-algorithm.ts`

Generates unified diff format:

```
@@ -10,5 +10,6 @@
 const x = 1;
-const y = 2;
+const y = 3;
+const z = 4;
```

Used in diff viewer to highlight changed lines (red/green background).

## Go-To-Definition

### Definition Navigation

**File**: `src/components/editor/code-editor-definition-handler.ts`

Ctrl+Click (or Cmd+Click) on code symbols navigates to definition:

- **JavaScript/TypeScript**: Resolves imports to source file + line
- **Other languages**: Shows available definitions (limited language support)

Uses LSP-like heuristics for built-in languages; external LSP not implemented.

### Definition Popup

**File**: `src/components/editor/definition-popup.tsx`

On hover, shows:
- Symbol name
- File path + line number
- Preview of definition code (2-3 lines)

Click to navigate to definition file.

## Markdown Preview & Edit Modes

### Markdown Viewer

**File**: `src/components/editor/markdown-file-viewer.tsx`

For `.md` and `.mdx` files:

- **Edit mode**: CodeMirror with markdown syntax
- **Preview mode**: Rendered HTML with styling

Toggle via button in editor header. Preview includes:
- Heading anchors (#section navigation)
- Code block syntax highlighting
- Table rendering
- Link navigation

### Preview Styling

Uses `remark` + `rehype` for markdown parsing, Tailwind CSS for styling.

## File Conflict Resolution

### Merge Conflict Detection

During git operations (merge, rebase, pull), conflicts create temporary conflict files.

**File**: `src/components/editor/file-diff-resolver-modal.tsx`

Conflict markers are detected:

```
<<<<<<< HEAD
our code here
=======
their code here
>>>>>>> branch-name
```

Modal shows:

| Section | Content |
|---------|---------|
| **Incoming** (your changes) | Left panel with diff |
| **Current** (main branch) | Right panel with diff |
| **Resolution** | Merged result in middle |

### Merge Helpers

- **Accept Incoming** — choose your version
- **Accept Current** — choose their version
- **Accept Both** — combine both sections
- **Manual Edit** — open resolver in editor

Resolving saves merged result, removes conflict markers, stages file in git.

### Diff Panels

**Files**:
- `src/components/editor/diff-panel-local.tsx` — shows unstaged changes
- `src/components/editor/diff-panel-remote.tsx` — shows remote vs local

Both show unified diff with:
- Line numbers
- Added/removed/modified highlighting
- Context lines (3 before/after)
- File name + status

## Editor Extensions

Located in `src/components/editor/extensions/`:

| Extension | Purpose |
|-----------|---------|
| `inline-edit.ts` | Enables inline AI editing UI |
| `goto-definition.ts` | Ctrl+Click navigation |
| `marker-line-highlight.ts` | Highlights specific lines (search results) |
| `cursor-selection-theme.ts` | Custom cursor + selection colors |
| `add-to-context.ts` | Right-click context menu |

### Custom Theming

Light and dark cursor/selection themes:

```typescript
const cursorSelectionDark = EditorView.baseTheme({
  '.cm-cursor': { borderLeftColor: '#e0e0e0' },
  '.cm-selectionBackground': { backgroundColor: '#3a3f45' },
});

const cursorSelectionLight = EditorView.baseTheme({
  '.cm-cursor': { borderLeftColor: '#000000' },
  '.cm-selectionBackground': { backgroundColor: '#d4d4d8' },
});
```

## Multi-Tab Management

### Editor State

**Store**: `src/stores/` (not a dedicated store; state managed in layout component)

Tabs track:
- File path (unique key)
- Content (in memory)
- Unsaved changes marker
- Active tab (one at a time)

### Tab Operations

- **Open file**: Add tab, make active
- **Close tab**: Remove from tabs (prompt if unsaved)
- **Rename file**: Update tab path, editor state
- **Save**: Persist via filesystem API
- **Undo/Redo**: Per-file editor history

Active tab content displays in main editor view. Keyboard shortcut Ctrl+Tab cycles through tabs.

## Editor Position Tracking

### Navigation Context

When code search finds a match, editor jumps to location:

```typescript
interface EditorPosition {
  lineNumber?: number;
  column?: number;
  matchLength?: number;
}
```

CodeMirror converts line number to character offset, performs selection, scrolls match into view.

**File**: `src/components/editor/code-mirror-editor.tsx` lines 65-80 — implements position tracking

## Performance & Memory

- Each file holds full content in memory (no lazy-loading for large files)
- Syntax highlighting is incremental (CodeMirror recomputes on change)
- Extension chains are memoized per editor instance
- Binary files are skipped entirely (no loading attempt)

## Accessibility

- Keyboard shortcuts for common operations (Ctrl+S save, Ctrl+Z undo)
- Screen reader support for line numbers + status
- High contrast theme available
- Arrow keys navigate editor content

## Related Files

| Path | Purpose |
|------|---------|
| `src/components/editor/` | All editor UI components |
| `src/stores/inline-edit-store.ts` | Inline edit session state |
| `src/lib/diff-generator.ts` | Diff generation logic |
| `src/app/api/files/` | File operations endpoints |
| `src/hooks/use-active-project.ts` | Project context for file paths |

## Typical User Flow

1. User opens file from file browser — tab created, content loaded
2. User selects code + Ctrl+Shift+E — inline edit dialog opens
3. User types edit instruction (e.g., "add error handling")
4. Clicks Generate — AI streams replacement code
5. Preview shows diff; user clicks Accept
6. Code applied to editor, dialog closes
7. Ctrl+S saves file to disk
8. During git pull with conflicts, resolver modal appears
9. User chooses sections manually or auto-merge
10. File saved, conflict resolved, ready to commit
