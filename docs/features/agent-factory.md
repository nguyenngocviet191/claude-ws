# Agent Factory

Plugin system for creating and managing custom skills, commands, agents, and agent sets. Enables non-programmers to extend Claude Workspace functionality without code knowledge.

## What It Does

Agent Factory provides a complete plugin ecosystem:

| Feature | Purpose |
|---------|---------|
| **Plugin Types** | Skills (Python/Node functions), Commands (CLI scripts), Agents (autonomous workers), Agent Sets (grouped agents) |
| **Filesystem Discovery** | Auto-detect plugins from `~/.claude` and local project directories |
| **Dependency Management** | Track npm/pip/system dependencies with tree visualization |
| **Install Scripts** | Generate installation commands for Python, npm, Cargo, Go packages |
| **Project Association** | Link plugins to specific projects, isolate dependencies |
| **CRUD Operations** | Create, read, update, delete plugins via API |

## Architecture

### Storage Types

Plugins are stored in three locations:

1. **Local** - Created within Claude Workspace, new blank files
2. **Imported** - Discovered from filesystem (`.claude` or project dirs), existing files
3. **External** - Registered but not in filesystem (metadata only)

### Database Schema

| Table | Purpose |
|-------|---------|
| `agentFactoryPlugins` | Plugin metadata (name, type, paths, timestamps) |
| `projectPlugins` | Links plugins to projects (many-to-many) |
| `pluginDependencies` | Lists dependencies (npm, pip, system, skill, agent) |
| `pluginDependencyCache` | Caches resolved dependency trees |

### Plugin File Paths

Generated plugins live in:
- Skills: `data/agent-factory/skills/{name}.py`
- Commands: `data/agent-factory/commands/{name}.sh`
- Agents: `data/agent-factory/agents/{name}/`
- Agent Sets: Grouped under `data/agent-factory/agent-sets/{groupName}/`

### Dependency Tree

Plugins track transitive dependencies. A skill may depend on npm packages and other skills:

```
Skill: data-processor
├── npm: pandas@2.0.0
├── npm: requests@2.28.0
└── Skill: file-utilities
    └── npm: pathlib
```

Tree is visualized in UI for debugging and understanding impact of changes.

## API Endpoints

### Plugins API

```
GET /api/agent-factory/plugins?type=skill|command|agent|agent_set
  Returns: { plugins: Plugin[] }

POST /api/agent-factory/plugins
  Body: { type, name, description?, storageType?, metadata? }
  Returns: { plugin: Plugin } (201)

GET /api/agent-factory/plugins/{id}
  Returns: { plugin: Plugin }

PATCH /api/agent-factory/plugins/{id}
  Body: { name?, description?, metadata? }
  Returns: { plugin: Plugin }

DELETE /api/agent-factory/plugins/{id}
  Returns: { success: true }
```

### Discovery API

```
GET /api/agent-factory/discover?path=/path/to/scan
  Auto-discovers plugins in filesystem
  Returns: { discovered: DiscoveredNode[] }
```

### Dependency APIs

```
GET /api/agent-factory/dependencies/{pluginId}
  Returns full tree: { tree: DependencyNode }

POST /api/agent-factory/dependencies
  Body: { pluginId, dependencyType, spec, pluginDependencyId? }
  Returns: { dependency: PluginDependency }

POST /api/agent-factory/dependencies/{depId}/install
  Generates install scripts: { scripts: { npm?: string; pip?: string; ... } }
```

### Project-Plugin Association

```
POST /api/agent-factory/projects/{projectId}/plugins/{pluginId}
  Link plugin to project

DELETE /api/agent-factory/projects/{projectId}/plugins/{pluginId}
  Unlink plugin from project

GET /api/agent-factory/projects/{projectId}/plugins
  List plugins for project
```

## Key Features

### Filesystem Discovery

Scans directories and auto-detects:
- Python skills in `skills/` (files with `def` functions)
- Shell commands in `commands/` (`.sh` files)
- Agent directories in `agents/`
- Grouping by parent folder (nested folders create groups)

Imports found plugins into database without copying files.

### Install Script Generation

For each dependency type, generates appropriate install command:

| Type | Generated | Example |
|------|-----------|---------|
| npm | npm install | `npm install pandas@2.0.0` |
| pip | pip install | `pip install pandas==2.0.0` |
| cargo | cargo add | `cargo add serde --version 1.0.0` |
| go | go get | `go get github.com/lib/package@v1.0.0` |
| system | Guidance | For macOS: `brew install ...` |

Scripts can be copied and run manually or automated.

### Dependency Visualization

Resolve transitive dependencies and show as interactive tree in UI:
- Click to expand/collapse
- Highlight circular dependencies
- Show installation status
- Update status as packages install

### Plugin File Editing

View and edit plugin source code directly in Claude Workspace:
- Syntax highlighting for Python, shell, JSON
- Save changes to disk
- Track git status (M, A, D, U, R)
- Optional file size limits

## Usage Workflow

### Creating a New Skill

1. **Create** via API or UI: `POST /api/agent-factory/plugins` with type=skill
2. **File Generated**: `data/agent-factory/skills/{name}.py` created with template
3. **Edit**: Open in editor, write Python code
4. **Add Dependencies**: Link npm/pip packages via dependency API
5. **Test**: Use in prompts to Claude via slash command or agent

### Importing Existing Plugin

1. **Discover**: `GET /api/agent-factory/discover?path=/home/user/.claude`
2. **Import**: Select discovered plugin, saves metadata to database
3. **Link**: Associate to projects for isolated use
4. **Dependencies**: Manually add if not auto-detected

### Managing Dependencies

1. **View Tree**: `GET /api/agent-factory/dependencies/{pluginId}` shows full tree
2. **Add Dep**: `POST /api/agent-factory/dependencies` with npm/pip/system
3. **Install**: `POST /api/agent-factory/dependencies/{depId}/install` generates script
4. **Run**: Copy script to terminal and execute

## Related Files

- Plugin types: `src/types/agent-factory.ts`
- API routes: `src/app/api/agent-factory/`
- UI store: `src/stores/agent-factory-store.ts`
- File generator: `src/lib/plugin-file-generator.ts`
- Discovery: `src/components/agent-factory/discovery-comparison-utils.ts`
