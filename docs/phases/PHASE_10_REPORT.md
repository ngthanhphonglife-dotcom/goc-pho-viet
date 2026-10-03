# [PHASE 10 — KẾT THÚC NGÀY + THỐNG KÊ] Báo cáo

## Đã làm
- **Hết ngày có tổng kết**: tới 24:00 đồng hồ dừng ở 23:59 và hiện bảng **Tổng kết ngày**; chỉ khi bấm "Sang ngày mới" mới chuyển sang 06:00 hôm sau (trước đây tự chuyển).
- **Kết thúc ngày sớm**: nút "Đóng quầy, xem tổng kết ngày" trong bảng Quầy hàng; khi đó bảng có thêm nút "Bán tiếp".
- **Nội dung bảng**: doanh thu, tiền tip, chi phí nguyên liệu, **lợi nhuận** (xanh khi lãi, đỏ khi lỗ); 4 ô số: ly đã bán, % khách hài lòng, khách bỏ đi, uy tín thay đổi trong ngày; món bán chạy nhất; biểu đồ **số ly theo giờ** (06h–24h); biểu đồ **lợi nhuận các ngày gần đây** (tối đa 7 ngày, cột đỏ cho ngày lỗ); một câu nhận xét.
- **Ghi số liệu**: mỗi lần bán ghi theo món và theo giờ; nhớ uy tín đầu ngày để tính thay đổi; lịch sử 7 ngày gần nhất nằm trong save.
- **Không mất ngày**: thoát game khi bảng tổng kết đang mở → vào lại bảng hiện lại đúng số liệu. Đóng bảng bằng X: hết ngày thật = sang ngày mới, kết thúc sớm = bán tiếp.
- Sang ngày mới: ghi lịch sử, xoá số liệu ngày, dọn hàng khách, chủ quầy về quầy, tự lưu.

## Kiểm tra (Playwright)
Bán 4 ly (2 khung giờ sáng, trưa, tối) + 1 khách bỏ đi + mua 1 bịch đá → số liệu ngày đúng từng mục · 24:00: dừng 23:59, chưa đổi ngày, đồng hồ không chạy tiếp · bảng hiện đúng doanh thu 95.000đ, tip 8.000đ, chi phí −10.000đ, lợi nhuận +93.000đ, 4 ly, 60% hài lòng, 1 bỏ đi, +5 uy tín, bán chạy nhất Cà phê sữa (3 ly) · 18 cột giờ, cột 7h cao hơn cột 12h · bảng không tràn màn hình · tải lại trang vẫn hiện tổng kết · Sang ngày mới: ngày 2, số liệu về 0, lịch sử có 1 dòng, có lưu, đồng hồ chạy lại · kết thúc sớm có "Bán tiếp" · ngày lỗ: lợi nhuận âm, cột đỏ · lịch sử tối đa 7 ngày.

## Sửa trong lúc làm
- "Uy tín thay đổi trong ngày" tính sai (lấy mốc sau khi đã cộng uy tín lần bán đầu) → ghi mốc trước khi cộng.

## Thay đổi so với phase trước
- Hết ngày không còn tự sang ngày mới; test Phase 5 và Phase 8 được cập nhật để bấm qua bảng tổng kết.

## Ghi chú
- Phase tiếp theo: **Phase 11 — Uy tín & Tiến trình** (cấp uy tín, mở khoá Bạc xỉu / Trà đào, nhiệm vụ hằng ngày).

## Phạm vi kiểm tra lần này
Máy test chạy chậm nên không chạy đủ cả bộ trên 5 màn hình: Phase 10, Phase 7 và hai bài liên quan tới chuyển ngày (Phase 5 "đồng hồ chạy…", Phase 8 "hàng chờ…") chạy trên cả 5 màn hình; các bài còn lại của Phase 0–9 chạy trên iPhone 15. Tất cả đều đạt. Một bài Phase 8 phải sửa phép so sánh số liệu ngày (giờ có thêm mục theo món/theo giờ) rồi chạy lại mới đạt.
