# PHASE 0 — NỀN TẢNG WEB + MASTER UI + KHU PHỐ HOA SỮA (bản web)

GAME: GÓC PHỐ VIỆT · Nền tảng: Web (PWA) trước → app iOS/Android sau (Capacitor) · Màn dọc 9:16 → 9:19.5

## Mục tiêu
Mở link là thấy đúng màn hình chính như ảnh MASTER REFERENCE:
- khu phố Hoa Sữa phía sau;
- HUD phía trên, bảng nhiệm vụ, menu phải, thanh dưới.

Mọi thứ sắc nét trên mọi màn hình, chạy mượt, lưu ra Màn hình chính được.

## Nguyên tắc bắt buộc
1. **Không cắt ảnh tham chiếu.** Mọi hình đều vẽ mới bằng vector (SVG), nguồn nằm trong repo.
2. **Không mờ.**
   - UI là HTML/CSS + SVG nên trình duyệt vẽ theo đúng độ phân giải thật.
   - World là lớp SVG, được raster hoá theo `devicePixelRatio` mỗi khi đổi kích thước.
3. **Chữ là chữ thật.** Font Be Vietnam Pro (OFL), tự host bằng woff2, đủ dấu tiếng Việt. Không chữ nào nằm sẵn trong ảnh UI.
4. **World tách khỏi UI.**
   - World vẽ trên canvas PixiJS (WebGL), gồm nhiều lớp để sau này làm chuyển động.
   - UI là lớp DOM nằm trên canvas.
5. **Không scale UI bằng transform để bù màn hình.**
   - Toàn bộ kích thước UI tính theo một đơn vị `--u` = bề ngang thiết kế 1080 quy ra màn thật, và không vượt quá chiều cao / 1920.
   - Bố cục dùng flex, neo và % như anchor.
6. **Safe Area.** Dùng `env(safe-area-inset-*)` và `viewport-fit=cover` cho tai thỏ, Dynamic Island, home indicator.
7. **Không gameplay** ở Phase 0. Các nút chỉ mở popup "Sẽ có ở Phase X".
8. **Pháp lý:** không gambling, không đổi tiền thật, không giao dịch giữa người chơi.

## Cấu trúc màn hình (khớp ảnh Master)
| Khối | Nội dung |
|---|---|
| TopHUD | Tờ lịch (Ngày 3 / Thứ Tư / 06:45) · Thời tiết (Nắng nhẹ 28°C) · Tiền 1.250.000đ + nút "+" xanh · Uy tín ⭐ 35 · Bánh răng Cài đặt |
| QuestPanel | "Nhiệm vụ chính" · ☑ Bán 20 ly cà phê 8/20 + thanh tiến độ · ☐ Nói chuyện với chú Tư sửa xe |
| RightActionMenu | Bản đồ · Nhiệm vụ · Túi đồ · Cửa hàng |
| World | Khu phố Hoa Sữa (xem phần World) |
| BottomNavigation | Quầy hàng · Nguyên liệu · **Bán hàng** (nút tròn đỏ nổi) · Nâng cấp · Trang trí |

## World — khu phố Hoa Sữa (vẽ vector, theo lớp từ xa đến gần)
1. `sky`: trời xanh nhạt, mây.
2. `back-buildings`: dãy nhà xa, mái đỏ.
3. `main-building`: nhà ống vàng kem nhiều tầng: cửa sổ, ban công sắt, chậu cây, cờ đỏ sao vàng, cục máy lạnh, dây leo.
4. `shops`:
   - tiệm **SỬA XE Chú Tư**: bảng trắng chữ đỏ, chồng lốp, bên trong là xưởng;
   - tiệm **TẠP HOÁ Cô Ba**: bảng vàng chữ đỏ, mái che xanh, kệ hàng nhiều màu.
5. `street-furniture`: cột điện và bó dây, biển "ĐƯỜNG HOA SỮA", cột sọc đỏ trắng, thùng rác xanh "GIỮ PHỐ SẠCH ĐẸP".
6. `tree`: cây hoa sữa lớn bên trái, hoa trắng.
7. `sidewalk`: vỉa hè lát gạch, bó vỉa.
8. `cart`: xe **CÀ PHÊ GÓC PHỐ** mái sọc nâu kem, bảng phấn (Cà phê 25K / Trà tắc 20K / Bánh mì 30K), ghế nhựa đỏ, bàn nhỏ, chậu cây; xe **TRÁI CÂY TƯƠI NGON** bên phải.
9. `road`: lòng đường, vạch qua đường.

Nhân vật (chú Tư, cô Ba, khách, shipper, xe máy) và bong bóng thoại thuộc các phase NPC và giao thông. Phase 0 chỉ vẽ cảnh nền tĩnh.

## Kỹ thuật
- Vite + TypeScript + PixiJS 8.
- PWA:
  - `manifest.webmanifest` với display `standalone`, orientation `portrait`, màu nền kem, icon 192/512/maskable, `apple-touch-icon`;
  - service worker cache để mở lại khi mất mạng.
- Khoá dọc: khi xoay ngang, hiện màn "Xoay dọc để chơi".
- Dữ liệu HUD lấy từ một `GameState` (store) và có hàm cập nhật. UI không viết cứng số liệu.
- Popup placeholder dùng chung: tiêu đề, icon, nhãn phase, mô tả, nút X, nút Đóng.
- Nút có hiệu ứng nhấn 0.95. Animation dùng CSS transform; đây là hiệu ứng tạm thời, không phải scale bố cục.
- Âm thanh, rung: chưa làm (thuộc phase Cài đặt).

## Test (Playwright, Chromium)
Màn hình test:
- 360×640 @3x (1080×1920)
- 390×844 @3x (iPhone 15)
- 430×932 @3x (iPhone 15 Pro Max), có safe-area giả lập
- 412×915 @2.625 (Android)
- 768×1024 (iPad)

Phải đạt:
- không có lỗi console, không có request lỗi;
- font Be Vietnam Pro đã nạp, đủ glyph tiếng Việt;
- các khối HUD, Quest, RightMenu, BottomNav không đè nhau và nằm trong safe-area;
- bấm thật vào giữa từng nút trong 12 nút (`elementFromPoint` là chính nút đó), popup mở đúng tiêu đề rồi đóng;
- canvas World có kích thước backing = CSS × devicePixelRatio, tức là không mờ;
- manifest và service worker hợp lệ;
- chụp ảnh từng màn để so với ảnh Master.

## Bàn giao
- Mã nguồn.
- `npm run build` ra thư mục `dist/`.
- Link GitHub Pages.
- `docs/phases/PHASE_00_REPORT.md` gồm:
  [PHASE 0] [FILES CREATED] [UI COMPONENTS] [ART] [FONT] [PWA] [TEST PERFORMED] [TEST RESULT] [KNOWN ISSUES]

**Dừng sau Phase 0, chờ duyệt.**
