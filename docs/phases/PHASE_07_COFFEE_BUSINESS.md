# PHASE 7 — KINH DOANH CÀ PHÊ (prompt)

Tham chiếu: bảng 3.8 §1–4, 3.4 §5. Biểu tượng nguyên liệu và món vẽ vector mới.

## Việc phải làm
1. **Kho nguyên liệu** (nút Nguyên liệu): cà phê hạt, sữa đặc, sữa tươi, đường, đá, trà, tắc, ly nhựa — số còn lại, nhãn "Sắp hết"/"Hết", nút đi mua ở Tạp hoá Cô Ba (bảng mua thuộc Phase 9).
2. **Thực đơn** (nút Quầy hàng / chạm xe cà phê): Cà phê đen 25K, Cà phê sữa 25K, Trà tắc 20K (giá theo bảng phấn); Bạc xỉu, Trà đào hiện "khoá" (mở ở Phase 11). Mỗi món ghi nguyên liệu cần và còn pha được mấy ly.
3. **Minigame pha chế**: mỗi món 4 bước; mỗi bước một thanh có kim chạy qua lại, bấm "Pha chế" đúng vùng xanh. Điểm các bước → chất lượng ly: Tuyệt hảo / Ngon / Tạm được. Ly hiện đầy dần theo bước. Huỷ giữa chừng không mất nguyên liệu.
4. Pha xong: trừ nguyên liệu, ly vào **khay pha sẵn** (tối đa 6) để bán ở Phase 8.
5. Lưu kho + khay trong save; save cũ tự có kho khởi đầu. Master UI giữ nguyên.

## Test (5 màn hình)
Kho khởi đầu đúng · thực đơn: giá, số ly pha được, món khoá · pha 4 bước trúng vùng xanh → Tuyệt hảo; lệch → chất lượng thấp · trừ đúng nguyên liệu · huỷ không trừ · hết nguyên liệu / khay đầy → nút bị khoá · "Sắp hết" hiện đúng · lưu/mở lại · test Phase 0–6 vẫn đạt.
