# Work Breakdown Structure (WBS) & Implementation Tasks

> **Quy ước cho Agent:**
>
> - Hoàn thành tuần tự từng task nhỏ.
> - Mỗi task hoàn thành phải vượt qua phần `Verification / Acceptance Criteria` mới được đánh dấu `[x]`.

---

## Giai đoạn 1: Môi Trường & Hạ Tầng Dự Án (Scaffolding & Infrastructure)

- [x] **Task 1.0: Chuẩn bị thư mục storage và tệp âm thanh mẫu**
  - **Mô tả:** Tạo sẵn thư mục `server/storage/uploads`, `server/storage/outputs` và thư mục `server/tests/fixtures/` chứa sẵn 2 file âm thanh ngắn `vocal_test.mp3` và `beat_test.mp3` để kiểm thử tự động.
- [x] **Task 1.1: Khởi tạo Root & Server Workspace**
  - **Mô tả:** Thiết lập cấu trúc thư mục, khởi tạo `package.json` cho server với ES Modules (`"type": "module"`), cài đặt các thư viện lõi: `express`, `dotenv`, `cors`, `uuid`, `fluent-ffmpeg`.
  - **File tác động:** `server/package.json`, `server/src/app.js`, `server/.env.example`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node server/src/app.js`, server lắng nghe trên cổng 5000 và phản hồi `{"status": "ok"}` tại endpoint `GET /health`.

- [x] **Task 1.2: Thiết lập Prisma ORM & SQLite Migration**
  - **Mô tả:** Cấu hình Prisma kết nối SQLite, viết schema model `MixJob` chuẩn hóa theo file `ARCHITECTURE.md`, chạy migration đầu tiên.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/config/db.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Lệnh `npx prisma migrate dev --name init` chạy thành công; tạo được 1 file database cục bộ `dev.db`; file client `db.js` export singleton instance của `PrismaClient` hoạt động ổn định.

---

## Giai đoạn 2: Lõi Xử Lý Âm Thanh (Core Audio Engine)

- [x] **Task 2.1: Xây dựng Module kiểm tra Binary FFmpeg**
  - **Mô tả:** Viết utility kiểm tra xem máy chủ đã cài đặt `ffmpeg` và `ffprobe` chưa trước khi cho phép server chạy. Báo lỗi rõ ràng nếu thiếu.
  - **File tác động:** `server/src/utils/checkFfmpeg.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gọi hàm kiểm tra trả về `true` kèm đường dẫn binary hoặc ném ngoại lệ có hướng dẫn cài đặt nếu binary không tồn tại trong `$PATH`.

- [x] **Task 2.2: Hiện thực hóa AudioMixerService**
  - **Mô tả:** Đóng gói logic phối trộn bằng `fluent-ffmpeg`. Nhận vào đường dẫn 2 file, cấu hình complexFilter (`aresample`, `volume`, `amix`, `alimiter`), theo dõi tiến độ qua sự kiện `.on('progress')` và lưu file MP3 320kbps ra thư mục output.
  - **File tác động:** `server/src/services/AudioMixerService.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Viết script test độc lập gọi Service trộn 2 file mẫu; kiểm tra file đầu ra phát tốt, âm lượng cân bằng, không bị vỡ tiếng khi mở bằng VLC/trình nghe nhạc.

---

## Giai đoạn 3: Tầng API & Xử Lý Tác Vụ Bất Đồng Bộ (API & Asynchronous Worker)

- [x] **Task 3.1: Cấu hình Multer Upload & File Validation Middleware**
  - **Mô tả:** Viết middleware tiếp nhận 2 trường file `trackA` và `trackB`, lưu tạm vào `storage/uploads/`, kiểm định dung lượng tối đa 25MB và đuôi file hợp lệ.
  - **File tác động:** `server/src/middlewares/uploadMiddleware.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi thử request qua Postman/cURL: thiếu file trả về 400; file quá lớn trả về 413; file hợp lệ được ghi vào đĩa và trả về metadata.

- [x] **Task 3.2: Endpoint POST /api/v1/mix**
  - **Mô tả:** Controller nhận dữ liệu từ multer, tạo bản ghi `MixJob` trạng thái `PENDING` trong SQLite, kích hoạt `AudioMixerService` chạy ngầm (không dùng `await` chặn response), lập tức trả về HTTP 202 kèm `jobId`.
  - **File tác động:** `server/src/controllers/mixController.js`, `server/src/routes/mixRoutes.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Request trả về trong vòng dưới 200ms; trong database bản ghi chuyển từ `PENDING` -> `PROCESSING` -> `SUCCESS` khi audio render xong.

- [x] **Task 3.3: Endpoint GET /api/v1/mix/:jobId & Stream / Download**
  - **Mô tả:** Cung cấp API kiểm tra trạng thái job và API phân phối file âm thanh (hỗ trợ HTTP 206 Partial Content cho streaming).
  - **File tác động:** `server/src/controllers/mixController.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Trình duyệt gọi URL stream có thể phát và tua nhạc mượt mà; endpoint download trả về file đính kèm với header `Content-Disposition`.

---

## Giai đoạn 4: Giao Diện Người Dùng (React Client)

- [x] **Task 4.1: Khởi tạo Client Workspace với Vite & TailwindCSS**
  - **Mô tả:** Thiết lập ứng dụng React trong thư mục `client`, cài đặt `tailwindcss`, `lucide-react`, `axios`, `wavesurfer.js`.
  - **File tác động:** `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `npm run dev` hiển thị trang chào mừng có áp dụng class TailwindCSS thành công.

- [x] **Task 4.2: Thành phần tải lên (DualDropzone Component)**
  - **Mô tả:** Xây dựng UI gồm 2 ô kéo thả file riêng biệt cho Track A và Track B, hiển thị tên file, dung lượng và nút bấm "Bắt đầu Mix". Có validate cơ bản ở client.
  - **File tác động:** `client/src/components/DualDropzone.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Người dùng có thể chọn 2 file từ máy tính; nút bấm kích hoạt gọi API upload và nhận về `jobId`.

- [x] **Task 4.3: Hook điều phối Polling & Trạng thái (useJobPolling)**
  - **Mô tả:** Custom hook nhận vào `jobId`, kích hoạt `setInterval` gọi `GET /api/v1/mix/:jobId` mỗi 1.5 giây. Dừng polling khi trạng thái là `SUCCESS` hoặc `FAILED`.
  - **File tác động:** `client/src/hooks/useJobPolling.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** UI hiển thị chính xác thanh phần trăm tiến độ cập nhật liên tục từ server cho đến khi đạt 100%.

- [x] **Task 4.4: Trình phát trực quan hóa (WaveformPlayer Component)**
  - **Mô tả:** Tích hợp thư viện `wavesurfer.js` để render dạng sóng của bản mix lấy từ endpoint stream. Có nút Play/Pause và nút Download.
  - **File tác động:** `client/src/components/WaveformPlayer.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Sóng âm hiển thị trực quan; nhấp chuột vào vị trí bất kỳ trên sóng để tua nhạc thành công.

---

## Giai đoạn 5: Hoàn Thiện & Kiểm Thử Tích Hợp (End-to-End Verification)

- [x] **Task 5.1: Cấu hình Root Script & Kiểm thử toàn diện**
  - **Mô tả:** Thêm script `concurrently` tại root `package.json` để khởi động cả client và server bằng một lệnh duy nhất (`npm run dev`).
  - **File tác động:** `package.json`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Mở trình duyệt, thực hiện trọn vẹn luồng từ Upload 2 bài hát -> Theo dõi thanh tiến trình -> Nghe bản mashup trên Waveform -> Tải về thành công.
