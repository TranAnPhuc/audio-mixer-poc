# Technical Architecture & System Design

## Audio Mashup Engine - Technical Specification

---

### 1. Kiến Trúc Tổng Thể (System Topology)

```text
+-----------------------------------------------------------------------------------+
|                            CLIENT (React 18 + Vite)                               |
|                                                                                   |
|  [Route: "/"] Landing Page (Cinematic Showcase)                                   |
|   - Three.js Interactive 3D Audio Orb (WebGL 60 FPS)                              |
|   - GSAP ScrollTrigger Pinned Deep-Tech Storytelling                              |
|   - HUD Telemetry Overlay & Magnetic Reticle Cursor                               |
|                                                                                   |
|  [Route: "/studio"] Studio Workspace (Mini-DAW)                                   |
|   - DualDropzone (File Ingestion & Client Validation)                             |
|   - DualWaveformTimeline (Stacked WaveSurfer Canvas Track A & Track B)            |
|   - Direct Drag-to-Offset Engine (Mouse Drag -> Delta X -> vocalOffsetMs)         |
|   - Harmonic Key & Pitch Controls (Camelot Badges & Semitone Stepper)             |
|   - Web Audio Synchronized Preview (Zero-Latency in-browser playback)             |
|   - MixingStatus (Job Polling & Real-Time Metrics)                                |
|   - WaveformPlayer (HTTP 206 Partial Content Stream Player)                       |
+-----------------------------------------------------------------------------------+
                                           |
                                           | POST multipart/form-data
                                           | (trackA, trackB, vocalOffsetMs, pitchShift)
                                           v
+-----------------------------------------------------------------------------------+
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
|  |  1. Parallel Detection (Promise.all):   |     |                                |
|  |     - BpmDetectorService (Onset PCM)    |     |                                |
|  |     - KeyDetectorService (Chroma STFT)  |     |                                |
|  |  2. Calculate Ratio r = BpmB / BpmA     |     |                                |
|  |  3. Calculate Optimal Pitch Shift       |     |                                |
|  |     (Circle of Fifths / Camelot Wheel)  |     |                                |
|  |  4. AudioMixerService (FFmpeg Graph)    |     |                                |
|  |     [asetrate, atempo, adelay/atrim,    |     |                                |
|  |      amix, alimiter]                    |     |                                |
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
│   │   │   ├── BpmDetectorService.js # Audio PCM decoding & tempo detection
│   │   │   └── KeyDetectorService.js # Chroma STFT & Krumhansl-Schmuckler key detection
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
│   │   ├── test_key_detector.js
│   │   ├── test_mixer_pitch.js
│   │   ├── test_api_key_mix.js
│   │   └── test_e2e_full_cycle.js
│   ├── package.json
│   ├── .env
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DualDropzone.jsx          # File ingestion & drag-drop wrapper
│   │   │   ├── DualWaveformTimeline.jsx  # Mini-DAW Stacked Waveform with drag offset & audio sync
│   │   │   ├── MixingStatus.jsx          # Polling progress card, tempo & key badges
│   │   │   ├── ThreeAudioVisualizer.jsx  # Three.js 3D Audio Orb Visualizer
│   │   │   ├── ThemeToggle.jsx           # Sun/Moon theme switcher
│   │   │   └── WaveformPlayer.jsx        # Output WaveSurfer.js player
│   │   ├── context/
│   │   │   └── ThemeContext.jsx          # Light/Dark mode state & localStorage persistence
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx           # Cinematic GSAP + Three.js Showcase Page
│   │   │   └── StudioPage.jsx            # Dedicated Mini-DAW Mashup Studio Page
│   │   ├── hooks/
│   │   │   └── useJobPolling.js          # Polling lifecycle hook with memory cleanup
│   │   ├── services/
│   │   │   └── api.js                    # Axios client with upload progress
│   │   ├── App.jsx                       # React Router configuration
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── package.json                          # Monorepo root orchestration
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
  id                         String    @id @default(uuid())
  status                     String    @default("PENDING") // PENDING, PROCESSING, SUCCESS, FAILED
  progress                   Int       @default(0)         // Tiến độ từ 0 -> 100%

  // Thông tin tệp gốc A (Vocal)
  trackAOriginalName         String
  trackAPath                 String
  trackAMimeType             String
  trackASize                 Int
  trackABpm                  Float?    // Nhịp độ nhận diện của Track A
  trackAKey                  String?   // Tông nhạc Track A (ví dụ: "Am", "C")
  trackACamelot              String?   // Mã Camelot Track A (ví dụ: "8A", "8B")

  // Thông tin tệp gốc B (Beat)
  trackBOriginalName         String
  trackBPath                 String
  trackBMimeType             String
  trackBSize                 Int
  trackBBpm                  Float?    // Nhịp độ nhận diện của Track B
  trackBKey                  String?   // Tông nhạc Track B (ví dụ: "C", "G")
  trackBCamelot              String?   // Mã Camelot Track B (ví dụ: "8B", "9B")

  // Thông số điều chỉnh âm học (DSP Adjustments)
  appliedTempoRatio          Float?    // Tỷ lệ co/dãn r = trackBBpm / trackABpm
  vocalOffsetMs              Int       @default(0) // Độ trễ vocal tính bằng mili-giây (-3000 đến +3000)
  appliedPitchShiftSemitones Int       @default(0) // Số bán âm đã dịch chuyển (-6 đến +6)

  // Thông tin kết quả đầu ra
  outputFileName             String?
  outputPath                 String?
  outputDuration             Float?    // Thời lượng tệp thành phẩm (giây)

  // Ghi nhận hiệu năng và xử lý sự cố
  errorMessage               String?
  executionTimeMs            Int?      // Thời gian xử lý FFmpeg (ms)

  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt

  @@index([status])
  @@index([createdAt])
}
```

