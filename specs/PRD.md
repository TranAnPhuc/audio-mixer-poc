# Product Requirements Document (PRD)

## Hệ Thống Tự Động Phối Âm Thanh (Audio Mashup Engine)

---

### 1. Tổng Quan & Mục Tiêu Sản Phẩm

- **Tên dự án:** Web Audio Mashup Studio.
- **Mục tiêu:** Cung cấp dịch vụ web cho phép người dùng tải lên 2 tệp âm thanh độc lập (Track A: Vocal/Chính, Track B: Beat/Nền), hệ thống tự động bóc tách thân âm AI (AI Stem Separation), nhận diện nhịp độ (BPM), đồng bộ cao độ/tông nhạc (Harmonic Key Matching), căn chỉnh độ trễ/phách trực quan trên timeline đa tầng, phối ghép (mix), cân bằng âm lượng và xuất bản phẩm chất lượng phòng thu.
- **Giá trị cốt lõi:** Tự động hóa toàn bộ quy trình stem-separation, beat-matching, key-matching, offset-alignment và mixing phức tạp thành một pipeline tự động, kết hợp giao diện Mini-DAW tương tác trực tiếp và trải nghiệm thị giác điện ảnh 3D cao cấp.

---

### 2. Đối Tượng Người Dùng & Ca Sử Dụng (Use Cases)

- **Người sáng tạo nội dung / DJ nghiệp dư:** Muốn ghép nhanh 2 bài hát thương mại hoàn chỉnh với nhau mà không cần chuẩn bị sẵn file Acappella hay Instrumental tách rời; cần nhìn thấy trực quan dạng sóng của cả 2 bài xếp chồng lên nhau, tự động hòa âm cùng tông nhạc và căn chỉnh câu hát rơi đúng phách trống trước khi xuất file.
- **Người nghe phổ thông:** Muốn tạo các bản phối cá nhân hóa nhanh chóng từ hai ca khúc yêu thích với khả năng nghe thử tức thời không độ trễ trên trình duyệt.

---

### 3. Phạm Vi Triển Khai (Scope Matrix)

| Hạng mục                   | Trong phạm vi (In-Scope - Giai đoạn 1 đến 12)                                                                                                            | Ngoài phạm vi (Out-of-Scope - Tương lai)                 |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **Định dạng vào**          | MP3, WAV (MIME: `audio/mpeg`, `audio/wav`)                                                                                                               | FLAC, AAC, OGG, M4A                                      |
| **Kích thước tệp**         | Tối đa 25MB / tệp, thời lượng $\le 5\text{ phút}$ / tệp                                                                                                  | Tệp dung lượng lớn, video MP4                            |
| **Tách thân âm AI**        | Tách 2 thân âm Vocals / Instrumental qua mô hình Demucs v4 (Hybrid Transformer)                                                                          | Tách 4-6 thân âm chi tiết (Drums, Bass, Piano, Guitar)   |
| **Xử lý âm thanh**         | Chuẩn hóa sample rate, gain staging, amix, limiter chống vỡ tiếng                                                                                        | Hòa âm bè phụ thông minh (Multi-voice auto-harmony)      |
| **Đồng bộ nhịp điệu**      | Tự động phát hiện BPM (Onset detection), time-stretch bằng filter `atempo`                                                                               | Tự động căn chỉnh lưới ô nhịp (Quantize to Beatgrid)     |
| **Khớp tông hòa âm**       | Dò tông tự động (Chroma + Krumhansl-Schmuckler), mã hóa Camelot Wheel, dịch cao độ pitch-shift qua FFmpeg                                                | Nhận diện vòng hòa âm phức tạp nhiều hợp âm chuyển giọng |
| **Căn chỉnh độ trễ**       | Tinh chỉnh độ trễ (`vocalOffsetMs` từ $-3000\text{ ms}$ đến $+3000\text{ ms}$) qua filter `adelay` và `atrim`                                            | Tự động dò phase alignment bằng AI                       |
| **Trực quan hóa timeline** | Timeline đa tầng (Dual-track Waveform Canvas), thước đo thời gian (Ruler), kéo trượt trực quan Vocal và nghe thử cục bộ (Zero-latency Web Audio Preview) | Tự động cắt ghép nhiều phân đoạn (Multi-region slicing)  |
| **Trải nghiệm thị giác**   | Landing Page 3D Three.js 60 FPS, GSAP ScrollTrigger HUD Telemetry V2, astronaut storytelling sprites, chuyển đổi Dark/Light mode                         | Trình chỉnh sửa hiệu ứng ánh sáng sân khấu               |
| **Xử lý tác vụ**           | Xử lý bất đồng bộ (Non-blocking Child Process) với trạng thái lưu DB                                                                                     | Message Queue phân tán (RabbitMQ, Redis BullMQ)          |
| **Lưu trữ**                | Hệ thống tệp cục bộ (Local File System) có phân cấp thư mục                                                                                              | Cloud Storage (AWS S3, Cloudflare R2)                    |
| **Bảo mật / Auth**         | Không yêu cầu đăng nhập (Public access theo Session/Job ID)                                                                                              | JWT Authentication, quản lý thư viện cá nhân             |

