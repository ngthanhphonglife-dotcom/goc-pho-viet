# [PHASE 9 — TẠP HOÁ CÔ BA] Báo cáo (kèm bản 0.8.2: âm thanh hiệu ứng + hình khách riêng)

## 0.8.2 — Âm thanh hiệu ứng
- 15 âm tự tổng hợp bằng Web Audio (không dùng file âm thanh nào): bấm nút, mở/đóng bảng, tiền vào, mua hàng, pha chuẩn / được / lệch, pha xong, chuông khách tới, khách bỏ đi, hoàn thành nhiệm vụ, tiếng chữ chạy trong hội thoại, sang ngày mới, báo lỗi; thêm tiếng mưa nền theo cường độ mưa.
- Âm lượng theo thanh **Hiệu ứng** trong Cài đặt (kéo về 0 là tắt). Trình duyệt chỉ cho phát sau lần chạm đầu tiên.
- Nhạc nền và âm môi trường nhiều lớp vẫn thuộc Phase 19.

## 0.8.2 — Hình khách riêng
- 9 nhân vật khách vẽ mới, không trùng hàng xóm có tên: văn phòng (nam cà vạt đỏ, nữ vest xanh), học sinh (nam tóc dựng, nữ hai búi), shipper (cam, xanh dương), khách ghé quán (du khách nón rộng vành + máy ảnh, chú tóc hoa râm đeo kính, cô búi tóc xách giỏ). Mỗi loại khách chọn ngẫu nhiên một hình trong nhóm của mình; bảng Đơn hàng dùng đúng chân dung.

## Phase 9 — Tạp hoá Cô Ba
- **Bảng mua hàng**: 8 nguyên liệu bán theo gói (cà phê hạt 500 g 60.000đ, sữa đặc 380 ml 25.000đ, sữa tươi 1 lít 28.000đ, đường 1 kg 20.000đ, đá 40 viên 10.000đ, trà 100 g 30.000đ, tắc 20 quả 15.000đ, ly 50 cái 25.000đ). Mỗi dòng: số đang có trong kho (cảnh báo sắp hết / hết), giá, nút − số lượng +. Có tiền hiện có, tổng tiền, nút Mua hàng (khoá khi giỏ trống; đổi thành "Không đủ tiền" khi thiếu).
- **Giá theo ngày**: mỗi ngày mỗi món lệch tối đa ±15% giá gốc, cố định theo số ngày, làm tròn 500đ, có ▲ / ▼. Ngày 1 đúng giá gốc.
- **5 lối mở**: nút Cửa hàng, nút "+" cạnh tiền, nút trong bảng Nguyên liệu, chạm tiệm Cô Ba, chọn "Con muốn mua ít nguyên liệu" khi nói chuyện. Đang ở xa thì chủ quầy đi tới tiệm rồi bảng mới mở.
- **Giờ mở cửa** 06:00–21:00; ngoài giờ báo "đóng cửa".
- Mua xong: trừ tiền, cộng kho, ghi chi phí trong ngày (cho Phase 10), tự lưu. Chỉ dùng tiền trong game.

## Kiểm tra (Playwright, 5 màn hình)
Giá ngày 1 = giá gốc · 8 ngày tiếp: bội số 500, trong ±15%, có tăng có giảm, cố định · nút +/− (không âm), tổng tiền · mua: tiền, kho, chi phí, save · thiếu tiền khoá · đóng cửa sau 21:00 · nút "+" mở tạp hoá · ở xa đi tới tiệm rồi mới mở · mở từ hội thoại Cô Ba · âm thanh: tap/open/close/buy/arrive/perfect/good/miss/done/coin đều phát; âm lượng 0 thì không phát · khách đúng nhóm hình, mỗi nhóm ≥ 2 kiểu, đủ 9 atlas · lưu/mở lại · test Phase 0–8 vẫn đạt.

## Ghi chú
- Phase tiếp theo: **Phase 10 — Kết thúc ngày + Thống kê**.

## Phạm vi kiểm tra lần này
Máy test chạy chậm hơn trước nên không chạy đủ cả bộ trên 5 màn hình: Phase 0, 3, 6, 7, 8, 9 chạy trên cả 5 màn hình; Phase 1, 2, 4, 5 chạy trên 2 màn hình (360×640 và iPhone 15). Tất cả đều đạt. Hai bài trên iPhone 15 Pro Max lần đầu hỏng vì hết thời gian chờ (máy vẽ quá chậm), chạy lại với thời gian chờ dài hơn thì đạt. Hai bài cũ được sửa cho khớp thay đổi: Phase 3 (số bộ hình nhân vật 9 → 18) và Phase 6 (tắt khách tự đến sau khi tải lại trang để uy tín không bị trừ ngẫu nhiên).
