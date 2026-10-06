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

- [x] **Task 6.2: Cập nhật Prisma Schema & AudioMixerService with filter atempo**
  - **Mô tả:** Bổ sung các trường `trackABpm`, `trackBBpm`, `appliedTempoRatio` vào schema Prisma và chạy migration; cập nhật `AudioMixerService` nhận tham số `tempoRatio` để co dãn Track A (Vocal) theo nhịp của Track B (Beat) qua filter `atempo`.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/services/AudioMixerService.js`, `server/tests/test_mixer_tempo.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Render thử 1 bài vocal with ratio $1.25$, verify duration contracts by $20\%$ with pitch untouched (no chipmunk effect).

- [x] **Task 6.3: Tích hợp BPM Matching vào Background Worker & API**
  - **Mô tả:** Cập nhật luồng xử lý ngầm `processMixJobInBackground` trong `mixController.js`: Tự động dò BPM Track A và Track B $\rightarrow$ Tính tỷ lệ $r = \frac{BPM_B}{BPM_A}$ $\rightarrow$ Truyền $r$ vào AudioMixerService $\rightarrow$ Lưu thông số BPM và tỷ lệ vào SQLite. Cập nhật endpoint `GET /api/v1/mix/:jobId` trả về metadata nhịp độ.
  - **File tác động:** `server/src/controllers/mixController.js`, `server/tests/test_api_bpm_mix.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi request tạo mix job; endpoint `GET /:jobId` khi `SUCCESS` trả về đầy đủ block dữ liệu `tempo: { trackABpm, trackBBpm, appliedTempoRatio }`.

- [x] **Task 6.4: Hiển thị thông số BPM trên Giao diện Web**
  - **Mô tả:** Cập nhật UI `MixingStatus.jsx` và `WaveformPlayer.jsx` để hiển thị các Badge thông số: BPM của bài Vocal, BPM của bài Beat, và tỷ lệ phần trăm tốc độ đã tự động cân chỉnh (ví dụ: `+27.0% Tempo Adjusted`).
  - **File tác động:** `client/src/components/MixingStatus.jsx`, `client/src/components/WaveformPlayer.jsx`, `client/src/hooks/useJobPolling.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Sau khi bài phối âm hoàn tất, người dùng nhìn thấy rõ ràng các chỉ số nhịp độ trực quan ngay trên card kết quả.

---

## Giai đoạn 7: Căn Chỉnh Vị Trí Phách & Độ Trễ (Vocal Offset Alignment)

- [x] **Task 7.1: Mở rộng AudioMixerService với cơ chế Offset Delay & Script kiểm định**
  - **Mô tả:** Nâng cấp `AudioMixerService.js` hỗ trợ tham số `vocalOffsetMs`, xử lý 2 nhánh filter `adelay` (dương) và `atrim` (âm). Viết script kiểm tra độ lệch thời gian thực tế của luồng Vocal.
  - **File tác động:** `server/src/services/AudioMixerService.js`, `server/tests/test_mixer_offset.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Render thử with offset +1000ms and -1000ms; `ffprobe` and analysis audio buffer confirm vocal slice gets shifted exactly by $1.0\text{s}$ on timeline.

- [x] **Task 7.2: Cập nhật Prisma Schema, Upload Controller & Background Worker**
  - **Mô tả:** Chạy migration bổ sung trường `vocalOffsetMs` vào bảng `MixJob`; cập nhật `mixController.js` nhận trường `vocalOffsetMs` từ `req.body`, truyền vào worker và lưu vào database.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/controllers/mixController.js`, `server/tests/test_api_offset.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi `POST /api/v1/mix` kèm `vocalOffsetMs: 500`, bản ghi SQLite lưu đúng `vocalOffsetMs = 500`.

- [x] **Task 7.3: Tích hợp Thanh trượt Căn nhịp (Vocal Offset Slider) trên Giao diện React**
  - **Mô tả:** Bổ sung thanh trượt tùy chỉnh `vocalOffsetMs` ($-3000\text{ms} \rightarrow +3000\text{ms}$) vào component `DualDropzone.jsx`, hiển thị mốc thời gian dạng `+0.50s` / `-0.50s`, kèm nút "Reset về 0s". Đóng gói gửi kèm FormData qua `api.js`.
  - **File tác động:** `client/src/components/DualDropzone.jsx`, `client/src/services/api.js`, `client/src/components/MixingStatus.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Thao tác trượt thanh offset trên web, submit job và nhận bản mix được căn chỉnh đúng mốc thời gian đã chọn.

---

