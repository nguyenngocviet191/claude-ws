# PRODUCT REQUIREMENTS DOCUMENT (PRD): CLAUDE WORKSPACE

**Project Name:** Claude Workspace (claude-ws)
**Owner:** Claude Workspace
**Status:** Active Development / Expanded Business Hub Vision
**Tech Stack Goal:** Next.js, React, Fastify, SQLite, Drizzle ORM, Socket.io, Claude Agent SDK

---

## 1. Tầm nhìn & Mục tiêu (Vision & Objectives)
* **Tầm nhìn:** Xây dựng một workspace local-first nơi solo CEO, indie builder và nhóm nhỏ có thể vận hành cả công việc phát triển phần mềm lẫn hoạt động kinh doanh hằng ngày bằng AI agents trong một giao diện thống nhất.
* **Mục tiêu:**
    * Hợp nhất quản lý repo, task, hội thoại AI, chỉnh sửa mã nguồn, terminal và Git , xem trước UI vào cùng một sản phẩm desktop-web.
    * Giảm chi phí chuyển ngữ cảnh giữa các công cụ phát triển bằng cách gắn lịch sử hội thoại, file, shell và checkpoint trực tiếp vào task.
    * Cung cấp một backend headless để người dùng có thể tự động hóa luồng làm việc qua REST và SSE mà không phụ thuộc UI.
    * Cung cấp cli app để người dùng có thể tự động hóa luồng làm việc qua REST và SSE mà không phụ thuộc UI.
    * Mở rộng từ developer workspace thành business hub, nơi agent có thể xử lý inbox, lịch, hỗ trợ khách hàng và workflow vận hành.

---

## 2. Chân dung người dùng (User Persona)
* **Solo CEO / Indie Builder:** Cần một workspace duy nhất để vừa xây dựng sản phẩm vừa điều hành vận hành kinh doanh với AI support.
* **AI-first Developer:** Cần theo dõi task, giữ lịch sử Claude conversation, chỉnh sửa code, chạy terminal và thao tác Git mà không phải chuyển sang nhiều ứng dụng.
* **Small Product Team:** Cần một môi trường local-first có thể dùng chung quy trình Kanban, review diff, checkpoint và headless API để tích hợp vào automation nội bộ.

---

## 3. Yêu cầu chức năng (Functional Requirements)

### FR1: Quản lý công việc & ngữ cảnh hội thoại (Task and Conversation Management)
* Hệ thống phải cung cấp Kanban board với các trạng thái công việc rõ ràng để người dùng theo dõi tiến độ task.
* Mỗi task phải lưu được lịch sử hội thoại AI, attempt thực thi và log liên quan để giữ nguyên ngữ cảnh làm việc.
* Người dùng phải có khả năng lưu checkpoint và quay lại một trạng thái hội thoại trước đó khi cần thử nhánh giải pháp khác.

### FR2: Workspace phát triển tích hợp (Integrated Development Workspace)
* Hệ thống phải cung cấp code editor dạng nhiều tab với syntax highlighting cho các ngôn ngữ phổ biến và hỗ trợ AI suggestions.
* Hệ thống phải cung cấp terminal tích hợp để chạy lệnh trong cùng project context.
* Người dùng phải có thể xem, sửa và điều hướng file dự án mà không cần rời workspace.

### FR3: Git workflow trong giao diện (Built-in Git Workflow)
* Hệ thống phải hỗ trợ xem Git status, stage file, commit, diff và lịch sử thay đổi trong giao diện.
* Người dùng phải có thể kiểm tra thay đổi trước khi commit bằng diff trực quan.
* Git workflow phải được gắn với project đang mở để tránh thao tác sai repository.

### FR4: Tương tác AI theo thời gian thực (Real-time AI Execution)
* Claude response phải được stream theo thời gian thực để người dùng thấy tiến trình trả lời hoặc thực thi.
* UI phải hiển thị trạng thái chạy, log và kết quả attempt theo từng task.
* Hệ thống phải hỗ trợ model configuration qua biến môi trường để người dùng dùng Anthropic API trực tiếp hoặc proxy tùy chỉnh.

### FR5: Mở rộng bằng agent và plugin (Extensibility with Agents and Plugins)
* Hệ thống phải cho phép đăng ký custom skills, commands hoặc agents thông qua Agent Factory.
* Plugin/agent phải có thể được quản lý theo dự án hoặc toàn cục để phù hợp nhiều cách dùng khác nhau.
* Agentic SDK phải cung cấp REST + SSE để các automation hoặc client khác có thể dùng cùng logic backend.

