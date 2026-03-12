# Tinh hoa Kỹ thuật (Harvest) từ Dự án Claude Workspace

Dưới đây là một số các đoạn mã nguồn và pattern thiết kế đáng chú ý có thể tái sử dụng (hoặc học tập) cho các dự án sau này.

## 💎 1. Singleton Orchestrator (AgentManager)

**Mô tả**: Sử dụng pattern Singleton kết hợp với `globalThis` để duy trì một Agent Manager duy nhất trong môi trường Hot-reload của Next.js, tránh việc tạo ra nhiều instance làm trùng lặp các tiến trình AI.

```typescript
// src/lib/agent-manager.ts

const globalKey = "__claude_agent_manager__" as const;

declare global {
  var __claude_agent_manager__: AgentManager | undefined;
}

export const agentManager: AgentManager =
  (globalThis as any)[globalKey] ?? new AgentManager();

if (!(globalThis as any)[globalKey]) {
  (globalThis as any)[globalKey] = agentManager;
}

export class AgentManager extends EventEmitter {
  // ... logic điều phối
}
```

---

## 💎 2. Provider Pattern cho AI Agents

**Mô tả**: Tách biệt logic gọi AI (CLI hay SDK) thông qua một interface `Provider`. Điều này cho phép chuyển đổi backend AI mà không ảnh hưởng đến phần core (`AgentManager`).

```typescript
// Các Provider implement cùng interface
export interface Provider {
  readonly id: ProviderId;
  start(options: ProviderStartOptions): Promise<ProviderSession>;
  answerQuestion(
    attemptId: string,
    toolUseId: string | undefined,
    questions: unknown[],
    answers: Record<string, string>,
  ): boolean;
  // ...
}
```

---

## 💎 3. BGPID Fix Pattern (Bash Background Processes)

**Mô tả**: Một thủ thuật thông minh để bắt ID của process chạy ngầm (background) trong shell, giúp AI theo dõi được tiến trình (pid) ngay cả khi lệnh shell exit ngay lập tức. Đây là một pattern rất hữu ích khi xây dựng AI Agent hỗ trợ DevOps.

```typescript
// src/lib/providers/claude-sdk-provider.ts

if (toolName === "Bash") {
  const command = input.command as string | undefined;
  if (
    command &&
    isServerCommand(command) &&
    !command.includes('echo "BGPID:$!"')
  ) {
    if (/>\s*\/tmp\/[^\s]+\.log\s*$/.test(command)) {
      const fixedCommand = command.trim() + ' 2>&1 & echo "BGPID:$!"';
      return {
        behavior: "allow" as const,
        updatedInput: { ...input, command: fixedCommand },
      };
    }
  }
}
```

---

## 💎 4. Custom Server with Socket.io & Next.js

**Mô tả**: Tích hợp Socket.io trực tiếp vào `httpServer` của Next.js thay vì dùng API Route riêng biệt (vốn không ổn định cho WebSockets dài hạn).

```typescript
// server.ts

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    // Auth & Logging logic
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    // Socket.io options
  });

  io.on("connection", (socket) => {
    // Listen to "attempt:start" and "question:answer"
  });

  httpServer.listen(port, () => {
    console.log(`Server started at http://${hostname}:${port}`);
  });
});
```

---

## 💎 5. Context Track & Auto-fix Sessions

**Mô tả**: Logic tự động phát hiện các lỗi của phiên làm việc trước đó (như lỗi API bị hỏng) và tự động tạo ra một điểm "fix" để Claude có thể tiếp tục mà không bị kẹt.

```typescript
// src/lib/session-manager.ts

async getSessionOptionsWithAutoFix(taskId: string) {
  // Logic kiểm tra history, nếu có message lỗi cuối cùng,
  // hãy lùi lại một bước (resume-at) để tránh lỗi lặp lại.
}
```
