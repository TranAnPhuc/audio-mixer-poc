# Technical Architecture & System Design

## Audio Mashup Engine - Technical Specification

---

### 1. Kiến Trúc Tổng Thể (System Topology)

```text
+-----------------------------------------------------------------------------------+
|                            CLIENT (React 18 + Vite)                               |
|  +------------------------------------------------------------------------------+ |
|  | DualDropzone & Mini-DAW Studio                                               | |
|  |  + Dual-Track Timeline (Stacked Waveform Canvas Track A & Track B)           | |
|  |  + Drag-to-Offset Engine (Mouse Drag -> Delta X -> vocalOffsetMs)             | |
|  |  + Web Audio Synchronized Preview (Zero-Latency in-browser playback)         | |
|  +---------------------------------------+--------------------------------------+ |
|                                          | POST multipart                         |
|                                          | (files + vocalOffsetMs)                |
|  +--------------------------+            v            +-------------------------+ |
|  | MixingStatus             |  GET :jobId (Polling)   | WaveformPlayer (Output) | |
|  | - Status Badges & Tempo  |<------------------------| - HTTP 206 Stream Player| |
|  +--------------------------+                         +-------------------------+ |
+-----------------------------------------------------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                            SERVER (Node.js + Express ESM)                         |
|  +-----------------------+   +---------------------------------------+            |
|  | Multer Middleware     |   | Stream & Download Controller          |            |
|  | (DiskStorage UUID)    |   | (HTTP 206 Range Handler)              |            |
|  +-----------+-----------+   +-------------------^-------------------+            |
|              v                                   |                                |
|  +-----------------------+                       |                                |
|  | Mix Job Controller    |                       |                                |
|  | (Immediate 202 Spawn) |                       |                                |
|  +-----------+-----------+                       |                                |
|              | Async Background Worker           |                                |
|              v                                   |                                |
|  +-----------------------------------------+     |                                |
|  | Worker Pipeline                         |     |                                |
|  |  1. BpmDetectorService (PCM Stream)     |     |                                |
|  |  2. Calculate Ratio r = BpmB / BpmA     |     |                                |
|  |  3. AudioMixerService (FFmpeg Graph)    |     |                                |
|  |     [atempo, adelay/atrim, amix, limit] |     |                                |
|  +-----------+-------------------------+---+     |                                |
|              |                         |         |                                |
+--------------|-------------------------|---------|--------------------------------+
               | Persist State           +---------+ Storage Engine
               v                                     (/uploads & /outputs)
+------------------------------------------+
|       PERSISTENCE LAYER (Prisma ORM)     |
|       SQLite (Dev) / PostgreSQL (Prod)   |
+------------------------------------------+
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
│   │   │   ├── beat_test.mp3
│   │   │   └── rhythm_120bpm.mp3
│   │   ├── test_db.js
│   │   ├── test_ffmpeg.js
│   │   ├── test_mixer.js
│   │   ├── test_upload.js
│   │   ├── test_api_mix.js
│   │   ├── test_api_stream.js
│   │   ├── test_bpm.js
│   │   ├── test_mixer_tempo.js
│   │   ├── test_api_bpm_mix.js
│   │   ├── test_mixer_offset.js
│   │   ├── test_api_offset.js
│   │   └── test_e2e_full_cycle.js
│   ├── package.json
│   ├── .env
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DualDropzone.jsx          # File ingestion & drag-drop wrapper
│   │   │   ├── DualWaveformTimeline.jsx  # Mini-DAW Stacked Waveform with drag offset & audio sync
│   │   │   ├── MixingStatus.jsx          # Polling progress card & tempo badges
│   │   │   └── WaveformPlayer.jsx        # Output WaveSurfer.js player
│   │   ├── hooks/
│   │   │   ├── useJobPolling.js          # Polling lifecycle hook with memory cleanup
│   │   │   └── useDualTrackSync.js       # Web Audio API dual playback synchronization
│   │   ├── services/
│   │   │   └── api.js                    # Axios client with upload progress
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── package.json                          # Monorepo root orchestration
└── .gitignore
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

  // Thông số biến đổi nhịp điệu (Tempo Matching) & Căn chỉnh phách (Offset)
  appliedTempoRatio  Float?    // Tỷ lệ co/dãn r = trackBBpm / trackABpm
  vocalOffsetMs      Int       @default(0) // Độ trễ vocal tính bằng mili-giây (-3000 đến +3000)

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

### 4. Chi Tiết Kỹ Thuật Pipeline Âm Thanh & Cơ Chế Preview Trình Duyệt

#### 4.1. FFmpeg Complex FilterGraph (Server-Side Final Rendering)

```text
// Trường hợp vocalOffsetMs > 0 (Trễ):
[0:a]aresample=44100,{atempoChain}adelay={vocalOffsetMs}|{vocalOffsetMs},volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]

// Trường hợp vocalOffsetMs < 0 (Sớm):
[0:a]aresample=44100,{atempoChain}atrim=start={absOffsetSec},asetpts=PTS-STARTPTS,volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

#### 4.2. Cơ chế Đồng bộ Phát Đa Tầng Cục Bộ (Client Zero-Latency Preview)

1. **Blob URL Generation:** Khi người dùng chọn 2 tệp, client khởi tạo URL cục bộ qua `URL.createObjectURL(file)`.
2. **Dual WaveSurfer Instance:**
   - WaveSurfer Track A (Vocal): Tone Indigo, chiều cao 70px.
   - WaveSurfer Track B (Beat): Tone Emerald, chiều cao 70px.
3. **Offset Visual Transformation:** Khi `vocalOffsetMs` thay đổi (qua kéo chuột hoặc slider), container của Track A áp dụng dịch chuyển CSS:
   $$\Delta x = \frac{\text{vocalOffsetMs}}{1000} \times \text{pixelsPerSecond}$$
   Hiệu ứng `transform: translateX(Δx px)` cập nhật ngay lập tức ở 60 FPS mà không cần vẽ lại Canvas.
4. **Đồng bộ Phát lại (Web Audio Scheduler):**
   - Khi bấm "Nghe thử Preview":
     - Nếu $offset \ge 0$: Beat phát ngay tại $t = 0$; Vocal lên lịch phát trễ qua `setTimeout` hoặc Web Audio API `AudioBufferSourceNode.start(audioCtx.currentTime + offsetSec)`.
     - Nếu $offset < 0$: Vocal phát ngay từ mốc $\vert{}offset\vert{}$ giây; Beat phát ngay tại $t = 0$.

---

### 5. Đặc Tả Giao Diện Lập Trình Ứng Dụng (API Contract)

#### 5.1. Khởi tạo tác vụ Mix

- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `trackA` (Audio Binary, bắt buộc)
  - `trackB` (Audio Binary, bắt buộc)
  - `vocalOffsetMs` (Integer, tùy chọn, mặc định: 0, phạm vi: -3000 đến 3000)
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
      "trackABpm": 134.6,
      "trackBBpm": 170.9,
      "appliedTempoRatio": 1.27
    },
    "vocalOffsetMs": 500,
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
