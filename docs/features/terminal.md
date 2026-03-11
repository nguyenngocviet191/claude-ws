# Terminal Feature

## What & Why

The embedded terminal provides interactive multi-tab shell sessions with process monitoring and background persistence. Developers execute commands, run builds, and manage shell environments without leaving the workspace. Sessions survive page refreshes and persist across reconnections, enabling long-running operations to continue in the background.

## xterm.js Integration

### Core Terminal Emulator

**Package**: `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links`

Located in `src/components/terminal/terminal-instance.tsx`:

```typescript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
```

**Features:**
- Full ANSI color + 256 color support
- Mouse tracking (selection, wheel scroll)
- URL detection and clickable links
- Custom themes (dark/light with workspace colors)
- Auto-fit to container size

### Terminal Themes

**File**: `src/components/terminal/terminal-themes.ts`

Defined color palettes for light and dark modes:

```typescript
{
  foreground: '#000000',      // Text color
  background: '#ffffff',      // Background
  cursor: '#000000',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  // ... standard ANSI colors
}
```

Matches workspace theme (updates on theme toggle).

## Node-PTY Backend

### Shell Process Manager

**File**: `src/lib/shell-manager.ts`

Creates and manages pseudo-terminal processes:

- **Input queue**: Commands buffered until process ready
- **Output streaming**: Terminal data sent via WebSocket
- **Process monitoring**: Tracks PID, exit status, resource usage
- **Graceful shutdown**: SIGTERM (2s wait) → SIGKILL

### Process Lifecycle

1. **Create**: `terminal:create` event with optional projectPath
2. **Subscribe**: `terminal:subscribe` connects stream
3. **Receive input**: `terminal:input` → write to PTY stdin
4. **Output**: `terminal:data` → broadcast to all subscribers
5. **Resize**: `terminal:resize` with cols/rows → SIGWINCH
6. **Exit**: `terminal:exit` when process closes

**Socket Events** (via Socket.IO):

| Event | Direction | Payload |
|-------|-----------|---------|
| `terminal:create` | Client→Server | `{ projectId?: string }` |
| `terminal:subscribe` | Client→Server | `{ terminalId: string }` |
| `terminal:input` | Client→Server | `{ terminalId: string, data: string }` |
| `terminal:data` | Server→Client | `{ terminalId: string, data: string }` |
| `terminal:resize` | Client→Server | `{ terminalId: string, cols: number, rows: number }` |
| `terminal:close` | Client→Server | `{ terminalId: string }` |
| `terminal:exit` | Server→Client | `{ terminalId: string, code: number }` |
| `terminal:check` | Client→Server | `{ terminalId: string }` (ack callback) |

## Multi-Tab Support

### Tab Structure

**Store**: `src/stores/terminal-store.ts` (Zustand with persistence)

```typescript
interface TerminalTab {
  id: string;           // PTY session ID
  projectId: string;    // Associated project (or 'global')
  title: string;        // User-editable tab name
  createdAt: number;
  isConnected: boolean; // PTY alive status
}
```

Tabs are persisted in localStorage, allowing reconnection on page reload.

### Tab Naming

Auto-generates "Terminal 1", "Terminal 2", etc. based on creation order. Numbers reuse lowest available (if Terminal 2 closed, next tab is Terminal 2, not Terminal 3).

**Function**: `nextAvailableTabNumber()` in terminal-store.ts

### Tab Operations

- **Create**: User clicks + button, new PTY spawned, tab added
- **Switch**: Click tab to set as active (sends data to active PTY only)
- **Rename**: Double-click tab title, inline edit
- **Close**: Removes tab from UI, PTY receives SIGTERM
- **Close All**: Batch close all tabs (keyboard shortcut: Ctrl+Shift+W)

## Session Persistence & Reconnection

### Background PTY Sessions

PTY processes continue running after panel close or page reload. Multiple browser tabs can reconnect to same PTY:

1. User opens Terminal in tab A
2. User closes terminal panel in tab A (PTY lives on)
3. User opens page in tab B
4. Terminal tabs auto-reconnect to existing PTYs

**Flow** (`src/components/terminal/use-terminal-lifecycle.ts`):

```typescript
// On mount: restore tabs from localStorage
const { tabs, activeTabId } = useTerminalStore();

// For each tab, check if PTY still alive
const alive = await socket.emit('terminal:check', { terminalId });

// If alive: re-subscribe to stream
if (alive) socket.emit('terminal:subscribe', { terminalId });
```

### Reconnection Timeout

Each PTY check has 2-second timeout. If no response, tab marked as stale and removed from list.

## Process Monitoring

### Crash Detection

When PTY exits unexpectedly:

1. Server sends `terminal:exit` with exit code
2. Store updates `isConnected: false` for that tab
3. UI shows disconnected indicator (red dot)
4. User can close the stale tab or restart

No auto-restart (requires explicit user action to maintain safety).

### Shell Environment

PTY inherits environment from server process:

```bash
# Shell is determined by server OS + user config
# Linux/macOS: /bin/bash or /bin/zsh (fallback: /bin/sh)
# Windows: cmd.exe or PowerShell
```

Project path is set as CWD if projectId provided.

## Input & Output Handling

### Keyboard Input

Data typed in terminal is sent via `terminal:input` event:

- **Normal characters**: Sent immediately
- **Special keys**:
  - Enter → `\r`
  - Backspace → `\x7f`
  - Tab → `\t`
  - Ctrl+C → `\x03`
  - Ctrl+D → `\x04`

