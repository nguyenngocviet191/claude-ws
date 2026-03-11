# Deployment Guide

Claude Workspace is a full-stack application combining a Next.js frontend, Express-based API routes, and optional headless Fastify backend (Agentic SDK). This guide covers all deployment scenarios.

## Prerequisites

**Required:**

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | For running the application |
| pnpm | 9+ | Package manager (faster than npm) |
| Claude Code CLI | Latest | For agent execution; install via `npm install -g @anthropic-ai/claude-code` |

**Optional:**

- PM2 (process manager) — for production background process management
- Cloudflare Tunnel — for secure remote access without port forwarding
- SQLite (bundled) — database already included; no separate install needed

**System:**

- Disk space: 500MB minimum (plus project/data directory)
- RAM: 512MB minimum (1GB+ recommended for concurrent agents)
- Network: Outbound HTTPS to `api.anthropic.com` (or custom proxy)

## Installation Methods

### Option 1: Quick Try (npx)

Fastest way to test Claude Workspace without installation:

```bash
npx -y claude-ws
```

This downloads and runs the latest version from npm. Opens http://localhost:8556

**Pros:** Zero setup, immediate start
**Cons:** Slower subsequent starts, doesn't persist settings

### Option 2: Global npm Install

Install as a global command:

```bash
npm install -g claude-ws
claude-ws
```

Opens http://localhost:8556, persists configuration in `~/.claude/` directory.

**Pros:** Portable, single command to start
**Cons:** Updates require `npm update -g claude-ws`

### Option 3: From Source (Git Clone)

For development, contributing, or using unreleased features:

```bash
git clone https://github.com/Claude-Workspace/claude-ws.git
cd claude-ws
pnpm install
pnpm dev
```

Opens http://localhost:8556 with hot-reload enabled.

**Pros:** Full control, bleeding-edge features, can modify code
**Cons:** Requires all dev dependencies, slightly slower startup

## Configuration

Create a `.env` file in your working directory to customize settings:

```bash
# Server Configuration
PORT=8556
NODE_ENV=development

# Logging (optional)
LOG_LEVEL=debug

# Claude Code CLI Path (optional, auto-detected)
# CLAUDE_PATH=/home/user/.local/bin/claude

# API Authentication (optional, empty = disabled)
API_ACCESS_KEY=your-secret-key

# Anthropic API Configuration
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_AUTH_TOKEN=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Model Tier Overrides (optional)
ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-6
ANTHROPIC_DEFAULT_SONNET_MODEL=claude-sonnet-4-6
ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-5-20251001

# Retry Configuration (optional)
ANTHROPIC_API_RETRY_TIMES=3
ANTHROPIC_API_RETRY_DELAY_MS=10000

# Database Location (optional)
DATA_DIR=/path/to/data

# Agent Factory Directory (optional)
# AGENT_FACTORY_DIR=~/.claude/agentfactory
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server listening port | `8556` | No |
| `NODE_ENV` | Node environment | `development` | No |
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error, silent) | `debug` (dev), `warn` (prod) | No |
| `API_ACCESS_KEY` | API key for `x-api-key` header auth | (none) | No |
| `ANTHROPIC_BASE_URL` | Anthropic API or proxy endpoint | `https://api.anthropic.com` | No |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic API token | — | Yes* |
| `ANTHROPIC_MODEL` | Default model for agent tasks | — | Yes* |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override opus tier model | Falls back to `ANTHROPIC_MODEL` | No |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override sonnet tier model | Falls back to `ANTHROPIC_MODEL` | No |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override haiku tier model | Falls back to `ANTHROPIC_MODEL` | No |
| `ANTHROPIC_API_RETRY_TIMES` | Retry attempts for failed API calls | `3` | No |
| `ANTHROPIC_API_RETRY_DELAY_MS` | Delay between retries (milliseconds) | `10000` | No |
| `DATA_DIR` | SQLite database and uploads directory | `./data` | No |
| `CLAUDE_PATH` | Path to Claude Code CLI executable | Auto-detected | No |
| `AGENT_FACTORY_DIR` | Custom agent/plugin directory | `~/.claude/agentfactory` | No |

*Either provide both `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_MODEL`, or let Claude Code CLI provide them via `~/.claude/settings.json`.

## PM2 Production Setup

For production deployments, use PM2 to manage the Claude Workspace process:

### Installation

```bash
npm install -g pm2
```

