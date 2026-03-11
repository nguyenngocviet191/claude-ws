# Access Anywhere - Remote Tunneling

Securely access Claude Workspace from anywhere via Cloudflare Tunnel or ctunnel. No port forwarding, no firewall changes, automatic DNS setup.

## What It Does

Enables remote access to local workspace:

| Feature | Purpose |
|---------|---------|
| **Cloudflare Tunnel** | Free, enterprise-grade tunneling via Cloudflare network |
| **ctunnel** | Lightweight alternative tunnel provider |
| **Automatic Setup Wizard** | Step-by-step tunnel configuration |
| **API Access Keys** | Secure workspace access with token-based auth |
| **Tunnel Status Monitor** | Real-time connection health and URL display |
| **Health Checks** | Auto-reconnect on connection loss |
| **Subdomain Support** | Custom URLs or auto-generated subdomains |

## Architecture

### Tunnel Service

Core tunnel handler (`src/lib/tunnel-service.ts`):
- Manages ctunnel instance lifecycle
- Monitors connection health (30s intervals)
- Auto-reconnect with exponential backoff
- Stores API keys in database (encrypted at rest)
- Emits status events for UI updates

### Provider Options

| Provider | Setup | URL Format | Cost |
|----------|-------|-----------|------|
| **Cloudflare Tunnel** | Manual cloudflared install + config | `claude-ws.yourdomain.com` | Free (via Cloudflare account) |
| **ctunnel** | Automatic, generates API key | `xxxxx.ctunnel.app` | Free tier, paid for custom domains |

### Database Schema

```
Table: appSettings (key-value store)
  tunnel_apikey        // ctunnel API key
  tunnel_url           // Current tunnel URL
  tunnel_subdomain     // Requested subdomain (if custom)
  tunnel_provider      // "ctunnel" or "cloudflare"
```

## Data Flow

### Starting Tunnel

```
User Clicks "Enable Remote Access"
  ↓
Setup Wizard: Choose Provider
  ↓
If Cloudflare:
  → Manual cloudflared install instructions
  → User configures ~/.cloudflared/config.yml
  → User runs: cloudflared tunnel run claude-workspace

If ctunnel:
  → User gets/enters API key
  → TunnelService.start({ subdomain?: string })
  ↓
ctunnel Client Connects
  ↓
Remote Tunnel Created
  ↓
URL Generated (xxxxx.ctunnel.app or custom)
  ↓
Stored in Database
  ↓
Status: Connected ✓
```

### Health Checks

Every 30 seconds:

```
TunnelService.healthCheck()
  ↓
HTTP request to tunnel URL
  ↓
If 200 OK:
  → Health counter resets
  → Status remains "connected"

If 5xx or timeout:
  → Failure counter increments
  → If 3+ consecutive failures → trigger reconnect
```

### Auto-Reconnect

On connection loss:

```
Detect Failure
  ↓
Clear existing tunnel
  ↓
TunnelService.start(lastOptions)
  ↓
Retry up to 50 times
  ↓
Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  ↓
Emit status: connecting → connected/error
```

## API Endpoints

### Tunnel Management

```
GET /api/tunnel/status
  Returns: {
    status: "disconnected" | "connecting" | "connected" | "error",
    url?: string,
    provider?: "ctunnel" | "cloudflare",
    error?: string
  }

POST /api/tunnel/start
  Body: { subdomain?: string, provider?: "ctunnel" | "cloudflare" }
  Returns: { url: string, status: string }

POST /api/tunnel/stop
  Disconnects tunnel
  Returns: { success: true }

GET /api/tunnel/url
  Returns: { url: string }
```

### Setup Wizard API

```
POST /api/tunnel/wizard/validate-key
  Body: { apiKey: string }
  Validates ctunnel API key
  Returns: { valid: true } or error

GET /api/tunnel/wizard/cloudflare-instructions
  Returns: { steps: string[] }
  Provides cloudflared setup instructions
```

## UI Components

### Tunnel Status Indicator

Shows in workspace header/sidebar:

```
⬤ Connected (xxxxx.ctunnel.app)
⬤ Connecting...
⬤ Disconnected
⬤ Error: Connection failed
```

Click to open settings or copy URL.

### Setup Wizard

Multi-step dialog:

**Step 1: Choose Provider**
- Cloudflare Tunnel (free, requires manual setup)
- ctunnel (automatic, easier)

**Step 2: Provider-Specific Setup**

