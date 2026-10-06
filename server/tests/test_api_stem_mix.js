process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiStemMixIntegration() {
  console.log('='.repeat(75));
  console.log('  TEST SUITE: API AI Stem Separation Pipeline Integration (Task 11.2)');
  console.log('='.repeat(75));

  const TEST_PORT = 5099;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  const createdJobIds = [];
  const uploadedFiles = [];
  const outputFiles = [];
  const stemDirs = [];

  try {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const vocalFixture = path.join(fixturesDir, 'c_major_test.mp3');
    const beatFixture = path.join(fixturesDir, 'beat_test.mp3');

    if (!fs.existsSync(vocalFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra server/tests/fixtures/');
    }

    // =========================================================================
    // CA 1: Gửi request với enableStemSeparation = true (Kích hoạt AI Stem Separation)
    // =========================================================================
    console.log('\n[CA 1] Gửi request POST /api/v1/mix với enableStemSeparation = true...');
    const formData1 = new FormData();
    formData1.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'c_major_test.mp3');
    formData1.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');
    formData1.append('enableStemSeparation', 'true');
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
    console.log('  -> Polling GET /api/v1/mix/:jobId chờ Background Worker bóc tách stem và phối âm...');
    let isComplete1 = false;
    let pollCount1 = 0;
    const maxPollAttempts = 50;
    let job1FinalData = null;

    while (!isComplete1 && pollCount1 < maxPollAttempts) {
      pollCount1++;
      await new Promise((r) => setTimeout(r, 600));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${job1Id}`);
      const pollBody = await pollRes.json();

      if (pollBody.success && pollBody.data) {
        const { status, progress } = pollBody.data;
        process.stdout.write(`\r  -> Lần thăm dò ${pollCount1}: Trạng thái = ${status}, Tiến độ = ${progress}%`);

        if (status === 'SUCCESS') {
          isComplete1 = true;
          job1FinalData = pollBody.data;
          console.log('\n  -> Tác vụ đã hoàn tất thành công 100%!');
        } else if (status === 'FAILED') {
          throw new Error(`Tác vụ thất bại với lỗi: ${pollBody.data.errorMessage}`);
        }
      }
    }

    if (!isComplete1 || !job1FinalData) {
      throw new Error(`Quá thời gian chờ (Timeout) sau ${maxPollAttempts} lần polling!`);
    }

    // Xác thực cấu trúc phản hồi API Ca 1
    console.log('  -> Xác thực siêu dữ liệu phản hồi API Ca 1:');
    console.log('     + stems.enabled           :', job1FinalData.stems?.enabled);
    console.log('     + stems.separationTimeMs  :', job1FinalData.stems?.separationTimeMs, 'ms');
    console.log('     + tempo.trackABpm         :', job1FinalData.tempo?.trackABpm);
    console.log('     + harmonic.trackAKey      :', job1FinalData.harmonic?.trackAKey);
    console.log('     + result.duration         :', job1FinalData.result?.duration, 's');

    if (job1FinalData.stems?.enabled !== true) {
      throw new Error('API Ca 1: stems.enabled phải là true');
    }
    if (typeof job1FinalData.stems?.separationTimeMs !== 'number' || job1FinalData.stems.separationTimeMs <= 0) {
      throw new Error('API Ca 1: stems.separationTimeMs phải là số nguyên dương hợp lệ');
    }

    // Xác thực trực tiếp từ cơ sở dữ liệu SQLite
    const job1DbFinal = await prisma.mixJob.findUnique({ where: { id: job1Id } });
    if (job1DbFinal.outputPath) outputFiles.push(job1DbFinal.outputPath);

    const jobStemDir1 = path.resolve(__dirname, '../../server/storage/stems', job1Id);
    stemDirs.push(jobStemDir1);

    console.log('  -> Xác thực dữ liệu lưu trong SQLite:');
    console.log('     + enableStemSeparation    :', job1DbFinal.enableStemSeparation);
    console.log('     + trackAStemPath          :', job1DbFinal.trackAStemPath ? path.basename(job1DbFinal.trackAStemPath) : 'null');
    console.log('     + trackBStemPath          :', job1DbFinal.trackBStemPath ? path.basename(job1DbFinal.trackBStemPath) : 'null');
    console.log('     + stemSeparationTimeMs    :', job1DbFinal.stemSeparationTimeMs, 'ms');

    if (job1DbFinal.enableStemSeparation !== true) {
      throw new Error('Database Ca 1: enableStemSeparation phải là true');
    }
    if (!job1DbFinal.trackAStemPath || !fs.existsSync(job1DbFinal.trackAStemPath)) {
      throw new Error(`Database Ca 1: trackAStemPath không tồn tại trên đĩa (${job1DbFinal.trackAStemPath})`);
    }
    if (!job1DbFinal.trackBStemPath || !fs.existsSync(job1DbFinal.trackBStemPath)) {
      throw new Error(`Database Ca 1: trackBStemPath không tồn tại trên đĩa (${job1DbFinal.trackBStemPath})`);
    }
    console.log('  ✓ Ca 1 đạt chuẩn 100%: Pipeline bóc tách thân âm AI và lưu trữ thành công.');

    // =========================================================================
    // CA 2: Gửi request không truyền enableStemSeparation (Mặc định: false)
    // =========================================================================
    console.log('\n[CA 2] Gửi request POST /api/v1/mix với enableStemSeparation = false (Mặc định)...');
    const formData2 = new FormData();
    formData2.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'c_major_test.mp3');
    formData2.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');

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

    const job2DbInitial = await prisma.mixJob.findUnique({ where: { id: job2Id } });
    if (job2DbInitial?.trackAPath) uploadedFiles.push(job2DbInitial.trackAPath);
    if (job2DbInitial?.trackBPath) uploadedFiles.push(job2DbInitial.trackBPath);

    console.log('  -> Polling GET /api/v1/mix/:jobId chờ Worker hoàn tất (Bỏ qua tách stem)...');
    let isComplete2 = false;
    let pollCount2 = 0;
    let job2FinalData = null;

    while (!isComplete2 && pollCount2 < maxPollAttempts) {
      pollCount2++;
      await new Promise((r) => setTimeout(r, 500));

      const pollRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${job2Id}`);
      const pollBody = await pollRes.json();

      if (pollBody.success && pollBody.data) {
        if (pollBody.data.status === 'SUCCESS') {
          isComplete2 = true;
          job2FinalData = pollBody.data;
        } else if (pollBody.data.status === 'FAILED') {
          throw new Error(`Tác vụ Ca 2 thất bại: ${pollBody.data.errorMessage}`);
        }
      }
    }

    if (!isComplete2 || !job2FinalData) {
      throw new Error(`Quá thời gian chờ (Timeout) Ca 2!`);
    }

    console.log('  -> Xác thực siêu dữ liệu phản hồi API Ca 2:');
    console.log('     + stems.enabled           :', job2FinalData.stems?.enabled);
    console.log('     + stems.separationTimeMs  :', job2FinalData.stems?.separationTimeMs);

    if (job2FinalData.stems?.enabled !== false) {
      throw new Error('API Ca 2: stems.enabled phải là false');
    }
    if (job2FinalData.stems?.separationTimeMs !== null) {
      throw new Error('API Ca 2: stems.separationTimeMs phải là null');
    }

    const job2DbFinal = await prisma.mixJob.findUnique({ where: { id: job2Id } });
    if (job2DbFinal.outputPath) outputFiles.push(job2DbFinal.outputPath);

    if (job2DbFinal.enableStemSeparation !== false) {
      throw new Error('Database Ca 2: enableStemSeparation phải là false');
    }
    if (job2DbFinal.trackAStemPath !== null || job2DbFinal.trackBStemPath !== null) {
      throw new Error('Database Ca 2: trackAStemPath và trackBStemPath phải là null');
    }
    console.log('  ✓ Ca 2 đạt chuẩn 100%: Worker bỏ qua tách stem khi cờ tắt, tối ưu thời gian xử lý.');

    console.log('\n' + '='.repeat(75));
    console.log('🎉 TẤT CẢ TIÊU CHUẨN NGHIỆM THU (DoD) CỦA TASK 11.2 ĐÃ ĐẠT 100%!');
    console.log('='.repeat(75) + '\n');
  } finally {
    console.log('[DỌN DẸP] Đang xóa các tệp và bản ghi thử nghiệm...');
    for (const f of uploadedFiles) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); console.log(`  -> Đã xóa tệp upload: ${path.basename(f)}`); } catch { /* ignore */ }
      }
    }
    for (const f of outputFiles) {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); console.log(`  -> Đã xóa tệp output: ${path.basename(f)}`); } catch { /* ignore */ }
      }
    }
    for (const d of stemDirs) {
      if (fs.existsSync(d)) {
        try { fs.rmSync(d, { recursive: true, force: true }); console.log(`  -> Đã xóa thư mục stem: ${path.basename(d)}`); } catch { /* ignore */ }
      }
    }
    for (const id of createdJobIds) {
      try {
        await prisma.mixJob.delete({ where: { id } });
        console.log(`  -> Đã xóa bản ghi test trong SQLite: ${id}`);
      } catch { /* ignore */ }
    }

    await new Promise((resolve) => server.close(resolve));
    console.log('✔ Máy chủ thử nghiệm đã đóng an toàn.');
  }
}

testApiStemMixIntegration().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
