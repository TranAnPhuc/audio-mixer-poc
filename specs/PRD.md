# Product Requirements Document (PRD)

## Hệ Thống Tự Động Phối Âm Thanh (Audio Mashup Engine - MVP)

---

### 1. Tổng Quan & Mục Tiêu Sản Phẩm

- **Tên dự án:** Web Audio Mashup MVP.
- **Mục tiêu:** Cung cấp dịch vụ web cho phép người dùng tải lên 2 tệp âm thanh độc lập (Track A: Vocal/Chính, Track B: Beat/Nền), hệ thống tự động xử lý chuẩn hóa, phối ghép (mix), cân bằng âm lượng và trả về một bản nhạc duy nhất có thể nghe trực tuyến và tải về.
- **Giá trị cốt lõi:** Đơn giản hóa quy trình mixing thủ công bằng một pipeline xử lý âm thanh tự động, phục vụ nhu cầu thử nghiệm mashup nhanh.

---

### 2. Đối Tượng Người Dùng & Ca Sử Dụng (Use Cases)

- **Người sáng tạo nội dung / DJ nghiệp dư:** Muốn ghép nhanh một đoạn Acappella vào một Beat có sẵn để kiểm tra độ hòa hợp trước khi đưa vào DAW (Digital Audio Workstation).
- **Người nghe phổ thông:** Muốn tạo các bản phối nhạc cá nhân hóa nhanh chóng không cần kiến thức kỹ thuật âm thanh.

---

### 3. Phạm Vi Triển Khai (Scope Matrix)

| Hạng mục           | Trong phạm vi MVP (In-Scope)                                         | Ngoài phạm vi MVP (Out-of-Scope - Phase 2)                     |
| :----------------- | :------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Định dạng vào**  | MP3, WAV (MIME: `audio/mpeg`, `audio/wav`)                           | FLAC, AAC, OGG, M4A                                            |
| **Kích thước tệp** | Tối đa 25MB / tệp, thời lượng $\le$ 5 phút/tệp                       | Tệp dung lượng lớn, video MP4                                  |
| **Xử lý âm thanh** | Chuẩn hóa sample rate, gain staging, amix, auto-fadeout              | Stem separation bằng AI, Beat matching tự động, Pitch shifting |
| **Xử lý tác vụ**   | Xử lý bất đồng bộ (Non-blocking Child Process) với trạng thái lưu DB | Message Queue phân tán (RabbitMQ, Redis BullMQ)                |
| **Lưu trữ**        | Hệ thống tệp cục bộ (Local File System) có phân cấp thư mục          | Cloud Storage (AWS S3, Cloudflare R2)                          |
| **Bảo mật / Auth** | Không yêu cầu đăng nhập (Public access theo Session/Job ID)          | JWT Authentication, quản lý thư viện cá nhân                   |

---

### 4. Yêu Cầu Chức Năng (Functional Requirements)

#### FR-01: Tiếp nhận và kiểm định tệp (File Ingestion & Validation)

- Hệ thống phải cung cấp 2 trường tải lên riêng biệt:
  - `trackA` (Vocal / Lead Audio).
  - `trackB` (Beat / Instrumental Audio).
- **Ràng buộc kiểm tra (Validation):**
  - Định dạng: Bắt buộc kiểm tra MIME type thực tế của file (Magic Bytes), từ chối file đổi đuôi giả mạo.
  - Dung lượng: Reject ngay lập tức nếu file $> 25\text{ MB}$ với mã lỗi `413 Payload Too Large`.
  - Số lượng: Yêu cầu chính xác 2 file; nếu thiếu 1 trong 2, trả về mã lỗi `400 Bad Request`.

#### FR-02: Khởi tạo và theo dõi tiến trình (Job Tracking)

- Khi nhận file hợp lệ, hệ thống tạo một bản ghi `MixJob` với trạng thái `PENDING` và trả về ngay `jobId` (UUID v4) trong vòng $\le 500\text{ms}$.
- Chuyển tác vụ xử lý sang chế độ chạy nền, cập nhật trạng thái theo vòng đời:
  `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `SUCCESS` hoặc `FAILED`.
- Client có thể truy vấn trạng thái tiến độ thông qua cơ chế Polling HTTP GET.

#### FR-03: Đường ống xử lý âm thanh (Audio Mixing Pipeline)

- **Chuẩn hóa (Standardization):** Chuyển đổi cả 2 luồng âm thanh về cùng chuẩn: Stereo, Sample Rate $44,100\text{ Hz}$, Bit Depth $16\text{-bit}$.
- **Gain Staging (Cân bằng biên độ):**
  - Giảm Gain của Track B (Beat) xuống mức $-2.5\text{dB}$ hoặc tỷ lệ $0.75$ để tránh lấn át giọng hát.
  - Giữ Gain của Track A (Vocal) ở mức $1.0$ ($0\text{dB}$).
- **Trộn luồng (Summing/Mixing):** Sử dụng filter `amix` của FFmpeg, chế độ độ dài theo tệp dài nhất (`duration=longest`).
- **Phòng chống vỡ tiếng (Clipping Prevention):** Áp dụng dynamic audio normalizer hoặc limiter nhẹ để tránh méo tiếng khi cộng hưởng biên độ đỉnh (Peak Overload $> 0\text{dBFS}$).
- **Đóng gói đầu ra:** Xuất file MP3 định dạng Constant Bitrate (CBR) $320\text{ kbps}$.

#### FR-04: Trực quan hóa và Phát lại (Playback & Visualization)

- Khi trạng thái là `SUCCESS`, giao diện hiển thị:
  - Dạng sóng âm thanh tương tác (Interactive Audio Waveform).
  - Các nút điều khiển: Play/Pause, Cột mốc thời gian hiện tại / Tổng thời gian.
  - Nút "Download Bản Mix" để tải trực tiếp file thành phẩm về máy.

---

### 5. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

- **Hiệu năng:** Thời gian trộn cho 2 file thời lượng 3 phút không được vượt quá $15\text{ giây}$ trên môi trường tiêu chuẩn (4 vCPU, 8GB RAM).
- **Độ tin cậy & Dọn dẹp tài nguyên:** File tạm (`temp/uploads`) và kết quả (`temp/outputs`) phải có cơ chế dọn dẹp hoặc gắn cờ để xóa định kỳ, tránh tràn ổ đĩa.
- **Tính khả chuyển (Portability):** Cấu hình cơ sở dữ liệu phải trừu tượng hóa qua ORM để chuyển đổi từ SQLite (Local Dev) sang PostgreSQL (Staging/Production) chỉ bằng việc thay đổi biến môi trường `DATABASE_URL`.
