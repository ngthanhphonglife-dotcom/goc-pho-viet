# PHASE 5 — THỜI GIAN, NGÀY/ĐÊM, THỜI TIẾT (prompt)

Tham chiếu: bảng 3.5 §1·§2·§3·§8, 3.4 §9. Chỉ học không khí; hiệu ứng tự làm bằng mã, không dùng ảnh tham chiếu.

## Việc phải làm
1. **Đồng hồ chạy**: 1 phút trong game = 0,8 giây thật (một ngày 06:00→24:00 ≈ 14 phút). Chỉ chạy khi đang trong game; tạm dừng khi mở bảng, ẩn app. Hết ngày → sang ngày mới 06:00 (tổng kết cuối ngày thuộc Phase 10).
2. **Ánh sáng theo giờ**: sáng sớm ấm → trưa trong → chiều vàng → hoàng hôn cam → chạng vạng tím → đêm xanh; bầu trời đổi màu, có sao ban đêm.
3. **Đèn buổi tối**: đèn đường trên 3 cột điện, đèn xe cà phê, đèn trong tiệm Chú Tư, Cô Ba, cửa sổ các nhà — tự sáng dần lúc chạng vạng.
4. **Thời tiết**: Nắng nhẹ / Nhiều mây / Mưa nhẹ / Mưa lớn; mỗi ngày 3 buổi (sáng, chiều, tối) theo dự báo cố định của ngày đó. Mưa có hạt mưa rơi, trời xám, mặt đường ướt dần và có vũng nước; tạnh thì khô dần. Nhiệt độ đổi theo giờ và thời tiết.
5. **HUD**: giờ, thứ, ngày, nhãn + biểu tượng thời tiết (nắng / mây / mưa / trăng) cập nhật trực tiếp; bấm ô thời tiết mở bảng **Dự báo hôm nay**.
6. Lưu giờ + thời tiết trong save. Master UI giữ nguyên bố cục.

## Test (5 màn hình)
Đồng hồ tăng đúng tốc độ, HUD đổi theo · mở bảng thì đồng hồ dừng · trưa sáng hơn đêm (lấy mẫu điểm ảnh), đêm có đèn · mưa lớn: có hạt mưa, đường ướt, HUD ghi "Mưa lớn" · tạnh mưa: hết hạt, khô dần · dự báo cố định theo ngày · 24:00 sang ngày mới · bảng dự báo đủ 3 buổi · lưu/mở lại đúng giờ · test Phase 0–4 vẫn đạt.
