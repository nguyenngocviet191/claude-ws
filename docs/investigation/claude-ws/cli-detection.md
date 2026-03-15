# Cách Claude-WS phát hiện Claude Code CLI

Dưới đây là chi tiết về cơ chế `claude-ws` sử dụng để phát hiện và làm việc với Claude Code CLI.

## 1. Phát hiện đường dẫn Binary (CLI Path)

Cơ chế logic chính nằm ở file `src/lib/cli-query.ts` trong hàm `findClaudePath()`.

### Quy trình tìm kiếm:
1.  **Biến môi trường**: Đầu tiên nó kiểm tra biến `CLAUDE_PATH` trong file `.env`. Nếu có, nó sẽ sử dụng đường dẫn này.
2.  **Ứng viên theo Platform**: Nếu không tìm thấy trong env, nó sẽ quét các đường dẫn mặc định:
    *   **Windows**:
        *   `%USERPROFILE%\.local\bin\claude.exe`
        *   `%USERPROFILE%\AppData\Roaming\npm\claude.cmd` (Cài qua npm)
        *   `%USERPROFILE%\AppData\Local\Programs\claude\claude.exe`
    *   **macOS / Linux**:
        *   `~/.local/bin/claude`
        *   `/usr/local/bin/claude`
        *   `/opt/homebrew/bin/claude`

```typescript
// src/lib/cli-query.ts L18-42
export function findClaudePath(): string | undefined {
  const envPath = process.env.CLAUDE_PATH;
  if (envPath) {
    const normalized = normalize(envPath);
    if (existsSync(normalized)) return normalized;
  }

  const isWindows = process.platform === 'win32';
  const home = process.env.USERPROFILE || process.env.HOME || '';

  const candidates = isWindows
    ? [
        join(home, '.local', 'bin', 'claude.exe'),
        join(home, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
        join(home, 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
      ]
    : [ ... ];

  return candidates.find(p => existsSync(p));
}
```

## 2. Nạp cấu hình (Settings & Auth)

File `src/lib/claude-code-settings.ts` chịu trách nhiệm nạp các thông tin như API Key, Model từ Claude Code CLI để `claude-ws` có thể sử dụng lại.

### Thứ tự ưu tiên (từ cao xuống thấp):
1.  `~/.claude/settings.json` (Cấu hình chính của SDK)
2.  `.claude/.env` (Cấu hình riêng của project)
3.  `~/.claude/.env`
4.  `~/.claude.json` (Chứa `primaryApiKey` khi login qua OAuth)
5.  `~/.claude/.credentials.json` (Dành cho OAuth SDK nội bộ)

## 3. Quản lý phiên (Session Detection)

Trong `server.ts`, biến môi trường `CLAUDECODE` được **giữ lại** cho subprocess:

```typescript
// server.ts L20-25
// Enable SDK file checkpointing globally
process.env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = '1';

// NOTE: We keep CLAUDECODE for subprocess detection
// claude-ws spawns Claude CLI from a server process that may itself run inside Claude Code
```

**QUAN TRỌNG**: `CLAUDECODE` được giữ lại để Claude CLI/SDK có thể phát hiện và phản hồi chat đúng cách. Trước đây, việc xóa biến này có thể gây ra lỗi "Claude Code not responding" vì subprocess không biết nó đang chạy trong môi trường Claude Code.

Các file đã được cập nhật:
- `server.ts`: Không còn xóa `CLAUDECODE`
- `src/lib/providers/claude-sdk-provider.ts`: Giữ lại `CLAUDECODE` trong subprocessEnv
- `packages/agentic-sdk/src/agent/claude-sdk-agent-provider.ts`: Giữ lại `CLAUDECODE` trong process.env

## 4. Tương tác (Provider)

Hệ thống Provider (`src/lib/providers/index.ts`) quyết định cách giao tiếp:
*   Nếu `CLAUDE_PROVIDER=sdk`: Dùng trực tiếp Agent SDK.
*   Mặc định: Dùng `claude-cli`. Provider này (`ClaudeCLIProvider`) sẽ khởi chạy process bằng `spawn(claudePath, ...)` kèm theo các flag `--input-format stream-json --output-format stream-json`.
