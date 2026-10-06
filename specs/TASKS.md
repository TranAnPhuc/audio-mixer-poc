# Work Breakdown Structure (WBS) — AuraVinyl

- [x] **Task 1: Dọn Dẹp Codebase & Khởi Tạo Giao Diện Dark Minimalist**
  - Xóa bỏ toàn bộ các component gây rối mắt: `AstronautCharacters.jsx`, các HUD Telemetry, radar sonar và các lớp hiển thị giả lập.
  - Cố định theme nền đen huyền bí (`bg-[#0a0a0f]`), bố trí khung layout chia 2 cột: Cột trái mâm đĩa 3D, Cột phải lời bài hát / thông tin bài hát.

- [x] **Task 2: Xây Dựng Mâm Đĩa Than 3D & Chuyển Động Cần Gạt (Three.js Turntable)**
  - Dựng đĩa vinyl vân rãnh, tem tròn ở tâm và cần kim (Tonearm) trong `Turntable3D.jsx`.
  - Diễn hoạt chuyển động: Bấm Play -> cần kim quay vào đĩa và hạ xuống -> đĩa bắt đầu quay; Bấm Pause -> cần kim nâng lên và đĩa dừng lại.

- [x] **Task 3: Tích Hợp Web Audio & Hiệu Ứng Âm Thanh Kim Đĩa Than**
  - Tạo tiếng nổ lách tách (_needle crackle_) bằng Web Audio API phát ra trong 1–2 giây lúc kim vừa hạ.
  - Kết nối audio của bài hát vào `AnalyserNode` để mâm đĩa và ánh sáng phản xạ nhún nhảy nhẹ theo nhịp bass.

- [x] **Task 4: Trích Xuất Metadata & Đổi Màu Nền Động Học (Ambient Aurora)**
  - Dùng `jsmediatags` đọc tên bài hát, ca sĩ và ảnh bìa album từ file MP3 tải lên.
  - Trích xuất màu chủ đạo của ảnh bìa để đổi ánh sáng nền Three.js mềm mại theo tông màu bài hát.

- [x] **Task 5: Đồng Bộ Lời Bài Hát Nghệ Thuật (Kinetic Synced Lyrics)**
  - Gọi API Lrclib tìm lời theo tên bài + nghệ sĩ; parse định dạng timestamp `[mm:ss.xx]`.
  - Hỗ trợ nạp file `.lrc` thủ công (kéo thả đồng thời hoặc tải riêng) và trích xuất lời nhúng ID3 (`USLT`/`SYLT`) với chuỗi ưu tiên 4 cấp.
  - Dùng GSAP làm hiệu ứng cuộn mượt và phát sáng chữ ở dòng đang hát; nếu không có lời, hiển thị các hạt bụi ánh sáng thư giãn (_ambient dust particles_).

- [x] **Task 6: Tích Hợp AI Whisper Bóc Lời & Canh Nhịp Trực Tiếp Trên Trình Duyệt**
  - Cài đặt `@xenova/transformers`, cấu hình Web Worker chạy mô hình `Xenova/whisper-tiny`.
  - Viết module xử lý âm thanh: Trích xuất PCM Float32Array và resample về 16,000 Hz chuẩn cho Whisper.
  - Bổ sung nút "✨ AI Bóc Lời" và thanh trạng thái tiến trình (Loading Model -> Transcribing %) trên cột Kinetic Lyrics.
  - Tự động chuyển đổi kết quả chunks sang danh sách câu hát đồng bộ mốc thời gian và hiển thị ngay trên mâm đĩa.

- [x] **Task 7: Tinh Chỉnh Động Học Cần Kim Theo Thời Gian Thực & Hạt Bụi 3D**
  - Đồng bộ góc xoay ngang cần kim theo currentTime/duration (0.46 rad -> 0.73 rad) và tự động lerp khi tua hoặc phát nhạc.
  - Dựng hệ thống 60 hạt bụi ánh sáng không gian lơ lửng chuyển động Brownian trong luồng sáng và phản xạ theo màu album.
  - Tối ưu hóa phản xạ vi rãnh đĩa than (micro-grooves) sắc nét và cơ chế Audio Gain Fade-in/Fade-out 50ms khi Play/Pause.

- [x] **Task 8: Nâng Cấp Kinetic Lyrics (Mask Fade, Xuất File .LRC) & Chế Độ Zen Mode Toàn Màn Hình**
  - Áp dụng mặt nạ chuyển mờ Apple Music Sing `linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)` cho container cuộn câu hát.
  - Tích hợp nút và cơ chế "📥 Xuất .LRC" tạo Blob UTF-8 tự động tải về file `{tên_bài_hát}.lrc` chuẩn mốc thời gian.
  - Chế độ Zen Mode toàn màn hình (phím F hoặc nút Maximize) tối giản hóa giao diện, tôn vinh mâm đĩa than 3D và lời hát bay bổng.
  - Hệ thống phím tắt toàn cục: Space (Play/Pause), ArrowLeft/Right (Tua +/-5s), M (Mute), F (Zen Mode), Esc (Thoát Zen).

