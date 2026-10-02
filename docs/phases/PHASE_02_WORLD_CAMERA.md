# PHASE 2 — THẾ GIỚI MỞ RỘNG + CAMERA (prompt)

Tham chiếu: bảng Environment (Scene layout, Parallax layers, Props), 3.7 §2 (camera), §8 (lớp hiển thị). Chỉ học bố cục; mọi hình vẽ vector gốc.

## Mục tiêu
Phố Hoa Sữa dài 3 màn hình (3240×2340 đơn vị thiết kế), người chơi kéo ngang để dạo phố. Phần giữa giữ nguyên như Phase 0.

## Việc phải làm
1. **Art** (`tools/art/world.py`):
   - Trái: Nhà của bạn (mái ngói), hẻm, nhà xanh có Bảng tin khu phố; dù + bàn ghế, ghế dài, xe máy đỗ, mèo.
   - Giữa: giữ nguyên (Sửa xe Chú Tư, xe cà phê, Tạp hoá Cô Ba) + xe máy đang sửa, chó.
   - Phải: nhà mái tôn, cây hoa sữa nhỏ, nhà "Cho thuê", trạm xe buýt, biển "Bờ sông", xe đạp.
   - 3 cột điện nối dây suốt phố.
2. **Lớp parallax**: trời (0) · nhà xa (0.25) · nhà sau (0.5) · mặt phố (1) · đạo cụ (1, từng món riêng, xếp trước/sau theo chân) · hoa tiền cảnh (1.25).
3. **Camera**: kéo/lướt có quán tính, chặn ở hai đầu phố, phím ←/→ và lăn chuột trên máy tính; chỉ hoạt động khi đang trong game; kéo trên nút UI không làm trôi phố.
4. **Điểm chạm**: chạm (không kéo) vào nhà, bảng tin, tiệm, xe cà phê, bảng menu, thùng rác, xe trái cây, trạm xe buýt, biển Bờ sông → hiện tên hoặc mở đúng bảng chức năng.
5. **Sắc nét & bộ nhớ**: raster theo ô 1080 đơn vị đúng độ phân giải màn hình, mỗi texture ≤ 4096.

## Không được
Đổi bố cục Master UI · cắt ảnh tham chiếu · bỏ test Phase 0/1.

## Test (5 màn hình)
Camera giữa lúc vào game (khung hình giữa như Phase 0) · kéo trái/phải đổi vị trí, chặn biên, không hở nền ở hai đầu · lớp xa trôi chậm hơn lớp gần · menu không kéo được · chạm điểm tương tác đúng, kéo không kích hoạt · UI vẫn bấm được · không lỗi console.
