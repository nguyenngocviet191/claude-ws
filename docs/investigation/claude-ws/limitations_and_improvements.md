# Giới hạn & Đề xuất Nâng cấp (Limitations & Improvements)

## ⚠️ Nhược điểm & Hạn chế Hiện tại (Limitations)

1.  **Hiệu năng trên Windows (node-pty)**: Việc quản lý nhiều terminal và shell tiến trình có thể tiêu tốn nhiều tài nguyên của hệ thống trên Windows, đặc biệt nếu có quá nhiều instance agent đang chạy.
2.  **Thiếu Khả năng Scale ngang**: Hiện tại, cơ sở dữ liệu là SQLite local, do đó không thể mở rộng theo kiến trúc phân tán (Distributed Architecture). Mỗi dự án bị giới hạn ở một file DB duy nhất.
3.  **Hệ thống Auth Đơn giản**: Việc bảo vệ API chỉ qua một `API_ACCESS_KEY` đơn lẻ trong môi trường remote có rủi ro nếu key bị rò rỉ.
4.  **Hỗ trợ MCP File-based**: Các MCP server hiện tại phải được liệt kê cứng trong các file `.json`. Việc cài đặt/quản lý MCP server qua giao diện người dùng (UI) còn sơ khai.
5.  **Quản lý Dependency**: Việc cài đặt dependencies của MCP server nếu có (với npm/pnpm) có thể gây xung đột nếu runtime không được môi trường hóa (ví dụ: dùng Docker).

---

## 🛠 Đề xuất Nâng cấp (Improvements)

### 📈 1. Database & Persistence Layer

- **Migrate to PostgreSQL**: Nếu người dùng muốn mở rộng dự án lên Cloud, nên hỗ trợ PostgreSQL (Drizzle vốn hỗ trợ tốt việc này).
- **Multi-Tenant Support**: Hỗ trợ nhiều tài khoản người dùng với các database schema riêng biệt.

### 🛡️ 2. Hệ thống Bảo mật & Identity

- **OAuth2 / OIDC Integration**: Sử dụng các dịch vụ xác thực chuyên nghiệp (Clerk, Auth0, Kinde) thay vì chỉ dùng static key.
- **Role-Based Access Control (RBAC)**: Phân quyền cho phép "View Only" hoặc "Full Agent Control".

### 💡 3. AI Orchestration & UX

- **Multi-Model Routing**: Cho phép gán model thông minh cho từng tác vụ (ví dụ: dùng Haiku cho tóm tắt và Opus cho coding phức tạp).
- **Visual Workflow Builder**: Thay vì chỉ là Kanban, hãy xây dựng giao diện kéo-thả (No-code/Low-code) để kết nối các Agent và Skills (tương tự n8n hoặc LangFlow).

### 🚀 4. Infrastructure & Deployment

- **Dockerization**: Container hóa ứng dụng để đảm bảo môi trường chạy Agent nhất quán trên mọi máy tính.
- **Serverless Edge Support**: Tối ưu hóa API routes để có thể chạy trên Cloudflare Workers hoặc Vercel Edge.

### 🧩 5. Plugin Ecosystem (Marketplace)

- **Agent Hub UI**: Xây dựng UI cho phép "duyệt và cài đặt" các OpenClaw Agent từ cộng đồng trực tiếp từ ứng dụng.
- **Skill Versioning**: Quản lý phiên bản cho các skill/plugin để tránh bị break khi mã nguồn gốc thay đổi.
