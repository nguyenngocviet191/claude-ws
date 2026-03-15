# Claude Workspace (claude-ws) Investigation: Overview

## 🎯 Mục đích dự án

**Claude Workspace** là một nền tảng workspace hiện đại được thiết kế cho Solo CEOs và Indie Builders. Nó không chỉ là một trình chỉnh sửa mã nguồn mà còn là một trung tâm điều hành doanh nghiệp được hỗ trợ bởi AI agents.

Dự án cung cấp giao diện đồ họa (GUI) cho **Claude Code (Anthropic)**, tích hợp các công cụ quản lý tác vụ (Kanban), trình soạn thảo mã nguồn, quản lý Git và hệ thống Agent SDK mạnh mẽ.

## 🛠 Tech Stack

| Layer                    | Technologies                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**             | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| **State Management**     | [Zustand](https://zustand-demo.pmnd.rs/)                                                                                   |
| **UI Components**        | [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.steventey.com/)        |
| **In-App Communication** | [Socket.io](https://socket.io/) (Real-time Streaming)                                                                      |
| **Backend Framework**    | [Fastify 5](https://fastify.dev/) (Headless SDK), Next.js API Routes                                                       |
| **Database**             | [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3), [Drizzle ORM](https://orm.drizzle.team/)                     |
| **AI Integration**       | [@anthropic-ai/claude-agent-sdk](https://github.com/anthropics/claude-code)                                                |
| **Terminal / Shell**     | [node-pty](https://github.com/microsoft/node-pty), [xterm.js](https://xtermjs.org/)                                        |
| **Local Proxy / Tunnel** | [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) (via ctunnel)                                             |

## 🚀 Hướng dẫn Setup nhanh (Quick Setup)

1. **Prerequisites**: Node.js 20+, pnpm 9+, Claude Code CLI.
2. **Cài đặt dependencies**:
   ```bash
   pnpm install
   ```
3. **Cấu hình môi trường**:
   Copy `.env.example` thành `.env` và điền các API keys cần thiết:
   ```bash
   cp .env.example .env
   ```
   Các biến quan trọng:
   - `ANTHROPIC_AUTH_TOKEN`: API key của Anthropic.
   - `ANTHROPIC_MODEL`: Model mặc định (ví dụ: `claude-3-7-sonnet-20250219`).
4. **Chạy dự án ở chế độ development**:
   ```bash
   pnpm dev
   ```
5. **Truy cập giao diện**: Mở trình duyệt tại `http://localhost:8556`.

## 📁 Cấu trúc thư mục chính

```text
claude-ws/
├── src/                        # Ứng dụng Next.js chính
│   ├── app/                    # Routes & Pages
│   ├── components/             # UI Components (Radix UI, shadcn-like)
│   ├── lib/                    # Business Logic, AI Orchestration, DB
│   ├── stores/                 # Zustand Stores (Client state)
│   └── types/                  # TypeScript Types & Interfaces
├── server.ts                   # Custom Server entrypoint (Fastify + Next.js + Socket.io)
├── packages/
│   └── agentic-sdk/            # Headless Fastify backend (Pure API)
├── drizzle/                    # Database migrations (SQLite)
├── locales/                    # i18n
├── public/                     # Static assets (images, swagger docs)
└── scripts/                    # Maintenance & Build scripts
```

## 📚 Tài liệu điều tra liên quan

- [Tổng quan dự án (Overview)](./overview.md)
- [Kiến trúc hệ thống (Architecture)](./architecture.md)
- [Cơ chế phát hiện Claude Code CLI (CLI Detection)](./cli-detection.md)
- [Tính năng chính (Features)](./features.md)
- [Hạn chế và Cải tiến (Limitations & Improvements)](./limitations_and_improvements.md)
- [Ghi chú thu hoạch (Harvest)](./harvest.md)
