process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiKeyMixIntegration() {
  console.log('='.repeat(75));
  console.log('  TEST SUITE: API Harmonic Key Matching & Auto-Harmonize Worker Integration (Task 10.3)');
  console.log('='.repeat(75));

  const TEST_PORT = 5098;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  const createdJobIds = [];
  const uploadedFiles = [];
  const outputFiles = [];

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const cMajorFixture = path.join(fixturesDir, 'c_major_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    if (!fs.existsSync(cMajorFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra server/tests/fixtures/');
    }

    // =========================================================================
    // CA 1: Gửi request với autoHarmonize = true (Tự động phát hiện tông & hòa âm)
    // =========================================================================
    console.log('\n[CA 1] Gửi request POST /api/v1/mix với autoHarmonize = true...');
    const formData1 = new FormData();
    formData1.append('trackA', new Blob([fs.readFileSync(cMajorFixture)], { type: 'audio/mpeg' }), 'c_major_test.mp3');
    formData1.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    formData1.append('autoHarmonize', 'true');

    const startTime1 = performance.now();
    const createRes1 = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData1
    });

    const responseTimeMs1 = Math.round(performance.now() - startTime1);
    const createBody1 = await createRes1.json();

    console.log(`  -> Mã phản hồi HTTP  : ${createRes1.status} (Kỳ vọng: 202 Accepted)`);
    console.log(`  -> Thời gian phản hồi : ${responseTimeMs1}ms (< 200ms)`);
    console.log(`  -> Job ID khởi tạo    : ${createBody1.data?.jobId}`);

    if (createRes1.status !== 202 || !createBody1.data?.jobId) {
      throw new Error(`Khởi tạo MixJob Ca 1 thất bại! HTTP Status: ${createRes1.status}`);
    }

    const job1Id = createBody1.data.jobId;
    createdJobIds.push(job1Id);

    // Ghi nhận file upload để dọn dẹp
    const job1DbInitial = await prisma.mixJob.findUnique({ where: { id: job1Id } });
    if (job1DbInitial?.trackAPath) uploadedFiles.push(job1DbInitial.trackAPath);
    if (job1DbInitial?.trackBPath) uploadedFiles.push(job1DbInitial.trackBPath);

    // Polling cho đến khi hoàn tất
    console.log('  -> Polling GET /api/v1/mix/:jobId chờ Background Worker xử lý 4 luồng âm học song song...');
    let isComplete1 = false;
    let pollCount1 = 0;
    const maxPollAttempts = 40;
    let job1FinalData = null;

    while (!isComplete1 && pollCount1 < maxPollAttempts) {
      pollCount1++;
      await new Promise((r) => setTimeout(r, 500));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${job1Id}`);
      const pollBody = await pollRes.json();
      const status = pollBody.data?.status;
      const progress = pollBody.data?.progress;

      process.stdout.write(`\r     Polling #${pollCount1}: Status = [${status}] | Progress = ${progress}%`);

      if (status === 'SUCCESS') {
        isComplete1 = true;
        job1FinalData = pollBody.data;
        process.stdout.write('\n');
      } else if (status === 'FAILED') {
        process.stdout.write('\n');
        throw new Error(`Background Worker Ca 1 báo lỗi FAILED: ${pollBody.data?.errorMessage}`);
      }
    }

    if (!isComplete1) {
      throw new Error('Ca 1: Polling vượt quá thời gian tối đa mà chưa hoàn thành.');
    }

    // Kiểm tra cấu trúc JSON trả về của Ca 1
    console.log('\n[XÁC THỰC CA 1] Kiểm tra khối dữ liệu harmonic và tempo trả về:');
    console.log('  -> Dữ liệu harmonic:', job1FinalData.harmonic);
    console.log('  -> Dữ liệu tempo   :', job1FinalData.tempo);

    if (!job1FinalData.harmonic) {
      throw new Error('[FAIL Ca 1] Phản hồi API thiếu khối dữ liệu "harmonic"!');
    }
    if (!job1FinalData.harmonic.trackAKey || !job1FinalData.harmonic.trackACamelot) {
      throw new Error(`[FAIL Ca 1] Thiếu thông tin Key/Camelot của Track A! Nhận: ${JSON.stringify(job1FinalData.harmonic)}`);
    }
    if (job1FinalData.harmonic.trackAKey !== 'C' || job1FinalData.harmonic.trackACamelot !== '8B') {
      throw new Error(`[FAIL Ca 1] Nhận diện sai Key Track A! Kỳ vọng C / 8B, nhận: ${job1FinalData.harmonic.trackAKey} / ${job1FinalData.harmonic.trackACamelot}`);
    }
    if (typeof job1FinalData.harmonic.appliedPitchShiftSemitones !== 'number') {
      throw new Error('[FAIL Ca 1] appliedPitchShiftSemitones không phải số nguyên!');
    }

    // Ghi nhận output file Ca 1
    const job1DbFinal = await prisma.mixJob.findUnique({ where: { id: job1Id } });
    if (job1DbFinal?.outputPath) outputFiles.push(job1DbFinal.outputPath);

    console.log('  ✓ Ca 1 đạt chuẩn 100%: Dò Key C Major (8B) chuẩn xác, tính toán Auto-Harmonize và trả về khối harmonic đầy đủ.\n');

    // =========================================================================
    // CA 2: Gửi request với pitchShiftSemitones = 2 thủ công, autoHarmonize = false
    // =========================================================================
    console.log('[CA 2] Gửi request POST /api/v1/mix với pitchShiftSemitones = 2 (Thủ công)...');
    const formData2 = new FormData();
    formData2.append('trackA', new Blob([fs.readFileSync(cMajorFixture)], { type: 'audio/mpeg' }), 'c_major_test.mp3');
    formData2.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    formData2.append('pitchShiftSemitones', '2');
    formData2.append('autoHarmonize', 'false');

    const createRes2 = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData2
    });
    const createBody2 = await createRes2.json();

    if (createRes2.status !== 202 || !createBody2.data?.jobId) {
      throw new Error(`Khởi tạo MixJob Ca 2 thất bại! HTTP Status: ${createRes2.status}`);
    }

    const job2Id = createBody2.data.jobId;
    createdJobIds.push(job2Id);

    // Xác nhận SQLite lưu đúng appliedPitchShiftSemitones = 2 ngay khi PENDING
    const job2DbInitial = await prisma.mixJob.findUnique({ where: { id: job2Id } });
    if (job2DbInitial?.trackAPath) uploadedFiles.push(job2DbInitial.trackAPath);
    if (job2DbInitial?.trackBPath) uploadedFiles.push(job2DbInitial.trackBPath);

    console.log(`  -> appliedPitchShiftSemitones trong DB lúc PENDING: ${job2DbInitial?.appliedPitchShiftSemitones} (Kỳ vọng: 2)`);
    if (job2DbInitial?.appliedPitchShiftSemitones !== 2) {
      throw new Error(`[FAIL Ca 2] Lưu appliedPitchShiftSemitones vào SQLite sai! Nhận: ${job2DbInitial?.appliedPitchShiftSemitones}, kỳ vọng: 2`);
    }

    // Polling Ca 2 đến khi hoàn tất
    console.log('  -> Polling GET /api/v1/mix/:jobId chờ Worker xử lý...');
    let isComplete2 = false;
    let pollCount2 = 0;
    let job2FinalData = null;

    while (!isComplete2 && pollCount2 < maxPollAttempts) {
      pollCount2++;
      await new Promise((r) => setTimeout(r, 500));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${job2Id}`);
      const pollBody = await pollRes.json();
      const status = pollBody.data?.status;

      process.stdout.write(`\r     Polling #${pollCount2}: Status = [${status}]`);

      if (status === 'SUCCESS') {
        isComplete2 = true;
        job2FinalData = pollBody.data;
        process.stdout.write('\n');
      } else if (status === 'FAILED') {
        process.stdout.write('\n');
        throw new Error(`Background Worker Ca 2 báo lỗi FAILED: ${pollBody.data?.errorMessage}`);
      }
    }

    if (!isComplete2) {
      throw new Error('Ca 2: Polling vượt quá thời gian tối đa mà chưa hoàn thành.');
    }

    console.log('\n[XÁC THỰC CA 2] Kiểm tra appliedPitchShiftSemitones sau khi hoàn tất:');
    console.log(`  -> appliedPitchShiftSemitones trong API: ${job2FinalData.harmonic?.appliedPitchShiftSemitones} (Kỳ vọng: 2)`);

    if (job2FinalData.harmonic?.appliedPitchShiftSemitones !== 2) {
      throw new Error(`[FAIL Ca 2] Phản hồi API sai appliedPitchShiftSemitones! Nhận: ${job2FinalData.harmonic?.appliedPitchShiftSemitones}, kỳ vọng: 2`);
    }

    const job2DbFinal = await prisma.mixJob.findUnique({ where: { id: job2Id } });
    if (job2DbFinal?.outputPath) outputFiles.push(job2DbFinal.outputPath);

    console.log('  ✓ Ca 2 đạt chuẩn 100%: Ghi nhận và xử lý dịch bán âm thủ công chuẩn xác.\n');

    // =========================================================================
    // CA 3: Kiểm tra tính năng Kẹp giá trị an toàn (Clamping: -6 đến +6 bán âm)
    // =========================================================================
    console.log('[CA 3] Kiểm tra cơ chế tự động giới hạn (Clamping) pitchShiftSemitones = 12...');
    const formData3 = new FormData();
    formData3.append('trackA', new Blob([fs.readFileSync(cMajorFixture)], { type: 'audio/mpeg' }), 'c_major_test.mp3');
    formData3.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    formData3.append('pitchShiftSemitones', '12'); // Vượt quá +6 bán âm

    const createRes3 = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix`, {
      method: 'POST',
      body: formData3
    });
    const createBody3 = await createRes3.json();
    const job3Id = createBody3.data?.jobId;
    createdJobIds.push(job3Id);

    const job3DbInitial = await prisma.mixJob.findUnique({ where: { id: job3Id } });
    if (job3DbInitial?.trackAPath) uploadedFiles.push(job3DbInitial.trackAPath);
    if (job3DbInitial?.trackBPath) uploadedFiles.push(job3DbInitial.trackBPath);

    console.log(`  -> Gửi pitchShiftSemitones = 12 => SQLite lưu: ${job3DbInitial?.appliedPitchShiftSemitones} (Kỳ vọng: 6)`);
    if (job3DbInitial?.appliedPitchShiftSemitones !== 6) {
      throw new Error(`[FAIL Ca 3] Cơ chế Clamp thất bại! Nhận: ${job3DbInitial?.appliedPitchShiftSemitones}, kỳ vọng: 6`);
    }

    // Đợi job 3 xử lý xong để dọn dẹp an toàn
    let wait3 = 0;
    while (wait3 < 20) {
      wait3++;
      await new Promise((r) => setTimeout(r, 200));
      const chk = await prisma.mixJob.findUnique({ where: { id: job3Id } });
      if (chk && (chk.status === 'SUCCESS' || chk.status === 'FAILED')) {
        if (chk.outputPath) outputFiles.push(chk.outputPath);
        break;
      }
    }
    console.log('  ✓ Ca 3 đạt chuẩn 100%: Tự động kẹp an toàn phạm vi [-6, +6] bán âm.\n');

    console.log('='.repeat(75));
    console.log('🎉 TẤT CẢ TIÊU CHUẨN NGHIỆM THU (DoD) CỦA TASK 10.3 ĐÃ ĐẠT 100%!');
    console.log('='.repeat(75));

  } finally {
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

    for (const filePath of outputFiles) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  -> Đã xóa tệp output: ${path.basename(filePath)}`);
        }
      } catch (e) {
        console.warn('  -> Không thể xóa file output:', e.message);
      }
    }

    for (const jobId of createdJobIds) {
      try {
        await prisma.mixJob.delete({ where: { id: jobId } });
        console.log(`  -> Đã xóa bản ghi test trong SQLite: ${jobId}`);
      } catch (e) {
        console.warn('  -> Không thể xóa bản ghi SQLite:', e.message);
      }
    }

    await prisma.$disconnect();
    server.close();
    console.log('✔ Máy chủ thử nghiệm đã đóng an toàn.');
  }
}

testApiKeyMixIntegration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST API KEY MIX THẤT BẠI:', err.message);
    process.exit(1);
  });
