# audio-mixer-poc

Trạng thái: dự án vibe-coded, đang TRẢ NỢ KỸ THUẬT. Ưu tiên hiểu & sửa đúng, KHÔNG thêm tính năng.

## Stack

- client/: React 18 + Vite, Three.js, GSAP, Whisper (transformers.js) trong Web Worker
- server/: Node 20 + Express (ESM), Prisma + SQLite, FFmpeg qua fluent-ffmpeg

## Lệnh

- Test client: cd client && npm test
- Test server: npm run test:e2e

## Quy tắc dự án

- README và specs/ có thể KHÔNG khớp với code. Code là sự thật; nếu lệch, báo cho tôi.
- Mọi thay đổi FilterGraph phải có test đo biên độ/độ dài trên file audio thật trong tests/fixtures.
- Ghi mọi vấn đề phát hiện vào docs/tech-debt.md (vấn đề | rủi ro | bằng chứng | hướng sửa).
- Không thêm dependency mới khi chưa hỏi.
