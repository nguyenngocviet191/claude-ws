# Claude Workspace FR Tracking

Nguồn đối chiếu:
- PRD: `docs/claude-workspace-prd.md`
- Repo state: kiểm tra code, routes, docs tính năng, README
- Ngày rà soát: 2026-03-22

## Functional Requirements

- [x] FR1: Quản lý công việc & ngữ cảnh hội thoại
  - Kanban board với các trạng thái task rõ ràng
  - Task có conversation history, attempt, log
  - Có checkpoint, rewind và fork
  - Bằng chứng: `src/components/kanban/board.tsx`, `src/components/task/conversation-view.tsx`, `src/components/task/interactive-command/checkpoint-list.tsx`

- [x] FR2: Workspace phát triển tích hợp
  - Có code editor nhiều tab, syntax highlighting, AI inline edit
  - Có terminal tích hợp trong project context
  - Có file browser / file tabs để xem-sửa-điều hướng file
  - Bằng chứng: `docs/features/code-editor.md`, `docs/features/terminal.md`, `src/app/[locale]/page.tsx`

- [x] FR3: Git workflow trong giao diện
  - Có Git status, stage, commit, diff, log, branch
  - Có diff trực quan trước khi commit
  - Git thao tác theo project đang mở
  - Bằng chứng: `src/app/api/git/status/route.ts`, `src/app/api/git/stage/route.ts`, `src/app/api/git/commit/route.ts`, `src/app/api/git/diff/route.ts`, `src/app/api/git/log/route.ts`, `docs/features/git-integration.md`

- [x] FR4: Tương tác AI theo thời gian thực
  - Claude response / execution log được stream realtime
  - UI có trạng thái chạy, log, attempt result
  - Có model configuration qua biến môi trường
  - Bằng chứng: `docs/real-time-events.md`, `packages/agentic-sdk/src/routes/attempt-sse-routes.ts`, `README.md`

- [x] FR5: Mở rộng bằng agent và plugin
  - Có Agent Factory cho plugin / skills / commands
  - Có quản lý plugin theo project
  - Có Agentic SDK REST + SSE cho headless automation
  - Bằng chứng: `packages/agentic-sdk/README.md`, `src/app/api/agent-factory/*`, `packages/agentic-sdk/src/routes/agent-factory-plugin-routes.ts`, `packages/agentic-sdk/src/routes/agent-factory-project-routes.ts`

- [x] FR6: Vận hành local-first và truy cập từ xa an toàn
  - Dữ liệu lưu local-first bằng SQLite
  - Có `API_ACCESS_KEY` cho API không công khai
  - Có remote access qua tunnel
  - Bằng chứng: `packages/agentic-sdk/src/db/database-connection.ts`, `src/app/api/auth/verify/route.ts`, `packages/agentic-sdk/src/plugins/fastify-auth-plugin.ts`, `src/app/api/tunnel/start/route.ts`

- [ ] FR7: Business Hub mở rộng cho solo operators
  - Chưa thấy triển khai đầy đủ OpenClaw / multi-channel inbox / business workflow automation
  - Hiện mới ở mức roadmap / planned
  - Bằng chứng: `README.md`, `docs/project-roadmap.md`

- [x] FR8: Cho phép nhìn trước UI
  - Có Preview UI qua dev server
  - Có preview dialog và preview proxy
  - Bằng chứng: `src/components/header/preview-button.tsx`, `src/components/preview/preview-dialog.tsx`, `server.ts`, `docs/features/preview-dev-server.md`

- [x] FR9: Tương tác qua cli app
  - Có CLI app và subcommands để tương tác ngoài UI
  - Bằng chứng: `bin/claude-ws.js`, `bin/lib/commands/*`, `package.json`

## Summary

- Đã triển khai: FR1, FR2, FR3, FR4, FR5, FR6, FR8, FR9
- Chưa triển khai đầy đủ: FR7

## Notes

- `TASKS.md` trước đó trống, chưa có tracking chính thức.
- Kết quả này là đối chiếu theo trạng thái code hiện tại của repo, không chỉ dựa vào mô tả trong PRD.
