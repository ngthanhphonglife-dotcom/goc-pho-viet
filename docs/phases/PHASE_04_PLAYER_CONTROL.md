# PHASE 4 — ĐIỀU KHIỂN NGƯỜI CHƠI (prompt)

Tham chiếu: bảng 3.7 §1·§2·§5, 3.4 §1. Master UI giữ nguyên; joystick và nút tương tác là lớp điều khiển riêng nằm trên vỉa hè, phía trên thanh dưới.

## Việc phải làm
1. **Đi lại**: chủ quầy đi được trên vỉa hè (không xuống lòng đường, không ra khỏi phố). Ba cách: joystick (góc dưới trái), chạm vào vỉa hè để đi tới, phím WASD/mũi tên.
2. **Vật cản + tìm đường**: không đi xuyên xe cà phê, ghế, chậu cây, cột, người đang đứng. Chạm để đi thì tự tìm đường vòng (lưới ô 30 đơn vị, A*).
3. **Tương tác**: chạm nhân vật/điểm trên phố → chủ quầy đi tới gần rồi mới chào / mở bảng. Chạm xe cà phê → quay về đứng sau quầy rồi mở Quầy hàng. Khi đứng gần ai/cái gì, hiện **nút tương tác** (góc dưới phải) ghi tên.
4. **Camera**: theo nhân vật khi di chuyển; kéo phố vẫn được (xem tự do), đi tiếp thì camera theo lại.
5. **Lưu vị trí** nhân vật trong save; mở lại đứng đúng chỗ cũ.
6. Đứng sau quầy mà không điều khiển → chủ quầy tự pha chế/mời khách như Phase 3.

## Test (5 màn hình)
Nút điều khiển chỉ hiện trong game · chạm vỉa hè → đi tới nơi, camera theo · chạm Cô Ba → đi tới gần rồi mới chào · chạm xe cà phê → về sau quầy rồi mở Quầy hàng · joystick + phím di chuyển, thả ra dừng · không xuyên xe cà phê, không ra ngoài phố · nút tương tác hiện đúng tên, bấm được · lưu và mở lại đúng vị trí · test Phase 0–3 vẫn đạt.
