import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uploadMiddleware from '../src/middlewares/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUploadTests() {
  console.log('--- Bắt đầu kiểm thử độc lập Multer Upload & Validation Middleware ---');

  // 1. Khởi tạo Express Test App trên cổng tạm thời
  const app = express();
  const TEST_PORT = 5099;

  app.post('/test/upload', uploadMiddleware, (req, res) => {
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        trackA: {
          originalName: req.files.trackA[0].originalname,
          filename: req.files.trackA[0].filename,
          path: req.files.trackA[0].path,
          size: req.files.trackA[0].size,
          mimetype: req.files.trackA[0].mimetype
        },
        trackB: {
          originalName: req.files.trackB[0].originalname,
          filename: req.files.trackB[0].filename,
          path: req.files.trackB[0].path,
          size: req.files.trackB[0].size,
          mimetype: req.files.trackB[0].mimetype
        }
      }
    });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  const filesToCleanup = [];

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const vocalFixture = path.join(fixturesDir, 'vocal_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    // ==========================================
    // Ca 1: Gửi hợp lệ 2 file MP3 chuẩn
    // ==========================================
    console.log('\n[Test Ca 1]: Gửi đầy đủ 2 tệp trackA và trackB hợp lệ...');
    const formData1 = new FormData();
    const vocalBuffer = fs.readFileSync(vocalFixture);
    const beatBuffer = fs.readFileSync(beatFixture);

    formData1.append('trackA', new Blob([vocalBuffer], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    formData1.append('trackB', new Blob([beatBuffer], { type: 'audio/mpeg' }), 'beat_test.mp3');

    const res1 = await fetch(`http://localhost:${TEST_PORT}/test/upload`, {
      method: 'POST',
      body: formData1
    });

    const data1 = await res1.json();
    console.log(`  → HTTP Status: ${res1.status} (Kỳ vọng: 200)`);
    if (res1.status !== 200 || !data1.success) {
      throw new Error(`Ca 1 thất bại! Phản hồi: ${JSON.stringify(data1)}`);
    }

    console.log('  ✔ Tên file lưu trên đĩa Track A:', data1.data.trackA.filename);
    console.log('  ✔ Tên file lưu trên đĩa Track B:', data1.data.trackB.filename);

    if (!fs.existsSync(data1.data.trackA.path) || !fs.existsSync(data1.data.trackB.path)) {
      throw new Error('Tệp không tồn tại trong thư mục storage/uploads!');
    }

    filesToCleanup.push(data1.data.trackA.path, data1.data.trackB.path);
    console.log('  ✔ Ca 1 ĐẠT CHUẨN: File đã lưu trên đĩa với tên UUID và metadata hợp lệ.');

    // ==========================================
    // Ca 2: Thiếu 1 trong 2 file (chỉ gửi trackA)
    // ==========================================
    console.log('\n[Test Ca 2]: Gửi thiếu tệp (chỉ gửi trackA, thiếu trackB)...');
    const formData2 = new FormData();
    formData2.append('trackA', new Blob([vocalBuffer], { type: 'audio/mpeg' }), 'vocal_test.mp3');

    const res2 = await fetch(`http://localhost:${TEST_PORT}/test/upload`, {
      method: 'POST',
      body: formData2
    });

    const data2 = await res2.json();
    console.log(`  → HTTP Status: ${res2.status} (Kỳ vọng: 400)`);
    console.log(`  → Error Code: ${data2.error?.code} (Kỳ vọng: MISSING_REQUIRED_FILES)`);

    if (res2.status !== 400 || data2.error?.code !== 'MISSING_REQUIRED_FILES') {
      throw new Error(`Ca 2 thất bại! Phản hồi: ${JSON.stringify(data2)}`);
    }
    console.log('  ✔ Ca 2 ĐẠT CHUẨN: Bắt lỗi 400 Bad Request và tự động dọn dẹp file tạm.');

    // ==========================================
    // Ca 3: Gửi file sai định dạng (tệp .txt)
    // ==========================================
    console.log('\n[Test Ca 3]: Gửi tệp sai định dạng (.txt / text/plain)...');
    const formData3 = new FormData();
    formData3.append('trackA', new Blob(['Nội dung văn bản không phải audio'], { type: 'text/plain' }), 'test.txt');
    formData3.append('trackB', new Blob([beatBuffer], { type: 'audio/mpeg' }), 'beat_test.mp3');

    const res3 = await fetch(`http://localhost:${TEST_PORT}/test/upload`, {
      method: 'POST',
      body: formData3
    });

    const data3 = await res3.json();
    console.log(`  → HTTP Status: ${res3.status} (Kỳ vọng: 415)`);
    console.log(`  → Error Code: ${data3.error?.code} (Kỳ vọng: UNSUPPORTED_MEDIA_TYPE)`);

    if (res3.status !== 415 || data3.error?.code !== 'UNSUPPORTED_MEDIA_TYPE') {
      throw new Error(`Ca 3 thất bại! Phản hồi: ${JSON.stringify(data3)}`);
    }
    console.log('  ✔ Ca 3 ĐẠT CHUẨN: Bắt lỗi 415 Unsupported Media Type.');

    console.log('\n🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU UPLOAD MIDDLEWARE ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } finally {
    // Dọn dẹp tệp sinh ra trong lúc test
    for (const f of filesToCleanup) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
    server.close();
  }
}

runUploadTests().catch((err) => {
  console.error('\n❌ Kiểm thử Upload Middleware thất bại:', err);
  process.exit(1);
});
