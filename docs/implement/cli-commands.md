# CLI Command Implementation Design

This document outlines the design and implementation details for the enhanced `claude-ws` CLI commands.

## Architecture

The CLI uses a modular architecture where each subcommand is defined in its own file under `bin/lib/commands/`. The main entry point `bin/claude-ws.js` delegates to these commands based on the first positional argument.

### Core Components
- **`bin/lib/cli-parser.js`**: A lightweight, zero-dependency argument parser.
- **`bin/lib/config.js`**: Manages configuration (port, host, data directory).
- **`bin/lib/socket-client.js`**: Handles real-time communication with the `claude-ws` daemon for interactive task execution.

## Commands

### 1. Project Management

#### `create <name> [path]`
- **Description**: Registers a new project in the workspace.
- **Implementation**:
    - Normalizes the project path (defaulting to current directory).
    - Ensures the directory exists and contains a standard `CLAUDE.md`.
    - Inserts a new record into the `projects` table in the SQLite database.

#### `projects`
- **Description**: Lists all registered projects.
- **Implementation**: Queries the `projects` table and displays each project's ID, name, and path in a formatted table.

#### `open [path-or-id]`
- **Description**: Opens a project in the browser.
- **Implementation**: 
    - Resolves the project by ID or path.
    - If it's a new path, prompts to register it as a project.
    - Opens `http://localhost:8556/project/<id>`.

### 2. Task Management

#### `add-task <title> [description]`
- **Description**: Adds a new task to the current project.
- **Implementation**:
    - Detects the "current project" by looking up the current working directory (or its parents) in the database.
    - Creates a new entry in the `tasks` table with status `todo`.

#### `tasks [status]`
- **Description**: Lists tasks for the current project.
- **Implementation**:
    - Filters by project and optionally by status (`todo`, `in_progress`, `done`).
    - Displays a summary of the task title, ID, and latest status.

### 3. Interactive Task Execution

#### `run-task <task-id-or-title> [prompt]`
- **Description**: Starts an agent attempt for a task.
- **Interactivity**: 
    - Connects to the daemon via Socket.IO.
    - Streams output logs (`stdout`, `stderr`) to the terminal.
    - **Interactive Prompts**: When the agent uses the `AskUserQuestion` tool, the CLI intercepts the event and prompts the user for input directly in the terminal, sending the response back to the agent.
- **Syncing**: All progress is automatically visible in the web UI.

### 4. Git Checkpoints

#### `git <subcommand>`
- **`snapshot`**: Manually creates a git checkpoint commit for the current project.
- **`rewind <hash>`**: Resets the project's files to a specific checkpoint state.
- **`list`**: Shows the history of checkpoints created by `claude-ws`.

## Technical Considerations

### Database Access
CLI commands that perform read-only or simple CRUD operations interact directly with the SQLite database using Drizzle ORM to ensure performance and independence from the daemon status.

### Daemon Communication
For long-running tasks or operations requiring real-time agent coordination, the CLI communicates with the `claude-ws` daemon's API and WebSocket interface. This ensures that the agent state is managed consistently in one place.
