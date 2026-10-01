# PHASE 1 — MỞ GAME (GAME BOOT) · bản web

GAME: GÓC PHỐ VIỆT · Nền tảng: Web PWA (TypeScript + PixiJS) → app sau (Capacitor)

**Phase 0 đã duyệt và khoá.** Không đổi bố cục Master UI, không tạo HUD khác. Khu phố dùng đúng art của Phase 0.

## Mục tiêu
Luồng mở game hoàn chỉnh, mượt, có lưu game:

```
Splash → Loading (tiến độ thật) → Main Menu ─┬─ Chơi mới → (xác nhận nếu đã có save) → Game
                                              ├─ Tiếp tục (chỉ bật khi có save) → Game
                                              └─ Cài đặt (panel)
Game: Master UI Phase 0 + khu phố; nút Cài đặt (bánh răng) mở panel Cài đặt thật.
```

## 1. Splash
- Nền kem, logo **GÓC PHỐ VIỆT** vẽ vector mới (chữ + mái hiên sọc + ly cà phê), dòng chữ "Những câu chuyện nhỏ từ góc phố thân quen…".
- Hiện dần 0.6s → giữ 1.2s → mờ dần 0.5s. Chạm màn hình thì bỏ qua.
- Trong lúc Splash hiện, đã bắt đầu tải tài nguyên ngầm.

## 2. Loading
- Thanh tiến độ **thật**: đếm từng tài nguyên đã tải (font, 9 lớp khu phố, icon, logo) và bước dựng khu phố. Không chạy giả.
  - Thanh chỉ tăng, không lùi, chạy mượt tới 100%.
- Có % và một mẹo ngẫu nhiên (ví dụ "Mẹo nhỏ: khách quen thích ghé vào buổi sáng"), xe cà phê nhỏ chạy theo thanh.
- Lỗi tải: hiện "Không tải được dữ liệu, kiểm tra mạng" + nút **Thử lại**. Không treo, không màn trắng.

## 3. Main Menu
- Nền là khu phố (đã tải), phủ lớp mờ ấm; logo phía trên.
- 3 nút lớn: **Chơi mới** (đỏ, nổi bật) · **Tiếp tục** (hiện thông tin save: "Ngày 3 · 1.250.000đ"; mờ và không bấm được khi chưa có save) · **Cài đặt**.
- Góc dưới hiện số phiên bản.

## 4. Chơi mới
- Panel xác nhận hiện giá trị khởi đầu: **Ngày 1 · Thứ Hai · 06:00 · 1.000.000đ · Uy tín 0**.
- Nếu đã có save: cảnh báo "Ván cũ sẽ bị thay thế" → nút "Bắt đầu lại" / "Huỷ".
- Bắt đầu: tạo GameState mới, nhiệm vụ khởi đầu (Bán 20 ly cà phê 0/20 · Nói chuyện với chú Tư sửa xe), **lưu ngay**, chuyển vào Game.

## 5. Tiếp tục
Nạp save → vào Game với đúng số liệu đã lưu.

## 6. Lưu game
- Lưu vào bộ nhớ trình duyệt (localStorage): JSON có `version`, `savedAt`.
- Mỗi lần ghi, giữ **bản dự phòng** (backup) của lần trước.
- Kiểm tra dữ liệu khi nạp. Save hỏng → dùng bản dự phòng. Cả hai đều hỏng → báo "Dữ liệu lưu bị lỗi" và cho chơi mới, **không crash**.
- Tự lưu khi: bắt đầu ván, rời app hoặc ẩn tab (`visibilitychange`/`pagehide`), và mỗi 30 giây khi đang chơi.
- Khi đóng gói app (Capacitor) sẽ thay bằng Preferences/Filesystem qua cùng một interface `SaveStore`.

## 7. Cài đặt (panel dùng chung ở Menu và trong Game)
- Âm nhạc (0–100), Hiệu ứng (0–100), Rung (bật/tắt). Lưu ngay, áp dụng lại khi mở game.
- Rung: gọi `navigator.vibrate` khi bấm nút nếu máy hỗ trợ (Android). iOS web không hỗ trợ; sẽ dùng Haptics khi làm app.
- Âm thanh thật thuộc phase sau. Phase 1 chỉ lưu giá trị và cung cấp `AudioSettings` cho phase sau dùng.
- Trong Game: nút "Về Menu chính" (lưu trước khi thoát).

## 8. Chuyển cảnh
Mờ dần qua màu kem 0.35s giữa các màn. Trong lúc chuyển, khoá thao tác để tránh bấm 2 lần.

## Kỹ thuật
- `src/core/save.ts`: `SaveStore` (interface), `LocalSaveStore`, `SaveService` (validate, backup, migrate theo `version`).
- `src/core/settings.ts`: `SettingsService`.
- `src/core/preload.ts`: `AssetLoader` có callback tiến độ.
- `src/screens/*`: Splash, Loading, MainMenu, NewGamePanel, SettingsPanel, `ScreenManager` (chuyển cảnh).
- `src/app/Boot.ts`: điều phối luồng.
- Master UI Phase 0 **giữ nguyên**. Chỉ đăng ký handler: nút Cài đặt → panel Cài đặt.

## Test (Playwright, 5 màn hình như Phase 0)
1. Lần đầu: Splash → Loading lên đến 100% (dãy số chỉ tăng) → Menu. Nút Tiếp tục bị tắt.
2. Chơi mới → panel đúng giá trị → vào Game: HUD hiện Ngày 1, Thứ Hai, 06:00, 1.000.000đ, 0; nhiệm vụ 0/20.
3. Tải lại trang → Menu: Tiếp tục bật, có thông tin save → vào Game với đúng số liệu.
4. Chơi mới khi đã có save → hiện cảnh báo ghi đè; Huỷ thì giữ save cũ.
5. Cài đặt: đổi Âm nhạc, Hiệu ứng, Rung → tải lại vẫn giữ; mở được từ Menu và từ nút bánh răng trong Game; nút Về Menu hoạt động.
6. Save hỏng → dùng backup. Cả hai hỏng → báo lỗi, vẫn chơi mới được.
7. Bấm qua Splash bằng chạm.
8. Không lỗi console. Master UI vẫn đạt toàn bộ test Phase 0.

## Báo cáo
`docs/phases/PHASE_01_REPORT.md`: [PHASE 1] [FILES CREATED] [ASSETS] [SCREENS] [GAMEPLAY] [TEST] [RESULT] [KNOWN ISSUES]

**Không tự chuyển sang Phase 2.**
