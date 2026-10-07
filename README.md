# 🌌 AuraVinyl & Web Audio Mashup Studio

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r186-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Web_Audio_API-DSP-f59e0b?style=for-the-badge&logo=w3c&logoColor=white" alt="Web Audio API" />
  <img src="https://img.shields.io/badge/Transformers.js-Whisper_Tiny-ff5722?style=for-the-badge&logo=huggingface&logoColor=white" alt="Transformers.js" />
  <img src="https://img.shields.io/badge/GSAP-v3.15-88ce02?style=for-the-badge&logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/React-v18-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-v6-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/FFmpeg-DSP_Engine-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

> **AuraVinyl & Web Audio Mashup Studio** là hệ sinh thái trải nghiệm âm nhạc kỹ thuật số kết hợp giữa **Nghệ thuật đĩa than 3D tương tác (Interactive 3D Vinyl)**, **Trí tuệ nhân tạo bóc lời trực tiếp trên trình duyệt (In-Browser Whisper AI)**, và **Cỗ máy tự động phối âm chuẩn phòng thu (Studio-Grade Mashup DSP Engine)**.

---

## 📑 Mục Lục

- [Tổng Quan Kiến Trúc Hệ Thống](#-tổng-quan-kiến-trúc-hệ-thống)
- [✨ AuraVinyl: Trình Phát Đĩa Than 3D & Lời Động Học AI](#-auravinyl-trình-phát-đĩa-than-3d--lời-động-học-ai)
  - [1. Mâm đĩa than Three.js & Động học thời gian thực](#1-mâm-đĩa-than-threejs--động-học-thời-gian-thực)
  - [2. Hiệu ứng âm học đĩa than (Vinyl Audio DSP Engine)](#2-hiệu-ứng-âm-học-đĩa-than-vinyl-audio-dsp-engine)
  - [3. Đồng bộ lời bài hát nghệ thuật (Kinetic Synced Lyrics)](#3-đồng-bộ-lời-bài-hát-nghệ-thuật-kinetic-synced-lyrics)
  - [4. AI Whisper bóc lời & canh nhịp In-Browser](#4-ai-whisper-bóc-lời--canh-nhịp-in-browser)
  - [5. Ánh sáng Ambient Aurora & Chế độ Zen Mode](#5-ánh-sáng-ambient-aurora--chế-độ-zen-mode)
- [🎛️ Audio Mashup Studio: Cỗ Máy Phối Âm Tự Động (/studio)](#️-audio-mashup-studio-cỗ-máy-phối-âm-tự-động-studio)
  - [1. Sơ đồ luồng dữ liệu DSP Backend](#1-sơ-đồ-luồng-dữ-liệu-dsp-backend)
  - [2. Đường ống FFmpeg FilterGraph & WSOLA Time-Stretching](#2-đường-ống-ffmpeg-filtergraph--wsola-time-stretching)
  - [3. Dò nhịp BPM in-memory](#3-dò-nhịp-bpm-in-memory)
- [⌨️ Bảng Phím Tắt Toàn Cục (Keyboard Shortcuts)](#️-bảng-phím-tắt-toàn-cục-keyboard-shortcuts)
- [🛠️ Công Nghệ Sử Dụng (Tech Stack)](#️-công-nghệ-sử-dụng-tech-stack)
- [📁 Cấu Trúc Thư Mục (Directory Layout)](#-cấu-trúc-thư-mục-directory-layout)
- [📡 Đặc Tả Giao Diện API Backend (REST API Contract)](#-đặc-tả-giao-diện-api-backend-rest-api-contract)
- [💻 Yêu Cầu Hệ Thống (Prerequisites)](#-yêu-cầu-hệ-thống-prerequisites)
- [🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng](#-hướng-dẫn-cài-đặt--chạy-ứng-dụng)
- [🧪 Bộ Kiểm Thử Tự Động Hóa (Testing Suite)](#-bộ-kiểm-thử-tự-động-hóa-testing-suite)
- [🛡️ Quản Lý Tài Nguyên & Chống Rò Rỉ Bộ Nhớ (Zero Memory Leaks)](#️-quản-lý-tài-nguyên--chống-rò-rỉ-bộ-nhớ-zero-memory-leaks)
- [📄 Giấy Phép (License)](#-giấy-phép-license)

---

## 🏛️ Tổng Quan Kiến Trúc Hệ Thống

Dự án được xây dựng dưới cấu trúc **Monorepo** liên kết chặt chẽ hai phân hệ cốt lõi:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AURAVINYL MONOREPO                                   │
├────────────────────────────────────────────┬───────────────────────────────────────────┤
│    🌟 AuraVinyl Experience (Client - /)    │   🎛️ Mashup Engine (Server & Client /studio)│
│                                            │                                           │
│  • Three.js 3D Turntable & Tonearm Kinematics│  • Dual-Track Ingestion (Vocal + Beat)    │
│  • Web Audio Vinyl Crackle & Sub-Bass      │  • In-Memory PCM BPM Detection (<200ms)   │
│  • In-Browser AI Whisper (@xenova)         │  • WSOLA Pitch-Neutral Time-Stretching    │
│  • Kinetic Synced Lyrics + Apple Mask Fade │  • Non-Clipping Studio Gain Limiter       │
│  • Ambient Aurora Palette Extraction       │  • Background Worker & SQLite State       │
│  • Zen Mode & Global Keyboard Shortcuts    │  • HTTP 206 Partial Content Streaming     │
└────────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## ✨ AuraVinyl: Trình Phát Đĩa Than 3D & Lời Động Học AI

### 1. Mâm đĩa than Three.js & Động học thời gian thực
- **Mô phỏng vật lý chân thực:** Mâm đĩa than bằng hợp kim nhôm, đĩa vinyl đen bóng với vân rãnh siêu vi (procedural micro-grooves texture được vẽ bằng canvas 2D 1024x1024) và tem nhãn tròn (center label) hiển thị ảnh bìa trích xuất từ file nhạc.
- **Động học cần kim theo thời gian thực (Progress Tracking Tonearm):**
  - Khi Play: Cần kim xoay vào đĩa và hạ nhẹ nhàng xuống rãnh âm; đĩa bắt đầu quay mượt mà.
  - Khi bài hát phát: Góc xoay ngang của cần kim (`tonearmYawGroup.rotation.y`) tự động trôi mượt mà từ mép đĩa ($0.46\text{ rad}$) vào sát tâm đĩa ($0.73\text{ rad}$) theo tỷ lệ `progress = currentTime / duration`.
  - Khi tua bài (seeking): Cần kim tự động lerp mượt mà đến vị trí tương ứng trên rãnh đĩa.
  - Khi Pause: Cần kim tự động nhấc lên và quay về vị trí nghỉ; đĩa than giảm tốc tự nhiên.
- **Hiệu ứng đĩa bay vào mâm (Vinyl Drop-in):** Khi nạp bài hát mới, đĩa vinyl bay từ trên cao ($y = 1.8$, $rx = -0.35\text{ rad}$) đáp êm ái xuống mâm xoay ($y = 0.17$, $rx = 0$) qua GSAP trong $0.9\text{s}$ (`power2.out`).
- **Vòng sóng xung kích 3D (Bass Shockwaves Pool):** Tối ưu hóa object pool gồm 3 vòng sóng `RingGeometry` bán trong suốt; tự động bung nở từ bán kính $2.4 \to 5.4$ và mờ dần khi phát hiện nhịp trống kick (`bassEnergy > 0.68`).
- **Hào quang gầm mâm đĩa (Chassis Neon Underglow):** Vành đèn phát quang viền đáy `TorusGeometry` với chế độ `AdditiveBlending`, phát xung nhịp nhàng theo năng lượng dải trầm.
- **Hạt bụi ánh sáng xoáy ốc (Spiral Vortex Particles):** 150 hạt bụi ánh sáng tạo thành hình phễu xoáy ốc hướng lên quanh trục Y mâm đĩa, co giãn bán kính theo nhịp bass.
- **Camera Bass Punch & Damped Parallax:** Camera rung nhún theo âm trầm ($\pm 0.06$) kết hợp suy giảm chuyển động chuột góc nhìn 3D mượt mà (`lerp factor = 0.04`).

### 2. Hiệu ứng âm học đĩa than (Vinyl Audio DSP Engine)
- **Tiếng nổ lách tách tự nhiên (Procedural Vinyl Crackle):** Mô phỏng tiếng rãnh đĩa bằng Web Audio API với bộ lọc đa tầng (White Noise $\rightarrow$ BandPass Filter 1.2kHz $\rightarrow$ Random Dust Impulses).
- **Tiếng va chạm kim đĩa (Needle Contact Thud):** Sinh tiếng "thump" trầm ấm ($60\text{Hz}$ Sine wave với bộ giảm âm hàm mũ Exponential Decay) đúng khoảnh khắc đầu kim chạm mặt đĩa.
- **Bộ phân tích phổ tần thời gian thực (Frequency Analyser):** Kết nối nguồn âm qua `AnalyserNode` FFT 512, trích xuất chính xác năng lượng `bassEnergy`, `midEnergy`, `trebleEnergy` điều khiển chuyển động 3D.
- **Smooth Volume Fading:** Cơ chế Fade-in / Fade-out âm lượng $50\text{ms}$ khi Play/Pause, loại bỏ hoàn toàn tiếng "pop/click" kỹ thuật số.

### 3. Đồng bộ lời bài hát nghệ thuật (Kinetic Synced Lyrics)
- **Chuỗi ưu tiên 4 cấp (4-Tier Fallback Hierarchy):**
  1. *File `.lrc` tải lên thủ công*: Kéo thả đồng thời cùng file nhạc, hoặc nạp riêng qua nút bấm / modal dán văn bản.
  2. *Lời nhúng sẵn trong file nhạc (Embedded Lyrics)*: Tự động trích xuất thẻ ID3v2 `USLT` hoặc `SYLT`.
  3. *Tự động tra cứu Lrclib API*: Tìm kiếm chính xác hoặc mờ qua endpoint `https://lrclib.net/api/` với timeout an toàn 5 giây.
  4. *Hiệu ứng Ambient Dust Fallback*: Khi không có lời, giao diện chuyển sang màn sương bụi ánh sáng thư giãn.
- **Hiệu ứng chuyển mờ Apple Music Sing (Gradient Mask Fade):** Sử dụng CSS Mask Image `linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)` giúp câu hát trôi vào từ sương mờ và tan biến êm ái ở hai mép.
- **Cuộn mượt GSAP:** Tự động canh chỉnh câu hát đang phát ra chính giữa khung nhìn với màu sắc phát sáng nổi bật và làm mờ các câu kề cạnh.
- **Xuất tệp `.LRC` chuẩn:** Cho phép tải về file `.lrc` chuẩn UTF-8 sau khi nạp lời từ bất kỳ nguồn nào hoặc sau khi AI bóc lời.

### 4. AI Whisper bóc lời & canh nhịp In-Browser
- **100% In-Browser & Ngoại tuyến:** Tích hợp mô hình `Xenova/whisper-tiny` (~39MB quantized) thông qua `@xenova/transformers`, tự động cache vào trình duyệt qua Cache API.
- **Web Worker chuyên dụng:** Xử lý toàn bộ tác vụ AI trong worker nền (`whisperWorker.js`), không gây lag giật giao diện hay đơ WebGL 3D.
- **Đường ống Resampling 16,000 Hz:** Trích xuất mảng PCM Float32Array từ file âm thanh và resample chuẩn xác về tần số 16kHz trước khi đưa vào mô hình.
- **Bộ lọc ảo giác âm thanh (Anti-Hallucination Filter):** Tự động loại bỏ các đoạn ảo giác thường gặp của Whisper như `[music]`, `[Song]`, từ lặp quá 3 lần, hoặc các phân đoạn nhiễu rác.

### 5. Ánh sáng Ambient Aurora & Chế độ Zen Mode
- **Trích xuất bảng màu thông minh (Dynamic Palette Extraction):** Phân tích ảnh bìa album qua Canvas in-memory, trích xuất màu chủ đạo (Primary Hex), màu phát sáng (Glow Hex), và màu thứ cấp để đồng bộ ánh sáng đèn rọi 3D Three.js và vầng hào quang Aurora toàn trang.
- **Chế độ Zen Mode toàn màn hình (Phím F):** Ẩn thanh công cụ điều hướng, mở rộng mâm đĩa than 3D và cột lời động học ra toàn bộ màn hình, mang lại không gian thưởng thức âm nhạc thuần khiết.

---

## 🎛️ Audio Mashup Studio: Cỗ Máy Phối Âm Tự Động (/studio)

Phân hệ phòng thu `/studio` cung cấp giải pháp ghép bản phối (Mashup) tự động hai bài hát độc lập: **Track A (Vocal Acappella)** và **Track B (Instrumental Beat)**.

### 1. Sơ đồ luồng dữ liệu DSP Backend

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
       │     ├─ atempo={r} (WSOLA Time-Scale Modification nối tầng)
       │     ├─ volume=1.0 (Vocal) / volume=0.75 (Beat -2.5dB Headroom)
       │     ├─ amix=inputs=2:duration=longest:dropout_transition=2
       │     └─ alimiter=limit=0.95 (Chống méo biên độ đỉnh)
       │
       ├─ 6. Xuất MP3 320kbps CBR -> Cập nhật SUCCESS & Tempo metadata vào SQLite
       ▼
[ Client Polling (useJobPolling) ] ──> Nhận kết quả ──> Hiển thị BPM Badges & WaveSurfer (HTTP 206)
```

### 2. Đường ống FFmpeg FilterGraph & WSOLA Time-Stretching

Biểu thức FilterGraph chuẩn:

```text
[0:a]aresample=44100,atempo={tempoRatio},volume=1.0[vocal_norm];
[1:a]aresample=44100,volume=0.75[beat_norm];
[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed];
[raw_mixed]alimiter=limit=0.95:level=true[final_output]
```

- **`aresample=44100`:** Chuẩn hóa tần số lấy mẫu, ngăn hiện tượng lệch pha và răng cưa tần số.
- **`atempo={r}`:** Co dãn thời gian giọng hát theo nhịp Beat qua thuật toán WSOLA. Hỗ trợ tự động phân rã nối chuỗi an toàn ngoài dải $[0.5, 2.0]$ (ví dụ: $2.5 \rightarrow$ `atempo=2.0,atempo=1.25`) mà không làm biến dạng cao độ (giữ nguyên tông giọng, không bị méo tiếng sóc chuột).
- **`volume=1.0` & `volume=0.75`:** Cân bằng biên độ, nhường $-2.5\text{dB}$ headroom cho giọng hát nổi bật trên nền nhạc.
- **`amix`:** Phối trộn 2 nguồn âm, giữ độ dài theo bài dài hơn và fade chuyển mượt mà 2 giây.
- **`alimiter=limit=0.95:level=true`:** Peak Limiter cắt đỉnh biên độ vượt ngưỡng $-0.45\text{dBFS}$, triệt tiêu 100% hiện tượng Digital Clipping khi cộng hưởng tín hiệu.

### 3. Dò nhịp BPM in-memory
- **Trích xuất PCM in-memory:** FFmpeg giải mã trực tiếp ra stream Buffer `pcm_s16le` Mono $44.1\text{kHz}$, không tốn I/O ghi đĩa tạm.
- **Spectral Flux Onset Detection:** Tính toán biến thiên phổ tần số giữa các khung âm thanh, tìm đỉnh xung năng lượng để trích xuất các mốc gõ phách (Beat Onsets).
- **Autocorrelation (Tự tương quan):** Gom cụm khoảng cách giữa các phách (Inter-Beat Interval - IBI) để suy ra chỉ số BPM trung bình trong $\le 200\text{ms}$.

---

## ⌨️ Bảng Phím Tắt Toàn Cục (Keyboard Shortcuts)

Người dùng có thể điều khiển toàn bộ trải nghiệm phát nhạc trên bàn phím:

| Phím tắt | Chức năng | Mô tả hoạt động |
| :--- | :--- | :--- |
| `Space` | **Phát / Tạm Dừng** | Kích hoạt quay đĩa / nhấc cần kim kèm âm thanh tiếp xúc rãnh đĩa than |
| `ArrowLeft` | **Tua lùi 5 giây** | Tua ngược 5s và lập tức lerp cần kim đến vị trí tương ứng trên rãnh đĩa |
| `ArrowRight` | **Tua tiến 5 giây** | Tua tới 5s và cập nhật vị trí cần kim theo tỷ lệ thời gian |
| `ArrowUp` | **Tăng âm lượng** | Tăng âm lượng thêm 5% (tối đa 100%) |
| `ArrowDown` | **Giảm âm lượng** | Giảm âm lượng bớt 5% (tối thiểu 0%) |
| `M` | **Tắt / Bật tiếng** | Chuyển đổi trạng thái Mute / Unmute tức thì |
| `F` | **Chế độ Zen Mode** | Bật / Tắt hiển thị toàn màn hình tối giản tôn vinh đĩa than 3D |
| `Escape` | **Thoát Zen Mode** | Trở về giao diện điều khiển chuẩn |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Frontend & Đồ Họa 3D
- **React 18 & Vite 6:** Nền tảng SPA hiệu năng cao, Fast Refresh, quản lý state bất đồng bộ theo máy trạng thái.
- **Three.js (r186):** Dựng hình mâm đĩa than 3D, vật liệu kim loại ánh kim, hệ thống vi rãnh procedural, hiệu ứng sóng xung kích bass và hạt bụi không gian.
- **GSAP (GreenSock v3.15):** Diễn hoạt chuyển động mượt mà cho đĩa rơi vào mâm, cần gạt đĩa than và cuộn lời bài hát kinetic.
- **TailwindCSS v3.4:** Thiết kế giao diện Dark Minimalist, Glassmorphism, Responsive hoàn hảo.
- **WaveSurfer.js v7:** Biểu đồ dạng sóng âm tương tác hỗ trợ kéo tua (Audio Seeking) trực tiếp.
- **jsmediatags:** Đọc thẻ ID3v2 (Title, Artist, Album, Cover Art, Embedded Lyrics USLT/SYLT) từ tệp nhị phân MP3 trực tiếp trên trình duyệt.
- **Lucide React:** Bộ biểu tượng giao diện hiện đại, sắc nét.

### In-Browser AI & Web Audio
- **@xenova/transformers (v2.17):** Chạy mô hình ngôn ngữ và giọng nói `Xenova/whisper-tiny` bằng ONNX Runtime Web trong Web Worker.
- **Web Audio API:** Xử lý âm thanh độ trễ thấp, sinh tiếng rãnh đĩa than procedural crackle, bộ phân tích phổ tần AnalyserNode, resample Float32Array 16kHz.

### Backend & Audio DSP
- **Node.js 20+ & Express 4 (ES Modules):** Kiến trúc module phân lớp rõ ràng, chuẩn hóa 100% `import/export`.
- **FFmpeg & fluent-ffmpeg:** Động cơ xử lý tín hiệu âm thanh chuyên nghiệp (WSOLA, Gain Staging, Limiter, Resampling).
- **Prisma ORM & SQLite:** Quản trị cơ sở dữ liệu tác vụ phối âm nhẹ, hỗ trợ migration tự động.
- **Multer:** Tiếp nhận multipart form data, băm tên file UUID v4 chống Path Traversal và kiểm tra định dạng an toàn.
- **Music-Tempo:** Thuật toán dò nhịp BeatRoot thuần JavaScript.

---

## 📁 Cấu Trúc Thư Mục (Directory Layout)

```text
audio-mixer-poc/
├── specs/                                # Hồ sơ đặc tả yêu cầu & kiến trúc
│   ├── PRD.md                            # Product Requirement Document
│   ├── ARCHITECTURE.md                   # Kiến trúc hệ thống & Audio DSP
│   └── TASKS.md                          # Danh sách Task WBS hoàn thiện 100%
├── client/                               # Ứng dụng Frontend & In-Browser AI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Turntable3D.jsx           # Mâm đĩa than 3D Three.js, cần kim, sóng bass, hạt bụi
│   │   │   ├── KineticLyrics.jsx         # Cột lời bài hát động học GSAP, Apple mask fade, xuất .lrc
│   │   │   ├── DualDropzone.jsx          # Vùng kéo thả Vocal & Beat cho phòng thu Mashup
│   │   │   ├── MixingStatus.jsx          # Tiến trình phối âm & huy hiệu BPM
│   │   │   ├── WaveformPlayer.jsx        # Trình phát sóng âm WaveSurfer.js
│   │   │   ├── DualWaveformTimeline.jsx  # So sánh dạng sóng 2 bản nhạc
│   │   │   ├── ThreeAudioVisualizer.jsx  # Trực quan hóa phổ tần 3D
│   │   │   ├── ToastNotification.jsx     # Thông báo hệ thống nổi
│   │   │   └── ThemeToggle.jsx           # Nút chuyển giao diện Dark/Light
│   │   ├── context/
│   │   │   └── ThemeContext.jsx          # Quản lý theme hệ thống
│   │   ├── hooks/
│   │   │   └── useJobPolling.js          # Polling trạng thái tiến trình phối âm
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx           # Trải nghiệm chính AuraVinyl (Đĩa than 3D & Lời AI)
│   │   │   └── StudioPage.jsx            # Phòng thu số Mashup DAW (/studio)
│   │   ├── services/
│   │   │   ├── aiTranscriptionService.js # Đường ống resample 16kHz & lọc ảo giác AI
│   │   │   ├── lyricsService.js          # Tích hợp Lrclib API & bộ phân tích cú pháp LRC
│   │   │   ├── metadataService.js        # Đọc ID3v2, lời nhúng & trích xuất bảng màu ảnh bìa
│   │   │   └── api.js                    # Axios client kết nối backend
│   │   ├── utils/
│   │   │   ├── vinylAudioEngine.js       # Web Audio API: crackle, thud, fade & analyser
│   │   │   └── soundEffects.js           # Âm thanh phản hồi xúc giác (Haptic clicks)
│   │   ├── workers/
│   │   │   └── whisperWorker.js          # Web Worker chạy Xenova/whisper-tiny ngoại tuyến
│   │   ├── tests/
│   │   │   └── e2e_verification.js       # Bộ 18 kịch bản kiểm thử tự động toàn diện
│   │   ├── App.jsx                       # Điều phối React Router (/ và /studio)
│   │   ├── main.jsx                      # Điểm khởi chạy React DOM
│   │   └── index.css                     # TailwindCSS & CSS animations
│   ├── vite.config.js                    # Cấu hình Vite & proxy /api
│   ├── tailwind.config.js                # Cấu hình TailwindCSS
│   └── package.json
├── server/                               # Backend Server & Động cơ FFmpeg DSP
│   ├── prisma/
│   │   ├── schema.prisma                 # Cấu trúc bảng tác vụ MixJob
│   │   ├── dev.db                        # SQLite Database
│   │   └── migrations/                   # Lịch sử các bước migrate DB
│   ├── storage/
│   │   ├── uploads/                      # Lưu tệp tải lên tạm thời
│   │   └── outputs/                      # Lưu tệp MP3 phối âm hoàn chỉnh
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                     # Prisma client singleton
│   │   ├── controllers/
│   │   │   └── mixController.js          # Xử lý upload, polling, streaming 206, download
│   │   ├── middlewares/
│   │   │   └── uploadMiddleware.js       # Multer validation & dọn dẹp file rác
│   │   ├── routes/
│   │   │   └── mixRoutes.js              # Cấu hình routes Express
│   │   ├── services/
│   │   │   ├── AudioMixerService.js      # Lõi FFmpeg FilterGraph & WSOLA atempo chain
│   │   │   └── BpmDetectorService.js     # Dò nhịp raw PCM in-memory
│   │   ├── utils/
│   │   │   └── checkFfmpeg.js            # Kiểm tra Fail-Fast nhị phân FFmpeg/FFprobe
│   │   └── app.js                        # Bootstrap Express server
│   ├── tests/
│   │   ├── fixtures/                     # Tệp âm thanh mẫu
│   │   ├── test_bpm.js                   # Kiểm thử đo BPM
│   │   ├── test_mixer_tempo.js           # Kiểm thử co dãn nhịp & chống clipping
│   │   ├── test_api_bpm_mix.js           # Kiểm thử API & worker
│   │   └── test_e2e_full_cycle.js        # Kiểm thử tích hợp 5 bước toàn trình
│   └── package.json
├── package.json                          # Monorepo orchestration scripts
├── .gitignore
└── README.md
```

---

## 📡 Đặc Tả Giao Diện API Backend (REST API Contract)

### 1. Khởi tạo tác vụ Mix
- **Endpoint:** `POST /api/v1/mix`
- **Content-Type:** `multipart/form-data`
- **Body Fields:**
  - `trackA`: Tệp âm thanh Vocal Acappella (MP3/WAV, $\le 25\text{MB}$)
  - `trackB`: Tệp âm thanh Instrumental Beat (MP3/WAV, $\le 25\text{MB}$)
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
      "duration": 182.4,
      "executionTimeMs": 2840
    },
    "createdAt": "2026-10-06T14:20:00.000Z"
  }
}
```

### 3. Phát trực tuyến phân đoạn (Streaming)
- **Endpoint:** `GET /api/v1/mix/:jobId/stream`
- **Headers hỗ trợ:** `Range: bytes=start-end`
- **Response:** `HTTP 206 Partial Content` (kèm headers `Content-Range`, `Content-Length`, `Content-Type: audio/mpeg`).

### 4. Tải xuống tệp MP3 hoàn chỉnh
- **Endpoint:** `GET /api/v1/mix/:jobId/download`
- **Response:** `HTTP 200 OK` kèm `Content-Disposition: attachment; filename="mashup-[jobId].mp3"`.

---

## 💻 Yêu Cầu Hệ Thống (Prerequisites)

1. **Node.js:** Phiên bản `>= 20.0.0` (khuyến nghị bản LTS).
2. **FFmpeg & FFprobe:** Đã cài đặt và có trong biến môi trường `PATH` (cần thiết cho phân hệ Mashup Studio Backend).
   - *Kiểm tra phiên bản:*
     ```bash
     ffmpeg -version
     ffprobe -version
     ```
   - *Cài đặt nhanh trên Windows:*
     ```powershell
     winget install Gyan.FFmpeg
     # hoặc
     choco install ffmpeg
     ```
   - *Cài đặt trên macOS:*
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
Cài đặt tự động một lượt cho Root, Backend Server và Client Frontend:
```bash
npm run install:all
```

### Bước 3: Cấu hình biến môi trường Backend
Sao chép tệp cấu hình mẫu cho Server:
```bash
# Windows PowerShell
copy server\.env.example server\.env

# Linux / macOS
cp server/.env.example server/.env
```

Nội dung chuẩn trong `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
MAX_FILE_SIZE_MB=25
STORAGE_UPLOAD_DIR="./storage/uploads"
STORAGE_OUTPUT_DIR="./storage/outputs"
```

### Bước 4: Khởi tạo Database SQLite
```bash
cd server
npx prisma migrate dev
cd ..
```

### Bước 5: Khởi động hệ thống phát triển (Development)
Chạy cả Backend Server (`:5000`) và Frontend Client (`:5173`) song song với 1 lệnh:
```bash
npm run dev
```

Hoặc chỉ chạy riêng Frontend AuraVinyl (độc lập không cần backend):
```bash
cd client
npm run dev
```

Truy cập trình duyệt tại:
- **`http://localhost:5173/`**: Trải nghiệm đĩa than 3D AuraVinyl & Lời AI.
- **`http://localhost:5173/studio`**: Phòng thu âm phối nhạc tự động Mashup DAW.

---

## 🧪 Bộ Kiểm Thử Tự Động Hóa (Testing Suite)

### 1. Kiểm thử toàn diện Client & Subsystems (`18/18 PASS`)
Kiểm thử bộ xử lý LRC, ID3 metadata, trích xuất bảng màu, âm học đĩa than, AI pipeline và quản lý bộ nhớ:
```bash
cd client
npm test
```

**Chi tiết các bài test kiểm định:**
- **Suite 1: LRC Parsing & Synchronization:** Phân tích timestamp chuẩn `[mm:ss.xx]`, mili-giây 3 chữ số `[mm:ss.xxx]`, đa timestamp, tự động sắp xếp theo thời gian và xuất ngược file `.lrc`.
- **Suite 2: Metadata & Embedded Lyrics Extraction:** Đọc nhãn ID3v2 từ buffer MP3, bóc tách thẻ lời `USLT`/`SYLT` và fallback an toàn khi tệp không có thẻ.
- **Suite 3: Dynamic Palette Extraction:** Trích xuất bảng màu Dark Theme từ hình ảnh và cơ chế fallback `DEFAULT_PALETTE`.
- **Suite 4: Vinyl Audio DSP & Frequency Analysis:** Khởi tạo AudioContext, mô phỏng crackle & needle contact thud, tính toán năng lượng các dải tần số.
- **Suite 5: AI Transcription Pipeline:** Resampling 16kHz, chuyển đổi timestamp chunks và loại bỏ 100% ảo giác AI.
- **Suite 6: Memory Leak & Resource Integrity:** Tự động thu hồi Blob URL và kiểm tra thu hồi ngữ cảnh WebGL / Texture disposal.

### 2. Kiểm thử Backend Mashup DSP
```bash
# Kiểm thử toàn trình 5 bước Backend
npm run test:e2e

# Hoặc kiểm thử đo BPM độc lập
node server/tests/test_bpm.js

# Kiểm thử co dãn nhịp WSOLA & chống clipping
node server/tests/test_mixer_tempo.js
```

---

## 🛡️ Quản Lý Tài Nguyên & Chống Rò Rỉ Bộ Nhớ (Zero Memory Leaks)

AuraVinyl được thiết kế đặc biệt nghiêm ngặt về quản lý tài nguyên WebGL và âm thanh:
1. **Thu hồi ObjectURL:** Mỗi khi tải bài hát mới hoặc ảnh bìa mới, `URL.revokeObjectURL()` được kích hoạt ngay lập tức để giải phóng bộ nhớ RAM của trình duyệt.
2. **Three.js Resource Disposal:** Hàm cleanup của component `Turntable3D` tự động duyệt và giải phóng toàn bộ Geometries, Materials, Procedural Grooves Canvas Textures, và bể chứa sóng xung kích (`shockwavesPool`).
3. **Mô hình AI cô lập:** Web Worker tự động giải phóng bộ nhớ khi quá trình bóc lời hoàn thành; cache ONNX model được lưu trữ an toàn trong Cache API của trình duyệt.

---

## 📄 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn được tự do sử dụng, chỉnh sửa và đóng góp cho các mục đích học tập hoặc thương mại.

---

<p align="center">
  Được thiết kế và hoàn thiện với niềm đam mê sáng tạo âm nhạc kỹ thuật số bởi <b>Trần An Phúc</b>.
</p>
