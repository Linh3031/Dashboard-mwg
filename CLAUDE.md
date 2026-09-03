# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Dự án

Svelte 5 + Vite dashboard báo cáo doanh thu/nhân sự (nhiều siêu thị/kho), kèm module thi đua, chấm công, xuất báo cáo. State tập trung ở `src/stores.js`. Backend là Firebase (Auth + Firestore + Storage, project `qlst-9e6bd`), cấu hình ở `src/services/firebase.service.js`.

## Commands

```bash
npm run dev       # chạy dev server (Vite)
npm run build     # build production ra dist/
npm run preview   # preview bản build
npm run check     # svelte-check (type/diagnostics check)
```

- Không có test suite (không có Vitest/Jest) và không có lint script trong repo này — đừng giả định tồn tại.
- Sau khi sửa code, chạy `npm run build`, fix đến khi build sạch, và báo lại output thật (không tự khẳng định đã xong).
- Deploy qua Firebase Hosting (`firebase.json`, public dir là `dist`) — không tự ý deploy, chỉ báo cho người dùng nếu được yêu cầu.

## Kiến trúc

- `src/main.js` — entry point, khởi tạo Firebase, mount `App.svelte`, xử lý fast-boot (hydrate từ localStorage trước khi chờ Firebase) và cơ chế tự F5 khi phát hiện version mới hoặc lỗi nạp chunk.
- `src/App.svelte` — component gốc, điều phối tab (`activeTab` store), các modal/drawer toàn cục, và luồng xác thực.
- `src/stores.js` — toàn bộ state dùng chung (Svelte stores: `writable`/`derived`). Nhiều store tự đồng bộ hai chiều với `localStorage` (và sự kiện `storage` để đồng bộ cross-tab), ví dụ `competitionNameMappings`, `luykeNameMappings`, `composerTemplates`. File dùng chung — sửa cần cảnh báo trước (xem phần Nguyên tắc bảo trì).
- `src/config.js` — cấu hình tĩnh dùng chung: mapping tên cột Excel/ERP (`COLUMN_MAPPINGS`, có alias tiếng Việt cho từng loại file nguồn), mật khẩu admin, v.v. File dùng chung — sửa cần cảnh báo trước.
- `src/services/` — logic nghiệp vụ và tích hợp:
  - `src/services/processing/` — parser và xử lý dữ liệu thô (Excel/ERP export). Đây là nơi đặt logic nghiệp vụ, KHÔNG đặt trong component. Có `parsers/` (theo nguồn dữ liệu: `erp.parser.js`, `luyke.parser.js`, `cluster.parser.js`, `employee.parser.js`, `thidua.parser.js`) và `logic/` (theo domain xử lý: `dailyTrend.processor.js`, `competition.processor.js`, `regional.processor.js`, `timekeeping.processor.js`...).
  - `src/services/reports/` — build báo cáo tổng hợp theo domain (`master.report.js`, `detail.report.js`, `competition.report.js`, `installment.report.js`, `multiMonth.report.js`, `general.report.js`).
  - `src/services/data/` — cache, file handler, paste handler, sync handler cho luồng nhập dữ liệu.
  - `src/services/auth.service.js` — auth cho người dùng thường (login/logout, lắng nghe trạng thái Firebase Auth, kéo profile Firestore). `src/services/adminAuth.service.js` — tạo user phụ qua secondary Firebase app (dành cho admin tạo tài khoản mới mà không làm mất phiên đăng nhập hiện tại). Hai file này KHÔNG phải trùng lặp — đừng gộp.
  - `src/services.js` (root, không phải thư mục `services/`) — facade cũ, gộp `dataProcessing`, `reportService`, `composerService` thành object `services`. `src/utils.js` (root) cũng là file legacy tương tự, tách biệt với thư mục `src/utils/`. Khi tìm hàm, kiểm tra cả bản root lẫn bản trong thư mục con vì tên dễ trùng.
- `src/components/` — chia theo domain: `luyke`, `health-staff`, `realtime`, `admin`, `modals`, `drawers`, `data-section`, `common`. Toàn bộ component hiện tại viết theo cú pháp Svelte 4 (`export let`, `on:click`) dù `package.json` khai báo Svelte 5 — bám theo phong cách Svelte 4 khi sửa file cũ, không tự chuyển sang runes (`$state`, `$props`) trừ khi được yêu cầu.
- `src/styles/` — CSS dùng chung, nhiều file gắn với class cụ thể của component (`components.css`, `tables.css`, `dashboard-luyke.css`, `specific-*.css`...). File dùng chung — sửa cần cảnh báo trước.
- `src/utils/formatters.js` — format số/tiền/ngày dùng chung; luôn dùng hàm ở đây, không tự viết lại logic format. File dùng chung — sửa cần cảnh báo trước.
- File Excel snapshot (`SNAP_*.txt`, `structure.txt`, tạo bởi `create_snapshot.cjs`/`make_snapshot.js`) là bản dump cấu trúc/code để tham khảo nhanh, không phải nguồn chân lý — luôn ưu tiên đọc file source thật trong `src/`.

# Nguyên tắc bảo trì

Bạn là người bảo trì codebase này, không phải người dọn dẹp.
Code cũ xấu nhưng đang chạy thì GIỮ NGUYÊN.

## Root element là bất khả xâm phạm

Thẻ HTML ngoài cùng của mỗi component là giao diện với layout cha và với CSS trong `src/styles/`.

- KHÔNG thêm, xoá, hoặc sửa class của thẻ root, trừ khi được yêu cầu đích danh.
- Cần style thêm thì bọc một `div` wrapper BÊN TRONG root, không đụng vào root.

## Sửa đúng chỗ cần sửa

- Không refactor tiện tay: không đổi tên biến, không sắp xếp lại import, không "cải thiện" code nằm ngoài phạm vi yêu cầu.
- Bám theo phong cách của chính file đang sửa. File dùng Svelte 5 runes (`$state`) thì viết runes; file dùng Svelte 4 (`export let`) thì viết `export let`. Không trộn hai phong cách trong một file.

## Layout

- Không tự ý dùng `fixed`, `w-screen`, `h-screen`, hoặc `absolute` khi không có cha `relative`.
- Ưu tiên `w-full` hơn width cứng bằng px.
- Phần tử chứa text dài phải có `overflow-hidden` hoặc `truncate`.

## Phạm vi

Chỉ làm đúng thứ được giao. Không tự thêm animation, validation, error handling, hay tính năng "cho đủ bộ" nếu không có trong yêu cầu.

## IMPORTANT: cảnh báo trước khi sửa

Nếu yêu cầu buộc phải làm một trong các việc sau thì DỪNG LẠI và báo trước, chờ tôi đồng ý:

- Động vào layout của component cha
- Sửa file dùng chung: `src/stores.js`, `src/styles/*`, `src/utils/formatters.js`, `src/config.js`
- Đổi signature của hàm đang được nhiều nơi gọi
- Thêm thư viện mới

# Kiểm tra

Sửa xong chạy `npm run build`, fix đến khi build sạch. Báo lại output thật, không tự khẳng định là đã xong.
