# Product Requirements Document (PRD)

## Hệ Thống Tự Động Phối Âm Thanh (Audio Mashup Engine)

---

### 1. Tổng Quan & Mục Tiêu Sản Phẩm

- **Tên dự án:** Web Audio Mashup Studio.
- **Mục tiêu:** Cung cấp dịch vụ web cho phép người dùng tải lên 2 tệp âm thanh độc lập (Track A: Vocal/Chính, Track B: Beat/Nền), hệ thống tự động nhận diện nhịp độ (BPM), chuẩn hóa, co/dãn thời gian (time-stretching) để đồng bộ nhịp điệu, căn chỉnh độ trễ/phách trực quan trên timeline đa tầng, phối ghép (mix), cân bằng âm lượng và xuất bản phẩm chất lượng cao.
- **Giá trị cốt lõi:** Tự động hóa toàn bộ quy trình beat-matching, offset-alignment và mixing phức tạp thành một pipeline tự động, kết hợp giao diện Mini-DAW tương tác trực tiếp giúp người dùng kiểm soát chính xác điểm rơi của câu hát mà không cần phần mềm âm thanh chuyên nghiệp.

---

### 2. Đối Tượng Người Dùng & Ca Sử Dụng (Use Cases)

- **Người sáng tạo nội dung / DJ nghiệp dư:** Muốn ghép nhanh một đoạn Acappella vào một Beat có sẵn, cần nhìn thấy trực quan dạng sóng của cả 2 bài xếp chồng lên nhau để căn chỉnh câu hát rơi đúng phách trống trước khi bấm render.
- **Người nghe phổ thông:** Muốn tạo các bản phối cá nhân hóa nhanh chóng từ hai ca khúc yêu thích với khả năng nghe thử tức thời trên trình duyệt.

---

### 3. Phạm Vi Triển Khai (Scope Matrix)

| Hạng mục                   | Trong phạm vi (In-Scope - Giai đoạn hiện tại)                                                                                                            | Ngoài phạm vi (Out-of-Scope - Tương lai)                                 |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Định dạng vào**          | MP3, WAV (MIME: `audio/mpeg`, `audio/wav`)                                                                                                               | FLAC, AAC, OGG, M4A                                                      |
| **Kích thước tệp**         | Tối đa 25MB / tệp, thời lượng $\le 5\text{ phút}$ / tệp                                                                                                  | Tệp dung lượng lớn, video MP4                                            |
| **Xử lý âm thanh**         | Chuẩn hóa sample rate, gain staging, amix, limiter chống vỡ tiếng                                                                                        | Stem separation bằng AI (Demucs/Spleeter), Pitch shifting (Harmonic Key) |
| **Đồng bộ nhịp điệu**      | Tự động phát hiện BPM (Onset detection), time-stretch bằng filter `atempo`                                                                               | Nhận diện vòng hòa âm Camelot                                            |
| **Căn chỉnh độ trễ**       | Tinh chỉnh độ trễ thủ công (`vocalOffsetMs` từ $-3000\text{ ms}$ đến $+3000\text{ ms}$) qua filter `adelay` và `atrim`                                   | Tự động dò phase alignment bằng AI                                       |
| **Trực quan hóa timeline** | Timeline đa tầng (Dual-track Waveform Canvas), thước đo thời gian (Ruler), kéo trượt trực quan Vocal và nghe thử cục bộ (Zero-latency Web Audio Preview) | Tự động căn chỉnh lưới ô nhịp (Quantize to Beatgrid)                     |
| **Xử lý tác vụ**           | Xử lý bất đồng bộ (Non-blocking Child Process) với trạng thái lưu DB                                                                                     | Message Queue phân tán (RabbitMQ, Redis BullMQ)                          |
| **Lưu trữ**                | Hệ thống tệp cục bộ (Local File System) có phân cấp thư mục                                                                                              | Cloud Storage (AWS S3, Cloudflare R2)                                    |
| **Bảo mật / Auth**         | Không yêu cầu đăng nhập (Public access theo Session/Job ID)                                                                                              | JWT Authentication, quản lý thư viện cá nhân                             |

---

### 4. Yêu Cầu Chức Năng (Functional Requirements)

#### FR-01: Tiếp nhận và kiểm định tệp (File Ingestion & Validation)

- Hệ thống cung cấp 2 trường tải lên riêng biệt:
  - `trackA` (Vocal / Lead Audio).
  - `trackB` (Beat / Instrumental Audio).
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
  - Tự động phân tích và trích xuất chỉ số BPM của cả Track A (Vocal) và Track B (Beat) qua giải mã PCM stream.
  - Khoảng BPM hỗ trợ: 60 đến 180 BPM.
- **Quy chuẩn tốc độ (Master Tempo):**
  - Lấy tốc độ của Track B (Beat) làm nhịp độ chủ (Master Tempo).
  - Tự động tính toán tỷ lệ co dãn thời gian: $r = \frac{BPM_B}{BPM_A}$.
- **Co dãn thời gian (Time-Stretching):**
  - Sử dụng thuật toán time-stretching giữ nguyên cao độ (pitch-neutral) qua filter `atempo` của FFmpeg để co/dãn Track A theo nhịp của Track B.
  - Nếu tỷ lệ $r$ vượt ngoài khoảng $[0.5, 2.0]$, tự động nối tầng chuỗi filter `atempo` để bảo toàn tính toàn vẹn của âm thanh.
- **Lưu trữ & Phản hồi:** Lưu các trường `trackABpm`, `trackBBpm`, và `appliedTempoRatio` vào cơ sở dữ liệu và trả về cho Client.

