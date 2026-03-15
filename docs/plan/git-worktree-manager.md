# Kiến trúc Git Worktree Manager

Hệ thống quản lý Git Worktree sẽ được triển khai dưới dạng một service trung tâm để điều phối vòng đời của các thư mục làm việc cô lập cho Agent.

## Luồng hoạt động (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User as Người dùng (UI)
    participant API as Task API
    participant SVC as Task Service
    participant GWM as Git Worktree Manager
    participant Git as Git CLI
    participant DB as SQLite DB
    participant Agent as Agent Execution

    User->>API: POST /api/tasks (useWorktree: true)
    API->>SVC: create(taskData)
    SVC->>GWM: setupWorktree(taskId, projectPath)
    GWM->>Git: git checkout -b worktree/task-ID
    GWM->>Git: git worktree add .worktrees/task-ID worktree/task-ID
    GWM-->>SVC: return worktreePath
    SVC->>DB: insert task (with worktreePath)
    SVC-->>API: Task Created
    API-->>User: Success

    Note over User, Agent: Khi Agent bắt đầu chạy
    User->>Agent: Start Task
    Agent->>DB: Get Task Details
    DB-->>Agent: worktreePath
    Agent->>Git: Set CWD = worktreePath
    Agent->>Git: Thực hiện thay đổi code
```

## Các thành phần chính

### 1. Cấu trúc thư mục
Các worktree sẽ được lưu trữ trong thư mục ẩn của project:
- `[Project Root]/.worktrees/task-[TASK_ID]/`

### 2. Quản lý Branch
- Mỗi task sử dụng worktree sẽ có một branch riêng (ví dụ: `agent/task-fix-bug-123`).
- Điều này giúp tránh xung đột với branch hiện tại của người dùng.

### 3. Đồng bộ hóa Agent
- `AgentManager` sẽ ưu tiên sử dụng `task.worktreePath` nếu nó tồn tại.
- Mọi công cụ (tools) của Agent như `read_file`, `write_to_file`, `run_command` sẽ được thực thi trong ngữ cảnh của worktree này.

### 4. Dọn dẹp (Cleanup)
- Khi task được xóa hoặc chuyển sang trạng thái `done`, hệ thống sẽ gọi `GWM.removeWorktree()`.
- Lệnh thực thi: `git worktree remove --force [path]` và xóa branch tương ứng.

## Ưu điểm
- **An toàn**: Code của người dùng được bảo vệ, Agent không làm hỏng workspace hiện tại.
- **Song song**: Người dùng và Agent có thể làm việc trên cùng một repo ở các folder khác nhau.
- **Dễ dàng Review**: Người dùng có thể `cd` vào thư mục worktree để kiểm tra các thay đổi của Agent trước khi merge.
