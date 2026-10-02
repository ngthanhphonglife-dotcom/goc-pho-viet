# [PHASE 8 — KHÁCH HÀNG + ĐƠN HÀNG] Báo cáo

## Đã làm
- **Khách tự đến**: 4 loại — Khách văn phòng, Học sinh, Shipper, Khách ghé quán — đi từ hai đầu phố (tự tránh vật cản) tới xếp hàng: 1 người trước quầy + 5 người hàng chờ, tối đa 6. Người trước đi thì người sau dồn lên.
- **Tần suất khách** theo giờ (cao điểm sáng 6–9h, trưa 11–13h, tối 17–20h), thời tiết (mây ×0,9; mưa nhẹ ×0,6; mưa lớn ×0,3) và uy tín (tối đa +50%). Sau 22:00 không có khách mới.
- **Gọi món**: mỗi loại khách có sở thích riêng (học sinh thích trà tắc, văn phòng/shipper thích cà phê), trời mưa chuộng cà phê, nắng nóng chuộng trà tắc; chỉ gọi món đã mở. Trên đầu khách có bong bóng món + thanh kiên nhẫn; kiên nhẫn khác nhau theo loại (shipper vội nhất).
- **Bảng Đơn hàng** (nút Bán hàng hoặc chạm khách đầu hàng): danh sách khách kèm chân dung, món, giá, thanh kiên nhẫn chạy trực tiếp. Khách đầu hàng có 3 nút: **Giao ly pha sẵn** (lấy ly ngon nhất trên khay), **Pha ngay** (minigame), **Hết món**. Đang ở xa thì chủ quầy tự đi về quầy rồi bảng mới mở. Nút Bán hàng có huy hiệu số khách đang chờ.
- **Thanh toán**: tiền = giá món + tip (ly Tuyệt hảo: +10% giá; phục vụ nhanh: +1.000đ). Uy tín: hài lòng +2, bình thường +1, tạm 0. Khách hiện tim / dấu chấm rồi rời phố. Hết kiên nhẫn → bỏ đi, −2 uy tín (không xuống dưới 0).
- **Nhiệm vụ "Bán 20 ly cà phê"** đếm thật (cà phê đen + cà phê sữa); đủ 20 ly nhận 100.000đ, +10 uy tín.
- **Số liệu trong ngày** (số ly, doanh thu, tip, hài lòng, bình thường, bỏ đi) được ghi để dùng cho bảng tổng kết Phase 10.
- Mở bảng thì kiên nhẫn tạm dừng. Sang ngày mới / về menu: dọn hàng khách. Khách bỏ đi trong lúc đang pha → ly được để lên khay.

## Kiểm tra (Playwright, 5 màn hình)
Khách tới đúng chỗ trước quầy, có bong bóng · bảng Đơn hàng đúng nội dung, nút đủ lớn, không tràn màn hình · mở bảng thì kiên nhẫn dừng · Pha ngay Tuyệt hảo: +25.000đ +4.000đ tip, +2 uy tín, trừ nguyên liệu, nhiệm vụ 1/20 · giao ly pha sẵn lấy ly ngon nhất, không trừ nguyên liệu · ly Tạm được không tip · ly thứ 20 hoàn thành nhiệm vụ · hàng tối đa 6, không ai đứng chồng · Hết món không mất uy tín, người sau dồn lên · hết kiên nhẫn −2 uy tín, không âm · thiếu nguyên liệu khoá nút · ở xa bấm Bán hàng → về quầy rồi mở · chạm khách đầu hàng mở bảng · tần suất cao điểm > thấp điểm, mưa < nắng, khuya = 0 · học sinh gọi trà tắc nhiều hơn cà phê đen · ngày mới dọn khách · test Phase 0–7 vẫn đạt.

## Ghi chú
- Nhân vật khá to nên hàng 6 người đứng sát nhau và che xe cà phê; sẽ cân lại kích thước/khoảng cách ở Phase 24 (polish).
- Khách dùng chung hình với 4 người đi bộ của Phase 3 (chưa có hình riêng cho từng loại khách).
- Phase tiếp theo: **Phase 9 — Tạp hoá Cô Ba** (mua nguyên liệu).