---

### 4. Yêu Cầu Chức Năng (Functional Requirements)

#### FR-01: Tiếp nhận và kiểm định tệp (File Ingestion & Validation)

- Hệ thống cung cấp 2 trường tải lên riêng biệt:
  - `trackA` (Vocal / Lead Audio hoặc Full Song A).
  - `trackB` (Beat / Instrumental Audio hoặc Full Song B).
- **Ràng buộc kiểm tra (Validation):**
  - Định dạng: Kiểm tra phần mở rộng và MIME type hợp lệ (`audio/mpeg`, `audio/wav`).
  - Dung lượng: Từ chối nếu file $> 25\text{MB}$ với mã lỗi `413 Payload Too Large`.
  - Số lượng: Yêu cầu chính xác 2 file; nếu thiếu 1 trong 2, trả về mã lỗi `400 Bad Request` và tự động dọn dẹp file tạm.

#### FR-02: Khởi tạo và theo dõi tiến trình (Job Tracking)

- Khi nhận file hợp lệ, hệ thống tạo bản ghi `MixJob` trạng thái `PENDING` và trả về ngay `jobId` (UUID v4) trong vòng $\le 200\text{ms}$ với mã `HTTP 202 Accepted`.
- Tác vụ xử lý ngầm chuyển trạng thái theo vòng đời:
  `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SUCCESS` hoặc `FAILED`.
- Client truy vấn tiến độ qua cơ chế Polling HTTP GET mỗi 1.5 giây.

#### FR-03: Đường ống xử lý âm thanh cơ bản (Audio Mixing Pipeline)

- **Chuẩn hóa (Standardization):** Chuyển đổi cả 2 luồng âm thanh về cùng chuẩn: Stereo, Sample Rate $44,100\text{ Hz}$, Bit Depth $16\text{-bit}$.
- **Gain Staging (Cân bằng biên độ):**
  - Giảm Gain Track B (Beat) xuống mức $0.75$ ($-2.5\text{dB}$) để nhường dải động cho giọng hát.
  - Giữ Gain Track A (Vocal) ở mức $1.0$ ($0\text{dB}$).
- **Trộn luồng (Summing/Mixing):** Sử dụng filter `amix` của FFmpeg, chế độ độ dài theo tệp dài nhất (`duration=longest`), chuyển mượt `dropout_transition=2`.
- **Phòng chống vỡ tiếng (Clipping Prevention):** Áp dụng peak limiter `alimiter=limit=0.95:level=true` để triệt tiêu hoàn toàn hiện tượng méo tiếng số ($> 0\text{dBFS}$).
- **Đóng gói đầu ra:** Xuất file MP3 định dạng CBR $320\text{ kbps}$.

#### FR-04: Tự Động Dò & Khớp Nhịp Điệu (BPM & Tempo Matching)

- **Nhận diện nhịp độ (BPM Detection):**
  - Tự động phân tích và trích xuất chỉ số BPM của cả Track A (Vocal) và Track B (Beat) qua giải mã PCM stream. Khoảng BPM hỗ trợ: 60 đến 180 BPM.
