# PHASE 8 — KHÁCH HÀNG + ĐƠN HÀNG (prompt)

Tham chiếu: bảng 3.9, 3.8 §5–7. Master UI giữ nguyên; nút "Bán hàng" mở bảng Đơn hàng.

## Việc phải làm
1. **Khách tự đến**: 4 loại (văn phòng, học sinh, shipper, khách ghé quán) đi từ đầu phố tới xếp hàng trước xe cà phê, tối đa 6 người. Tần suất theo giờ (cao điểm sáng, trưa, tối), thời tiết (mưa ít khách) và uy tín. Sau 22:00 không có khách mới.
2. **Gọi món**: mỗi khách chọn món theo sở thích loại khách + thời tiết; bong bóng món + thanh kiên nhẫn trên đầu. Hết kiên nhẫn → bỏ đi, −2 uy tín.
3. **Bảng Đơn hàng** (nút Bán hàng / chạm khách đầu hàng): danh sách khách đang chờ; khách đầu hàng có nút **Giao ly pha sẵn** (nếu khay có đúng món), **Pha ngay** (minigame Phase 7), **Hết món** (mời khách đi, không mất uy tín). Phải đứng ở quầy: đang ở xa thì chủ quầy tự đi về rồi mới mở bảng.
4. **Thanh toán**: nhận tiền theo giá món + tiền tip khi ly Tuyệt hảo / phục vụ nhanh; uy tín +2 (hài lòng), +1 (bình thường), 0 (tạm). Khách hiện tim / biểu cảm rồi rời đi.
5. **Nhiệm vụ "Bán 20 ly cà phê"** đếm thật (cà phê đen + cà phê sữa). Số liệu trong ngày (số ly, doanh thu, hài lòng, bỏ đi) được ghi lại cho Phase 10.
6. Mở bảng thì kiên nhẫn tạm dừng. Sang ngày mới / về menu: hàng khách được dọn.

## Test (5 màn hình)
Khách đi tới đầu hàng, có đơn · Pha ngay → tiền, tip, uy tín, trừ nguyên liệu, nhiệm vụ +1 · giao ly pha sẵn · hết kiên nhẫn → bỏ đi, −uy tín · hàng tối đa 6, người sau dồn lên · Hết món · thiếu nguyên liệu khoá nút · ở xa bấm Bán hàng → về quầy rồi mở · tần suất cao điểm > thấp điểm, mưa < nắng · ly thứ 20 hoàn thành nhiệm vụ · test Phase 0–7 vẫn đạt.
