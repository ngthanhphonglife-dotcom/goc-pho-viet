# PHASE 3 — NHÂN VẬT & ANIMATION (prompt)

Tham chiếu: bảng 3.2E (dàn nhân vật, biểu cảm, bộ chuyển động), 3.18 §1·§3·§10. Chỉ học dáng và không khí; mọi hình vẽ vector gốc.

## Mục tiêu
Phố có người: 8 nhân vật vector có khớp, chuyển động mượt bằng xương (không dùng ảnh từng khung), có biểu cảm.

## Việc phải làm
1. **Art** (`tools/art/characters.py`): mỗi nhân vật một tấm SVG gồm các bộ phận rời (đầu, thân, tay, đùi, ống chân, đồ đeo lưng, đồ cầm tay) + toạ độ khớp. Bộ mặt dùng chung: bình thường, vui, ngạc nhiên, chớp mắt, nói.
   Nhân vật: Chủ quầy (mũ, tạp dề), Chú Tư, Cô Ba, Shipper Minh, Lan (học sinh nữ), học sinh nam, Mai (khách), Anh Hoàng (văn phòng).
2. **Xương & chuyển động** (`src/world/Character.ts`): đứng thở, đi, pha chế, mời/bán hàng, ngồi, sửa xe, vẫy tay, nói; chớp mắt ngẫu nhiên; quay trái/phải.
3. **Đời sống phố** (`src/world/StreetLife.ts`): chủ quầy đứng sau xe cà phê (đứng ↔ pha chế), Chú Tư ngồi sửa xe, Cô Ba đứng trước tiệm, Mai ngồi ghế nhựa, 4 người đi bộ qua lại trên vỉa hè. Xếp trước/sau đúng theo vị trí chân so với đạo cụ.
4. **Chạm nhân vật**: hiện tên + vai, nhân vật vui và vẫy tay.
5. Sắc nét mọi màn hình (raster theo độ phân giải), texture ≤ 4096. Master UI giữ nguyên.

## Test (5 màn hình)
Đủ 8 nhân vật và bộ phận · người đi bộ thật sự di chuyển, quay mặt đúng hướng, tay chân đổi góc · người đứng yên không trôi · chủ quầy nằm sau xe cà phê, người đi bộ nằm trước ghế · chạm nhân vật → tên + vẫy tay + mặt vui · điểm chạm Phase 2 vẫn hoạt động · không lỗi console · test Phase 0–2 vẫn đạt.
