# Work Breakdown Structure (WBS) & Implementation Tasks

> **Quy ước cho Agent:**
>
> - Hoàn thành tuần tự từng task nhỏ.
> - Mỗi task hoàn thành phải vượt qua phần `Verification / Acceptance Criteria` mới được đánh dấu `[x]`.

---

## Giai đoạn 1: Môi Trường & Hạ Tầng Dự Án (Scaffolding & Infrastructure)

- [x] **Task 1.0: Chuẩn bị thư mục storage và tệp âm thanh mẫu**
  - **Mô tả:** Tạo cấu trúc thư mục lưu trữ `server/storage/uploads`, `server/storage/outputs` (kèm `.gitkeep`) và `server/tests/fixtures/`. Dùng FFmpeg sinh 2 fixture chuẩn 10s: `vocal_test.mp3` (440Hz) và `beat_test.mp3` (110Hz) chuẩn 44.1kHz, 320kbps.
  - **File tác động:** `server/storage/uploads/.gitkeep`, `server/storage/outputs/.gitkeep`, `server/tests/fixtures/vocal_test.mp3`, `server/tests/fixtures/beat_test.mp3`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Cả 2 file xuất hiện trên đĩa; `ffprobe` xác nhận: mp3, 44100 Hz, stereo, 320 kbps, duration 10.0s.

- [x] **Task 1.1: Khởi tạo Root & Server Workspace**
  - **Mô tả:** Thiết lập cấu trúc thư mục, khởi tạo `server/package.json` với ES Modules (`"type": "module"`), cài đặt các thư viện `express`, `dotenv`, `cors`, `uuid`, `fluent-ffmpeg` và `nodemon`. Thiết lập file `.env` và Express app với endpoint `GET /health`.
  - **File tác động:** `server/package.json`, `server/src/app.js`, `server/.env.example`, `server/.env`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node src/app.js`, server lắng nghe trên cổng 5000; gọi `GET /health` nhận HTTP 200 kèm JSON `{ "status": "ok" }`.

- [x] **Task 1.2: Thiết lập Prisma ORM & SQLite Migration**
  - **Mô tả:** Cấu hình Prisma kết nối SQLite, viết schema model `MixJob` chuẩn hóa theo file `ARCHITECTURE.md`, chạy migration đầu tiên và export PrismaClient singleton từ `server/src/config/db.js`.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/config/db.js`, `server/tests/test_db.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Lệnh `npx prisma migrate dev --name init` chạy thành công; tạo được `dev.db`; chạy `node tests/test_db.js` xác nhận ghi, đọc, cập nhật và xóa bản ghi thành công.

---

## Giai đoạn 2: Lõi Xử Lý Âm Thanh (Core Audio Engine)

- [x] **Task 2.1: Xây dựng Module kiểm tra Binary FFmpeg**
  - **Mô tả:** Viết utility kiểm tra sự hiện diện của binary `ffmpeg` và `ffprobe` trong `$PATH` bằng `execFile` (ngăn Command Injection), tích hợp vào bootstrap của `server/src/app.js` theo nguyên lý Fail-Fast.
  - **File tác động:** `server/src/utils/checkFfmpeg.js`, `server/tests/test_ffmpeg.js`, `server/src/app.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_ffmpeg.js` trả về trạng thái ready cùng version và path cụ thể; server Express tự động dừng nếu thiếu binary.

- [x] **Task 2.2: Hiện thực hóa AudioMixerService**
  - **Mô tả:** Đóng gói logic phối trộn bằng `fluent-ffmpeg` vào Promise sạch. Cấu hình FilterGraph (`aresample`, `volume`, `amix`, `alimiter`), theo dõi tiến độ qua sự kiện `.on('progress')` và xuất file MP3 320kbps.
  - **File tác động:** `server/src/services/AudioMixerService.js`, `server/tests/test_mixer.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_mixer.js` phối trộn 2 fixture mẫu thành công; xuất file `test_mixed.mp3` đúng chuẩn 44100Hz, stereo, 320kbps, không bị clipping.

---

## Giai đoạn 3: Tầng API & Xử Lý Tác Vụ Bất Đồng Bộ (API & Asynchronous Worker)

- [x] **Task 3.1: Cấu hình Multer Upload & File Validation Middleware**
  - **Mô tả:** Viết middleware tiếp nhận 2 trường file `trackA` và `trackB`, lưu vào `storage/uploads/` bằng tên UUID chống Path Traversal, kiểm định dung lượng $\le 25\text{MB}$ và định dạng MP3/WAV. Tự động dọn dẹp file mồ côi nếu thiếu 1 trong 2 file.
  - **File tác động:** `server/src/middlewares/uploadMiddleware.js`, `server/tests/test_upload.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_upload.js` vượt qua cả 3 ca: tải hợp lệ (200), thiếu file (400), và sai định dạng (415).

- [x] **Task 3.2: Endpoint POST /api/v1/mix**
  - **Mô tả:** Controller nhận file từ Multer, tạo bản ghi `MixJob` trạng thái `PENDING` trong SQLite, kích hoạt background worker chạy ngầm qua `setImmediate()`, lập tức phản hồi mã `HTTP 202 Accepted` trong $\le 200\text{ms}$. Tích hợp cơ chế throttle ghi tiến độ vào DB.
  - **File tác động:** `server/src/controllers/mixController.js`, `server/src/routes/mixRoutes.js`, `server/tests/test_api_mix.js`, `server/src/app.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_api_mix.js` nhận phản hồi 202 trong 168ms; DB ghi nhận chuyển dịch trạng thái `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SUCCESS`.

- [x] **Task 3.3: Endpoint GET /api/v1/mix/:jobId & Stream / Download**
  - **Mô tả:** Cung cấp API truy vấn trạng thái job, API phân phối stream hỗ trợ HTTP 206 Partial Content (Range header phục vụ seeking), và API download với header `Content-Disposition`.
  - **File tác động:** `server/src/controllers/mixController.js`, `server/src/routes/mixRoutes.js`, `server/tests/test_api_stream.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_api_stream.js` xác thực thành công cả 3 endpoint: GET status (200), GET stream với Range bytes (206), và GET download (200).

---

## Giai đoạn 4: Giao Diện Người Dùng (React Client)

- [x] **Task 4.1: Khởi tạo Client Workspace với Vite & TailwindCSS**
  - **Mô tả:** Thiết lập ứng dụng React 18 trong thư mục `client/`, cài đặt `tailwindcss`, `lucide-react`, `axios`, `wavesurfer.js`. Cấu hình Vite Proxy trỏ `/api` sang `http://localhost:5000`.
  - **File tác động:** `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/src/index.css`, `client/src/App.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** `npm run build` thành công; mở `http://localhost:5173` hiển thị giao diện Dark Theme áp dụng đầy đủ class Tailwind và Lucide icons.