## Giai đoạn 8: Trực Quan Hóa Đa Tầng & Căn Nhịp Trực Tiếp (Dual-Track Waveform Studio / Mini-DAW)

- [x] **Task 8.1: Xây dựng Component DualWaveformTimeline & Thước đo thời gian**
  - **Mô tả:** Xây dựng component `client/src/components/DualWaveformTimeline.jsx` nhận vào `trackAFile` và `trackBFile`. Sử dụng `URL.createObjectURL` để render 2 instance Wavesurfer xếp chồng (Track A trên, Track B dưới) kèm thanh thước đo thời gian (Time Ruler Canvas) hiển thị mốc giây/vạch chia nhịp. Thu hồi Blob URL an toàn khi component unmount.
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`, `client/src/components/DualDropzone.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chọn đủ 2 file trên giao diện, bảng timeline đa tầng xuất hiện với 2 dải sóng độc lập và thước đo thời gian hiển thị đúng mốc giây.

- [x] **Task 8.2: Tương tác Kéo Trượt Dải Sóng Vocal (Drag-to-Offset Engine)**
  - **Mô tả:** Cho phép người dùng nhấp giữ chuột và kéo dải sóng Vocal (Track A) dịch chuyển sang trái hoặc phải trực tiếp trên timeline bằng Pointer Events (`setPointerCapture`). Tính toán độ dịch chuyển điểm ảnh $\Delta x$ thành mili-giây offset và đồng bộ hai chiều mượt mà với thanh trượt và state `vocalOffsetMs` ($-3000\text{ ms} \leftrightarrow +3000\text{ ms}$).
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`, `client/src/components/DualDropzone.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Kéo dải sóng Vocal bằng chuột, dải sóng dịch chuyển trực quan sang trái/phải, số mili-giây và nhãn hiển thị cập nhật thời gian thực không giật lag (60 FPS).

- [x] **Task 8.3: Trình Phát Nghe Thử Đồng Thới Không Độ Trễ (Zero-Latency Web Audio Preview)**
  - **Mô tả:** Xây dựng cơ chế phát đồng thời cả 2 track ngay trong trình duyệt trước khi render. Khi bấm "Nghe thử", cả 2 track phát đồng bộ với độ trễ đúng bằng `vocalOffsetMs` hiện tại, kèm vạch chỉ báo phát (Playhead) chạy xuyên suốt cả 2 track trên timeline.
  - **File tác động:** `client/src/components/DualWaveformTimeline.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Bấm "Nghe thử Preview", nghe thấy cả giọng hát và nhạc nền hòa quyện với đúng độ lệch phách đã căn chỉnh; bấm "Tạm dừng" dừng cả 2 track; kim phát chạy đồng bộ.

---

## Giai đoạn 9: Trang Giới Thiệu & Hiệu Ứng Thị Giác 3D (Three.js Landing Page)

- [x] **Task 9.1: Tích hợp Three.js, GSAP ScrollTrigger & Quả cầu sóng âm 3D biến dạng**
  - **Mô tả:** Cài đặt thư viện `three` và `gsap`. Tạo component `ThreeAudioVisualizer.jsx` dựng Quả cầu sóng âm 3D biến dạng phát sáng (3D Wave Orb) kết hợp vành đai hạt quay nghiêng, đồng bộ góc xoay/khoảng cách camera 3 giai đoạn theo cuộn chuột (Scroll-Tied Scrubbing).
  - **File tác động:** `client/package.json`, `client/src/components/ThreeAudioVisualizer.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Quả cầu 3D render mượt mà 60 FPS trên Canvas WebGL; khi cuộn chuột, camera zoom sát và quả cầu dịch chuyển mượt mà; không bị memory leak hay lỗi context loss.

