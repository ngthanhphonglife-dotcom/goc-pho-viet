# [PHASE 2 — THẾ GIỚI MỞ RỘNG + CAMERA] Báo cáo

## Đã làm
- **Phố Hoa Sữa dài 3 màn hình** (3240×2340), vẽ vector mới hoàn toàn:
  - Trái: Nhà của bạn (mái ngói, số 12, hộp thư), Hẻm 12, nhà xanh có cửa sắt xếp + **Bảng tin khu phố**; dù, bàn ghế xanh, ghế dài có mèo ngủ, 2 xe máy đỗ.
  - Giữa: giữ nguyên Phase 0 (Sửa xe Chú Tư, xe cà phê, Tạp hoá Cô Ba) + xe máy đang sửa, hộp đồ nghề, chú chó.
  - Phải: nhà mái tôn cửa gỗ xanh, cây hoa sữa nhỏ, nhà "Mặt bằng cho thuê", trạm xe buýt tuyến 08, ghế dài, xe đạp, biển "Bờ sông 200 m".
  - 3 cột điện nối dây suốt phố.
- **6 lớp chiều sâu**: trời (đứng yên) · nhà xa (0.25) · nhà sau (0.5) · mặt phố (1) · 32 đạo cụ riêng, xếp trước/sau theo vị trí chân · hoa tiền cảnh (1.25).
- **Camera**: kéo/lướt có quán tính, chặn ở hai đầu, phím ←/→, lăn chuột. Chỉ hoạt động trong game; vào game và về menu đều đưa về xe cà phê.
- **12 điểm chạm**: xe cà phê → Quầy hàng, Tạp hoá Cô Ba → Cửa hàng, Bảng tin → Nhiệm vụ, biển Bờ sông → Bản đồ; nhà, tiệm sửa xe, bảng menu, thùng rác, xe trái cây, trạm xe buýt, góc ngồi nghỉ, mặt bằng cho thuê → hiện tên. Có vòng sáng tại điểm chạm.
- Raster theo ô ≤ 1080 đơn vị đúng độ phân giải màn hình; mọi texture ≤ 4096.
- Số phase trên các popup "Sẽ có ở Phase X" cập nhật theo lộ trình mới.

## Kiểm tra (Playwright, 5 màn hình)
Camera giữa khi ở menu và khi vào game · kéo đổi vị trí đúng khoảng cách · lướt có quán tính · chặn biên · lấy mẫu điểm ảnh ở 2 mép, 2 đầu phố: không hở nền · lớp xa trôi chậm hơn lớp gần · phím mũi tên · chạm mở đúng bảng / hiện đúng tên · kéo không kích hoạt điểm chạm · kéo trên nút UI và khi popup mở không làm trôi phố · toàn bộ test Phase 0, 1 vẫn đạt.

## Sửa trong lúc làm
- Cột điện che biển "Đường Hoa Sữa" và thùng rác → xếp cột ra sau như Phase 0.
- Biển "Hẻm 12" bị cột che → chuyển sang tường nhà xanh. Biển "Bờ sông" tràn mép phải → dời vào.
- Mèo bị dù che → cho nằm trên ghế dài.

## Ghi chú
- Đạo cụ đã tách riêng để Phase 3–4 cho nhân vật đi xen giữa (trước/sau ghế, xe, cột).
- Phase tiếp theo: **Phase 3 — Nhân vật & Animation**.
