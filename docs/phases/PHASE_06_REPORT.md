# [PHASE 6 — HỘI THOẠI & NHIỆM VỤ CƠ BẢN] Báo cáo

## Đã làm
- **Khung hội thoại**: chân dung tròn + tên người nói, chữ chạy từng ký tự; chạm khung để hiện hết chữ hoặc sang câu tiếp; các lựa chọn trả lời hiện thành nút phía trên. Đang nói chuyện thì đồng hồ dừng, không điều khiển được nhân vật, người đi đường đứng lại nghe, nhân vật làm động tác nói.
- **8 chân dung** vẽ từ chính bộ nhân vật vector.
- **Lời thoại** (tự viết, giọng miền Nam): Chú Tư, Cô Ba, Mai có cây hội thoại đổi theo tiến độ nhiệm vụ và đổi câu chào theo giờ; Anh Hoàng, Lan, Nam, Shipper Minh có câu chào ngắn. Chọn "Con muốn mua ít nguyên liệu" với Cô Ba mở bảng Cửa hàng.
- **Hệ thống nhiệm vụ**:
  - Nói chuyện với chú Tư sửa xe → +50.000đ, +5 uy tín.
  - Làm quen khu phố (Chú Tư giao): chào Cô Ba, chào Mai, xem Bảng tin → +30.000đ, +3.
  - Dạo một vòng phố Hoa Sữa (Cô Ba giao): Nhà của bạn, Trạm xe buýt, biển Bờ sông → +40.000đ, +4.
  - Bán 20 ly cà phê: giữ trên HUD, sẽ đếm thật ở Phase 8.
- **3 bảng mới**: Nhiệm vụ mới (Nhận nhiệm vụ / Để sau — từ chối thì lần sau được mời lại), Hoàn thành nhiệm vụ (Nhận thưởng), Sổ nhiệm vụ (đang làm kèm từng việc đã tick + đã xong) mở từ nút Nhiệm vụ và từ Bảng tin khu phố.
- Bảng nhiệm vụ trên HUD hiện tiến độ thật (0/3 → 3/3); tiền và uy tín cộng khi nhận thưởng; tất cả nằm trong save.

## Kiểm tra (Playwright, 5 màn hình)
Chữ chạy, chạm hiện hết, nút lựa chọn đủ lớn và nằm trong màn hình · đồng hồ dừng khi hội thoại · thưởng đúng số, HUD đổi · nhận nhiệm vụ → 0/3 → 1/3 → 2/3 (chào lại không tính 2 lần) → Bảng tin → thưởng · Sổ nhiệm vụ đúng · từ chối rồi nhận lại · lưu/mở lại giữ tiến độ · đóng bảng thưởng bằng X vẫn nhận thưởng · người qua đường dừng lại khi nói chuyện · về menu giữa chừng không thưởng nhầm · test Phase 0–5 vẫn đạt.

## Sửa trong lúc làm
- Nút lựa chọn thấp hơn 40px trên điện thoại → tăng chiều cao tối thiểu.
- Về Menu khi đang nói chuyện làm nhiệm vụ tự hoàn thành → rời game giữa chừng thì cuộc nói chuyện không được tính.

## Thay đổi so với phase trước
- Chạm nhân vật giờ mở hội thoại (trước đây chỉ hiện tên). Bảng tin và nút Nhiệm vụ mở Sổ nhiệm vụ thật.

## Ghi chú
- Phase tiếp theo: **Phase 7 — Kinh doanh cà phê** (kho nguyên liệu, công thức, minigame pha chế).
