# [PHASE 3 — NHÂN VẬT & ANIMATION] Báo cáo

## Đã làm
- **8 nhân vật vector vẽ mới** (dáng chibi, viền nâu cùng phong cách phố): Chủ quầy (mũ đen, tạp dề), Chú Tư (mũ lưỡi trai, ria bạc, cờ lê), Cô Ba (tóc xoăn, áo hoa, tạp dề), Shipper Minh (mũ bảo hiểm + thùng giao hàng xanh), Lan (tóc đuôi ngựa, khăn quàng đỏ, cặp hồng), Nam (kính, cà vạt, cặp xanh), Mai (tóc dài, túi vải), Anh Hoàng (kính, cà vạt, cặp da).
- **Nhân vật có khớp**: đầu, thân, 2 tay, đùi + ống chân, đồ đeo lưng, đồ cầm tay là các mảnh rời; chuyển động tính bằng xương nên mượt ở mọi tốc độ khung hình, không cần ảnh từng khung.
- **Bộ chuyển động**: đứng thở, đi, pha chế, mời khách, ngồi, sửa xe, vẫy tay, nói. **Biểu cảm**: bình thường, vui, ngạc nhiên, nói, chớp mắt ngẫu nhiên.
- **Đời sống phố**: chủ quầy đứng sau xe cà phê (đứng → pha chế → mời khách), Chú Tư ngồi ghế thấp sửa xe máy, Cô Ba đứng trước tiệm vẫy tay/trò chuyện, Mai ngồi ghế nhựa cạnh quầy; Anh Hoàng, Lan, Nam và Shipper Minh đi bộ qua lại suốt phố.
- **Trước/sau đúng chiều sâu**: nhân vật xếp chung với đạo cụ theo vị trí chân (chủ quầy sau xe, người đi bộ trước ghế và cột, sau xe trái cây).
- **Chạm nhân vật**: hiện "Tên — vai", nhân vật cười và vẫy tay; người đang đi sẽ dừng lại chào. Chạm chủ quầy vẫn mở Quầy hàng.
- Ẩn tab/app thì nhân vật tạm dừng (đỡ tốn pin).

## Kiểm tra (Playwright, 5 màn hình)
Đủ 8 nhân vật và bộ phận · người đi bộ di chuyển đúng hướng, chân đổi góc · người đứng không trôi · thứ tự trước/sau đúng · chạm Cô Ba → tên, mặt vui, tay vẫy, rồi trở lại bình thường · chạm chủ quầy mở Quầy hàng · tắt chuyển động thì đứng yên · test Phase 0–2 vẫn đạt.

## Sửa trong lúc làm
- Thân nhân vật bị đặt sai vị trí (rơi xuống chân) → gắn lại đúng khớp hông.
- Dời xe máy đang sửa và hộp đồ nghề để Chú Tư có chỗ ngồi không bị cột điện che; dời chú chó khỏi lối đi bộ.

## Ghi chú
- Người đi bộ hiện đi thẳng trên một làn vỉa hè; lịch trình theo giờ và tránh vật cản thuộc Phase 14.
- Phase tiếp theo: **Phase 4 — Điều khiển người chơi** (joystick, chạm để đi, nút tương tác).
