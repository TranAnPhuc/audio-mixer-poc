# Work Breakdown Structure (WBS) & Implementation Tasks

> **Quy ước cho Agent:**
>
> - Hoàn thành tuần tự từng task nhỏ.
> - Mỗi task hoàn thành phải vượt qua phần `Verification / Acceptance Criteria` mới được đánh dấu `[x]`.

---

## Giai đoạn 1: Môi Trường & Hạ Tầng Dự Án (Scaffolding & Infrastructure)

- [x] **Task 1.0: Chuẩn bị thư mục storage và tệp âm thanh mẫu**
- [x] **Task 1.1: Khởi tạo Root & Server Workspace**
- [x] **Task 1.2: Thiết lập Prisma ORM & SQLite Migration**

---

## Giai đoạn 2: Lõi Xử Lý Âm Thanh (Core Audio Engine)

- [x] **Task 2.1: Xây dựng Module kiểm tra Binary FFmpeg**
- [x] **Task 2.2: Hiện thực hóa AudioMixerService**

---

## Giai đoạn 3: Tầng API & Xử Lý Tác Vụ Bất Đồng Bộ (API & Asynchronous Worker)

- [x] **Task 3.1: Cấu hình Multer Upload & File Validation Middleware**
- [x] **Task 3.2: Endpoint POST /api/v1/mix**
- [x] **Task 3.3: Endpoint GET /api/v1/mix/:jobId & Stream / Download**

---

## Giai đoạn 4: Giao Diện Người Dùng (React Client)

- [x] **Task 4.1: Khởi tạo Client Workspace với Vite & TailwindCSS**
- [x] **Task 4.2: Thành phần tải lên (DualDropzone Component)**
- [x] **Task 4.3: Hook điều phối Polling & Trạng thái (useJobPolling)**
- [x] **Task 4.4: Trình phát trực quan hóa (WaveformPlayer Component)**

---

## Giai đoạn 5: Hoàn Thiện & Kiểm Thử Tích Hợp (End-to-End Verification)

- [x] **Task 5.1: Cấu hình Root Script & Kiểm thử toàn diện**

---

## Giai đoạn 6: Tự Động Dò & Khớp Nhịp Điệu (BPM & Tempo Matching)

- [x] **Task 6.1: Hiện thực hóa BpmDetectorService & Script kiểm định**
- [x] **Task 6.2: Cập nhật Prisma Schema & AudioMixerService với filter atempo**
- [x] **Task 6.3: Tích hợp BPM Matching vào Background Worker & API**
- [x] **Task 6.4: Hiển thị thông số BPM trên Giao diện Web**

---

## Giai đoạn 7: Căn Chỉnh Vị Trí Phách & Độ Trễ (Vocal Offset Alignment)

- [x] **Task 7.1: Mở rộng AudioMixerService với cơ chế Offset Delay & Script kiểm định**
- [x] **Task 7.2: Cập nhật Prisma Schema, Upload Controller & Background Worker**
- [x] **Task 7.3: Tích hợp Thanh trượt Căn nhịp (Vocal Offset Slider) trên Giao diện React**

---

## Giai đoạn 8: Trực Quan Hóa Đa Tầng & Căn Nhịp Trực Tiếp (Dual-Track Waveform Studio / Mini-DAW)

- [x] **Task 8.1: Xây dựng Component DualWaveformTimeline & Thước đo thời gian**
  - **Mô tả:** Xây dựng component `client/src/components/DualWaveformTimeline.jsx` nhận vào `trackAFile` và `trackBFile`. Sử dụng `URL.createObjectURL` để render 2 instance Wavesurfer xếp chồng (Track A trên, Track B dưới) kèm thanh thước đo thời gian (Time Ruler Canvas) hiển thị mốc giây/vạch chia nhịp. Thu hồi Blob URL an toàn khi component unmount.
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`, `client/src/components/DualDropzone.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chọn đủ 2 file trên giao diện, bảng timeline đa tầng xuất hiện với 2 dải sóng độc lập và thước đo thời gian hiển thị đúng mốc giây.

- [x] **Task 8.2: Tương tác Kéo Trượt Dải Sóng Vocal (Drag-to-Offset Engine)**
  - **Mô tả:** Cho phép người dùng nhấp giữ chuột và kéo dải sóng Vocal (Track A) dịch chuyển sang trái hoặc phải trực tiếp trên timeline. Tính toán độ dịch chuyển điểm ảnh $\Delta x$ thành mili-giây offset và đồng bộ hai chiều mượt mà với thanh trượt và state `vocalOffsetMs` ($-3000\text{ ms} \leftrightarrow +3000\text{ ms}$).
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`, `client/src/components/DualDropzone.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Kéo dải sóng Vocal bằng chuột, dải sóng dịch chuyển trực quan sang trái/phải, số mili-giây và nhãn hiển thị cập nhật thời gian thực không giật lag (60 FPS).

- [x] **Task 8.3: Trình Phát Nghe Thử Đồng Thời Không Độ Trễ (Zero-Latency Web Audio Preview)**
  - **Mô tả:** Xây dựng cơ chế phát đồng thời cả 2 track ngay trong trình duyệt trước khi render. Khi bấm "Nghe thử", cả 2 track phát đồng bộ với độ trễ đúng bằng `vocalOffsetMs` hiện tại, kèm vạch chỉ báo phát (Playhead) chạy xuyên suốt cả 2 track trên timeline.
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Bấm "Nghe thử Preview", nghe thấy cả giọng hát và nhạc nền hòa quyện với đúng độ lệch phách đã căn chỉnh; bấm "Tạm dừng" dừng cả 2 track; kim phát chạy đồng bộ.

## Giai đoạn 9: Trang Giới Thiệu & Hiệu Ứng Thị Giác 3D (Three.js Landing Page)

- [x] **Task 9.1: Tích hợp Three.js & Xây dựng Background Particle Wave 3D**
  - **Mô tả:** Cài đặt thư viện `three` vào `client/`. Tạo component `ThreeAudioVisualizer.jsx` dựng lưới hạt 3D uốn lượn với gradient màu Indigo-Emerald, phản hồi theo chuyển động chuột, có cơ chế dọn dẹp bộ nhớ WebGL an toàn khi unmount.
  - **File tác động:** `client/package.json`, `client/src/components/ThreeAudioVisualizer.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Component render mượt mà 60 FPS trên Canvas WebGL; khi di chuột, sóng hạt nghiêng theo góc nhìn; không bị memory leak hay lỗi context loss.

- [x] **Task 9.2: Xây dựng Giao Diện Landing Page & Điều Hướng Vào Studio**
  - **Mô tả:** Tạo component `LandingPage.jsx` kết hợp Hero Banner, thanh Navbar, thẻ giới thiệu tính năng và nút bấm CTA chuyển mượt vào khu vực Studio (DualDropzone & Mini-DAW). Cập nhật `App.jsx` để liên kết luồng trải nghiệm.
  - **File tác động:** `client/src/components/LandingPage.jsx`, `client/src/App.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Mở `http://localhost:5173`, người dùng được chào đón bằng Landing Page 3D đẹp mắt; bấm "Mở Studio Ngay" cuộn mượt xuống bàn làm việc Mini-DAW.
