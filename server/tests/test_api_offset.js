process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiOffsetIntegration() {
  console.log('='.repeat(75));
  console.log('  TEST SUITE: API Vocal Offset Alignment & Background Worker Integration');
  console.log('='.repeat(75));

  const TEST_PORT = 5097;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let createdJobId = null;
  let uploadedFiles = [];
  let outputFilePath = null;

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const vocalFixture = path.join(fixturesDir, 'vocal_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    if (!fs.existsSync(vocalFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra server/tests/fixtures/');
    }

    // 1. Tạo multipart form data có kèm vocalOffsetMs: 500
    console.log('\n[BƯỚC 1] Gửi request POST /api/v1/mix với vocalOffsetMs = 500...');
    const formData = new FormData();
    formData.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    formData.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    formData.append('vocalOffsetMs', '500');

    const startTime = performance.now();
    const createRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData
    });

    const responseTimeMs = Math.round(performance.now() - startTime);
    const createBody = await createRes.json();

    console.log(`  -> Mã phản hồi HTTP  : ${createRes.status} (Kỳ vọng: 202 Accepted)`);
    console.log(`  -> Thời gian phản hồi : ${responseTimeMs}ms`);
    console.log(`  -> Job ID khởi tạo    : ${createBody.data?.jobId}`);

    if (createRes.status !== 202 || !createBody.data?.jobId) {
      throw new Error(`Khởi tạo MixJob thất bại! HTTP Status: ${createRes.status}`);
    }

    createdJobId = createBody.data.jobId;

    // 2. Kiểm tra bản ghi trong SQLite ngay sau khi tạo
    console.log('\n[BƯỚC 2] Kiểm tra cơ sở dữ liệu SQLite: Xác minh trường vocalOffsetMs được lưu...');
    const initialJobInDb = await prisma.mixJob.findUnique({ where: { id: createdJobId } });
    
    if (!initialJobInDb) {
      throw new Error(`Không tìm thấy bản ghi trong SQLite với ID: ${createdJobId}`);
    }

    console.log(`  -> Trạng thái ban đầu  : [${initialJobInDb.status}]`);
    console.log(`  -> vocalOffsetMs trong DB: ${initialJobInDb.vocalOffsetMs} (Kỳ vọng: 500)`);

    if (initialJobInDb.vocalOffsetMs !== 500) {
      throw new Error(`Lưu vocalOffsetMs vào SQLite sai! Nhận được: ${initialJobInDb.vocalOffsetMs}, kỳ vọng: 500`);
    }

    if (initialJobInDb.trackAPath) uploadedFiles.push(initialJobInDb.trackAPath);
    if (initialJobInDb.trackBPath) uploadedFiles.push(initialJobInDb.trackBPath);

    // 3. Polling trạng thái GET /api/v1/mix/:jobId cho đến khi SUCCESS
    console.log('\n[BƯỚC 3] Polling GET /api/v1/mix/:jobId chờ Background Worker xử lý...');
    let isComplete = false;
    let pollCount = 0;
    const maxPollAttempts = 40; // 20 giây tối đa
    let finalJobData = null;

    while (!isComplete && pollCount < maxPollAttempts) {
      pollCount++;
      await new Promise((r) => setTimeout(r, 500));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${createdJobId}`);
      const pollBody = await pollRes.json();
      const status = pollBody.data?.status;
      const progress = pollBody.data?.progress;

      process.stdout.write(`\r  -> Lần polling #${pollCount}: Status = [${status}] | Progress = ${progress}%`);

      if (status === 'SUCCESS') {
        isComplete = true;
        finalJobData = pollBody.data;
        process.stdout.write('\n');
      } else if (status === 'FAILED') {
        process.stdout.write('\n');
        throw new Error(`Background Worker báo lỗi FAILED: ${pollBody.data?.errorMessage}`);
      }
    }

    if (!isComplete) {
      throw new Error('Polling vượt quá thời gian tối đa mà chưa hoàn thành.');
    }

    // 4. Kiểm chứng cấu trúc JSON phản hồi khi SUCCESS
    console.log('\n[BƯỚC 4] Xác minh cấu trúc JSON phản hồi (ARCHITECTURE.md Mục 5.2)...');
    console.log(`  -> vocalOffsetMs trả về: ${finalJobData.vocalOffsetMs} (Kỳ vọng: 500)`);
    console.log(`  -> Tempo metadata      : TrackA=${finalJobData.tempo?.trackABpm} BPM, TrackB=${finalJobData.tempo?.trackBBpm} BPM`);
    console.log(`  -> Stream URL          : ${finalJobData.result?.streamUrl}`);
    console.log(`  -> Download URL        : ${finalJobData.result?.downloadUrl}`);
    console.log(`  -> Duration            : ${finalJobData.result?.duration}s`);

    if (finalJobData.vocalOffsetMs !== 500) {
      throw new Error(`Endpoint GET không trả về đúng vocalOffsetMs: ${finalJobData.vocalOffsetMs}`);
    }

    if (!finalJobData.tempo || typeof finalJobData.tempo.appliedTempoRatio !== 'number') {
      throw new Error('Thiếu hoặc sai dữ liệu tempo trong phản hồi SUCCESS!');
    }

    if (!finalJobData.result?.streamUrl || !finalJobData.result?.downloadUrl) {
      throw new Error('Thiếu streamUrl hoặc downloadUrl trong phản hồi!');
    }

    // Ghi nhận đường dẫn output để dọn dẹp
    const finishedJobInDb = await prisma.mixJob.findUnique({ where: { id: createdJobId } });
    if (finishedJobInDb?.outputPath) {
      outputFilePath = finishedJobInDb.outputPath;
    }

    // 5. Kiểm tra tính năng kẹp giá trị biên an toàn (Clamp Validation: -3000 -> +3000)
    console.log('\n[BƯỚC 5] Kiểm tra cơ chế tự động giới hạn (Clamping) giá trị vượt ngưỡng...');
    const clampFormData = new FormData();
    clampFormData.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    clampFormData.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    clampFormData.append('vocalOffsetMs', '9999'); // Vượt quá +3000ms

    const clampRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: clampFormData
    });
    const clampBody = await clampRes.json();
    const clampJobId = clampBody.data?.jobId;

    const clampJobInDb = await prisma.mixJob.findUnique({ where: { id: clampJobId } });
    console.log(`  -> Gửi vocalOffsetMs = 9999ms => SQLite lưu: ${clampJobInDb?.vocalOffsetMs} (Kỳ vọng: 3000)`);

    if (clampJobInDb?.vocalOffsetMs !== 3000) {
      throw new Error(`Cơ chế Clamp thất bại! Nhận: ${clampJobInDb?.vocalOffsetMs}, kỳ vọng: 3000`);
    }

    // Chờ clamp job hoàn tất để background worker không bị ngắt quãng
    let clampFinished = false;
    let clampWaitCount = 0;
    while (!clampFinished && clampWaitCount < 20) {
      clampWaitCount++;
      await new Promise((r) => setTimeout(r, 200));
      const check = await prisma.mixJob.findUnique({ where: { id: clampJobId } });
      if (check && (check.status === 'SUCCESS' || check.status === 'FAILED')) {
        clampFinished = true;
        if (check.outputPath && fs.existsSync(check.outputPath)) {
          fs.unlinkSync(check.outputPath);
        }
      }
    }

    // Dọn dẹp clamp job
    if (clampJobInDb?.trackAPath && fs.existsSync(clampJobInDb.trackAPath)) fs.unlinkSync(clampJobInDb.trackAPath);
    if (clampJobInDb?.trackBPath && fs.existsSync(clampJobInDb.trackBPath)) fs.unlinkSync(clampJobInDb.trackBPath);
    await prisma.mixJob.delete({ where: { id: clampJobId } });

    console.log('\n' + '='.repeat(75));
    console.log('🎉 TẤT CẢ TIÊU CHUẨN NGHIỆM THU (DoD) CỦA TASK 7.2 ĐÃ ĐẠT 100%!');
    console.log('='.repeat(75));

  } finally {
    // Dọn dẹp tài nguyên test
    console.log('\n[DỌN DẸP] Đang xóa các tệp và bản ghi thử nghiệm...');
    for (const filePath of uploadedFiles) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  -> Đã xóa tệp upload: ${path.basename(filePath)}`);
        }
      } catch (e) {
        console.warn('  -> Không thể xóa file upload:', e.message);
      }
    }

    try {
      if (outputFilePath && fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
        console.log(`  -> Đã xóa tệp output: ${path.basename(outputFilePath)}`);
      }
    } catch (e) {
      console.warn('  -> Không thể xóa file output:', e.message);
    }

    if (createdJobId) {
      try {
        await prisma.mixJob.delete({ where: { id: createdJobId } });
        console.log(`  -> Đã xóa bản ghi test trong SQLite: ${createdJobId}`);
      } catch (e) {
        console.warn('  -> Không thể xóa bản ghi SQLite:', e.message);
      }
    }

    await prisma.$disconnect();
    server.close();
    console.log('✔ Máy chủ thử nghiệm đã đóng an toàn.');
  }
}

testApiOffsetIntegration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST API OFFSET THẤT BẠI:', err.message);
    process.exit(1);
  });
