# Hỗ trợ Git Worktree khi gán Task
**Ngày tạo:** 2026-03-16

Mục tiêu là cho phép người dùng chọn chạy task trong một Git Worktree riêng biệt. Điều này giúp cô lập các thay đổi của agent, tránh ảnh hưởng đến thư mục làm việc hiện tại của người dùng.

## Proposed Changes

### DB Schema & Types
#### [MODIFY] `packages/agentic-sdk/src/db/database-schema.ts`
- Thêm cột `worktreePath` (text) vào bảng `tasks`.
- Thêm cột `useWorktree` (integer/boolean) vào bảng `tasks`.

### Services
#### [MODIFY] `packages/agentic-sdk/src/services/task-crud-and-reorder-service.ts`
- Cập nhật logic `create` để kiểm tra nếu `useWorktree` được bật.
- Nếu bật, thực hiện lệnh `git worktree add` để tạo folder mới.
- Lưu `worktreePath` vào database.

### API
#### [MODIFY] `src/app/api/tasks/route.ts`
- Nhận thêm field `useWorktree` từ request body.
- Chuyển tiếp field này xuống `taskService.create`.

### UI
#### [MODIFY] `src/components/kanban/create-task-dialog.tsx`
- Thêm checkbox "Sử dụng Git Worktree" (Use Git Worktree) trong form tạo task.
- Gửi giá trị này khi gọi `createTask`.

### Agent Execution
#### [MODIFY] `src/lib/agent-manager.ts`
- Khi bắt đầu một attempt, lấy thông tin task để kiểm tra `worktreePath`.
- Nếu có `worktreePath`, sử dụng nó làm `projectPath` cho agent.

## Verification Plan

### Automated Tests
- Tạo unit test cho `taskService.create` để đảm bảo lệnh `git worktree` được gọi chính xác.

### Manual Verification
1. Mở dialog tạo task mới.
2. Tích chọn "Sử dụng Git Worktree".
3. Nhấn "Tạo Task".
4. Kiểm tra trong file hệ thống xem thư mục worktree đã được tạo chưa.
5. Chạy task và xác nhận agent thực hiện thay đổi trong thư mục worktree chứ không phải thư mục gốc.
6. Xóa task và kiểm tra xem worktree có được dọn dẹp không (nếu có logic dọn dẹp).