#### FR-05: Tinh Chỉnh Vị Trí Phách & Độ Trễ (Vocal Offset Alignment)

- **Căn chỉnh độ trễ âm học (Audio Delay Adjustment):**
  - Cho phép người dùng thiết lập mốc thời gian bắt đầu của Track A (Vocal) so với Track B (Beat) qua tham số `vocalOffsetMs` (mili-giây).
  - Khoảng giá trị hỗ trợ: $-3000\text{ ms}$ (Vocal vào sớm hơn) đến $+3000\text{ ms}$ (Vocal vào trễ hơn), bước nhảy $50\text{ ms}$, mặc định là $0\text{ ms}$.
- **Xử lý tín hiệu FFmpeg:**
  - Nếu `vocalOffsetMs > 0`: Áp dụng bộ lọc `adelay={offset}|{offset}` để lùi thời điểm bắt đầu của giọng hát.
  - Nếu `vocalOffsetMs < 0`: Áp dụng bộ lọc cắt đầu `atrim=start={abs(offsetSec)},asetpts=PTS-STARTPTS` để giọng hát vào sớm hơn.
  - Nếu `vocalOffsetMs === 0`: Bỏ qua bộ lọc căn chỉnh để tối ưu thời gian render.

#### FR-06: Trực Quan Hóa Đa Tầng & Nghe Thử Trực Tiếp (Dual-Track Timeline & Zero-Latency Preview)

- **Dựng sóng âm xếp chồng (Stacked Multitrack Canvas):**
  - Ngay khi người dùng chọn đủ 2 tệp, client tự động tạo Blob Object URL và dựng 2 dải sóng xếp chồng (Dải trên: Vocal màu Indigo, Dải dưới: Beat màu Emerald).
  - Thước đo thời gian (Time Ruler) hiển thị mốc giây/phút liên tục bên trên.
- **Tương tác kéo dải sóng (Interactive Track Dragging):**
  - Cho phép dùng chuột nắm và kéo dải sóng Vocal dịch chuyển sang trái hoặc sang phải trực tiếp trên timeline.
  - Tọa độ kéo được quy đổi theo tỷ lệ khung hình sang mili-giây và đồng bộ hai chiều với `vocalOffsetMs` ($-3000\text{ms} \leftrightarrow +3000\text{ms}$).
- **Nghe thử đồng bộ không độ trễ (Zero-Latency Web Audio Preview):**
  - Nút Play Preview phát đồng thời cả 2 track từ bộ đệm trình duyệt (Web Audio API / WaveSurfer sync) với độ trễ đúng bằng `vocalOffsetMs` đang chọn, giúp người dùng nghe thẩm định ngay lập tức trước khi gửi lệnh render lên server.

#### FR-07: Trực quan hóa và Phát lại Thành Phẩm (Playback & Visualization)

- Khi trạng thái là `SUCCESS`, giao diện hiển thị:
  - Thông số BPM của cả 2 bài hát, tỷ lệ co dãn nhịp điệu đã áp dụng, và độ trễ phách đã chọn.
  - Dạng sóng âm thanh tương tác (Waveform) dựng bằng Wavesurfer.js.
  - Hỗ trợ tua nhạc tức thì (Audio Seeking) thông qua chuẩn **HTTP 206 Partial Content**.
  - Các nút điều khiển: Play/Pause, thời gian hiện tại / tổng thời gian, nút phát lại từ đầu.
  - Nút "Tải Xuống Bản Mix (.mp3)" kích hoạt download trực tiếp.

#### FR-08: Trang Giới Thiệu & Hiệu Ứng Thị Giác 3D (Three.js Hero Landing Page)

- **Không gian 3D tương tác (Interactive 3D Canvas):**
  - Sử dụng thư viện `three` dựng một trường hạt sóng âm 3D (Particle Wave Grid) phủ nền Hero Section.
  - Hỗ trợ chuyển động thị sai (Parallax Effect) mượt mà 60 FPS phản hồi theo tọa độ chuột của người dùng.
- **Bố cục Landing Page (Modern Studio Layout):**
  - Thanh điều hướng (Navbar) với logo âm thanh và trạng thái hệ thống.
  - Hero Section với tiêu đề ấn tượng, nút kêu gọi hành động (CTA) chuyển cảnh mượt vào Studio.
  - Khối giới thiệu 3 tính năng cốt lõi (BPM Matching, Direct Drag Timeline, High-fidelity Render).
- **Tối ưu hóa hiệu năng (Performance Optimization):**
  - Tự động tạm dừng vòng lặp render (`cancelAnimationFrame`) khi người dùng cuộn khỏi Hero Section hoặc khi tab trình duyệt bị ẩn để tiết kiệm GPU.

---

### 5. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

- **Hiệu năng:** Thời gian phân tích BPM và trộn 2 file 3 phút không vượt quá $20\text{ giây}$ trên môi trường tiêu chuẩn. Thao tác kéo trượt waveform trên giao diện đạt 60 FPS.
- **Toàn vẹn bộ nhớ:** Phải có cơ chế giải phóng tài nguyên triệt để (Cleanup Functions trong React hooks, thu hồi Blob URL qua `URL.revokeObjectURL`, hủy AudioContext của Web Audio API).
- **Tính khả chuyển (Portability):** Cấu hình cơ sở dữ liệu qua Prisma ORM, sẵn sàng chuyển đổi từ SQLite sang PostgreSQL khi triển khai Cloud.