- [x] **Task 9.2: Xây dựng Giao Diện Landing Page Điện Ảnh & Tách Biệt Tuyến Đường Studio**
  - **Mô tả:** Tách biệt ứng dụng thành 2 trang độc lập bằng `react-router-dom`: Route `/` (`LandingPage.jsx`) chuẩn điện ảnh HUD Telemetry, Reticle Cursor, Pinned Storytelling và Route `/studio` (`StudioPage.jsx`) chuyên dụng cho Mini-DAW. Tích hợp chuyển đổi Dark/Light mode toàn diện.
  - **File tác động:** `client/src/pages/LandingPage.jsx`, `client/src/pages/StudioPage.jsx`, `client/src/context/ThemeContext.jsx`, `client/src/components/ThemeToggle.jsx`, `client/src/App.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Trang chủ hiển thị 100% Landing Page không dính Dropzone; bấm nút "Vào Studio" chuyển tức thì sang `/studio`; nút Sun/Moon chuyển đổi mượt mà giữa nền sáng và nền tối.

---

## Giai đoạn 10: Khớp Tông Hòa Âm & Dịch Chuyển Cao Độ (Harmonic Key Shifting)

- [x] **Task 10.1: Xây dựng KeyDetectorService (Phân tích Chroma & Krumhansl-Schmuckler)**
  - **Mô tả:** Xây dựng service `server/src/services/KeyDetectorService.js` giải mã audio sang raw PCM, tính toán 12-bin Chromagram vector và tương quan với Krumhansl-Schmuckler Key Profiles để xác định Key, Scale và mã Camelot Wheel. Viết script kiểm thử độc lập `test_key_detector.js`.
  - **File tác động:** `server/src/services/KeyDetectorService.js`, `server/tests/test_key_detector.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy script nhận diện chính xác tông nhạc của các fixture mẫu với độ khớp $\ge 80\%$, trả về đầy đủ `key`, `scale`, `camelot` trong $\le 2\text{ giây}$.

- [x] **Task 10.2: Tích hợp Pitch Shifting vào AudioMixerService & Script kiểm định**
  - **Mô tả:** Nâng cấp `AudioMixerService.js` nhận tham số `pitchShiftSemitones` ($-6$ đến $+6$). Thiết lập filter chain kết hợp `asetrate` + `atempo` để dịch cao độ giữ nguyên thời lượng và nhịp độ bài hát. Viết script kiểm thử `test_mixer_pitch.js` đo tần số cơ bản dịch chuyển đúng tỷ lệ $2^{\Delta/12}$.
  - **File tác động:** `server/src/services/AudioMixerService.js`, `server/tests/test_mixer_pitch.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Render thử với $+2$ bán âm và $-2$ bán âm; phân tích autocorrelation xác nhận tần số pitch thay đổi chuẩn xác, không bị méo tiếng, âm lượng đạt chuẩn không clipping.

- [x] **Task 10.3: Cập nhật Prisma Schema, Worker Pipeline & API Khớp Tông Tự Động**
  - **Mô tả:** Chạy Prisma migration bổ sung các trường Key & Pitch vào SQLite; cập nhật `mixController.js` chạy song song `detectKey` cùng `detectBpm` qua `Promise.all`; hiện thực hàm tính toán bán âm tối ưu theo Camelot Wheel; trả về metadata tông nhạc trong endpoint `GET /api/v1/mix/:jobId`.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/controllers/mixController.js`, `server/tests/test_api_key_mix.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi job mix qua API, hệ thống tự động dò Key cả 2 bài, tự động tính số bán âm cần dịch và cập nhật đầy đủ các trường vào database.

- [x] **Task 10.4: Bàn Điều Khiển Cao Độ & Thẻ Camelot Wheel Trên Giao Diện Studio**
  - **Mô tả:** Cập nhật `StudioPage.jsx`, `DualDropzone.jsx` và `MixingStatus.jsx` hiển thị huy hiệu tông nhạc kèm mã Camelot (ví dụ: `8A • Am` và `8B • C`), bộ điều khiển chọn bán âm ($-6$ đến $+6$ semitones) kèm công tắc "Tự động hòa âm (Auto-Harmonize)".
  - **File tác động:** `client/src/components/DualDropzone.jsx`, `client/src/components/MixingStatus.jsx`, `client/src/services/api.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Người dùng thấy rõ tông gốc của 2 bài, có thể bật Auto-Harmonize hoặc tự chỉnh $\pm$ bán âm trước khi bấm Tạo bản mashup.

---

## Giai đoạn 11: Bóc Tách Thân Âm Tự Động Bằng AI (AI Stem Separation)

