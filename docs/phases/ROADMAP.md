# Lộ trình Góc Phố Việt (bản web → app)

Sắp xếp lại ngày 01/10/2026 theo 20 bảng tham chiếu (3.2E, Environment, 3.4 → 3.21).
Bảng tham chiếu chỉ để **nhìn và học bố cục, cơ chế, không khí** — mọi hình trong game vẫn vẽ vector gốc, không cắt ảnh.

**Quy trình mỗi phase:** viết prompt chi tiết (`PHASE_XX_*.md`) → làm → test Playwright trên 5 màn hình → sửa đến khi đạt → đẩy lên GitHub (link tự cập nhật) → báo cáo (`PHASE_XX_REPORT.md`) → sang phase tiếp theo.

## Thứ tự phase

Nguyên tắc sắp xếp: dựng **thế giới → nhân vật → điều khiển → thời gian** trước (nền móng), rồi tới **vòng chơi chính** (nguyên liệu → pha chế → khách → tiền), sau đó **tiến trình** (uy tín, nâng cấp, trang trí, quan hệ, bản đồ, sự kiện), cuối cùng **hoàn thiện** (âm thanh, lưu nâng cao, trợ năng, cân bằng, hướng dẫn, VFX, hiệu năng, đóng gói app). Phase nào xong cũng chơi được trên link.

| Phase | Nội dung | Bảng tham chiếu | Trạng thái |
|---|---|---|---|
| 0 | Nền tảng web PWA + Master UI + khu phố Hoa Sữa (vector) | Visual Master | ✅ |
| 1 | Mở game: Splash, Loading, Menu chính, Chơi mới/Tiếp tục, lưu tự động, Cài đặt cơ bản | 3.21 §1 | ✅ |
| 2 | **Thế giới mở rộng + Camera:** phố dài ~3 màn hình (Chú Tư ← quầy → Cô Ba), 7 lớp parallax, kéo/lướt camera, giới hạn biên, đạo cụ (ghế nhựa, dù, cây hoa sữa, chậu cây, xe máy đỗ, xe trái cây), điểm chạm tương tác | Environment, 3.7 §2·§3·§8 | ✅ |
| 3 | **Nhân vật & Animation:** dựng nhân vật vector có khớp (chủ quầy, Chú Tư, Cô Ba, Shipper Minh, học sinh nam/nữ, khách), bộ chuyển động Idle/Đi/Pha chế/Bán hàng/Ngồi, biểu cảm | 3.2E, 3.18 §1·§3·§10 | ✅ |
| 4 | **Điều khiển người chơi:** joystick + chạm để đi, camera theo nhân vật, nút tương tác hiện khi lại gần NPC/vật thể, hint "Chạm để tương tác" | 3.7 §1·§5, 3.4 §1 | ✅ |
| 5 | **Thời gian, Ngày/Đêm, Thời tiết:** đồng hồ chạy, 6 khung giờ đổi ánh sáng (sáng→đêm), nắng/nhiều mây/mưa nhẹ/mưa lớn, mưa + mặt đường ướt, đèn đường/đèn quán bật buổi tối | 3.5 §1·§2·§3·§8, 3.4 §9 | ✅ |
| 6 | **Hội thoại & Nhiệm vụ cơ bản:** khung hội thoại có lựa chọn, bảng nhận nhiệm vụ + phần thưởng, QuestPanel theo dõi tiến độ | 3.4 §2·§3, 3.11 §4 | ✅ |
| 7 | **Kinh doanh cà phê:** kho nguyên liệu, công thức (cà phê đen/sữa, bạc xỉu, trà tắc…), minigame pha chế theo bước + thanh thời gian | 3.8 §1–4, 3.4 §5 | ✅ |
| 8 | **Khách hàng AI + Đơn hàng:** loại khách (văn phòng, học sinh, shipper, du lịch, khách quen), hàng chờ tối đa 6, bảng đơn có hẹn giờ, giao món – nhận tiền – tip, phản ứng hài lòng → uy tín | 3.9, 3.8 §5–7 | ✅ |
| 9 | **Tạp hoá Cô Ba:** mua nguyên liệu (− số lượng +), giá dao động theo ngày | 3.4 §4, 3.19 §2 | ✅ |
| 10 | **Kết thúc ngày + Thống kê:** tổng kết doanh thu/chi phí/lợi nhuận, số ly, khách hài lòng, biểu đồ khách theo giờ | 3.8 §9, 3.9 §11 | |
| 11 | **Uy tín & Tiến trình:** cấp uy tín Lv.1–5, mở khoá món, khách mới, nhiệm vụ chính/phụ/hằng ngày/chuỗi | 3.10 | |
| 12 | **Nâng cấp quầy:** mái che, máy pha, bảng menu, bàn ghế; quầy Lv.1 → Lv.4 đổi hình | 3.8 §8·§11, 3.4 §7, 3.10 §6 | |
| 13 | **Trang trí & Tuỳ biến:** kiểu quầy, mái, bảng hiệu, đèn, cây; chế độ sửa (di chuyển/xoay/xoá); hiệu ứng lên khách | 3.13 | |
| 14 | **NPC sống: lịch trình + tìm đường + đám đông:** lịch hằng ngày từng NPC, tránh vật cản, mật độ theo giờ cao điểm, phản ứng thời tiết (che ô, trú mưa) | 3.5 §4–7, 3.6 | |
| 15 | **Quan hệ NPC & Câu chuyện:** tim thân thiết, tặng quà, câu chuyện cá nhân mở dần, nhật ký | 3.11, 3.21 §7 | |
| 16 | **Túi đồ, Hồ sơ người chơi, Thành tựu** | 3.4 §6, 3.21 §4·§5·§9·§10 | |
| 17 | **Bản đồ & Mở rộng khu vực:** bản đồ khu phố, chỉ đường nhiệm vụ, mở Bờ sông / Chợ / Công viên theo uy tín | 3.4 §8, 3.7 §3·§7, 3.10 §7, 3.21 §8 | |
| 18 | **Mùa & Sự kiện:** 4 mùa + mùa mưa, Tết, Lễ hội Hoa Sữa, Trung Thu; món & trang trí giới hạn theo mùa | 3.12 | |
| 19 | **Âm thanh & Không khí:** nhạc nền theo giờ, âm môi trường nhiều lớp, tiếng pha chế, xe cộ, mưa (tự tổng hợp, không dùng âm thanh có bản quyền) | 3.14 | |
| 20 | **Lưu game nâng cao:** nhiều slot + ảnh thu nhỏ, tải game, xuất/nhập file, sao lưu, xoá dữ liệu | 3.15, 3.21 §2·§11 | |
| 21 | **Cài đặt đầy đủ, Trợ năng, Đa ngôn ngữ:** đồ hoạ, FPS, cỡ chữ, tương phản, giảm chuyển động, hỗ trợ mù màu; Tiếng Việt / English | 3.21 §3·§12, 3.16 §9·§10·§12 | |
| 22 | **Kinh tế & Cân bằng:** bảng giá vốn/giá bán, chi phí nâng cấp, mô phỏng 30/90 ngày, chống lỗi tiền vô hạn | 3.19 | |
| 23 | **Hướng dẫn & Ngày đầu tiên:** mở đầu, đặt tên nhân vật, Chú Tư hướng dẫn, mua – pha – bán ly đầu tiên, tổng kết Ngày 1 | 3.20 | |
| 24 | **Animation, VFX & Polish:** khói cà phê, đá rơi, tiền bay, lá rơi, hoa sữa rơi, chuyển cảnh, biểu cảm | 3.18 | |
| 25 | **Hiệu năng & Phát hành:** 60 FPS trên máy phổ thông, mức đồ hoạ, kiểm tra tải nặng, đóng gói iOS/Android (Capacitor) | 3.17, 3.16 §11 | |

