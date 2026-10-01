# [PHASE 1 — MỞ GAME] Báo cáo

## Đã làm
- **Splash** (logo vector + câu giới thiệu, chạm để bỏ qua) → **Loading** có tiến độ thật: font, logo, 17 icon, 9 lớp khu phố, bước dựng khu phố (nặng hơn). Thanh chỉ tăng, xe cà phê chạy theo, mẹo nhỏ đổi mỗi 3,5 giây. Lỗi mạng → "Thử lại".
- **Menu chính** nằm trên nền khu phố: Chơi mới / Tiếp tục (hiện "Ngày X · số tiền", khoá khi chưa có ván) / Cài đặt, số phiên bản.
- **Chơi mới**: bảng thông số khởi đầu (Ngày 1 · Thứ Hai, 06:00, 1.000.000đ, uy tín 0); có ván cũ thì cảnh báo ghi đè + nút "Bắt đầu lại".
- **Lưu game**: lưu ngay khi bắt đầu, mỗi 30 giây, khi ẩn app/đóng tab, khi về menu. Kiểm tra cấu trúc khi đọc; giữ **bản dự phòng**; save chính hỏng → tự khôi phục từ dự phòng; cả hai hỏng → báo và mời chơi mới.
- **Cài đặt**: Âm nhạc, Hiệu ứng (0–100), Rung (bật/tắt, rung nhẹ khi bấm nút trên máy hỗ trợ). Lưu riêng, giữ qua lần mở sau. Mở từ menu hoặc nút ⚙ trong game (có "Về Menu").
- Chuyển cảnh mờ dần, khoá thao tác trong lúc chuyển. Master UI Phase 0 giữ nguyên bố cục.

## Kiểm tra (Playwright, 5 màn hình: 360×640@3, 390×844@3, 430×932@3 có tai thỏ, 412×915@2.625, iPad 768×1024@2)
- Phase 0 (giữ nguyên): font, không đè, trong safe area, chữ không cắt, khu phố sắc nét, 12 nút bấm trúng & đủ lớn, PWA.
- Phase 1: splash → loading tăng dần tới 100% → menu đúng vùng an toàn, nút ≥ 44px; chơi mới → lưu → tải lại → tiếp tục đúng dữ liệu; tự lưu khi rời trang; cảnh báo ghi đè; cài đặt lưu qua lần mở sau; về menu từ game; khôi phục bản dự phòng; báo lỗi khi save hỏng; lỗi mạng → Thử lại.

## Sửa trong lúc làm
- `.screen { display:flex }` đè thuộc tính `hidden` → thêm luật `[hidden]{display:none !important}`.
- Nút "Về Menu chính" xuống 2 dòng → rút gọn "Về Menu".

## Ghi chú
- Âm thanh thật có ở Phase 19; mức chỉnh đã lưu sẵn.
- Lộ trình được sắp xếp lại theo 20 bảng tham chiếu (xem `ROADMAP.md`). Phase tiếp theo: **Phase 2 — Thế giới mở rộng + Camera**.