### FR6: Vận hành local-first và truy cập từ xa an toàn (Local-first Operation and Secure Access)
* Dữ liệu dự án và ứng dụng phải được lưu local-first bằng SQLite để người dùng giữ quyền kiểm soát dữ liệu.
* Hệ thống phải hỗ trợ `API_ACCESS_KEY` cho các API không công khai.
* Người dùng phải có thể thiết lập remote access an toàn qua tunnel để dùng workspace ngoài máy local khi cần.

### FR7: Business Hub mở rộng cho solo operators (Future Business Hub Expansion)
* Sản phẩm phải chuẩn bị nền tảng để tiếp nhận claw agents cho các tác vụ kinh doanh như email, calendar, social media và customer support.
* Hệ thống phải hướng tới một multi-channel inbox hợp nhất để agent và người dùng xử lý tin nhắn từ nhiều nguồn trong cùng workspace.
* Hệ thống phải hỗ trợ workflow automation trực quan để nối nhiều agent thành quy trình vận hành hoàn chỉnh.

### FR8: Cho phép nhìn trước UI 
* Hiển thị Preview UI của repo qua dev server

### FR9: Tương tác qua cli app
* có cli app wrap call api để tương tác không qua giao diện
---

## 4. Yêu cầu phi chức năng (Non-functional Requirements)
* **Local-first Reliability:** Dữ liệu cốt lõi phải tiếp tục khả dụng sau khi server restart; checkpoint, task history và database không được mất trong luồng sử dụng bình thường.
* **Performance:** Các thao tác phổ biến như mở workspace, chuyển task, xem diff và stream phản hồi phải cho cảm giác phản hồi tức thời trong môi trường dự án cá nhân hoặc nhóm nhỏ.
* **Security:** Đường dẫn file và API phải có cơ chế chặn path traversal, xác thực key an toàn và hạn chế các điểm nhập liệu nguy hiểm.
* **Extensibility:** Kiến trúc phải hỗ trợ bổ sung feature mới qua package, plugin hoặc headless integration mà không buộc phải sửa toàn bộ UI.
* **Cross-platform Developer Experience:** Thiết lập và chạy sản phẩm phải hỗ trợ môi trường Node.js 20+ trên các hệ điều hành phát triển phổ biến.
* **Usability:** Giao diện phải duy trì trải nghiệm thống nhất giữa Kanban, editor, terminal, Git và AI chat để giảm chuyển ngữ cảnh cho người dùng.

---

## 5. Luồng người dùng (User Flow)
1. Người dùng cài đặt hoặc chạy `claude-ws` bằng `npx`, global install hoặc từ source rồi mở workspace trên trình duyệt local.
2. Người dùng cấu hình API key/model cần thiết và kết nối project đang làm việc.
3. Người dùng tạo hoặc chọn một task trên Kanban board để bắt đầu một phiên làm việc có ngữ cảnh.
4. Người dùng trao đổi với AI, chỉnh sửa file trong editor, chạy lệnh trong terminal và kiểm tra thay đổi Git ngay trong cùng giao diện.
5. Khi cần, người dùng lưu checkpoint để giữ lại trạng thái hội thoại hoặc thử một hướng xử lý khác.
6. Nếu muốn tự động hóa hoặc tích hợp ngoài UI, người dùng gọi Agentic SDK qua REST/SSE với cùng mô hình dữ liệu và logic backend.
7. Trong giai đoạn business hub, người dùng thêm claw agents và workflow để xử lý các tác vụ vận hành ngoài code từ cùng workspace.

---

## 6. Tiêu chí nghiệm thu (Acceptance Criteria)
* [x] Người dùng mới có thể khởi chạy sản phẩm theo một trong ba cách được tài liệu hóa và truy cập được giao diện workspace local.
* [x] Người dùng có thể tạo hoặc chọn task, xem lịch sử hội thoại liên quan và lưu ít nhất một checkpoint cho task đó.
* [x] Người dùng có thể mở file trong editor, thực hiện ít nhất một thao tác terminal và xem trạng thái Git của cùng project trong một phiên làm việc.
* [ ] Claude response hoặc execution log được stream theo thời gian thực thay vì chỉ trả kết quả sau cùng.
* [ ] Headless backend có thể khởi động độc lập và expose API phục vụ automation hoặc integration ngoài UI.
* [x] Khi `API_ACCESS_KEY` được cấu hình, các API được bảo vệ yêu cầu key hợp lệ trước khi trả dữ liệu.
* [ ] Tài liệu sản phẩm vẫn phản ánh rõ ràng sự tách biệt giữa tính năng đã phát hành và các tính năng business hub đang planned.
trả dữ liệu.
* [x] Xem được Preview UI
---

