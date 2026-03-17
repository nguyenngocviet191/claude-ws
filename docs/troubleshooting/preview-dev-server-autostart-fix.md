# Bug Fix: Preview Dev Server Auto-Start Issue

## Issue

**Problem:** Dev server không tự động khởi động khi bấm vào preview icon.

**Date:** 2026-03-17

**Component:** `src/components/preview/preview-dialog.tsx`

## Root Cause Analysis

### Race Condition Description

Khi người dùng click vào preview icon, quá trình sau diễn ra:

1. `PreviewDialog` mở với `open = true`
2. `useEffect` (lines 58-65) gọi 2 hàm async song song:
   - `fetchProjectSettings(projectId)` - fetch cấu hình dev
   - `subscribeToProject(projectId)` - fetch danh sách shells đang chạy
3. Auto-start `useEffect` (lines 105-110) có dependency `projectSettings`
4. Khi `projectSettings` được load xong, effect re-run **ngay lập tức**
5. **Vấn đề:** `runningShells.length` vẫn bằng 0 vì shells chưa load xong từ API
6. Effect nghĩ không có server nào đang chạy → auto-start một shell mới
7. Sau đó, shells được load và có thể bị trùng lặp

### Technical Details

```typescript
// Shell store có loading state
interface ShellState {
  shells: Map<string, ShellInfo>;
  loading: boolean;  // ← Quan trọng: tracks khi shells đang được fetch
  // ...
}

// Trong PreviewDialog, loading state không được sử dụng
const { shells, subscribeToProject, spawnShell } = useShellStore();
//                                          ↑ missing loading

// Auto-start condition thiếu check loading
if (open && projectSettings?.devCommand && runningShells.length === 0 && !isStarting && !hasAutoStarted) {
  // ↑ Không check shells đã load xong chưa
  startDevServer();
}
```

## Solution

### Changes Made

**File:** `src/components/preview/preview-dialog.tsx`

**Change 1:** Thêm `shellsLoading` từ shell store

```diff
- const { shells, subscribeToProject, spawnShell } = useShellStore();
+ const { shells, subscribeToProject, spawnShell, loading: shellsLoading } = useShellStore();
```

**Change 2:** Thêm check `!shellsLoading` vào điều kiện auto-start

```diff
  // Auto-start if command exists and no shells are running, only after shells are loaded
  useEffect(() => {
-   if (open && projectSettings?.devCommand && runningShells.length === 0 && !isStarting && !hasAutoStarted) {
+   if (open && projectSettings?.devCommand && !shellsLoading && runningShells.length === 0 && !isStarting && !hasAutoStarted) {
      setHasAutoStarted(true);
      startDevServer();
    }
  }, [open, projectSettings, shellsLoading, runningShells.length, isStarting, hasAutoStarted, startDevServer]);
```

### Expected Behavior After Fix

Dev server chỉ auto-start khi:
1. Preview dialog đang mở (`open = true`)
2. `devCommand` đã được cấu hình trong project settings
3. **Shells đã load xong** (`!shellsLoading`)
4. Không có shell nào đang chạy (`runningShells.length === 0`)
5. Không đang start shell khác (`!isStarting`)
6. Chưa từng auto-start trong lần mở này (`!hasAutoStarted`)

## Testing Notes

Do lỗi pre-existing trong `packages/agentic-sdk/src/db/database-connection.ts`, build không thể hoàn thành. Để test fix:

1. Fix lỗi trong `packages/agentic-sdk/src/db/database-connection.ts`:
   ```diff
   - import * as schema from './database-schema.ts';
   + import * as schema from './database-schema';
   ```

2. Build project: `npm run build`

3. Start dev server: `npm run dev`

4. Test scenario:
   - Đảm bảo `devCommand` được cấu hình trong project settings
   - Đảm bảo không có shell nào đang chạy cho project
   - Click preview icon
   - Expected: Dev server tự động khởi động

## Impact

**Risk:** Low - chỉ thêm condition check, không thay đổi logic chính

**Scope:** Chỉ ảnh hưởng đến PreviewDialog component

**Breaking Changes:** None
