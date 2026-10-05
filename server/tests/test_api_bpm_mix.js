process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiBpmMixIntegration() {
  console.log('='.repeat(70));
  console.log('  TEST SUITE: API BPM Matching & Background Worker Integration');
  console.log('='.repeat(70));

  const TEST_PORT = 5096;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let createdJobId = null;
  let outputFilePath = null;
  let uploadedFiles = [];

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const vocalFixture = path.join(fixturesDir, 'vocal_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    if (!fs.existsSync(vocalFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra server/tests/fixtures/');
    }

    // 1. Tạo multipart form data và gửi POST /api/v1/mix
    console.log('\n[BƯỚC 1] Gửi yêu cầu POST /api/v1/mix với 2 tệp Track A & Track B...');
    const formData = new FormData();
    formData.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    formData.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');

    const startTime = performance.now();
    const createRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData
    });

    const responseTimeMs = Math.round(performance.now() - startTime);
    const createBody = await createRes.json();

    console.log(`  -> Mã phản hồi HTTP: ${createRes.status} (Kỳ vọng: 202)`);
    console.log(`  -> Thời gian phản hồi: ${responseTimeMs}ms`);
    console.log(`  -> Job ID khởi tạo: ${createBody.data?.jobId}`);

    if (createRes.status !== 202 || !createBody.data?.jobId) {
      throw new Error(`Khởi tạo MixJob thất bại! HTTP Status: ${createRes.status}`);
    }

    createdJobId = createBody.data.jobId;

    // Lưu lại thông tin tệp upload để dọn dẹp sau test
    const jobInDb = await prisma.mixJob.findUnique({ where: { id: createdJobId } });
    if (jobInDb) {
      if (jobInDb.trackAPath) uploadedFiles.push(jobInDb.trackAPath);
      if (jobInDb.trackBPath) uploadedFiles.push(jobInDb.trackBPath);
    }

    // 2. Polling GET /api/v1/mix/:jobId cho đến khi SUCCESS
    console.log('\n[BƯỚC 2] Bắt đầu Polling trạng thái GET /api/v1/mix/:jobId...');
    let isComplete = false;
    let pollCount = 0;
    const maxPollAttempts = 40; // Tối đa 20 giây (mỗi lần 500ms)
    let finalJobData = null;

    while (!isComplete && pollCount < maxPollAttempts) {
      pollCount++;
      await new Promise((r) => setTimeout(r, 500));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${createdJobId}`);
      const pollBody = await pollRes.json();
      const status = pollBody.data?.status;
      const progress = pollBody.data?.progress;

      process.stdout.write(`\r  -> Lần polling #${pollCount}: Status = ${status}, Progress = ${progress}%`);

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

    console.log('\n[BƯỚC 3] Kiểm chứng phản hồi API và siêu dữ liệu Tempo...');
    console.log('  -> Cấu trúc phản hồi đầy đủ:\n', JSON.stringify(finalJobData, null, 2));

    // 3. Kiểm chứng khối dữ liệu tempo theo ARCHITECTURE.md Mục 5.2
    if (!finalJobData.tempo) {
      throw new Error('Phản hồi API thiếu khối "tempo" theo tiêu chuẩn kiến trúc!');
    }

    const { trackABpm, trackBBpm, appliedTempoRatio } = finalJobData.tempo;

    console.log(`\n  -> Track A BPM       : ${trackABpm}`);
    console.log(`  -> Track B BPM       : ${trackBBpm}`);
    console.log(`  -> Applied Ratio (r) : ${appliedTempoRatio}`);

    if (typeof trackABpm !== 'number' || trackABpm <= 0) {
      throw new Error(`trackABpm không hợp lệ: ${trackABpm}`);
    }

    if (typeof trackBBpm !== 'number' || trackBBpm <= 0) {
      throw new Error(`trackBBpm không hợp lệ: ${trackBBpm}`);
    }

    if (typeof appliedTempoRatio !== 'number' || appliedTempoRatio <= 0) {
      throw new Error(`appliedTempoRatio không hợp lệ: ${appliedTempoRatio}`);
    }

    // Kiểm tra tính nhất quán toán học: r xấp xỉ trackBBpm / trackABpm
    const expectedRatio = Number((trackBBpm / trackABpm).toFixed(3));
    const ratioDelta = Math.abs(appliedTempoRatio - expectedRatio);

    console.log(`  -> Expected Ratio    : ${expectedRatio}`);
    console.log(`  -> Delta             : ${ratioDelta.toFixed(4)}`);

    if (ratioDelta > 0.005) {
      throw new Error(`appliedTempoRatio (${appliedTempoRatio}) không khớp với tỷ lệ BPM kỳ vọng (${expectedRatio})!`);
    }

    // Kiểm tra tệp âm thanh thành phẩm
    const resultBlock = finalJobData.result;
    if (!resultBlock || !resultBlock.streamUrl || !resultBlock.downloadUrl) {
      throw new Error('Khối "result" thiếu streamUrl hoặc downloadUrl');
    }

    outputFilePath = path.resolve(__dirname, '../../server/storage/outputs', `mixed-${createdJobId}.mp3`);
    if (!fs.existsSync(outputFilePath)) {
      outputFilePath = path.resolve(__dirname, '../storage/outputs', `mixed-${createdJobId}.mp3`);
    }

    console.log('  PASS: Toàn bộ kiểm chứng nghiệp vụ Tempo Matching đạt chuẩn 100%!');

    console.log('\n' + '='.repeat(70));
    console.log('>> [DOD VERIFIED] Task 6.3 hoàn thành xuất sắc và đạt chuẩn nghiệm thu!');
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error(`\n>> [DOD FAILED] Lỗi kiểm thử: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    // Dọn dẹp tài nguyên
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // Xóa bản ghi trong database
    if (createdJobId) {
      try {
        await prisma.mixJob.delete({ where: { id: createdJobId } });
        console.log(`  [Clean up] Đã xóa bản ghi test ${createdJobId} trong SQLite.`);
      } catch (e) {
        // Bỏ qua nếu đã bị xóa
      }
    }

    // Xóa các file upload tạm
    for (const filePath of uploadedFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  [Clean up] Đã xóa file upload tạm: ${path.basename(filePath)}`);
        }
      } catch (e) {}
    }

    // Xóa file output tạm
    if (outputFilePath && fs.existsSync(outputFilePath)) {
      try {
        fs.unlinkSync(outputFilePath);
        console.log(`  [Clean up] Đã xóa file output tạm: ${path.basename(outputFilePath)}`);
      } catch (e) {}
    }

    await prisma.$disconnect();
  }
}

testApiBpmMixIntegration();