### Starting the Application

The project includes a pre-configured ecosystem file at `ecosystem.config.cjs`:

```bash
# Start with PM2
pm2 start ecosystem.config.cjs

# View running processes
pm2 status

# View logs
pm2 logs claude-ws

# Monitor CPU/memory
pm2 monit

# Restart on code changes (development only)
pm2 start ecosystem.config.cjs --watch
```

### PM2 Configuration (ecosystem.config.cjs)

The ecosystem file handles:

- **Auto-restart:** Restarts on crash with max 10 attempts
- **Memory limit:** 500MB threshold triggers automatic restart
- **Graceful shutdown:** 5-second kill timeout
- **Environment:** Loads `.env` file automatically
- **Logging:** Writes to `./logs/pm2-out.log` and `./logs/pm2-error.log`
- **Startup:** Installs dependencies, builds, then starts server

**Key settings:**

```javascript
{
  name: 'claude-ws',
  script: 'pnpm install && pnpm build && ./node_modules/.bin/tsx server.ts',
  instances: 1,
  exec_mode: 'fork',
  max_restarts: 10,
  max_memory_restart: '500M',
  autorestart: true,
  error_file: './logs/pm2-error.log',
  out_file: './logs/pm2-out.log'
}
```

### Common PM2 Commands

```bash
# Restart application
pm2 restart claude-ws

# Stop application
pm2 stop claude-ws

# Start application
pm2 start claude-ws

# Delete from PM2
pm2 delete claude-ws

# Permanently register with system boot
pm2 startup
pm2 save

# View process details
pm2 info claude-ws
```

### Monitoring & Logs

```bash
# Real-time logs
pm2 logs claude-ws

# Last 100 lines
pm2 logs claude-ws --lines 100

# Follow error logs only
pm2 logs claude-ws --err

# View all PM2-managed app logs
pm2 logs
```

## Agentic SDK (Headless Backend)

The Agentic SDK is a lightweight Fastify server that exposes the same API as Claude Workspace but **without the frontend UI**. Use it for:

- Programmatic task execution via REST API
- CI/CD pipeline integration
- Custom automation scripts
- Headless agent orchestration

### Starting Agentic SDK

From the claude-ws project root:

```bash
# Development (with file watching and hot reload)
pnpm agentic-sdk:dev

# Production
pnpm agentic-sdk:start
```

Server starts at `http://localhost:3100` by default.

### Agentic SDK Configuration

All environment variables are read from the parent claude-ws `.env` file:

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENTIC_SDK_PORT` | `3100` | Server port |
| `AGENTIC_SDK_DATA_DIR` | `<project-root>/data` | SQLite + uploads location |
| `API_ACCESS_KEY` | (none) | API key for `x-api-key` header |
| All Anthropic vars | — | Same as main app |

### Agentic SDK API Usage

Health check (no auth required):

```bash
curl http://localhost:3100/health
# Returns: {"status":"ok"}
```

Create a project:

```bash
curl -X POST http://localhost:3100/api/projects \
  -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "path": "/home/user/my-project"
  }'
```

Create a task:

```bash
curl -X POST http://localhost:3100/api/tasks \
  -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_...",
    "title": "Implement feature"
  }'
```

Queue an agent task:

```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_...",
    "prompt": "Add authentication to the app",
    "request_method": "queue"
  }'
# Returns immediately with attempt ID
```

Stream agent output via Server-Sent Events (SSE):

```bash
curl -N http://localhost:3100/api/attempts/atmp_.../stream \
  -H "x-api-key: your-secret-key"
# Streams real-time output until completion
```

Run synchronously (waits for completion):

```bash
curl -X POST http://localhost:3100/api/attempts \
  -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task_...",
    "prompt": "Fix the login bug",
    "request_method": "sync",
    "timeout": 300000
  }'