- **Quy chuẩn tốc độ (Master Tempo):** Lấy tốc độ của Track B (Beat) làm nhịp độ chủ. Tự động tính toán tỷ lệ co dãn thời gian: $r = \frac{BPM_B}{BPM_A}$.
- **Co dãn thời gian (Time-Stretching):**
  - Sử dụng thuật toán time-stretching giữ nguyên cao độ qua filter `atempo` của FFmpeg để co/dãn Track A theo nhịp của Track B.
  - Nếu tỷ lệ $r$ vượt ngoài khoảng $[0.5, 2.0]$, tự động nối tầng chuỗi filter `atempo` (Filter Chaining) để bảo toàn tính toàn vẹn của âm thanh.
- **Lưu trữ & Phản hồi:** Lưu các trường `trackABpm`, `trackBBpm`, và `appliedTempoRatio` vào cơ sở dữ liệu và trả về cho Client.

#### FR-05: Tinh Chỉnh Vị Trí Phách & Độ Trễ (Vocal Offset Alignment)

- **Căn chỉnh độ trễ âm học (Audio Delay Adjustment):**
  - Cho phép người dùng thiết lập mốc thời gian bắt đầu của Track A (Vocal) so với Track B (Beat) qua tham số `vocalOffsetMs` (mili-giây).
  - Khoảng giá trị hỗ trợ: $-3000\text{ ms}$ (Vocal vào sớm) đến $+3000\text{ ms}$ (Vocal vào trễ), bước nhảy $50\text{ ms}$, mặc định là $0\text{ ms}$.
- **Xử lý tín hiệu FFmpeg:**
  - Nếu `vocalOffsetMs > 0`: Áp dụng bộ lọc `adelay={offset}|{offset}` để lùi thời điểm bắt đầu của giọng hát.
  - Nếu `vocalOffsetMs < 0`: Áp dụng bộ lọc cắt đầu `atrim=start={abs(offsetSec)},asetpts=PTS-STARTPTS` để giọng hát vào sớm hơn.
  - Nếu `vocalOffsetMs === 0`: Bỏ qua bộ lọc căn chỉnh để tối ưu thời gian render.

#### FR-06: Trực Quan Hóa Đa Tầng & Nghe Thử Trực Tiếp (Dual-Track Timeline & Zero-Latency Preview)

- **Dựng sóng âm xếp chồng (Stacked Multitrack Canvas):**
  - Tạo Blob Object URL và dựng 2 dải sóng xếp chồng (Dải trên: Vocal màu Indigo, Dải dưới: Beat màu Emerald). Thước đo thời gian (Time Ruler SVG) hiển thị mốc giây/vạch chia phách liên tục bên trên.
- **Tương tác kéo dải sóng (Direct Drag-to-Offset Engine):**
  - Cho phép dùng chuột nắm và kéo dải sóng Vocal dịch chuyển sang trái hoặc sang phải trực tiếp trên timeline bằng Pointer Events (`setPointerCapture`).
  - Tọa độ kéo được quy đổi theo tỷ lệ khung hình sang mili-giây và đồng bộ hai chiều mượt mà với thanh trượt và state `vocalOffsetMs`.
- **Nghe thử đồng bộ không độ trễ (Zero-Latency Web Audio Preview):**
  - Nút Play Preview phát đồng thời cả 2 track từ bộ đệm trình duyệt với độ trễ đúng bằng `vocalOffsetMs` đang chọn, có vạch kim đọc thời gian thực (Playhead) 60 FPS quét xuyên suốt cả 2 track.

#### FR-07: Trực quan hóa và Phát lại Thành Phẩm (Playback & Visualization)

- Khi trạng thái là `SUCCESS`, giao diện hiển thị:
  - Thông số BPM, tỷ lệ co dãn nhịp điệu, độ trễ phách, tông nhạc và trạng thái tách thân âm đã áp dụng.
  - Dạng sóng âm thanh tương tác dựng bằng Wavesurfer.js.
  - Hỗ trợ tua nhạc tức thì (Audio Seeking) thông qua chuẩn **HTTP 206 Partial Content**.
  - Các nút điều khiển: Play/Pause, thời gian hiện tại / tổng thời gian, nút phát lại từ đầu.
  - Nút "Tải Xuống Bản Mix (.mp3)" kích hoạt download trực tiếp.