## Quyết định khi các bảng khác nhau

- **HUD:** giữ đúng Master UI Phase 0 (khoá bố cục). Bảng 3.16 vẽ HUD khác (ảnh đại diện, Lv.3, nút dưới khác) — chỉ lấy ý tưởng trợ năng/cài đặt, không đổi HUD.
- **Bố cục màn hình:** game dọc 9:16. Bảng vẽ ngang được chuyển sang dọc: phố trượt ngang theo camera, bảng chức năng mở dạng popup.
- **Giá món:** bảng phấn trên quầy (Cà phê 25K, Trà tắc 20K, Bánh mì 30K) và bảng 3.19 khác nhau — thống nhất ở Phase 22; trước đó dùng giá trên bảng phấn.
- **Tên/nhân vật:** dùng bộ nhân vật bảng 3.11 (Cô Ba, Chú Tư, Shipper Minh, Lan, Anh Hoàng, Mai, Bé Ti); nhân vật chính đội mũ, đeo tạp dề như bảng 3.2E.

## Nguyên tắc chung

Master UI Phase 0 khoá bố cục. Art vẽ vector gốc, không cắt ảnh tham chiếu. Không gambling, không đổi tiền thật, không giao dịch giữa người chơi. Tiếng Việt mặc định. Không xoá/thay thế phần đã làm của phase trước.
