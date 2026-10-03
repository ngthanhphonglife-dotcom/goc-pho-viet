# PHASE 10 — KẾT THÚC NGÀY + THỐNG KÊ (prompt)

Tham chiếu: bảng 3.8 §9, 3.9 §11, 3.20 §11. Master UI giữ nguyên.

## Việc phải làm
1. **Hết ngày (24:00)**: đồng hồ dừng ở 23:59, hiện bảng **Tổng kết ngày** thay vì tự sang ngày mới. Bấm "Sang ngày mới" mới chuyển ngày.
2. **Kết thúc ngày sớm**: nút trong bảng Quầy hàng; bảng tổng kết khi đó có thêm nút "Bán tiếp".
3. **Nội dung tổng kết**: doanh thu, tiền tip, chi phí nguyên liệu, lợi nhuận; số ly đã bán; khách hài lòng / bình thường / bỏ đi và % hài lòng; uy tín thay đổi trong ngày; món bán chạy nhất; biểu đồ số ly theo giờ; biểu đồ lợi nhuận 7 ngày gần nhất.
4. **Ghi số liệu**: mỗi lần bán ghi theo món và theo giờ; lịch sử 7 ngày nằm trong save.
5. Thoát game khi bảng tổng kết đang mở → vào lại hiện lại bảng (không mất ngày).

## Test (5 màn hình)
24:00 hiện tổng kết, chưa đổi ngày · số liệu đúng sau vài lần bán + mua hàng · món bán chạy, biểu đồ giờ · "Sang ngày mới" → ngày +1, 06:00, số liệu ngày về 0, lịch sử +1 · kết thúc sớm có "Bán tiếp" · lịch sử tối đa 7 ngày · thoát rồi vào lại vẫn hiện tổng kết · bảng không tràn màn hình · test Phase 0–9 vẫn đạt.
