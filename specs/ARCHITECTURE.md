# Technical Architecture & System Design

## Audio Mashup Engine - Technical Specification

---

### 1. Kiến Trúc Tổng Thể (System Topology)

```text
+-------------------------------------------------------------------+
|                      CLIENT (React 18 + Vite)                     |
|  +-----------------------+  +------------------+  +-------------+ |
|  |  DualDropzone (Files) |  |  MixingStatus    |  | Waveform    | |
|  |  Client Validation    |  |  Polling Progress|  | Player (206)| |
|  +-----------+-----------+  +--------^---------+  +------^------+ |
+--------------|-----------------------|-------------------|--------+
               | 1. POST multipart     | 3. GET :jobId     | 5. Stream
               v                       | (Polling 1.5s)    |
+--------------------------------------|-------------------|--------+
               |                       |                   |
+--------------v-------------------------------------------|--------+
|                      SERVER (Node.js + Express ESM)               |
|  +-----------------------+   +----------------------------------+ |
|  | Multer Middleware     |   | Stream & Download Controller     | |
|  | (DiskStorage UUID)    |   | (HTTP 206 Range Handler)         | |
|  +-----------+-----------+   +-----------------^----------------+ |
|              v                                 |                  |
|  +-----------------------+                     |                  |
|  | Mix Job Controller    |                     |                  |
|  | (Immediate 202 Spawn) |                     |                  |
|  +-----------+-----------+                     |                  |
|              | 2. Async Background             |                  |
|              v                                 |                  |
|  +---------------------------------------+     |                  |
|  | Worker Pipeline                       |     |                  |
|  |  1. BpmDetectorService (PCM Stream)   |     |                  |
|  |  2. Calculate Ratio r = BpmB / BpmA   |     |                  |
|  |  3. AudioMixerService (FFmpeg Graph)  |     |                  |
|  |     [atempo, volume, amix, alimiter]  |     |                  |
|  +-----------+-----------------------+---+     |                  |
|              |                       |         |                  |
+--------------|-----------------------|---------|------------------+
               | Persist State         +---------+ Storage Engine
               v                                   (/uploads & /outputs)
+----------------------------------------+
|       PERSISTENCE LAYER (Prisma ORM)   |
|       SQLite (Dev) / PostgreSQL (Prod) |
+----------------------------------------+
```

---

### 2. Cấu Trúc Dự Án (Directory Layout) & Biến Môi Trường

```text
audio-mashup/
├── .antigravity/
│   └── rules.md
├── specs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── TASKS.md
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── dev.db
│   │   └── migrations/
│   ├── storage/
│   │   ├── uploads/
│   │   └── outputs/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Prisma Singleton instance
│   │   ├── controllers/
│   │   │   └── mixController.js      # Job creation, polling, streaming, download
│   │   ├── middlewares/
│   │   │   └── uploadMiddleware.js   # Multer validation & error handler
│   │   ├── routes/
│   │   │   └── mixRoutes.js          # Express route bindings
│   │   ├── services/
│   │   │   ├── AudioMixerService.js  # FFmpeg mixing & rendering pipeline
│   │   │   └── BpmDetectorService.js # Audio PCM decoding & tempo detection
│   │   ├── utils/
│   │   │   └── checkFfmpeg.js        # Fail-Fast binary validator
│   │   └── app.js                    # Express bootstrap & CORS
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── vocal_test.mp3
│   │   │   └── beat_test.mp3
│   │   ├── test_db.js
│   │   ├── test_ffmpeg.js
│   │   ├── test_mixer.js
│   │   ├── test_upload.js
│   │   ├── test_api_mix.js
│   │   ├── test_api_stream.js
│   │   ├── test_bpm.js
│   │   └── test_e2e_full_cycle.js
│   ├── package.json
│   ├── .env
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DualDropzone.jsx      # Multi-file drag & drop with validation
│   │   │   ├── MixingStatus.jsx      # Polling progress card & status badges
│   │   │   └── WaveformPlayer.jsx    # Interactive WaveSurfer.js player
│   │   ├── hooks/
│   │   │   └── useJobPolling.js      # Polling lifecycle hook with memory cleanup
│   │   ├── services/
│   │   │   └── api.js                # Axios client with upload progress
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── package.json                      # Monorepo root orchestration
└── .gitignore
```