# Blocks until task completes (up to timeout)
```

### Full Agentic SDK API Reference

See `packages/agentic-sdk/README.md` for complete endpoint documentation including:

- Project CRUD operations
- Task management
- Attempt execution and monitoring
- File operations
- Git integration
- Webhook callbacks
- Structured output formats

## Remote Access via Cloudflare Tunnel

For secure remote access without exposing your server IP or managing firewall rules:

### Setup

1. **Install cloudflared:**

   ```bash
   # macOS
   brew install cloudflared

   # Linux
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
   chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

   # Windows
   winget install Cloudflare.cloudflared
   ```

2. **Authenticate:**

   ```bash
   cloudflared tunnel login
   ```

3. **Create tunnel:**

   ```bash
   cloudflared tunnel create claude-workspace
   ```

4. **Configure tunnel** in `~/.cloudflared/config.yml`:

   ```yaml
   tunnel: claude-workspace
   credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: claude-ws.yourdomain.com
       service: http://localhost:8556
     - service: http_status:404
   ```

5. **Add DNS record:**

   ```bash
   cloudflared tunnel route dns claude-workspace claude-ws.yourdomain.com
   ```

6. **Run tunnel:**

   ```bash
   # Foreground (testing)
   cloudflared tunnel run claude-workspace

   # Or as systemd service
   sudo cloudflared service install
   sudo systemctl enable cloudflared
   sudo systemctl start cloudflared
   ```

Now access `https://claude-ws.yourdomain.com` from anywhere.

### Optional: Cloudflare Access (Authentication)

Add email-based authentication via Cloudflare Zero Trust:

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Access** → **Applications** → **Add an application**
3. Select **Self-hosted**, configure:
   - **Application domain:** `claude-ws.yourdomain.com`
   - **Policy:** Allow specific emails or email domains
4. Save and deploy

For more details, see `docs/cloudflare-tunnel.md`.

## Database Management

Claude Workspace uses SQLite for local data storage. No separate database server needed.

### Database Location

By default: `./data/claude.db` (relative to working directory)

Override with environment variable:

```bash
DATA_DIR=/var/lib/claude-ws/data
```

### Database Files

| File | Purpose |
|------|---------|
| `data/claude.db` | Main SQLite database (projects, tasks, attempts, etc.) |
| `data/uploads/` | User-uploaded files |
| `data/agent-factory/` | Custom agent plugins (if configured) |

### Database Migrations

Migrations are handled automatically on startup via `initDb()` in `src/lib/db/index.ts`:

- **Fresh install:** Creates all tables
- **Existing database:** Adds new columns via `ALTER TABLE IF NOT EXISTS`
- **No manual migration needed:** All schema updates are backward-compatible

To check database integrity:

```bash
# Verify database exists and is readable
sqlite3 ./data/claude.db ".tables"

# Dump schema
sqlite3 ./data/claude.db ".schema"

# Check database size
du -sh ./data/claude.db
```

### Backup & Restore

**Backup:**

```bash
cp -r ./data ./data-backup-$(date +%Y%m%d-%H%M%S)
```

**Restore:**

```bash
rm -rf ./data
cp -r ./data-backup-20250311-120000 ./data
```

### Data Directory Permissions

For production deployments, ensure proper permissions:

```bash
# Run Claude Workspace as dedicated user
useradd -m -s /bin/bash claude-ws

# Create data directory with proper permissions
sudo mkdir -p /var/lib/claude-ws/data
sudo chown -R claude-ws:claude-ws /var/lib/claude-ws/data
sudo chmod 755 /var/lib/claude-ws/data

# Set DATA_DIR env var
echo "DATA_DIR=/var/lib/claude-ws/data" >> .env
```

## Troubleshooting

### Application Won't Start

**Issue:** Port already in use

```bash
# Find process on port 8556
lsof -i :8556

# Kill it
kill -9 <PID>

# Or use different port
PORT=8557 pnpm dev
```

**Issue:** Claude Code CLI not found

```bash
# Check if installed
which claude

# Install if missing
npm install -g @anthropic-ai/claude-code

# Explicitly set path if installed in non-standard location
CLAUDE_PATH=/custom/path/claude pnpm dev
```

**Issue:** API key not working

```bash
# Verify Anthropic token is set
echo $ANTHROPIC_AUTH_TOKEN

# Check if token is valid (starts with sk-ant-)
# Visit https://console.anthropic.com/account/keys

# Verify model exists
curl -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  https://api.anthropic.com/models | jq '.data[].id'
```

### Database Errors

**Issue:** "sqlite3: database disk image is malformed"

```bash
# Backup corrupted database
mv ./data/claude.db ./data/claude.db.corrupt

# Restart application (creates fresh database)
pnpm dev
```

**Issue:** "database is locked"

```bash
# Check for running processes holding lock
ps aux | grep claude-ws

# Kill stuck processes
pkill -f "claude-ws"

# Restart
pnpm dev
```

### Memory Issues

**Issue:** Application crashes with "out of memory"

