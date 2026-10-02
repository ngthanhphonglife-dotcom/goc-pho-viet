# [PHASE 7 — KINH DOANH CÀ PHÊ] Báo cáo

## Đã làm
- **13 biểu tượng vector mới**: 8 nguyên liệu (cà phê hạt, sữa đặc, sữa tươi, đường, đá viên, trà, tắc, ly nhựa) và 5 món (cà phê đen, cà phê sữa, bạc xỉu, trà tắc, trà đào).
- **Kho nguyên liệu** (nút Nguyên liệu): lưới 8 ô có số lượng + đơn vị, nhãn "Sắp hết" / "Hết", nút "Mua ở Tạp hoá Cô Ba" (bảng mua thuộc Phase 9). Ván mới có kho khởi đầu; save cũ tự được cấp kho.
- **Thực đơn** (nút Quầy hàng hoặc chạm xe cà phê): Cà phê đen 25.000đ, Cà phê sữa 25.000đ, Trà tắc 20.000đ (theo bảng phấn). Mỗi món ghi nguyên liệu cần và "Còn pha được N ly". Bạc xỉu, Trà đào hiện khoá (mở theo uy tín ở Phase 11).
- **Minigame pha chế**: mỗi món 4 bước (vd. cà phê sữa: cho sữa đặc → cho cà phê vào phin → rót nước sôi → khuấy, thêm đá). Mỗi bước kim chạy qua lại trên thanh, bấm "Pha chế" đúng vùng xanh (2 điểm), vàng (1), đỏ (0); kim nhanh dần. Ly đầy dần theo bước. Tổng điểm → **Tuyệt hảo / Ngon / Tạm được**. Huỷ giữa chừng không mất nguyên liệu.
- **Khay pha sẵn** (tối đa 6 ly, viền màu theo chất lượng): pha xong trừ nguyên liệu, ly lên khay để bán ở Phase 8. Khay đầy hoặc thiếu nguyên liệu thì nút Pha chế bị khoá.
- Đứng sau quầy khi pha thì chủ quầy làm động tác pha chế. Kho và khay nằm trong save.

## Kiểm tra (Playwright, 5 màn hình)
Kho khởi đầu đúng · 8 ô, "Hết" ở sữa tươi, ô không tràn · thực đơn 5 món, giá, số ly pha được, 2 món khoá, bảng không tràn màn hình · kim chạy thật · 4 bước trúng xanh → Tuyệt hảo; lệch → Ngon / Tạm được đúng ngưỡng · trừ đúng nguyên liệu từng món · huỷ không trừ · khay 6/6 khoá nút · thiếu nguyên liệu khoá đúng món · "Sắp hết" đúng · lưu/mở lại · save cũ không có kho · chạm xe cà phê mở Quầy hàng · về menu khi đang pha không trừ nguyên liệu · test Phase 0–6 vẫn đạt.

## Thay đổi so với phase trước
- Nút Quầy hàng, Nguyên liệu và chạm xe cà phê giờ mở bảng thật (trước là bảng "Sẽ có ở Phase X").

## Sửa trong lúc làm
- Nhãn "Hết" thò ra ngoài ô → đặt vào trong ô.
- Về Menu khi đang pha làm bảng thực đơn mở lại ở Menu → rời game thì dừng luồng pha.

## Ghi chú
- Ly trên khay chưa bán được — khách và đơn hàng là Phase 8 (khi đó nhiệm vụ "Bán 20 ly cà phê" mới đếm).
- Phase tiếp theo: **Phase 8 — Khách hàng AI + Đơn hàng**.