---

### 4. Chi Tiết Kỹ Thuật Pipeline Âm Thanh (Audio DSP Pipeline)

#### 4.1. Giải thuật Nhận diện Tông nhạc (`KeyDetectorService.js`)

```text
Raw Audio Stream (FFmpeg PCM 16-bit 22.05kHz Mono)
       │
       ▼
Short-Time Fourier Transform (STFT / 4096-sample Window, Hanning, 50% Overlap)
       │
       ▼
Pitch Class Profile (12-Bin Chroma Vector: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
       │
       ▼
Pearson Correlation với 24 Krumhansl-Schmuckler Key Profiles (12 Major + 12 Minor)
       │
       ▼
Output: { key: "Am", scale: "minor", camelot: "8A", confidence: 0.84 }
```

#### 4.2. FFmpeg Complex FilterGraph Tổng Hợp (Tempo + Pitch + Offset Alignment)

Khi áp dụng đồng thời:

1. Dịch cao độ $\Delta\text{semitones}$ ($\text{factor} = 2^{\frac{\Delta}{12}}$).
2. Co dãn nhịp điệu $r = \frac{BPM_B}{BPM_A}$ (tỷ lệ atempo tổng hợp: $r_{\text{atempo}} = \frac{r}{\text{factor}}$).
3. Căn chỉnh độ trễ `vocalOffsetMs` ($> 0$ dùng `adelay`, $< 0$ dùng `atrim + asetpts`).

**Cấu trúc FilterGraph hoàn chỉnh cho Track A (Vocal):**

```text
[0:a]aresample=44100,
     asetrate=44100*{factor},
     {combinedAtempoChain},
     {offsetFilter},
     aresample=44100,
     volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

---

### 5. Đặc Tả Giao Diện Lập Trình Ứng Dụng (API Contract)

#### 5.1. Khởi tạo tác vụ Mix

- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `trackA` (Audio Binary, bắt buộc)
  - `trackB` (Audio Binary, bắt buộc)
  - `vocalOffsetMs` (Integer, tùy chọn, mặc định: 0, phạm vi: -3000 đến 3000)
  - `pitchShiftSemitones` (Integer, tùy chọn, mặc định: 0, phạm vi: -6 đến 6)
  - `autoHarmonize` (Boolean, tùy chọn, mặc định: false)
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
    "harmonic": {
      "trackAKey": "Am",
      "trackACamelot": "8A",
      "trackBKey": "C",
      "trackBCamelot": "8B",
      "appliedPitchShiftSemitones": 0
    },
    "vocalOffsetMs": 500,
    "result": {
      "streamUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/stream",
      "downloadUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/download",
      "duration": 214.5,
      "executionTimeMs": 4230
    },
    "createdAt": "2026-10-06T03:00:00.000Z"
  }
}
```

#### 5.3. Stream âm thanh

- **Endpoint:** `GET /api/v1/mix/:jobId/stream`
- **Header hỗ trợ:** HTTP `Range: bytes=start-end`
- **Mã phản hồi:** `HTTP 206 Partial Content`.

#### 5.4. Tải xuống tệp thành phẩm

- **Endpoint:** `GET /api/v1/mix/:jobId/download`
- **Header phản hồi:** `Content-Disposition: attachment; filename="mashup-[id].mp3"`.