Increase Node.js memory limit:

```bash
NODE_OPTIONS=--max-old-space-size=2048 pnpm dev

# Or in PM2 config
pm2 start ecosystem.config.cjs --node-args="--max-old-space-size=2048"
```

### Network Connectivity

**Issue:** Cannot reach Anthropic API

```bash
# Test connectivity
curl -I https://api.anthropic.com

# Check DNS resolution
nslookup api.anthropic.com

# Verify proxy settings (if using proxy)
curl -x http://proxy.company.com:8080 https://api.anthropic.com
```

## Performance Optimization

### Production Build

Always build before deploying:

```bash
pnpm build
pnpm start
```

This optimizes the Next.js bundle (60-70% smaller than dev build).

### Caching

Claude Workspace implements automatic token caching for Anthropic API calls via `src/lib/proxy-token-cache.ts`. No configuration needed.

### Logging Level

In production, reduce logging verbosity:

```bash
LOG_LEVEL=warn pnpm start
```

This reduces I/O overhead and log file size.

### Concurrent Processes

For high-load deployments, run multiple instances behind a load balancer:

```bash
pm2 start ecosystem.config.cjs -i max
pm2 save
```

This uses all available CPU cores (via cluster mode). Requires load balancer to handle session affinity (sticky sessions) if using in-memory stores.

## Security Considerations

### API Authentication

Always set `API_ACCESS_KEY` in production:

```bash
API_ACCESS_KEY=$(openssl rand -base64 32) >> .env
```

Clients must include header:

```bash
curl -H "x-api-key: $API_ACCESS_KEY" http://localhost:8556/api/projects
```

### HTTPS Only

Always use HTTPS in production. Options:

1. **Cloudflare Tunnel:** Handles HTTPS automatically
2. **Nginx Reverse Proxy:** Terminate SSL/TLS
3. **Let's Encrypt + Certbot:** Free SSL certificates

### Firewall Rules

Restrict API access to trusted IPs:

```bash
# Allow only from office network and home IP
sudo ufw allow from 203.0.113.0/24 to any port 8556
sudo ufw allow from 192.0.2.42 to any port 8556
```

### Sensitive Data

**Never commit to git:**

- `.env` file (contains API keys)
- `./data/` directory (user data)
- Private SSH keys or credentials

Add to `.gitignore`:

```
.env
.env.local
data/
logs/
.next/
node_modules/
```

### Data Retention

Set database cleanup policies for old conversation data:

```bash
# Delete attempts older than 30 days (example script)
sqlite3 ./data/claude.db \
  "DELETE FROM attempts WHERE created_at < datetime('now', '-30 days');"
```

## Scaling Considerations

For very high-load deployments:

| Scenario | Recommendation |
|----------|-----------------|
| **Single user, local** | Use Option 1 (npx) or Option 3 (source) |
| **Team (2-10 users)** | Single instance with PM2, SSD storage |
| **High-traffic (100+ users)** | Multiple instances behind load balancer (nginx, HAProxy) |
| **Distributed agents** | Headless Agentic SDK servers with shared database |

### Database Scaling

SQLite is suitable for single-instance deployments. For multi-instance setups with shared data:

- Use read replicas: `PRAGMA query_only = true` on replica connections
- Implement write-through caching with Redis
- Consider migration to PostgreSQL for concurrent write scaling

## Deployment Checklist

- [ ] Install Node.js 20+ and pnpm 9+
- [ ] Install Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- [ ] Create `.env` file with `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_MODEL`
- [ ] Set `API_ACCESS_KEY` for production
- [ ] Set `DATA_DIR` to persistent location
- [ ] Run `pnpm install && pnpm build`
- [ ] Test locally: `pnpm start`
- [ ] Configure PM2 if using process manager
- [ ] Setup Cloudflare Tunnel for remote access (optional)
- [ ] Configure monitoring and log rotation
- [ ] Set up automated backups of `./data` directory
- [ ] Document admin runbooks (restart, logs, troubleshooting)
- [ ] Test disaster recovery (backup restore)

## Next Steps

- **API Documentation:** See `docs/api-docs.md` for complete endpoint reference
- **Architecture:** See `docs/system-architecture.md` for design details
- **Cloudflare Setup:** See `docs/cloudflare-tunnel.md` for detailed remote access guide
- **Agentic SDK:** See `packages/agentic-sdk/README.md` for headless API usage