If Cloudflare:
- Show installation instructions for cloudflared
- Link to Cloudflare docs
- Ask user to confirm when tunnel running
- Check for successful connection

If ctunnel:
- Ask for API key (or create account link)
- Allow custom subdomain or auto-generate
- Validate key and start tunnel
- Show URL once connected

**Step 3: Confirm Connection**
- Display tunnel URL
- Test connection (make HTTP request)
- Show success/failure
- Offer to copy URL to clipboard

### Settings Dialog

Allow users to:
- View current tunnel status
- Change provider
- Update API key
- Change subdomain
- Enable/disable auto-start
- View connection logs

## Access Control

### API Key Authentication

For remote access via API:

```
All requests to /api/* require header:
  Authorization: Bearer {api_key}

API keys generated in workspace settings
Each key has:
  - Name (for identification)
  - Created date
  - Last used timestamp
  - Ability to revoke/rotate
```

### Cloudflare Access (Optional)

When using Cloudflare Tunnel, optionally add Access layer:

1. Go to Cloudflare Zero Trust dashboard
2. Create Access policy (allow specific emails)
3. Tunnel automatically enforces authentication
4. Additional layer of security for sensitive workspace

## Cloudflare Tunnel Setup

Manual process (not automated in Claude Workspace):

1. **Install cloudflared**
   ```bash
   # macOS
   brew install cloudflared

   # Linux
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
   chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/
   ```

2. **Authenticate**
   ```bash
   cloudflared tunnel login
   ```

3. **Create Tunnel**
   ```bash
   cloudflared tunnel create claude-workspace
   ```

4. **Configure** `~/.cloudflared/config.yml`
   ```yaml
   tunnel: claude-workspace
   credentials-file: ~/.cloudflared/{TUNNEL_ID}.json

   ingress:
     - hostname: claude-ws.yourdomain.com
       service: http://localhost:8556
     - service: http_status:404
   ```

5. **Add DNS Record**
   ```bash
   cloudflared tunnel route dns claude-workspace claude-ws.yourdomain.com
   ```

6. **Run Tunnel**
   ```bash
   cloudflared tunnel run claude-workspace
   ```

## ctunnel Setup

Automatic process via Claude Workspace:

1. **Get API Key** (if not existing)
   - Visit ctunnel.app
   - Sign up / log in
   - Generate API key from account page

2. **In Claude Workspace**
   - Click "Enable Remote Access"
   - Select ctunnel
   - Paste API key
   - (Optional) Enter custom subdomain
   - Click Start

3. **URL Generated**
   - Auto-assigned: `xxxxx.ctunnel.app`
   - Custom: `myspace.ctunnel.app` (if claimed)

4. **Share URL**
   - Copy URL from status indicator
   - Share with collaborators
   - They can access workspace from anywhere

## Security Considerations

### Tunnel Encryption

- **Cloudflare Tunnel**: Traffic encrypted end-to-end via Cloudflare's network
- **ctunnel**: Traffic encrypted to tunnel server, then to localhost

### API Key Management

- Keys stored in database (encrypted at rest by database)
- Transmitted over HTTPS only
- Revokable from settings
- Rotate periodically for security

### Network Isolation

- Tunnel only exposes workspace port (8556)
- No filesystem access
- No direct machine access
- API key required for all requests

### Cloudflare Access

For additional security with Cloudflare:
- Add authentication requirement
- Allow only specific email addresses
- Geographic restrictions available
- Audit logs of all access

## Monitoring

### Health Metrics

Tunnel service tracks:
- Connection status (connected, connecting, error)
- Uptime percentage
- Reconnection attempts
- Last successful connection
- Current URL

### Logs

Available in workspace logs:
- Tunnel start/stop events
- Connection failures and recovery
- Health check results
- Configuration changes

## Related Files

- Tunnel service: `src/lib/tunnel-service.ts`
- Tunnel store: `src/stores/tunnel-store.ts`
- Setup wizard: `src/components/access-anywhere/access-anywhere-wizard.tsx`
- Status indicator: `src/components/access-anywhere/tunnel-status-indicator.tsx`
- Cloudflare step: `src/components/access-anywhere/wizard-step-cloudflare.tsx`
- ctunnel step: `src/components/access-anywhere/wizard-step-ctunnel.tsx`
- API routes: `src/app/api/tunnel/`
- Cloudflare docs: `docs/cloudflare-tunnel.md`
