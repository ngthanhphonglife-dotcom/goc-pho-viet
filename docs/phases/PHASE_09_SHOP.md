# PHASE 9 — TẠP HOÁ CÔ BA (prompt)

Tham chiếu: bảng 3.4 §4, 3.19 §2. Master UI giữ nguyên.

## Việc phải làm
1. **Bảng Mua hàng**: 8 nguyên liệu bán theo gói (vd. cà phê hạt 500 g, đá 1 bịch 40 viên); mỗi dòng có biểu tượng, quy cách, giá, nút − số lượng +; tổng tiền; nút **Mua hàng** (khoá khi chưa chọn gì hoặc không đủ tiền). Hiện số đang có trong kho và nhãn "Sắp hết".
2. **Giá theo ngày**: mỗi ngày mỗi món lệch tối đa ±15% so với giá gốc (cố định theo số ngày, làm tròn 500đ), có mũi tên tăng/giảm. Ngày 1 đúng giá gốc.
3. **Cách mở**: nút Cửa hàng, nút "+" cạnh tiền, nút "Mua ở Tạp hoá Cô Ba" trong kho, chạm tiệm Cô Ba, hoặc chọn "Con muốn mua ít nguyên liệu" khi nói chuyện. Đang ở xa thì chủ quầy đi tới tiệm rồi bảng mới mở. Tiệm mở 06:00–21:00.
4. Mua xong: trừ tiền, cộng kho, ghi chi phí trong ngày (cho Phase 10), tự lưu. Chỉ dùng tiền trong game.

## Test (5 màn hình)
Giá ngày 1 = giá gốc · giá các ngày khác cố định, trong ±15%, bội số 500 · nút +/− và tổng tiền · mua: tiền giảm đúng, kho tăng đúng · không đủ tiền thì khoá · đóng cửa sau 21:00 · ở xa bấm Cửa hàng → đi tới tiệm rồi mở · 4 lối mở đều tới cùng bảng · lưu/mở lại · test Phase 0–8 vẫn đạt.