#### FR-08: Trang Giới Thiệu & Hiệu Ứng Thị Giác 3D (Three.js Hero Landing Page)

- **Không gian 3D tương tác (Interactive 3D Canvas):**
  - Sử dụng Three.js dựng Quả cầu sóng âm 3D biến dạng phát sáng (3D Audio Wave Orb) cùng vành đai hạt quay quanh trục, tương tác thị sai theo di chuột (Mouse Parallax).
- **Hiệu ứng điện ảnh GSAP ScrollTrigger:**
  - Đồng bộ góc xoay, khoảng cách camera và độ biến dạng sóng của vật thể 3D theo 3 chặng cuộn trang.
  - Lớp phủ giao diện HUD Telemetry mang phong cách công nghệ cao viễn tưởng với tọa độ chuột động và tâm ngắm âm thanh (Reticle Cursor).
  - Phân đoạn ghim màn hình (Pinned Section) bóc tách 3 tầng công nghệ DSP theo bước lăn chuột.
- **Kiến trúc đa trang & Theme:** Phân tách hoàn toàn tuyến đường `/` (Landing Page) và `/studio` (Phòng thu), hỗ trợ chuyển đổi Dark/Light mode toàn diện.

#### FR-09: Khớp Tông Hòa Âm & Dịch Chuyển Cao Độ (Harmonic Key Shifting)

- **Nhận diện Tông & Thang âm (Musical Key Detection):**
  - Tự động trích xuất 12-bin Pitch Class Profile (Chromagram) qua phân tích STFT của raw PCM stream.
  - Đối sánh tương quan Pearson với 24 khuôn mẫu cảm thụ âm học Krumhansl-Schmuckler (12 Major + 12 Minor) để xác định Key, Scale và mã hóa chuẩn DJ Camelot Wheel (ví dụ: `8A` cho Am, `8B` cho C).
- **Thuật toán Khớp Tông Thông Minh (Smart Harmonic Matching):**
  - Tính toán khoảng cách bán âm ($\Delta\text{semitones}$) ngắn nhất để đưa Vocal về cung hòa âm tương thích với Beat theo vòng tròn Camelot (Circle of Fifths).
  - Giới hạn dịch chuyển an toàn trong khoảng $[-3, +3]$ bán âm để giữ nguyên Formant tự nhiên của giọng hát.
  - Cho phép tùy chỉnh thủ công $\pm 6$ bán âm hoặc bật chế độ tự động hòa âm (Auto-Harmonize).
- **Đường ống xử lý DSP (Pitch Shifting Pipeline):**
  - Sử dụng công thức tỷ lệ tần số $\text{factor} = 2^{\frac{\Delta\text{semitones}}{12}}$.
  - Nối chuỗi bộ lọc FFmpeg:
    `asetrate=44100*factor,atempo=1/factor,aresample=44100`
  - Đảm bảo giữ nguyên $100\%$ tốc độ tempo và thời lượng đã căn chỉnh trong khi cao độ được dịch chuẩn xác.

#### FR-10: Bóc Tách Thân Âm Tự Động Bằng AI (AI Stem Separation)

- **Cơ chế bóc tách nguồn âm (Audio Source Separation Engine):**
  - Tích hợp mô hình AI Demucs v4 (Hybrid Transformer) qua một Python CLI runner ngầm được điều phối bởi `StemSeparatorService.js`.
  - Hỗ trợ chế độ tách 2 thân âm độc lập (`--two-stems=vocals`):
    - Track A (Ca khúc hoàn chỉnh): Trích xuất phần giọng hát sạch (`vocals.wav`), triệt tiêu nhạc nền để phục vụ beat-matching và pitch-shifting.
    - Track B (Ca khúc hoàn chỉnh): Trích xuất phần hòa âm nhạc cụ (`no_vocals.wav` / Instrumental), loại bỏ giọng hát gốc để làm beat chủ.
