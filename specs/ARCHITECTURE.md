# Technical Architecture & System Design

## Audio Mashup Engine - Technical Specification

---

### 1. Kiến Trúc Tổng Thể (System Topology)

```text
+--------------------------------------------------------+
|                   CLIENT (React + Vite)                |
|  +-----------------------+   +----------------------+  |
|  |  Dropzone Uploader    |   | Wavesurfer Player    |  |
|  +-----------+-----------+   +----------^-----------+  |
+--------------|--------------------------|--------------+
               | 1. POST multipart/form   | 4. GET Stream / Audio
               v                          |
+--------------------------------------------------------+
|                   SERVER (Node.js + Express)           |
|  +-----------------------+   +----------------------+  |
|  | Multer Middleware     |   | Static / Stream API  |  |
|  +-----------+-----------+   +----------^-----------+  |
|              v                          |              |
|  +-----------------------+              |              |
|  | Job Controller        |              |              |
|  +-----------+-----------+              |              |
|              | 2. Async spawn           |              |
|              v                          |              |
|  +-----------------------+   +----------+-----------+  |
|  | AudioMixer Service    +---> Storage Engine       |  |
|  | (fluent-ffmpeg CLI)   |   | (/uploads & /outputs)|  |
|  +-----------+-----------+   +----------------------+  |
+--------------|-----------------------------------------+
               | 3. Persist State
               v
+--------------------------------------------------------+
|            PERSISTENCE LAYER (Prisma ORM)              |
|            SQLite (Dev) / PostgreSQL (Prod)            |
+--------------------------------------------------------+
```

---

### 2. Cấu Trúc Dự Án (Directory Layout)

Dự án áp dụng mô hình Monorepo chia tách `client` và `server`:

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
│   │   └── migrations/
│   ├── storage/
│   │   ├── uploads/          # Chứa file upload tạm thời
│   │   └── outputs/          # Chứa file MP3 thành phẩm
│   ├── src/
│   │   ├── config/           # Cấu hình biến môi trường, constants
│   │   ├── controllers/      # Điều phối request/response
│   │   ├── middlewares/      # Multer, Error handlers, Validation
│   │   ├── routes/           # Định nghĩa Express Router
│   │   ├── services/         # AudioMixerService, JobService
│   │   ├── utils/            # Helper formats, file system utilities
│   │   └── app.js            # Express app entrypoint
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/       # Uploader, WaveformPlayer, StatusCard
│   │   ├── hooks/            # useJobPolling, useAudioPlayer
│   │   ├── services/         # Axios API clients
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── package.json              # Root package running concurrent scripts
```

# server/.env.example

PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
MAX_FILE_SIZE_MB=25
STORAGE_UPLOAD_DIR="./storage/uploads"
STORAGE_OUTPUT_DIR="./storage/outputs"

---

### 3. Thiết Kế Cơ Sở Dữ Liệu (Database Schema)

Tệp: `server/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite" // Chuyển sang "postgresql" khi deploy production
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum JobStatus {
  PENDING       // Job đã tạo, file đã lưu ổ đĩa, chờ xếp hàng
  PROCESSING    // FFmpeg đang thực hiện render/mix
  SUCCESS       // Xử lý hoàn tất, file sẵn sàng để stream
  FAILED        // Quá trình xử lý bị lỗi
}

model MixJob {
  id              String     @id @default(uuid())
  status          JobStatus  @default(PENDING)
  progress        Int        @default(0) // Tiến độ từ 0 -> 100%

  // Thông tin tệp gốc A (Vocal)
  trackAOriginalName String
  trackAPath         String
  trackAMimeType     String
  trackASize         Int

  // Thông tin tệp gốc B (Beat)
  trackBOriginalName String
  trackBPath         String
  trackBMimeType     String
  trackBSize         Int

  // Thông tin kết quả
  outputFileName     String?
  outputPath         String?
  outputDuration     Float?    // Thời lượng file kết quả (giây)

  // Ghi nhận lỗi và hiệu năng
  errorMessage       String?
  executionTimeMs    Int?      // Tổng thời gian xử lý của FFmpeg (ms)

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([status])
  @@index([createdAt])
}
```

---

### 4. Chi Tiết Kỹ Thuật Pipeline Âm Thanh (Audio DSP Pipeline)

Lõi xử lý nằm trong `AudioMixerService.js` tương tác với binary `ffmpeg`:

#### Biểu thức Complex FilterGraph:

```text
[0:a]aresample=44100,volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

#### Phân tích chi tiết:

1. `aresample=44100`: Đồng bộ tần số lấy mẫu của 2 file về 44.1 kHz ngay từ đầu luồng. Tránh hiện tượng lệch pha và biến dạng âm thanh do không khớp sample rate.
2. `volume=1.0` vs `volume=0.75`: Cân bằng biên độ đầu vào (Gain Staging).
3. `amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75`:
   - `duration=longest`: Giữ độ dài theo tệp dài hơn.
   - `weights`: Trọng số trộn của 2 luồng.
   - `dropout_transition=2`: Tự động fade trong 2 giây khi một luồng kết thúc trước luồng kia.
4. `alimiter=limit=0.95:level=true`: Giới hạn mức biên độ trần ở -0.45 dBFS (0.95), triệt tiêu hoàn toàn hiện tượng vỡ tiếng (Digital Clipping) khi 2 sóng âm cộng hưởng biên độ đỉnh.
5. **Output Codec Parameters:** `-c:a libmp3lame -b:a 320k -ar 44100`.

---

### 5. Đặc Tả Giao Diện Lập Trình Ứng Dụng (API Contract)

#### 5.1. Khởi tạo tác vụ Mix

- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `trackA`: Tệp nhị phân (Binary Audio)
  - `trackB`: Tệp nhị phân (Binary Audio)
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

- **Response 400 Bad Request:**

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "MISSING_REQUIRED_FILES",
    "message": "Both 'trackA' and 'trackB' audio files are required."
  }
}
```

#### 5.2. Truy vấn trạng thái tác vụ

- **Endpoint:** `GET /api/v1/mix/:jobId`
- **Response 200 OK (Đang xử lý):**

```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PROCESSING",
    "progress": 45,
    "createdAt": "2026-10-05T10:00:00.000Z"
  }
}
```

- **Response 200 OK (Thành công):**

```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "SUCCESS",
    "progress": 100,
    "result": {
      "streamUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/stream",
      "downloadUrl": "/api/v1/mix/550e8400-e29b-41d4-a716-446655440000/download",
      "duration": 214.5,
      "executionTimeMs": 4230
    }
  }
}
```

#### 5.3. Stream âm thanh

- **Endpoint:** `GET /api/v1/mix/:jobId/stream`
- **Hỗ trợ:** HTTP `Range` Header (phục vụ việc kéo tua trên timeline của trình phát).
- **Content-Type:** `audio/mpeg`
