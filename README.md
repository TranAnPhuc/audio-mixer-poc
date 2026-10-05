# 🎛️ Web Audio Mashup Studio (Audio Mixer Engine)

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-v4-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-v18-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-v6-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/FFmpeg-Audio_DSP-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/Prisma-SQLite-2d3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

> **Web Audio Mashup Studio** là một hệ thống web full-stack tự động hóa hoàn toàn quy trình nhận diện nhịp độ (BPM), co dãn thời gian giữ nguyên cao độ (Pitch-Neutral Time-Stretching), cân bằng biên độ (Gain Staging), và phối ghép (Mixing) hai bản nhạc độc lập (Track A: Vocal Acappella & Track B: Instrumental Beat) thành một bản Mashup duy nhất với chất lượng chuẩn phòng thu (320kbps CBR, 44.1kHz Stereo).

---

## 📑 Mục Lục

- [Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [Kiến Trúc Hệ Thống & Đường Ống DSP](#-kiến-trúc-hệ-thống--đường-ống-dsp)
  - [1. Sơ đồ luồng dữ liệu (Dataflow)](#1-sơ-đồ-luồng-dữ-liệu-dataflow)
  - [2. Bộ lọc âm thanh nâng cao (FFmpeg Complex FilterGraph)](#2-bộ-lọc-âm-thanh-nâng-cao-ffmpeg-complex-filtergraph)
  - [3. Tự động dò BPM & Co dãn thời gian (WSOLA Time-Stretching)](#3-tự-động-dò-bpm--co-dãn-thời-gian-wsola-time-stretching)
- [Công Nghệ Sử Dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
- [Cấu Trúc Thư Mục (Directory Layout)](#-cấu-trúc-thư-mục-directory-layout)
- [Đặc Tả Giao Diện API (REST API Contract)](#-đặc-tả-giao-diện-api-rest-api-contract)
- [Yêu Cầu Hệ Thống (Prerequisites)](#-yêu-cầu-hệ-thống-prerequisites)
- [Hướng Dẫn Cài Đặt & Chạy Ứng Dụng](#-hướng-dẫn-cài-đặt--chạy-ứng-dụng)
- [Kiểm Thử Toàn Diện (Testing Suite)](#-kiểm-thử-toàn-diện-testing-suite)
- [Xử Lý Sự Cố Thường Gặp (Troubleshooting)](#-xử-lý-sự-cố-thường-gặp-troubleshooting)
- [Giấy Phép (License)](#-giấy-phép-license)

---

## 🌟 Tính Năng Nổi Bật

- **Tự động nhận diện nhịp độ (Automatic BPM Detection):** Giải mã luồng raw PCM in-memory qua FFmpeg và áp dụng thuật toán *Spectral Flux Onset Detection* kết hợp *Autocorrelation* để trích xuất chỉ số BPM trung bình với độ chính xác cao trong $\le 200\text{ms}$.
- **Đồng bộ nhịp điệu không méo tiếng (Pitch-Neutral Tempo Matching):** Lấy Beat làm nhịp chủ (Master Tempo), co/dãn giọng hát Track A theo Beat qua thuật toán WSOLA (bộ lọc `atempo`) với kỹ thuật nối tầng an toàn cho dải tốc độ không giới hạn mà không bị hiệu ứng sóc chuột (Chipmunk effect).
- **Phối âm chuẩn phòng thu (Studio-Grade Mixing):** Đồng bộ tần số lấy mẫu về 44.1kHz, hạ gain Beat $-2.5\text{dB}$ nhường khoảng động cho giọng hát, trộn âm theo tệp dài nhất (`duration=longest`), và áp dụng Peak Limiter trần $-0.45\text{dBFS}$ triệt tiêu hoàn toàn Digital Clipping.
- **Xử lý nền phi nghẽn (Non-Blocking Background Worker):** API phản hồi ngay `HTTP 202 Accepted` trong $< 200\text{ms}$; tác vụ nặng chuyển cho background worker quản lý máy trạng thái (`PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SUCCESS`/`FAILED`) có throttle tiến độ vào SQLite.
- **Truyền phát phân đoạn tức thì (HTTP 206 Partial Content Streaming):** Trình phát web có thể phát ngay lập tức và hỗ trợ kéo tua (Audio Seeking) mượt mà không cần đợi tải toàn bộ tệp MP3.
- **Giao diện Modern Dark Studio UI:** Xây dựng trên React 18, Vite và TailwindCSS; gồm 2 vùng kéo thả file (Dual Dropzone) có client validation, thanh tiến độ thời gian thực, bảng chỉ số nhịp độ trực quan và Canvas sóng âm tương tác bằng `wavesurfer.js`.

---

## 📐 Kiến Trúc Hệ Thống & Đường Ống DSP

### 1. Sơ đồ luồng dữ liệu (Dataflow)

```text
[ Người Dùng / Trình Duyệt ]
       │
       ├─ 1. Tải lên Track A (Vocal) & Track B (Beat) qua multipart/form-data
       ▼
[ Multer Validation Middleware ] (Kiểm tra MIME, đuôi file, giới hạn dung lượng <= 25MB)
       │
       ├─ 2. Tạo bản ghi MixJob (PENDING) -> Phản hồi 202 Accepted ngay (< 200ms)
       ▼
[ Background Worker (Node.js setImmediate) ]
       │
       ├─ 3. Chạy song song: BpmDetectorService.detectBpm(A) & detectBpm(B) [Promise.all]
       ├─ 4. Tính toán tỷ lệ: r = BPM_B / BPM_A (hoặc fallback r = 1.0)
       ├─ 5. Kích hoạt AudioMixerService (FFmpeg FilterGraph Engine)
       │     ├─ aresample=44100
       │     ├─ atempo={r} (WSOLA Time-Scale Modification)
       │     ├─ volume=1.0 (Vocal) / volume=0.75 (Beat)
       │     ├─ amix=inputs=2:duration=longest:dropout_transition=2
       │     └─ alimiter=limit=0.95 (Chống méo biên độ đỉnh)
       │
       ├─ 6. Xuất MP3 320kbps CBR -> Cập nhật SUCCESS & Tempo metadata vào SQLite
       ▼
[ Client Polling (useJobPolling) ] ──> Nhận kết quả ──> Hiển thị BPM Badges & WaveSurfer (HTTP 206)
```

### 2. Bộ lọc âm thanh nâng cao (FFmpeg Complex FilterGraph)

Biểu thức cấu hình FilterGraph chuyên dụng:

```text
[0:a]aresample=44100,atempo={tempoRatio},volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

- **`aresample=44100`:** Chuẩn hóa tần số lấy mẫu, ngăn lệch pha và méo dải tần.
- **`atempo={r}`:** Co dãn độ dài tệp Vocal theo Beat. FFmpeg giới hạn mỗi bộ lọc trong khoảng $[0.5, 2.0]$; hệ thống tự động phân rã nối chuỗi (ví dụ: $2.5 \rightarrow$ `atempo=2.0,atempo=1.25`).
- **`volume=1.0` & `volume=0.75`:** Cân bằng âm lượng (Gain Staging), nhường $2.5\text{dB}$ headroom cho giọng hát nổi bật trên nền nhạc.
- **`amix`:** Phối trộn 2 nguồn âm, giữ độ dài theo bài dài hơn và fade chuyển mượt 2 giây.
- **`alimiter=limit=0.95:level=true`:** Cắt ngọn các đỉnh biên độ vượt ngưỡng $-0.45\text{dBFS}$, triệt tiêu 100% hiện tượng Digital Clipping khi cộng hưởng tín hiệu.

### 3. Tự động dò BPM & Co dãn thời gian (WSOLA Time-Stretching)

1. **Trích xuất PCM in-memory:** Sử dụng FFmpeg xuất luồng `pcm_s16le` Mono $44.1\text{kHz}$ trực tiếp qua stream Buffer, không ghi file trung gian xuống đĩa cứng.
2. **Spectral Flux Onset Detection:** Tính toán biến thiên phổ tần số giữa các khung âm thanh, tìm đỉnh xung năng lượng để trích xuất các mốc gõ phách (Beat Onsets).
3. **Autocorrelation (Tự tương quan):** Gom cụm khoảng cách giữa các phách (Inter-Beat Interval - IBI) để suy ra nhịp độ chủ đạo (BPM).
4. **WSOLA (Waveform Similarity Overlap-Add):** Ghép chồng các khung sóng âm kề nhau với độ dịch chuyển tương ứng với tỷ lệ $r = \frac{\text{BPM}_B}{\text{BPM}_A}$, bảo toàn tần số dao động cơ bản của dây thanh đới.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Backend:
- **Node.js & Express (ES Modules):** Kiến trúc hướng module sạch sẽ, 100% chuẩn `import/export`.
- **FFmpeg & fluent-ffmpeg:** Bộ giải mã và xử lý tín hiệu âm thanh kỹ thuật số (DSP) chuyên nghiệp.
- **Prisma ORM & SQLite:** Quản trị cơ sở dữ liệu phi tập trung, hỗ trợ migration tự động và sẵn sàng chuyển đổi PostgreSQL.
- **Multer:** Tiếp nhận multipart form data, băm tên file UUID v4 chống Path Traversal và lọc định dạng MIME.
- **Music-Tempo:** Thuật toán phân tích nhịp độ BeatRoot thuần JavaScript, tối ưu bộ nhớ.

### Frontend:
- **React 18 & Vite:** Khởi động siêu tốc, quản lý state bất đồng bộ theo máy trạng thái.
- **TailwindCSS v3.4:** Giao diện Studio Dark sang trọng, responsive đa thiết bị.
- **WaveSurfer.js:** Dựng biểu đồ dạng sóng âm tương tác (Canvas Waveform) hỗ trợ seeking trực tiếp.
- **Lucide React:** Bộ icon giao diện âm nhạc trực quan.
- **Axios:** Client HTTP tích hợp bộ theo dõi tiến trình upload và tự động proxy.

---

## 📁 Cấu Trúc Thư Mục (Directory Layout)

```text
audio-mixer-poc/
├── .antigravity/
│   └── rules.md                # Bộ quy tắc chuẩn kỹ thuật và WBS
├── specs/
│   ├── PRD.md                  # Yêu cầu sản phẩm chi tiết
│   ├── ARCHITECTURE.md         # Đặc tả kiến trúc kỹ thuật & API contract
│   └── TASKS.md                # Danh sách WBS và checklist nghiệm thu
├── server/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema model MixJob
│   │   ├── dev.db              # SQLite Database
│   │   └── migrations/         # Lịch sử các bước migrate DB
│   ├── storage/
│   │   ├── uploads/            # Thư mục lưu file tạm người dùng tải lên
│   │   └── outputs/            # Thư mục chứa file MP3 phối âm hoàn chỉnh
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Prisma client singleton
│   │   ├── controllers/
│   │   │   └── mixController.js# Xử lý tạo job, polling, stream HTTP 206, download
│   │   ├── middlewares/
│   │   │   └── uploadMiddleware.js # Multer validator & dọn dẹp file mồ côi
│   │   ├── routes/
│   │   │   └── mixRoutes.js    # Cấu hình routes Express
│   │   ├── services/
│   │   │   ├── AudioMixerService.js  # Lõi FilterGraph FFmpeg & atempo chain
│   │   │   └── BpmDetectorService.js # Dò nhịp raw PCM in-memory
│   │   ├── utils/
│   │   │   └── checkFfmpeg.js  # Kiểm tra binary ffmpeg/ffprobe theo Fail-Fast
│   │   └── app.js              # Bootstrap Express server
│   ├── tests/
│   │   ├── fixtures/           # Tệp âm thanh mẫu (vocal_test.mp3, beat_test.mp3)
│   │   ├── test_bpm.js         # Kiểm thử đo BPM độc lập
│   │   ├── test_mixer_tempo.js # Kiểm thử co dãn nhịp và chống clipping
│   │   ├── test_api_bpm_mix.js # Kiểm thử tích hợp worker và metadata BPM
│   │   └── test_e2e_full_cycle.js # Kiểm thử toàn trình 5 bước
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DualDropzone.jsx    # Vùng kéo thả file Vocal & Beat
│   │   │   ├── MixingStatus.jsx    # Thẻ tiến trình & hiển thị BPM Badges
│   │   │   └── WaveformPlayer.jsx  # Trình phát sóng âm tương tác WaveSurfer
│   │   ├── hooks/
│   │   │   └── useJobPolling.js    # Hook polling vòng đời tác vụ có cleanup
│   │   ├── services/
│   │   │   └── api.js              # Axios service giao tiếp backend
│   │   ├── App.jsx                 # Component trung tâm điều phối trạng thái
│   │   └── index.css               # Cấu hình TailwindCSS
│   ├── tailwind.config.js
│   ├── vite.config.js              # Vite dev server cấu hình proxy /api
│   └── package.json
├── package.json                    # Monorepo root orchestration scripts
├── .gitignore
└── README.md
```

---

## 📡 Đặc Tả Giao Diện API (REST API Contract)

### 1. Khởi tạo tác vụ Mix
- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `trackA`: Tệp âm thanh Vocal (MP3/WAV, $\le 25\text{MB}$)
  - `trackB`: Tệp âm thanh Beat (MP3/WAV, $\le 25\text{MB}$)
- **Response `202 Accepted`:**
```json
{
  "success": true,
  "statusCode": 202,
  "data": {
    "jobId": "e5158fa8-c932-496f-864d-d6102179c3ec",
    "status": "PENDING",
    "message": "Files uploaded successfully. Mixing job initiated."
  }
}
```

### 2. Truy vấn tiến trình & kết quả (Polling)
- **Endpoint:** `GET /api/v1/mix/:jobId`
- **Response `200 OK` (Khi thành công):**
```json
{
  "success": true,
  "data": {
    "jobId": "e5158fa8-c932-496f-864d-d6102179c3ec",
    "status": "SUCCESS",
    "progress": 100,
    "tempo": {
      "trackABpm": 134.6,
      "trackBBpm": 170.9,
      "appliedTempoRatio": 1.27
    },
    "result": {
      "streamUrl": "/api/v1/mix/e5158fa8-c932-496f-864d-d6102179c3ec/stream",
      "downloadUrl": "/api/v1/mix/e5158fa8-c932-496f-864d-d6102179c3ec/download",
      "duration": 10.0,
      "executionTimeMs": 122
    },
    "createdAt": "2026-10-05T09:20:00.229Z"
  }
}
```

### 3. Phát trực tuyến phân đoạn (Streaming)
- **Endpoint:** `GET /api/v1/mix/:jobId/stream`
- **Headers hỗ trợ:** `Range: bytes=start-end`
- **Response:** `HTTP 206 Partial Content` (kèm headers `Content-Range`, `Content-Length`, `Content-Type: audio/mpeg`).

### 4. Tải xuống tệp MP3 hoàn chỉnh
- **Endpoint:** `GET /api/v1/mix/:jobId/download`
- **Header phản hồi:** `Content-Disposition: attachment; filename="mashup-[jobId].mp3"`

---

## 💻 Yêu Cầu Hệ Thống (Prerequisites)

1. **Node.js:** Phiên bản `>= 20.0.0`.
2. **FFmpeg & FFprobe:** Đã được cài đặt và có trong biến môi trường `PATH`.
   - *Kiểm tra trên Terminal:*
     ```bash
     ffmpeg -version
     ffprobe -version
     ```
   - *Cài đặt nhanh trên Windows (qua winget / choco):*
     ```powershell
     winget install Gyan.FFmpeg
     # hoặc
     choco install ffmpeg
     ```
   - *Cài đặt trên macOS (qua Homebrew):*
     ```bash
     brew install ffmpeg
     ```
   - *Cài đặt trên Linux (Ubuntu/Debian):*
     ```bash
     sudo apt update && sudo apt install -y ffmpeg
     ```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Bước 1: Clone kho lưu trữ
```bash
git clone https://github.com/TranAnPhuc/audio-mixer-poc.git
cd audio-mixer-poc
```

### Bước 2: Cài đặt toàn bộ dependencies
Chạy lệnh tự động cài đặt cho Root, Server và Client:
```bash
npm run install:all
```

### Bước 3: Cấu hình biến môi trường
Tạo tệp `server/.env` từ tệp mẫu:
```bash
# Windows PowerShell
copy server\.env.example server\.env

# Linux / macOS
cp server/.env.example server/.env
```

Nội dung chuẩn của `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
MAX_FILE_SIZE_MB=25
STORAGE_UPLOAD_DIR="./storage/uploads"
STORAGE_OUTPUT_DIR="./storage/outputs"
```

### Bước 4: Chạy Prisma Migration khởi tạo Database
```bash
cd server
npx prisma migrate dev
cd ..
```

### Bước 5: Khởi động chế độ phát triển (Development)
Chạy cả Backend Server (`:5000`) và Vite Client (`:5173`) song song chỉ bằng 1 câu lệnh duy nhất:
```bash
npm run dev
```

Mở trình duyệt tại: **`http://localhost:5173`** để bắt đầu trải nghiệm!

---

## 🧪 Kiểm Thử Toàn Diện (Testing Suite)

Dự án cung cấp bộ script kiểm định tự động hóa độc lập cho từng module:

| Loại kiểm thử | Câu lệnh chạy | Mục đích kiểm định |
| :--- | :--- | :--- |
| **BPM Detection** | `node server/tests/test_bpm.js` | Đo nhịp 2 file fixture, kiểm chứng độ trễ $\le 2\text{s}$ và độ lệch $\le 0.1\text{ BPM}$. |
| **Tempo Filter** | `node server/tests/test_mixer_tempo.js` | Kiểm thử co dãn 20% thời lượng, giữ nguyên cao độ và kiểm tra âm lượng đỉnh (no clipping). |
| **API & Worker** | `node server/tests/test_api_bpm_mix.js` | Kiểm thử chu trình tạo job, background worker và khối metadata `tempo`. |
| **Toàn trình E2E** | `npm run test:e2e` | Kiểm thử tích hợp 5 bước: Health check $\rightarrow$ Upload $\rightarrow$ Polling $\rightarrow$ Stream 206 $\rightarrow$ Download. |

---

## ❓ Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Lỗi `FFmpeg Binary Missing` khi server khởi động
- **Hiện tượng:** Server dừng ngay lập tức với thông báo `[Fail-Fast Error] Không tìm thấy ffmpeg trong PATH`.
- **Khắc phục:** Đảm bảo bạn đã cài đặt FFmpeg và mở lại Terminal mới để hệ điều hành nạp lại biến môi trường `PATH`.

### 2. Lỗi CORS khi gọi API từ Client
- **Hiện tượng:** Trình duyệt báo `Blocked by CORS policy`.
- **Khắc phục:** Đảm bảo `server/.env` cấu hình `CORS_ORIGIN="http://localhost:5173"` và Vite đang chạy đúng cổng `5173` (Vite Proxy đã được thiết lập sẵn tại `client/vite.config.js`).

### 3. File quá ngắn hoặc không rõ phách
- **Hiện tượng:** Giao diện hiển thị `BPM: Không rõ (Tự nhiên)`.
- **Nguyên nhân:** Âm thanh quá ngắn ($< 2\text{s}$) hoặc là đoạn nói ngắt quãng/ambient không có nhịp gõ phách.
- **Hành vi hệ thống:** Đây là tính năng phòng vệ **Graceful Fallback** có chủ đích ($r = 1.0$) giúp bản mix vẫn thành công mà không bị crash.

---

## 📄 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn được toàn quyền sử dụng, sửa đổi và tích hợp vào các dự án cá nhân hoặc thương mại.

---

<p align="center">
  Phát triển với niềm đam mê âm thanh số bởi <b>Trần An Phúc</b>.
</p>