- [x] **Task 11.1: Xây dựng StemSeparatorService & Python Demucs Runner**
  - **Mô tả:** Tạo runner script `server/src/scripts/separate_stems.py` sử dụng thư viện Demucs (hoặc bộ tách phổ STFT/Demucs CLI) và module `server/src/services/StemSeparatorService.js` để gọi tiến trình con. Tích hợp cơ chế kiểm tra môi trường Python và chế độ fallback an toàn. Viết script kiểm thử độc lập `server/tests/test_stem_separator.js`.
  - **File tác động:** `server/src/scripts/separate_stems.py`, `server/src/services/StemSeparatorService.js`, `server/tests/test_stem_separator.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Chạy script kiểm thử tiếp nhận 1 file audio hỗn hợp, trích xuất thành công 2 file `vocals.wav` và `no_vocals.wav` vào thư mục lưu trữ; phân tích năng lượng sóng âm xác nhận tách bạch tín hiệu.

- [x] **Task 11.2: Tích hợp Stem Separation vào Background Worker & API**
  - **Mô tả:** Chạy Prisma migration bổ sung các trường Stem vào SQLite; cập nhật `mixController.js` nhận cờ `enableStemSeparation` từ `req.body`. Nếu bật, worker sẽ kích hoạt tách thân âm trước khi đưa vào luồng song song `detectBpm`, `detectKey` và `mixAudioTracks`.
  - **File tác động:** `server/prisma/schema.prisma`, `server/src/controllers/mixController.js`, `server/tests/test_api_stem_mix.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Gửi request tạo mix job kèm `enableStemSeparation: true`, background worker tách file thành công, bản mix đầu ra được tạo từ các stem tách biệt và DB cập nhật các trường liên quan.

- [x] **Task 11.3: Tích hợp Giao diện Điều Khiển AI Stem Trên Studio Page**
  - **Mô tả:** Thêm công tắc gạt _"Tách Giọng Hát & Nhạc Nền Bằng AI (AI Stem Separation)"_ vào `DualDropzone.jsx`. Cập nhật thanh tiến trình `MixingStatus.jsx` hiển thị bước _"Đang bóc tách thân âm bằng mô hình AI Demucs..."_ và hiển thị badge nhận diện trên card kết quả.
  - **File tác động:** `client/src/components/DualDropzone.jsx`, `client/src/components/MixingStatus.jsx`, `client/src/services/api.js`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Người dùng có thể bật/tắt tính năng tách AI trên giao diện; khi bật, hệ thống hiển thị trạng thái xử lý AI rõ ràng và trả về bản mashup hoàn chỉnh từ 2 bài hát gốc.

---

## Giai đoạn 12: Kể Chuyện Vũ Trụ & Giao Diện HUD Điện Ảnh V2 (Cosmic Storytelling Landing)

- [x] **Task 12.1: Thiết lập Hệ Thống Diễn Hoạt Camera & Canvas Đa Chặng V2**
  - **Mô tả:** Nâng cấp `ThreeAudioVisualizer.jsx` nhận prop `scrollProgress` từ GSAP ScrollTrigger ở LandingPage để cấu hình 4 Stage biến chuyển góc máy, Orbit camera flight path, độ biến dạng lưới hạt uốn lượn 3D.
  - **File tác động:** `client/src/components/ThreeAudioVisualizer.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Lăn chuột đến đâu, quả cầu 3D chuyển động vị trí, thay đổi kích thước, zoom xa-gần, biến hình và xoắn vệt laser theo góc máy điện ảnh 1:1 ăn khớp với từng Stage.

- [x] **Task 12.2: Dựng Giao Diện HUD Telemetry & Binh đoàn Nhân vật Kể chuyện**
  - **Mô tả:** Thiết kế các module chỉ số HUD viễn tưởng xung quanh LandingPage, các đường gióng lưới, radar xoay nhịp điệu, và chèn các nhân vật astronaut hoạt họa (Astronaut sprites/SVG) kéo cáp, sửa nút bám theo các mốc di chuyển 3D.
  - **File tác động:** `client/src/pages/LandingPage.jsx`, `client/src/index.css`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Giao diện ngập tràn không khí phi thuyền không gian và radar nhảy số, các nhân vật hoạt họa bay xuất hiện đúng mốc cuộn trang một cách sinh động, tạo cảm giác một cỗ máy DJ vũ trụ.

- [x] **Task 12.3: Tích hợp Âm Thanh Immersive & Cánh Cổng Studio Launchpad Portal**
  - **Mô tả:** Tạo bộ nạp Sound FX (tiếng click cơ học khi rê qua nút, tiếng sóng không gian nhẹ sweep khi scroll qua stage). Xây dựng portal rực rỡ ở đáy Landing Page, tạo chuyển cảnh (Transition) mượt mà bằng hiệu ứng mờ nhòe máy (Glitch/Zoom blur) khi người dùng nhấp "KHỞI CHẠY STUDIO".
  - **File tác động:** `client/src/pages/LandingPage.jsx`, `client/src/pages/StudioPage.jsx`.
  - **Tiêu chuẩn nghiệm thu (DoD):** Âm thanh và hiệu ứng chuyển cảnh kích hoạt rực rỡ, đưa người dùng sang `/studio` với cảm giác bay vào không gian phòng thu tương lai.

```

```
