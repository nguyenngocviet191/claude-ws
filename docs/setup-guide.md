# Cài đặt và Chạy Claude Workspace (Dev Mode)

Để cài đặt và chạy dự án này ở chế độ phát triển (dev mode), bạn làm theo các bước sau:

## 1. Yêu cầu hệ thống
- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0 (Bắt buộc theo rule dự án)
- **Claude Code CLI**: Đã được cài đặt trên máy

## 2. Cài đặt các gói phụ thuộc (Dependencies)
Sử dụng `pnpm` để cài đặt:
```bash
pnpm install
```

## 3. Cấu hình môi trường
Sao chép file `.env.example` thành `.env` và điền các thông tin cần thiết:
```bash
cp .env.example .env
```
Các thông số quan trọng:
- `ANTHROPIC_AUTH_TOKEN`: Token của bạn từ Anthropic
- `ANTHROPIC_MODEL`: Model mặc định sử dụng (vạch định: `claude-3-7-sonnet-latest`)

## 4. Chạy dự án ở chế độ Dev
Bạn có thể chạy trực tiếp bằng lệnh pnpm:
```bash
pnpm dev
```
Lệnh này sẽ thực thi: `cross-env CLAUDECODE= tsx server.ts`.

## 5. Chạy qua npx (Nếu bạn muốn thử nhanh hoặc chạy binary nội bộ)
Dự án có định nghĩa binary trong `package.json`. Để chạy binary nội bộ ở chế độ dev (nếu đã cài đặt):
```bash
npx claude-ws
```
*Lưu ý: Để chạy thực sự ở "dev mode" của mã nguồn, cách tốt nhất vẫn là dùng `pnpm dev`.*

## 6. Truy cập
Sau khi khởi động thành công, hãy truy cập: [http://localhost:8556](http://localhost:8556)