#### Cấu hình biến môi trường (`server/.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
MAX_FILE_SIZE_MB=25
STORAGE_UPLOAD_DIR="./storage/uploads"
STORAGE_OUTPUT_DIR="./storage/outputs"
```

---

### 3. Thiết Kế Cơ Sở Dữ Liệu (Database Schema)

Tệp: `server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite" // Chuyển sang "postgresql" khi triển khai Production
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model MixJob {
  id                 String    @id @default(uuid())
  status             String    @default("PENDING") // PENDING, PROCESSING, SUCCESS, FAILED
  progress           Int       @default(0)         // Tiến độ từ 0 -> 100%

  // Thông tin tệp gốc A (Vocal)
  trackAOriginalName String
  trackAPath         String
  trackAMimeType     String
  trackASize         Int
  trackABpm          Float?    // Nhịp độ nhận diện của Track A

  // Thông tin tệp gốc B (Beat)
  trackBOriginalName String
  trackBPath         String
  trackBMimeType     String
  trackBSize         Int
  trackBBpm          Float?    // Nhịp độ nhận diện của Track B

  // Thông số biến đổi nhịp điệu (Tempo Matching)
  appliedTempoRatio  Float?    // Tỷ lệ co/dãn r = trackBBpm / trackABpm

  // Thông tin kết quả đầu ra
  outputFileName     String?
  outputPath         String?
  outputDuration     Float?    // Thời lượng tệp thành phẩm (giây)

  // Ghi nhận hiệu năng và xử lý sự cố
  errorMessage       String?
  executionTimeMs    Int?      // Thời gian xử lý FFmpeg (ms)

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([status])
  @@index([createdAt])
}
```

---

### 4. Chi Tiết Kỹ Thuật Pipeline Âm Thanh (Audio DSP Pipeline)

Lõi xử lý nằm trong `AudioMixerService.js` tương tác với binary `ffmpeg`:

#### Biểu thức Complex FilterGraph mở rộng (Hỗ trợ Tempo Matching):

```text
[0:a]aresample=44100,atempo={tempoRatio},volume=1.0[vocal_stretched];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_stretched][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

#### Phân tích chi tiết:

1. `aresample=44100`: Đồng bộ tần số lấy mẫu của cả 2 file về 44.1 kHz, loại trừ hiện tượng lệch pha và biến dạng âm thanh do mismatch sample rate.
2. `atempo={tempoRatio}`:
   - Co dãn thời gian giọng hát theo nhịp của beat mà không làm thay đổi cao độ (pitch-neutral time-stretching).
   - _Lưu ý ràng buộc kỹ thuật:_ Bộ lọc `atempo` của FFmpeg chỉ chấp nhận giá trị trong khoảng $[0.5, 2.0]$. Nếu $tempoRatio > 2.0$ hoặc $< 0.5$, chuỗi bộ lọc phải được tách thành nhiều tầng liên tiếp (ví dụ tỷ lệ $2.5$ sẽ được viết thành `atempo=2.0,atempo=1.25`).
3. `volume=1.0` vs `volume=0.75`: Cân bằng biên độ (Gain Staging), nhường $2.5\text{dB}$ headroom cho giọng hát.
4. `amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75`:
   - `duration=longest`: Giữ độ dài theo tệp dài hơn.
   - `dropout_transition=2`: Tự động fade trong 2 giây khi một luồng kết thúc trước luồng kia.
5. `alimiter=limit=0.95:level=true`: Giới hạn mức biên độ trần ở $-0.45\text{dBFS}$ ($0.95$), triệt tiêu hoàn toàn hiện tượng vỡ tiếng số (Digital Clipping) khi 2 sóng âm cộng hưởng biên độ đỉnh.
6. **Thông số Codec đầu ra:** `-c:a libmp3lame -b:a 320k -ar 44100`.

---

### 5. Đặc Tả Giao Diện Lập Trình Ứng Dụng (API Contract)

#### 5.1. Khởi tạo tác vụ Mix

- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Fields:** `trackA` (Audio Binary), `trackB` (Audio Binary)
- **Response 202 Accepted:**

```json
{
  "success": true,
  "statusCode": 202,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "message": "Files uploaded successfully. Mixing job initiated."
  }
}
```

#### 5.2. Truy vấn trạng thái tác vụ

- **Endpoint:** `GET /api/v1/mix/:jobId`
- **Response 200 OK (Thành công):**

```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "SUCCESS",
    "progress": 100,
    "tempo": {
      "trackABpm": 120.0,
      "trackBBpm": 128.0,
      "appliedTempoRatio": 1.067
    },
    "result": {
      "streamUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/stream",
      "downloadUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/download",
      "duration": 214.5,
      "executionTimeMs": 4230
    },
    "createdAt": "2026-10-05T10:00:00.000Z"
  }
}
```

#### 5.3. Stream âm thanh

- **Endpoint:** `GET /api/v1/mix/:jobId/stream`
- **Header hỗ trợ:** HTTP `Range: bytes=start-end`
- **Mã phản hồi:** `HTTP 206 Partial Content` (kèm headers `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type: audio/mpeg`).

#### 5.4. Tải xuống tệp thành phẩm

- **Endpoint:** `GET /api/v1/mix/:jobId/download`
- **Header phản hồi:** `Content-Disposition: attachment; filename="mashup-[id].mp3"`
