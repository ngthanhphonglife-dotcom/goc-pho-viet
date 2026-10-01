# [PHASE 0] Nền tảng web + Master UI + khu phố Hoa Sữa — Báo cáo (01/10/2026)

**Hướng mới:** game web dạng PWA (TypeScript + PixiJS 8 + Vite).
- Mở bằng link là chơi, lưu ra Màn hình chính được.
- Sau này đóng gói app bằng Capacitor.
- Project Unity ở `D:/GAMES/GocPhoViet` giữ nguyên để tham khảo.

## [FILES CREATED]
- **Ứng dụng:** `index.html`, `src/main.ts`
- **Core:** `src/core/GameState.ts` (trạng thái + định dạng tiền/giờ/thứ), `src/core/actions.ts` (12 nút)
- **UI:** `src/ui/MasterUI.ts`, `src/ui/style.css`
- **World:** `src/world/World.ts`
- **PWA:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*` (192, 512, maskable, apple-touch, favicon)
- **Art:**
  - `public/art/world/*.svg`: 9 lớp khu phố, kèm `layers.json` ghi vùng bao từng lớp
  - `public/art/icons/*.svg`: 17 icon
- **Công cụ vẽ:** `tools/art/svgkit.py`, `world.py`, `make_icons.py`, `make_app_icons.py`, `tools/fonts/*` (font gốc)
- **Test:** `playwright.config.ts`, `tests/phase0.spec.ts`
- **Deploy:** `.github/workflows/deploy.yml` (GitHub Pages)
- **Tài liệu:** `docs/phases/PHASE_00_MASTER_UI.md` (prompt), báo cáo này, `docs/screens/*.png`, `docs/art/world_preview.png`

## [UI COMPONENTS]
```
#app (khung dọc, rộng tối đa = cao × 9/16)
├── #world   canvas PixiJS — khu phố (World tách khỏi UI)
└── #ui
    ├── SafeArea (env(safe-area-inset-*))
    │   ├── TopHUD: CalendarPanel · WeatherPanel(nút) · MoneyPanel(+ nút "+") · ReputationPanel · SettingsButton
    │   ├── QuestPanel: Nhiệm vụ chính · 2 dòng (ô tick, tiến độ 8/20, thanh xanh)
    │   ├── RightActionMenu: Bản đồ · Nhiệm vụ · Túi đồ · Cửa hàng
    │   ├── BottomNavigation: Quầy hàng · Nguyên liệu · [Bán hàng] · Nâng cấp · Trang trí
    │   └── Toast
    └── PlaceholderPanel (popup: tiêu đề, X, icon, "Sẽ có ở Phase X", mô tả, nút Đóng; Esc đóng)
```
- Đơn vị `--u` = bề ngang khung / 1080. Bố cục giữ đúng toạ độ thiết kế 1080×1920.
- TopHUD và BottomNavigation neo theo % bề ngang. Không scale bố cục bằng transform.
- Chữ tự co cỡ để vừa một dòng, giống Auto Size của TMP.
- Nút "+" có vùng chạm mở rộng tới ≥ 30px, giao diện không đổi.
- Dữ liệu lấy từ `GameState`. Các phase sau gắn chức năng thật qua `ui.onAction()`.

## [ART]
- **Không cắt ảnh tham chiếu.** Toàn bộ là vector vẽ mới bằng code (`tools/art`), bám bố cục và màu của ảnh Master.
- **9 lớp khu phố:**
  - trời;
  - nhà phía sau;
  - nhà ống có ban công, cờ, máy lạnh, dây leo;
  - tiệm **SỬA XE Chú Tư** và tiệm **TẠP HOÁ Cô Ba**;
  - vỉa hè, lòng đường có vạch qua đường;
  - cây hoa sữa;
  - cột điện + dây, biển "ĐƯỜNG HOA SỮA", thùng rác;
  - xe **CÀ PHÊ GÓC PHỐ**: bảng phấn, ghế nhựa đỏ, chậu cây, xe trái cây.
- Chữ trên biển hiệu được đổi thành path vector, nên hiển thị đúng font Be Vietnam Pro.
- Khi chạy, mỗi lớp được raster đúng *kích thước hiển thị × devicePixelRatio*. Ví dụ iPhone 15 Pro Max: texture 1290×2796 = đúng 1:1 điểm ảnh.
- Các lớp tĩnh gộp thành 1 texture, xe cà phê là texture riêng, tổng bộ nhớ GPU khoảng 18MB.
- Nhân vật, bong bóng thoại và xe máy thuộc các phase NPC và giao thông, **chưa có ở Phase 0**.

## [FONT]
Be Vietnam Pro (OFL), 2 độ đậm 500/700, file woff2 tự host, có preload. Test kiểm `document.fonts.check` với chuỗi tiếng Việt có dấu.

## [PWA]
- **Manifest:** `standalone`, `portrait`, tiếng Việt, màu chủ đạo #AE1C3F.
- **Icon:** 192, 512, maskable, `apple-touch-icon`. Có thẻ meta cho iOS.
- **Service worker:** trang ưu tiên mạng; tài nguyên ưu tiên cache, nên mở lại được khi mất mạng.
- **Xoay ngang** trên điện thoại sẽ hiện màn "Xoay điện thoại dọc để chơi".

## [TEST PERFORMED]
Playwright (Chromium) trên 5 màn hình:
- 360×640@3 (1080×1920)
- 390×844@3 (iPhone 15)
- 430×932@3 có giả lập tai thỏ 59/34px (iPhone 15 Pro Max)
- 412×915@2.625 (Android)
- 768×1024@2 (iPad)

Mỗi màn hình kiểm tra:
1. Không có lỗi console, không có request lỗi.
2. Font tiếng Việt đã nạp.
3. 8 khối UI nằm trong Safe Area và không đè nhau.
4. Không chữ nào bị cắt.
5. Canvas có backing = CSS × DPR, world raster ≥ độ phân giải màn hình (không mờ).
6. 12 nút: điểm giữa nút đúng là nút (không bị che), vùng chạm ≥ 24px, chạm (tap) → popup mở → bấm X → đóng.
7. Dữ liệu mẫu đúng ảnh Master.
8. Manifest hợp lệ, service worker sẵn sàng.

## [TEST RESULT]
**10/10 PASS** (5 màn hình × 2 test). Ảnh chụp từng màn hình nằm trong `docs/screens/`.

## [KNOWN ISSUES]
1. Art vector phong cách phẳng ấm áp; mức chi tiết chưa bằng tranh vẽ tay của ảnh Master. Có thể thay từng lớp SVG mà không sửa code.
2. Chưa có nhân vật, xe cộ, bong bóng thoại; sẽ làm ở các phase sau.
3. Test chạy trên Chromium. Chưa thử trên Safari iOS thật; cần bạn mở link trên iPhone để xác nhận.
4. iPad và máy tính hiển thị khung dọc 9:16 ở giữa màn hình, hai bên là nền tối (đúng thiết kế game dọc).
5. Chưa có âm thanh (thuộc phase Cài đặt).

**Dừng sau Phase 0, chờ duyệt.**
