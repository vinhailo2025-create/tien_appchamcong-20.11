# NP ONE — Nguyên Phát Human Resources (`tien_appchamcong 20.11`)

Hệ thống Quản lý Chấm công Camera Trực tiếp GPS, Kiểm soát Quân số, Tăng ca & Tính lương Công trình theo mô hình **Phân cấp 5 Tầng** (Quản lý >100 công nhân).

## Tính năng chính
1. **Phân cấp quản lý 5 tầng độc lập:** Ban Giám đốc → Hành chính - Kế toán → Quản lý công trình → Đội trưởng (6 Đội) → Công nhân (108 Công nhân).
2. **Chấm công Camera trực tiếp (Chặn tải ảnh từ thư viện):** Bắt buộc chụp trực tiếp kèm định vị vệ tinh GPS thực tế (`Vĩ độ, Kinh độ, Sai số ±m`) và tra cứu Địa chỉ thực tế.
3. **Đóng dấu Watermark tự động lên ảnh:** Mã NV, Họ tên, Thời gian chấm công, Địa điểm định vị, Tọa độ GPS và Logo NP ONE.
4. **Chống "Quên Check-out = Cộng khống tăng ca" sau 17:30:** Tự động khóa tối đa 8.0h hành chính (0h OT) nếu không có phiếu đăng ký tăng ca của Đội trưởng.
5. **Báo cáo Quân số & Chi phí tự động 08:30 sáng cho Giám đốc.**
6. **Kiểm soát 100% Ứng lương phải qua phê duyệt & Tính lương 7 bước.**
7. **Giao diện Mobile-First PWA:** Menu bên trái trượt đóng/mở, thanh 5 phím tắt đáy màn hình, hỗ trợ cài phím tắt App ra màn hình chính iPhone/Android/Desktop.

## Cách chạy dự án
```bash
node server.js
```
Truy cập tại: `http://localhost:3899` (Báo giá chi tiết: `http://localhost:3899/bao-gia.html`).
