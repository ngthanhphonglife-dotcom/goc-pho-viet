# [PHASE 5 — THỜI GIAN, NGÀY/ĐÊM, THỜI TIẾT] Báo cáo

## Đã làm
- **Đồng hồ chạy**: 1 phút trong game = 0,8 giây thật, một ngày 06:00 → 24:00 dài khoảng 14 phút. Chỉ chạy khi đang trong game; dừng khi mở bảng, ẩn app, ở Menu. Hết 24:00 → màn hình mờ chuyển sang **ngày mới 06:00**, chủ quầy về sau quầy, tự lưu.
- **Ánh sáng theo giờ**: sáng sớm ấm → ban ngày trong → chiều vàng → hoàng hôn cam → chạng vạng tím → đêm xanh. Bầu trời đổi màu theo, ban đêm có sao và trăng khuyết. Nhân vật cũng đổi màu theo ánh sáng.
- **Đèn buổi tối** tự sáng dần từ chạng vạng: đèn đường mới gắn trên 3 cột điện (có vệt sáng dưới đất), đèn xe cà phê, đèn trong tiệm Chú Tư và Cô Ba, cửa sổ các nhà.
- **Thời tiết**: Nắng nhẹ / Nhiều mây / Mưa nhẹ / Mưa lớn. Mỗi ngày 3 buổi (sáng, chiều, tối) theo dự báo cố định của ngày đó; ngày 1 nắng suốt, buổi sáng không bao giờ mưa. Mưa có hạt rơi xiên, trời xám, mặt đường và vỉa hè ướt dần, có vũng nước; tạnh thì hạt mưa hết ngay còn đường khô từ từ. Chuyển thời tiết mượt, không giật.
- **HUD**: giờ, thứ, ngày, nhãn thời tiết, nhiệt độ (đổi theo giờ và thời tiết), biểu tượng nắng / mây / mưa / trăng (2 biểu tượng mới vẽ). Bấm ô thời tiết mở bảng **Dự báo hôm nay** (3 buổi, buổi hiện tại tô nổi).
- Giờ, ngày, thời tiết nằm trong save. Menu luôn hiển thị buổi sáng đẹp trời. Master UI giữ nguyên bố cục.
- HUD chỉ cập nhật phần thay đổi (không dựng lại danh sách nhiệm vụ mỗi phút).

## Kiểm tra (Playwright, 5 màn hình)
8 giây thật = 10 phút game, HUD đổi theo · mở bảng thì đồng hồ dừng · trưa: không đèn, màu trung tính; hoàng hôn ngả cam; đêm ngả xanh, đèn sáng hết, có sao; điểm ảnh ban đêm tối hơn ban ngày; quầng đèn đường sáng hơn vùng không đèn · 24:00 sang ngày mới + lưu · dự báo cố định theo ngày, 40 ngày có đủ 4 loại · mưa lớn: >120 hạt mưa, đường ướt, HUD "Mưa lớn", nhiệt độ giảm · tạnh: hết hạt, còn ướt · lưu và mở lại đúng ngày giờ · test Phase 0–4 vẫn đạt.

## Sửa trong lúc làm
- Lớp hiệu ứng trời/đường ướt bị xoá khi raster lại → chỉ xoá ảnh lớp, giữ hiệu ứng.
- Đèn ban đêm cháy sáng trắng quanh xe cà phê → giảm cường độ tổng.

## Ghi chú
- Thời tiết chưa ảnh hưởng lượng khách/món bán (Phase 8) và hành vi NPC (Phase 14).
- Tổng kết cuối ngày thuộc Phase 10; hiện tại hết ngày tự sang ngày mới.
- Phase tiếp theo: **Phase 6 — Hội thoại & Nhiệm vụ cơ bản**.