- **Tùy chọn tương tác trên giao diện (User Preference Controls):**
  - Công tắc chuyển đổi: _"Kích hoạt AI Tách Lời & Nhạc Nền (AI Stem Separation)"_.
  - Cho phép người dùng tùy chọn bật/tắt tách thân âm trước khi đưa vào pipeline xử lý.
- **Cơ chế Fallback & Tối ưu hiệu năng:**
  - Nếu tệp tải lên đã là Acappella hoặc Instrumental (người dùng tắt cờ AI), bỏ qua tiến trình AI để tiết kiệm tài nguyên tính toán.
  - Tự động kiểm tra môi trường Python & PyTorch; nếu thiếu GPU/CUDA, chạy chế độ CPU đa luồng có giới hạn thời lượng hoặc kích hoạt fallback DSP thông minh (Center-Channel Phase Inversion) trong môi trường test nhẹ.

#### FR-11: Trải Nghiệm Kể Chuyện Vũ Trụ Nhạc Số (Cosmic Storytelling V2)

- **Hành trình kể chuyện đa phân đoạn theo cuộn chuột (Immersive Horizontal & Vertical Scroll Tour):**
  - Khóa màn hình và chia nhỏ Landing Page thành một chuỗi diễn hoạt liền mạch lấy cảm hứng từ Noomo Agency:
    - **Phân đoạn 1: Sự hỗn loạn của âm thanh (The Un-synced Sound Chaos):** Hai tín hiệu sóng âm rời rạc, méo mó bay vô định trong không gian. Cần bộc lộ "vấn đề" của việc mix nhạc thủ công (Lệch nhịp, lạc tông).
    - **Phân đoạn 2: Cỗ máy bóc tách AI (The AI Stem Extraction Engine):** Người dùng cuộn chuột, cỗ máy bóc tách (Visualizer 3D) xuất hiện, các phi hành gia hoạt họa (Astronaut characters) kéo cáp, dải sóng đục ngầu được lọc thành 2 luồng tinh khiết: _Clean Vocals (Track A)_ và _Pure Instrumental (Track B)_.
    - **Phân đoạn 3: Phép màu Đồng bộ (Harmonic Sync & Calibration):** Visualizer uốn lượn uốn cong, vạch đo BPM và vòng tròn Camelot Wheel xoay khớp, hai luồng laser giao thoa vào tâm ma trận.
    - **Phân đoạn 4: Studio Portal:** Portal phát sáng hào quang mở ra, mời gọi bay vào không gian làm việc Studio.
- **HUD Telemetry & Game-like Widgets:**
  - Bảng chỉ số góc tương tác: Tọa độ chuột `POS: [X | Y]`, tần số Hertz động, vạch quét, chấm laser, radar dập dình theo nhịp.
  - Custom Reticle Cursor (Tâm ngắm âm thanh) đổi hình dạng & xoay tròn khi rê qua các nút bấm.
  - Immersive Sound FX: Tiếng click cơ học, tiếng sóng không gian nhẹ sweep khi scroll qua stage.

---

### 5. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

- **Hiệu năng:** Thời gian phân tích BPM, nhận diện Key và trộn 2 file 3 phút không vượt quá $20\text{ giây}$ trên môi trường tiêu chuẩn (không bật AI tách stem) và $\le 60\text{ giây}$ (khi bật AI stem). Thao tác kéo trượt waveform trên giao diện đạt 60 FPS.
- **Toàn vẹn bộ nhớ:** Phải có cơ chế giải phóng tài nguyên triệt để (Cleanup Functions trong React hooks, thu hồi Blob URL qua `URL.revokeObjectURL`, hủy AudioContext của Web Audio API, gọi `.dispose()` trên toàn bộ geometry/material/texture/renderer của Three.js).
- **Tính khả chuyển (Portability):** Cấu hình cơ sở dữ liệu qua Prisma ORM, sẵn sàng chuyển đổi từ SQLite sang PostgreSQL khi triển khai Cloud.
