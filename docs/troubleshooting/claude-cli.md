# Hướng dẫn sửa lỗi Claude Code CLI không phản hồi

Tài liệu này ghi lại các lỗi thường gặp liên quan đến việc Claude Code CLI không phản hồi tin nhắn hoặc không khởi chạy được trên môi trường Windows.

## 1. Không phản hồi chat (Lỗi Detection)

### Triệu chứng
Claude CLI được khởi chạy thành công nhưng không trả về kết quả hoặc bị treo khi gửi tin nhắn.

### Nguyên nhân
Dự án chủ động xóa biến môi trường `CLAUDECODE` ở một số nơi. Khi biến này bị thiếu, Claude CLI hoặc SDK subprocess không nhận diện được nó đang chạy trong một phiên tương tác của Claude Code, dẫn đến việc xử lý bị ngắt quãng hoặc không phản hồi.

### Cách khắc phục
Đảm bảo biến `CLAUDECODE` được giữ lại cho các subprocess.
- Trong `server.ts`: Comment out dòng `delete process.env.CLAUDECODE`.
- Trong `src/lib/providers/claude-sdk-provider.ts`: Không xóa `CLAUDECODE` khỏi `subprocessEnv`.

---

## 2. Lỗi `spawn EINVAL` hoặc không khởi chạy được trên Windows

### Triệu chứng
Server log thông báo lỗi `spawn EINVAL` ngay khi cố gắng khởi chạy Claude CLI.

### Nguyên nhân
1. **Thiếu `shell: true`**: Trên Windows, Claude được cài đặt dưới dạng file `.cmd`. Hàm `spawn` của Node.js yêu cầu option `{ shell: true }` để thực thi các file batch này.
2. **PATH bị lọc sai**: Một số logic cũ cố gắng làm sạch biến môi trường `PATH` bằng cách loại bỏ các thư mục hệ thống như `C:\Windows`. Điều này khiến Node.js không tìm thấy `cmd.exe` để chạy shell, dẫn đến lỗi khởi chạy.

### Cách khắc phục
1. Cấu hình `spawn` phù hợp cho Windows:
   ```typescript
   const child = spawn(claudePath, args, {
     cwd: projectPath,
     shell: process.platform === 'win32', // Bắt buộc cho Windows
     env: { ...process.env } // Giữ lại PATH hệ thống
   });
   ```
2. Không lọc bỏ các thư mục hệ thống quan trọng trong `PATH` khi chạy trên Windows.

---

## 3. Log rác từ Dotenv tràn ngập Terminal

### Triệu chứng
Mỗi khi Next.js reload hoặc route API được gọi, terminal hiện hàng chục dòng thông báo `[dotenv@17.2.4] injecting env...`.

### Cách khắc phục
Sử dụng tùy chọn `quiet: true` khi khởi tạo dotenv:
```typescript
dotenvConfig({ path: join(userCwd, '.env'), quiet: true });
```