- [x] **Task 4.2: Thành phần tải lên (DualDropzone Component)**
  - **Mô tả:** Xây dựng UI 2 ô kéo thả file riêng biệt cho Vocal (Indigo) và Beat (Emerald), tích hợp Client-Side Validation (đuôi file, MIME type, dung lượng $\le 25\text{MB}$), hiển thị metadata và gọi API `POST /api/v1/mix`.
  - **File tác động:** `client/src/services/api.js`, `client/src/components/DualDropzone.jsx`, `client/src/App.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chọn thử file sai định dạng bị chặn ngay tại client; chọn đủ 2 file hợp lệ gửi request nhận `HTTP 202` kèm `jobId`.

- [x] **Task 4.3: Hook điều phối Polling & Trạng thái (useJobPolling)**
  - **Mô tả:** Custom hook nhận vào `jobId`, kích hoạt `setInterval` gọi `GET /api/v1/mix/:jobId` mỗi 1.5 giây. Tự động ngắt timer khi đạt `SUCCESS`/`FAILED` và có Cleanup Function chống Zombie Polling. Hiển thị component `MixingStatus` với thanh tiến độ chuyển động mượt mà.
  - **File tác động:** `client/src/hooks/useJobPolling.js`, `client/src/components/MixingStatus.jsx`, `client/src/App.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Thanh tiến trình hiển thị nhảy đều đặn $0\% \rightarrow \dots \rightarrow 100\%$; mạng dừng gửi polling khi job hoàn tất.

