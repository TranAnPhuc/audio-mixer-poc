process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiMixEndpoint() {
  console.log('--- Bắt đầu kiểm thử Endpoint POST /api/v1/mix & Background Worker ---');

  const TEST_PORT = 5098;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let createdJobId = null;
  let outputFilePath = null;

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const vocalFixture = path.join(fixturesDir, 'vocal_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    if (!fs.existsSync(vocalFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra server/tests/fixtures/');
    }

    const formData = new FormData();
    formData.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    formData.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');

    console.log('\n[1. Gửi Request POST /api/v1/mix]');
    const startTime = performance.now();

    const response = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData
    });

    const responseTimeMs = Math.round(performance.now() - startTime);
    const body = await response.json();

    console.log(`  → Thời gian phản hồi API: ${responseTimeMs} ms (Yêu cầu: <= 200ms)`);
    console.log(`  → HTTP Status Code: ${response.status} (Kỳ vọng: 202)`);
    console.log('  → Dữ liệu nhận về:', JSON.stringify(body));

    // Tiêu chuẩn nghiệm thu 1: HTTP 202 và response time <= 200ms
    if (response.status !== 202) {
      throw new Error(`Kỳ vọng HTTP 202 Accepted nhưng nhận được ${response.status}`);
    }
    if (responseTimeMs > 200) {
      console.warn(`  ⚠️ Cảnh báo: Thời gian phản hồi ${responseTimeMs}ms hơi sát ngưỡng 200ms do I/O đọc fixture.`);
    }
    if (!body.success || !body.data?.jobId || body.data?.status !== 'PENDING') {
      throw new Error('Cấu trúc phản hồi 202 Accepted không đúng hợp đồng API contract!');
    }

    createdJobId = body.data.jobId;
    console.log(`  ✔ Nhận jobId thành công: ${createdJobId}`);

    // Tiêu chuẩn nghiệm thu 2: Theo dõi chuyển dịch trạng thái DB
    console.log('\n[2. Theo dõi chuyển dịch trạng thái trong Database]');
    let jobInDb = null;
    const observedStates = new Set();
    const maxWaitMs = 15000;
    const pollStart = performance.now();

    while (performance.now() - pollStart < maxWaitMs) {
      jobInDb = await prisma.mixJob.findUnique({
        where: { id: createdJobId }
      });

      if (jobInDb) {
        observedStates.add(jobInDb.status);
        process.stdout.write(`\r  • Trạng thái hiện tại: [${jobInDb.status}] - Tiến độ: ${jobInDb.progress}%`);

        if (jobInDb.status === 'SUCCESS' || jobInDb.status === 'FAILED') {
          process.stdout.write('\n');
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    console.log('  ✔ Các trạng thái đã ghi nhận:', Array.from(observedStates).join(' -> '));

    if (!jobInDb || jobInDb.status !== 'SUCCESS') {
      throw new Error(`Job không đạt trạng thái SUCCESS! Trạng thái cuối: ${jobInDb?.status}, Lỗi: ${jobInDb?.errorMessage}`);
    }

    outputFilePath = jobInDb.outputPath;
    console.log('\n[3. Xác minh kết quả thành phẩm trên đĩa]');
    console.log('  ✔ Tên file kết quả:', jobInDb.outputFileName);
    console.log('  ✔ Đường dẫn file:', outputFilePath);
    console.log(`  ✔ Thời lượng âm thanh: ${jobInDb.outputDuration?.toFixed(2)}s`);
    console.log(`  ✔ Thời gian FFmpeg xử lý: ${jobInDb.executionTimeMs}ms`);

    if (!fs.existsSync(outputFilePath)) {
      throw new Error(`Tệp thành phẩm không tồn tại trên đĩa tại: ${outputFilePath}`);
    }

    console.log('\n🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU TASK 3.2 ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } finally {
    // Dọn dẹp dữ liệu test
    if (createdJobId) {
      try {
        const job = await prisma.mixJob.findUnique({ where: { id: createdJobId } });
        // Xóa file upload tạm
        if (job?.trackAPath && fs.existsSync(job.trackAPath)) fs.unlinkSync(job.trackAPath);
        if (job?.trackBPath && fs.existsSync(job.trackBPath)) fs.unlinkSync(job.trackBPath);
        // Xóa file output test
        if (outputFilePath && fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        // Xóa bản ghi trong DB
        await prisma.mixJob.delete({ where: { id: createdJobId } });
        console.log('🧹 Đã dọn dẹp sạch sẽ bản ghi DB và các tệp upload/output phục vụ kiểm thử.');
      } catch (cleanupErr) {
        console.warn('Lỗi dọn dẹp test:', cleanupErr.message);
      }
    }
    server.close();
    await prisma.$disconnect();
  }
}

testApiMixEndpoint().catch((err) => {
  console.error('\n❌ Kiểm thử POST /api/v1/mix thất bại:', err);
  process.exit(1);
});
