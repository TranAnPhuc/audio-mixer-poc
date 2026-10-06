# Product Requirements Document (PRD)

## AuraVinyl — 3D Interactive Vinyl & Kinetic Lyrics Player

---

### 1. Tổng Quan & Mục Tiêu Sản Phẩm

- **Tên dự án:** AuraVinyl.
- **Định vị:** Trình phát nhạc đĩa than 3D tương tác cảm xúc, kết hợp ánh sáng không gian biến ảo (Dynamic Ambient Lighting) và lời bài hát động học (Kinetic Synced Lyrics).
- **Giá trị cốt lõi:** Biến hành động nghe nhạc cá nhân thành một trải nghiệm thị giác và thính giác hoài niệm, sang trọng, không quảng cáo và hợp pháp 100%.

---

### 2. Yêu Cầu Chức Năng (Functional Requirements)

#### FR-01: Tiếp nhận tệp & Trích xuất Metadata (Local Ingestion)

- Người dùng kéo thả 1 file MP3/WAV trực tiếp vào mâm đĩa hoặc bấm chọn file.
- Trích xuất tự động bằng `jsmediatags` (hoặc thư viện tương đương chạy trên trình duyệt):
  - Tên bài hát, tên nghệ sĩ, album.
  - Ảnh bìa album (Album Cover Art) dạng nhãn dán ở tâm đĩa than.

#### FR-02: Mâm Đĩa Than 3D Tương Tác (Three.js Turntable Engine)

- Dựng mô hình 3D mâm đĩa phong cách tối giản cao cấp:
  - **Đĩa Vinyl:** Màu đen bóng, có vân rãnh xoắn ốc phản xạ ánh sáng (Grooves).
  - **Tem đĩa (Center Label):** Dán ảnh bìa bài hát vừa tải lên.
  - **Cần gạt kim (Tonearm):** Tự động nâng lên, lia vào rìa đĩa và hạ kim khi bấm Play; tự nâng lên và thu về bệ đỡ khi Pause/Stop.
  - **Chuyển động quay:** Đĩa xoay đều 33⅓ RPM khi đang phát nhạc.

#### FR-03: Không Gian Ánh Sáng Biến Ảo (Dynamic Ambient Atmosphere)

- Phân tích bảng màu của ảnh bìa đĩa (Dominant Palette):
  - Tự động đổi màu nền Canvas và ánh sáng phản chiếu (Ambient Bloom / Aurora Mesh) hòa quyện theo tông màu của bài hát.

#### FR-04: Âm Học Đĩa Than & Phân Tích Dải Tần (Lo-Fi Vinyl Audio)

- Sử dụng Web Audio API:
  - Phát tiếng rít nhẹ và tiếng nổ lách tách (_needle crackle_) trong 1.5 giây lúc kim vừa chạm đĩa.
  - Phân tích FFT dải trầm (Bass / Kick drum) làm đèn nền nhún nhảy nhẹ theo nhịp.

#### FR-05: Lời Bài Hát Động Học Đồng Bộ (Kinetic Synced Lyrics)

- Tự động truy vấn lời bài hát có mốc thời gian (LRC format) từ API miễn phí (ví dụ: `https://lrclib.net/api/get` theo Title & Artist).
- Hiển thị lời bài hát nghệ thuật bên cạnh đĩa than bằng GSAP:
  - Câu đang hát: Phóng to nhẹ, phát sáng chữ.
  - Câu trước/sau: Làm mờ mượt mà và trôi dần lên trên.
  - Nếu bài hát không có lyrics: Hiển thị sóng âm tối giản hoặc các hạt bụi ánh sáng bay lơ lửng.
