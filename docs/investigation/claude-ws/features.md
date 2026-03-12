# Tính năng Chính (Features) của Claude Workspace

Dưới đây là một số tính năng cốt lõi được xây dựng trong dự án **claude-ws**.

## 🏗️ 1. Quản lý Tác vụ (Task Monitoring & Management)

**Mô tả**: Giao diện Kanban tích hợp, cho phép kéo thả các nhiệm vụ và quản lý trạng thái của chúng (Todo, In Progress, Done).

**Triển khai kỹ thuật**:

- **Libraries**: `@dnd-kit/core`, `@dnd-kit/sortable`.
- **Logic**: Khi tác vụ được chuyển trạng thái trong Kanban, client sẽ gọi `patch /api/tasks/[id]` để cập nhật cơ sở dữ liệu SQLite.

---

## ⚡ 2. Real-time Message Streaming

**Mô tả**: Phản hồi từ Claude được phát trực tiếp (stream) theo thời gian thực tới màn hình người dùng, kèm theo các thông báo về trạng thái của các công cụ đang được gọi.

**Triển khai kỹ thuật**:

- **WebSocket**: Sử dụng **Socket.io** để đẩy dữ liệu delta từ `ClaudeSDKProvider` -> `AgentManager` -> `Socket.io Server` -> `React Client`.
- **UI**: Dùng React component (`MessageDisplay.tsx`) với `react-markdown` và `highlight.js` để hiển thị định dạng giàu dữ liệu.

---

## 💾 3. Checkpoints & State Persistence

**Mô tả**: Hệ thống tự động sao lưu trạng thái phiên làm việc và cấu trúc file (checkpoints). Người dùng có thể quay lại bất kỳ thời điểm nào trong lịch sử hội thoại.

**Triển khai kỹ thuật**:

- **Manager**: `checkpoint-manager.ts`.
- **SDK**: Sử dụng tính năng `SDK_FILE_CHECKPOINTING` của Claude Code SDK.
- **Database**: Lưu thông tin UUID của checkpoint vào bảng `attempts` và `tasks` trong SQLite.

---

## 🏗️ 4. Agent SDK & Hub (Quản lý Agent)

**Mô tả**: Hỗ trợ việc tạo ra các Custom Agent với các skill, lệnh và plugin riêng biệt thông qua hệ thống Plugin của Agent SDK.

**Triển khai kỹ thuật**:

- **Manager**: `agent-manager.ts` phối hợp với `agent-factory-dir.ts`.
- **Plugin System**: Tự động quét các thư mục skills và load cấu hình từ dự án.

---

## 📂 5. Code Editor & Git Integration

**Mô tả**: Trình chỉnh sửa mã nguồn tích hợp (CodeMirror) với highlighting và các chức năng Git (Status, Stage, Commit, Diff, Graph).

**Triển khai kỹ thuật**:

- **Editor**: `@uiw/react-codemirror` với support đa ngôn ngữ.
- **Git Logic**: Sử dụng `scripts/git-snapshot.ts` hoặc các thư viện git node-js tích hợp (thông qua `git-stats-collector.ts`).
- **Visual Graph**: Cho phép xem lịch sử commit và các nhánh trực quan.

---

## 🔐 6. Secure Remote Access (Cloudflare Tunnel)

**Mô tả**: Cho phép truy cập workspace từ xa qua một link duy nhất (ví dụ: `https://my-claude.pages.dev`) một cách an toàn mà không cần cấu hình Router phức tạp.

**Triển khai kỹ thuật**:

- **Service**: `tunnel-service.ts` quản lý tiến trình `ctunnel`.
- **Status API**: `/api/tunnel/status` cung cấp trạng thái của tunnel cho giao diện backend.

---

## 🌍 7. Đa ngôn ngữ (i18n)

**Mô tả**: Giao diện người dùng hỗ trợ nhiều ngôn ngữ (Tiếng Anh, Tiếng Việt, v.v.).

**Triển khai kỹ thuật**:

- **Framework**: `next-intl`.
- **Locales**: Các file JSON trong thư mục `locales/`.