**Mobile Touch Handling** (`src/components/terminal/setup-terminal-mobile-touch-handlers.ts`):

- Virtual keyboard integration via IME listeners
- Paste support via clipboard API
- Selection detection (long-press)

### Output Streaming

Server streams terminal output as it arrives:

1. PTY subprocess writes to stdout
2. Node-PTY captures bytes
3. Server broadcasts to all subscribed clients
4. xterm.js writes to terminal emulator
5. Display updates in real-time

Low-latency (typically <50ms round-trip).

### Paste Operations

Two paste modes:

1. **System paste** (Ctrl+V): Uses navigator.clipboard, more reliable for IME
2. **Selection paste** (middle-click on Linux): Direct text insertion

**Store method**: `pasteText(terminalId, text)` via `xterm.paste()` API.

## Terminal Lifecycle Hooks

**File**: `src/components/terminal/use-terminal-lifecycle.ts`

Manages setup and teardown:

```typescript
// On component mount
useEffect(() => {
  // 1. Reconnect persisted tabs
  reconnectTabs();

  // 2. Attach socket listeners
  socket.on('terminal:exit', handleExit);
  socket.on('terminal:data', handleData);
}, []);

// On component unmount
useEffect(() => {
  return () => {
    socket.off('terminal:exit');
    socket.off('terminal:data');
  };
}, []);
```

## Mobile Optimizations

### Touch Gesture Support

**File**: `src/components/terminal/setup-terminal-mobile-touch-handlers.ts`

- **Long-press**: Select text
- **Double-tap**: Double-select word
- **Swipe left**: Previous tab
- **Swipe right**: Next tab
- **Pinch**: Zoom font size (if implemented)

Touch coordinates are mapped to PTY via mouse events.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+N | New terminal tab |
| Ctrl+Shift+W | Close terminal tab |
| Ctrl+Shift+C | Copy selection |
| Ctrl+Shift+V | Paste |
| Ctrl+L | Clear terminal |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |

Mobile: Virtual keyboard brings up action menu for less-common shortcuts.

## Context Menu

**File**: `src/components/terminal/terminal-context-menu.tsx`

Right-click (or long-press on mobile) shows menu:

- Copy selection
- Paste
- Select all
- Clear terminal
- Rename terminal
- Close terminal
- Open new terminal

## Terminal Panel Resizing

### Height Management

**Store**: `usePanelLayoutStore()`

- `panelHeight` — stored height (default 300px)
- `MIN_PANEL_HEIGHT = 150px`
- `MAX_PANEL_HEIGHT = 600px`

Resizing is draggable from the top edge of the panel. Height is persisted to localStorage.

**Implementation**: `src/components/terminal/terminal-panel.tsx` lines 78-100

Mouse and touch events both supported.

## Shortcut Bar

**File**: `src/components/terminal/terminal-shortcut-bar.tsx`

Quick action buttons above terminal:

| Button | Action |
|--------|--------|
| + | New terminal |
| Undo | Previous command (shell history) |
| Redo | Next command (shell history) |
| Copy | Copy selection |
| Paste | Paste from clipboard |
| Clear | Clear all output |

"Undo/Redo" calls shell history navigation if not selection available.

## State Management

**Store**: `src/stores/terminal-store.ts` (Zustand with localStorage persistence)

```typescript
interface TerminalState {
  isOpen: boolean;              // Panel visible
  panelHeight: number;          // Resizable height
  activeTabId: string | null;   // Current tab
  tabs: TerminalTab[];          // All tabs
  selectionMode: Record<string, boolean>; // Per-tab selection active
  _terminalActions: Record<string, TerminalInstanceActions>; // Action refs
  _listenersAttached: boolean;  // Socket listeners initialized
  _isCreating: boolean;         // Prevent concurrent creation
}
```

Persisted to localStorage (only visual state, not process data):

```typescript
{
  name: 'terminal-store',
  partialize: (state) => ({
    isOpen: state.isOpen,
    panelHeight: state.panelHeight,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
  }),
}
```

## Performance & Resource Management

### Memory Usage

- Each PTY process uses ~5-10MB RAM (baseline process)
- xterm.js terminal buffer limited to 1000 lines (scrollback)
- Input queue prevents memory explosion on rapid typing

### CPU Impact

- Minimal when idle (only socket event listeners)
- Output rendering debounced (max 60fps)
- Syntax highlighting not applied (raw ANSI rendering)

### Network Efficiency

- WebSocket used for low-latency streaming
- Binary protocol (not text-based) for efficiency
- Buffered output (sent every 16ms) to reduce packet count

## Related Files

| Path | Purpose |
|------|---------|
| `src/components/terminal/` | All terminal UI components |
| `src/stores/terminal-store.ts` | Terminal state & API |
| `src/lib/shell-manager.ts` | PTY process management |
| `src/lib/shell-process-monitor.ts` | Resource monitoring |
| `src/app/api/shells/` | Backend shell endpoints |
| `src/hooks/use-terminal-lifecycle.ts` | Lifecycle management |

## Typical User Flow

1. User clicks Terminal panel toggle button
2. First terminal auto-creates if none exist
3. User types commands, sees output streamed in real-time
4. User clicks + button, opens Terminal 2 in new tab
5. Both terminals run simultaneously in background
6. User switches tabs to check other terminal
7. User closes browser tab; terminals keep running on server
8. User opens browser again; terminals auto-reconnect
9. User closes Terminal 1 tab; PTY receives SIGTERM
10. User types `exit` in Terminal 2, PTY cleanly exits
11. User clicks terminal panel close; still can reopen