- [x] **Task 4.4: Trình phát trực quan hóa (WaveformPlayer Component)**
  - **Mô tả:** Tích hợp `wavesurfer.js` render sóng âm đa phân đoạn tương tác kết nối qua endpoint stream (HTTP 206), hỗ trợ click tua nhạc tức thì, hiển thị đồng hồ thời gian và nút tải tệp về máy. Có Cleanup giải phóng AudioContext.
  - **File tác động:** `client/src/components/WaveformPlayer.jsx`, `client/src/components/MixingStatus.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Sóng âm hiển thị trực quan; bấm Play nhạc phát mượt; nhấp chuột vào đỉnh sóng tua nhạc tức thì không có độ trễ; nút Download tải đúng file MP3.

---

## Giai đoạn 5: Hoàn Thiện & Kiểm Thử Tích Hợp (End-to-End Verification)

- [x] **Task 5.1: Cấu hình Root Script & Kiểm thử toàn diện**
  - **Mô tả:** Cài đặt `concurrently` ở root `package.json`, cấu hình script `"dev"` chạy song song cả Server và Client với cờ `-k` tắt sạch tiến trình khi ngắt. Viết kịch bản test E2E toàn chu trình 5 bước.
  - **File tác động:** `package.json`, `server/tests/test_e2e_full_cycle.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `npm run test:e2e` vượt qua 100% cả 5 bước; chạy `npm run dev` khởi động đồng thời cả 2 máy chủ trên cùng 1 terminal.

---

## Giai đoạn 6: Tự Động Dò & Khớp Nhịp Điệu (BPM & Tempo Matching)

- [x] **Task 6.1: Hiện thực hóa BpmDetectorService & Script kiểm định**
  - **Mô tả:** Xây dựng service giải mã luồng audio sang raw PCM stream qua FFmpeg và áp dụng thuật toán nhận diện nhịp độ (Onset Detection / Autocorrelation) để tính toán BPM trung bình của bài nhạc. Xử lý các ca ngoại lệ khi bài hát không rõ nhịp.
  - **File tác động:** `server/src/services/BpmDetectorService.js`, `server/tests/test_bpm.js`, `server/package.json`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy `node tests/test_bpm.js` đo được BPM của 2 file fixture mẫu hoặc file nhạc thực tế với độ chính xác cao, in ra kết quả phân tích trong $\le 2\text{ giây}$.

- [x] **Task 6.2: Cập nhật Prisma Schema & AudioMixerService với filter atempo**
  - **Mô tả:** Bổ sung các trường `trackABpm`, `trackBBpm`, `appliedTempoRatio` vào schema Prisma và chạy migration; cập nhật `AudioMixerService` nhận tham số `tempoRatio` để co dãn Track A (Vocal) theo nhịp của Track B (Beat) qua filter `atempo`.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/services/AudioMixerService.js`, `server/tests/test_mixer_tempo.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Render thử 1 bài vocal với tỷ lệ co dãn $1.25$, kiểm tra thời lượng co lại đúng $20\%$ nhưng cao độ (pitch) giữ nguyên vẹn, không bị hiệu ứng sóc chuột.

- [x] **Task 6.3: Tích hợp BPM Matching vào Background Worker & API**
  - **Mô tả:** Cập nhật luồng xử lý ngầm `processMixJobInBackground` trong `mixController.js`: Tự động dò BPM Track A và Track B $\rightarrow$ Tính tỷ lệ $r = \frac{BPM_B}{BPM_A}$ $\rightarrow$ Truyền $r$ vào AudioMixerService $\rightarrow$ Lưu thông số BPM và tỷ lệ vào SQLite. Cập nhật endpoint `GET /api/v1/mix/:jobId` trả về metadata nhịp độ.
  - **File tác động:** `server/src/controllers/mixController.js`, `server/tests/test_api_bpm_mix.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi request tạo mix job; endpoint `GET /:jobId` khi `SUCCESS` trả về đầy đủ block dữ liệu `tempo: { trackABpm, trackBBpm, appliedTempoRatio }`.

- [ ] **Task 6.4: Hiển thị thông số BPM trên Giao diện Web**
  - **Mô tả:** Cập nhật UI `MixingStatus.jsx` và `WaveformPlayer.jsx` để hiển thị các Badge thông số: BPM của bài Vocal, BPM của bài Beat, và tỷ lệ phần trăm tốc độ đã tự động cân chỉnh (ví dụ: `+6.7% Tempo Adjusted`).
  - **File tác động:** `client/src/components/MixingStatus.jsx`, `client/src/components/WaveformPlayer.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Sau khi bài phối âm hoàn tất, người dùng nhìn thấy rõ ràng các chỉ số nhịp độ trực quan ngay trên card kết quả.
