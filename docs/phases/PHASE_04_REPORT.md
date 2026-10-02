# [PHASE 4 — ĐIỀU KHIỂN NGƯỜI CHƠI] Báo cáo

## Đã làm
- **Ba cách đi**: cần điều khiển (joystick) ở góc dưới trái, chạm vào vỉa hè để đi tới, phím WASD / mũi tên trên máy tính.
- **Vật cản + tự tìm đường**: không đi xuyên xe cà phê, ghế, chậu cây, xe máy, cột, gốc cây, người đang đứng; không xuống lòng đường, không ra khỏi phố. Chạm để đi thì tự vòng qua vật cản (lưới ô 30 đơn vị, A*, rút gọn đường thẳng).
- **Tương tác có "đi tới"**: chạm nhân vật / đồ vật → chủ quầy đi tới gần, quay mặt về phía đó rồi mới chào hoặc mở bảng. Chạm xe cà phê → vòng ra sau quầy rồi mở Quầy hàng.
- **Nút tương tác** (góc dưới phải): tự hiện khi đứng gần ai/cái gì, ghi tên đối tượng (ưu tiên người hơn đồ vật).
- **Camera** bám theo nhân vật khi di chuyển; kéo phố để xem tự do vẫn được, đi tiếp thì camera theo lại.
- **Lưu vị trí** nhân vật trong save; mở lại đứng đúng chỗ, camera nhìn đúng nhân vật.
- Đứng sau quầy mà không điều khiển → chủ quầy tự pha chế / mời khách như Phase 3.
- Master UI giữ nguyên; joystick và nút tương tác nằm trên lớp riêng, bị popup che khi mở bảng, ẩn ở Menu.

## Kiểm tra (Playwright, 5 màn hình)
Nút điều khiển chỉ hiện trong game, không đè Master UI · chạm vỉa hè → đi tới nơi, camera theo · chạm Cô Ba từ xa → chưa chào ngay, tới gần mới chào, quay mặt đúng · nút tương tác hiện "Cô Ba"/"Chú Tư", bấm được · chạm xe cà phê → về sau quầy rồi mới mở Quầy hàng · joystick trái/phải/lên/xuống, thả ra dừng · không xuyên xe cà phê, không ra ngoài vỉa hè · bàn phím · đường A* không cắt qua vật cản · lưu và mở lại đúng vị trí · test Phase 0–3 vẫn đạt.

## Thay đổi so với phase trước
- Phím mũi tên giờ điều khiển nhân vật (trước đây trượt camera).
- Chạm điểm trên phố giờ có bước đi tới trước khi mở bảng.

## Sửa trong lúc làm
- Camera đang bám nhân vật kéo lệch điểm chạm → đặt camera thủ công thì tạm ngưng bám.
- Đứng cạnh Cô Ba mà nút lại ghi "Tạp hoá Cô Ba" → ưu tiên người hơn đồ vật.
- Nút điều khiển đè lên dòng thông báo → nâng lên cao hơn.

## Ghi chú
- Phase tiếp theo: **Phase 5 — Thời gian, Ngày/Đêm, Thời tiết**.
