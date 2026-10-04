# [PHASE 11 — UY TÍN & TIẾN TRÌNH] Báo cáo

## Đã làm
- **Cấp uy tín Lv.1–5**: Quán mới (0) · Được biết đến (30) · Quen thuộc (80) · Đông khách (160) · Nổi tiếng khu phố (280). Cấp đã đạt không tụt khi mất điểm.
- **Mở khoá theo cấp**: Lv.2 mở **Bạc xỉu** + khách văn phòng; Lv.3 mở **Trà đào** + shipper; Lv.4 khách tip thêm 1.000đ mỗi ly Ngon trở lên; Lv.5 thêm 2.000đ. Khách chỉ gọi món đã mở. Hai món mới có đủ 4 bước pha chế.
- **Bảng Lên cấp** hiện khi vượt mốc (nhảy nhiều cấp thì hiện lần lượt). **Bảng Uy tín**: chạm ô ngôi sao trên HUD — cấp hiện tại, thanh tiến độ, còn thiếu bao nhiêu điểm, danh sách 5 cấp.
- **Chuỗi nhiệm vụ chính** tự nối: Bán 20 ly cà phê → Đạt 30 uy tín → Bán 10 ly Bạc xỉu → Đạt 80 uy tín → Bán 10 ly Trà đào → Làm hài lòng 50 khách → Đạt 160 uy tín → Đạt 280 uy tín. Sổ nhiệm vụ gắn nhãn **Chính / Phụ**.
- **Nhiệm vụ hằng ngày**: mỗi ngày 3 việc (bán N ly, làm hài lòng N khách, thu X tiền, bán N ly một món đã mở — độ khó theo cấp), cố định theo ngày, sang ngày đổi bộ khác; nhận thưởng trong Sổ nhiệm vụ, mỗi việc một lần.
- Save cũ vào game nhận cấp theo điểm đang có, không hiện bảng lên cấp dồn. Master UI giữ nguyên bố cục.

## Kiểm tra (Playwright)
- Phase 11 trên 5 màn hình: mốc cấp · lên cấp hiện bảng, mở món, đổi loại khách · không tụt cấp · khách không gọi món chưa mở · chuỗi nhiệm vụ chính tự nối · nhiệm vụ ngày đếm đúng, nhận một lần, sang ngày đổi bộ · tip Lv.4 · bảng không tràn màn hình · lưu/tải giữ nguyên · save cũ.
- Phase 0, 6, 7, 8, 9, 10 chạy lại trên iPhone 15. Phase 1–5 và bài âm thanh không chạy lại ở bản này.

## Sửa trong lúc làm
- Ô Uy tín trên HUD không nhận chạm (HUD mặc định bỏ qua chạm) → bật riêng cho ô này.

## Ghi chú
- Trà đào hiện dùng trà + đường + đá (chưa có nguyên liệu "đào") — bổ sung khi cân bằng kinh tế ở Phase 22.
- Lồng tiếng vẫn tạm tắt.
- Phase tiếp theo: **Phase 12 — Nâng cấp quầy**.
