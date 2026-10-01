# Góc Phố Việt (web)

Game quản lý quầy cà phê ở góc phố Hoa Sữa, chạy trên trình duyệt (PWA). Sau này sẽ đóng gói thành app iOS/Android bằng Capacitor.

- **Chơi:** https://ngthanhphonglife-dotcom.github.io/goc-pho-viet/
- **Cài lên iPhone:** mở link bằng Safari → nút Chia sẻ → **Thêm vào Màn hình chính**.
- **Cài lên Android:** mở bằng Chrome → menu ⋮ → **Cài đặt ứng dụng**.

## Chạy trên máy

```
npm install
npm run dev        # http://localhost:5173/goc-pho-viet/
npm run build      # ra thư mục dist/
npm test           # Playwright: 5 màn hình (cần Chromium)
```

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/core` | Trạng thái game (`GameState`) và 12 hành động của Master UI |
| `src/ui` | Master UI bằng HTML/CSS: HUD, nhiệm vụ, menu phải, thanh dưới, popup, toast |
| `src/world` | Khu phố vẽ bằng PixiJS. Các lớp SVG được raster theo độ phân giải màn hình nên không bị mờ |
| `public/art` | Art vector gốc: `world/*.svg` (khu phố theo lớp), `icons/*.svg` |
| `tools/art` | Script vẽ art (Python): `world.py`, `make_icons.py`, `make_app_icons.py` |
| `docs/phases` | Prompt và báo cáo của từng phase |

## Vẽ lại art

```
pip install cairosvg pillow fonttools brotli
python tools/art/world.py          # khu phố → public/art/world + docs/art/world_preview.png
python tools/art/make_icons.py     # icon UI → tools/art/icons_svg + public/art/icons
python tools/art/make_app_icons.py # icon app / PWA
```

Hoạ sĩ có thể thay từng lớp SVG trong `public/art/world/` nếu giữ đúng khung 1080×2340. Sau đó chạy lại `world.py` để cập nhật vùng bao (bbox).

## Đóng gói app sau này

1. Chạy `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`, rồi `npx cap init "Góc Phố Việt" vn.gocphoviet.app --web-dir dist`.
2. Build bằng `npx vite build --mode app` (đường dẫn tương đối), rồi chạy `npx cap add ios` và `npx cap sync`.
3. Mở Xcode bằng `npx cap open ios` để ký và gửi lên App Store.

Font Be Vietnam Pro dùng giấy phép SIL OFL (`public/fonts/OFL.txt`).
