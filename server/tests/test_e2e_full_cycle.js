process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { app } from '../src/app.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runFullCycleE2ETest() {
  console.log('================================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TÍCH HỢP ĐẦU-CUỐI TOÀN DIỆN (FULL-CYCLE E2E TEST)');
  console.log('================================================================================\n');

  const TEST_PORT = 5096;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  // 0. Khởi động server trên cổng kiểm thử
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let createdJobId = null;
  let outputFilePath = null;
  let uploadedFiles = [];

  try {
    // -------------------------------------------------------------
    // Bước 1: Kiểm tra sức khỏe hệ thống (Liveness Probe)
    // -------------------------------------------------------------
    console.log('[Bước 1/5]: Kiểm tra trạng thái máy chủ (GET /health)...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();

    console.log(`  → HTTP Status: ${healthRes.status} (Kỳ vọng: 200)`);
    console.log(`  → Phản hồi:`, JSON.stringify(healthData));

    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Bước 1 Thất bại: Máy chủ không phản hồi trạng thái OK tại /health');
    }
    console.log('  ✔ Bước 1 HOÀN TẤT: Server Express và môi trường vận hành hoàn toàn ổn định.\n');

    // -------------------------------------------------------------
    // Bước 2: Tải lên 2 tệp âm thanh và khởi tạo tác vụ (POST /api/v1/mix)
    // -------------------------------------------------------------
    console.log('[Bước 2/5]: Tải lên 2 track (Vocal & Beat) khởi tạo tác vụ (POST /api/v1/mix)...');
    const vocalFixture = path.resolve(__dirname, 'fixtures/vocal_test.mp3');
    const beatFixture = path.resolve(__dirname, 'fixtures/beat_test.mp3');

    if (!fs.existsSync(vocalFixture) || !fs.existsSync(beatFixture)) {
      throw new Error('Bước 2 Thất bại: Không tìm thấy tệp fixture mẫu!');
    }

    const formData = new FormData();
    formData.append('trackA', new Blob([fs.readFileSync(vocalFixture)], { type: 'audio/mpeg' }), 'vocal_test.mp3');
    formData.append('trackB', new Blob([fs.readFileSync(beatFixture)], { type: 'audio/mpeg' }), 'beat_test.mp3');

    const postStart = performance.now();
    const mixPostRes = await fetch(`${BASE_URL}/api/v1/mix`, {
      method: 'POST',
      body: formData
    });
    const postTimeMs = Math.round(performance.now() - postStart);
    const mixPostData = await mixPostRes.json();

    console.log(`  → Thời gian phản hồi: ${postTimeMs}ms (Tiêu chuẩn: <= 200ms)`);
    console.log(`  → HTTP Status: ${mixPostRes.status} (Kỳ vọng: 202)`);
    console.log(`  → Dữ liệu nhận về:`, JSON.stringify(mixPostData));

    if (mixPostRes.status !== 202 || !mixPostData.success || !mixPostData.data?.jobId) {
      throw new Error('Bước 2 Thất bại: Không nhận được mã 202 Accepted hoặc thiếu jobId');
    }

    createdJobId = mixPostData.data.jobId;
    console.log(`  ✔ Bước 2 HOÀN TẤT: Tiếp nhận tệp thành công, Job ID: ${createdJobId}\n`);

    // -------------------------------------------------------------
    // Bước 3: Polling theo dõi trạng thái đến khi SUCCESS (GET /api/v1/mix/:jobId)
    // -------------------------------------------------------------
    console.log('[Bước 3/5]: Polling trạng thái tiến trình phối âm (GET /api/v1/mix/:jobId)...');
    let jobResultData = null;
    const maxPollingTimeoutMs = 25000;
    const pollingStart = performance.now();
    let pollCount = 0;

    while (performance.now() - pollingStart < maxPollingTimeoutMs) {
      pollCount++;
      const pollRes = await fetch(`${BASE_URL}/api/v1/mix/${createdJobId}`);
      const pollData = await pollRes.json();

      if (pollData.success && pollData.data) {
        const { status, progress } = pollData.data;
        process.stdout.write(`\r  • Lần thăm dò #${pollCount}: Trạng thái = [${status}] | Tiến độ = ${progress}%`);

        if (status === 'SUCCESS') {
          jobResultData = pollData.data;
          process.stdout.write('\n');
          break;
        }

        if (status === 'FAILED') {
          process.stdout.write('\n');
          throw new Error(`Bước 3 Thất bại: Job chuyển sang FAILED với lỗi: ${pollData.data.errorMessage}`);
        }
      }

      await new Promise((r) => setTimeout(r, 800));
    }

    if (!jobResultData) {
      throw new Error(`Bước 3 Thất bại: Quá thời gian chờ (${maxPollingTimeoutMs}ms) mà job chưa hoàn thành.`);
    }

    console.log(`  → Tổng số lần thăm dò: ${pollCount}`);
    console.log(`  → Thời lượng file kết quả: ${jobResultData.result.duration.toFixed(2)}s`);
    console.log(`  → Thời gian FFmpeg render: ${jobResultData.result.executionTimeMs}ms`);
    console.log(`  → Stream URL: ${jobResultData.result.streamUrl}`);
    console.log(`  → Download URL: ${jobResultData.result.downloadUrl}`);

    // Ghi nhận file đầu ra để dọn dẹp sau này
    const jobInDb = await prisma.mixJob.findUnique({ where: { id: createdJobId } });
    if (jobInDb) {
      outputFilePath = jobInDb.outputPath;
      uploadedFiles.push(jobInDb.trackAPath, jobInDb.trackBPath);
    }

    if (!fs.existsSync(outputFilePath)) {
      throw new Error(`Bước 3 Thất bại: Tệp vật lý không tồn tại trên đĩa tại: ${outputFilePath}`);
    }
    console.log('  ✔ Bước 3 HOÀN TẤT: Quá trình phối âm thành công 100%, file MP3 đã sẵn sàng.\n');

    // -------------------------------------------------------------
    // Bước 4: Kiểm thử Streaming hỗ trợ tua nhạc (HTTP 206 Partial Content)
    // -------------------------------------------------------------
    console.log('[Bước 4/5]: Gửi Range Request kiểm thử truyền phát phân đoạn (GET /stream)...');
    const rangeHeader = 'bytes=0-2048';
    const streamRes = await fetch(`${BASE_URL}${jobResultData.result.streamUrl}`, {
      headers: { Range: rangeHeader }
    });

    const contentRange = streamRes.headers.get('content-range');
    const contentLength = streamRes.headers.get('content-length');
    const contentType = streamRes.headers.get('content-type');
    const streamBytes = await streamRes.arrayBuffer();

    console.log(`  → HTTP Status: ${streamRes.status} (Kỳ vọng: 206 Partial Content)`);
    console.log(`  → Content-Range: ${contentRange}`);
    console.log(`  → Content-Length: ${contentLength} (Kỳ vọng: 2049)`);
    console.log(`  → Content-Type: ${contentType} (Kỳ vọng: audio/mpeg)`);
    console.log(`  → Dung lượng buffer nhận được: ${streamBytes.byteLength} bytes`);

    if (streamRes.status !== 206 || streamBytes.byteLength !== 2049 || !contentRange.startsWith('bytes 0-2048/')) {
      throw new Error('Bước 4 Thất bại: Server không hỗ trợ chuẩn xác giao thức HTTP 206 Range Request!');
    }
    console.log('  ✔ Bước 4 HOÀN TẤT: Stream audio phân đoạn byte hoạt động mượt mà, hỗ trợ seeking.\n');

    // -------------------------------------------------------------
    // Bước 5: Kiểm thử Tải về tệp thành phẩm (GET /download)
    // -------------------------------------------------------------
    console.log('[Bước 5/5]: Tải tệp thành phẩm về máy (GET /download)...');
    const downloadRes = await fetch(`${BASE_URL}${jobResultData.result.downloadUrl}`);
    const contentDisposition = downloadRes.headers.get('content-disposition');
    const downloadBytes = await downloadRes.arrayBuffer();

    console.log(`  → HTTP Status: ${downloadRes.status} (Kỳ vọng: 200)`);
    console.log(`  → Content-Disposition: ${contentDisposition}`);
    console.log(`  → Dung lượng tải về: ${downloadBytes.byteLength} bytes (~${(downloadBytes.byteLength / 1024).toFixed(1)} KB)`);

    if (downloadRes.status !== 200 || !contentDisposition || !contentDisposition.includes('attachment')) {
      throw new Error('Bước 5 Thất bại: Header Content-Disposition không hợp lệ để kích hoạt tải file!');
    }

    if (downloadBytes.byteLength < 100000) {
      throw new Error('Bước 5 Thất bại: Dung lượng file tải về quá nhỏ, có thể bị lỗi nội dung!');
    }
    console.log('  ✔ Bước 5 HOÀN TẤT: Tệp âm thanh hợp lệ và sẵn sàng lưu về máy người dùng.\n');

    console.log('================================================================================');
    console.log('🎉 XÁC THỰC THÀNH CÔNG: TOÀN BỘ 5 BƯỚC E2E ĐÃ ĐẠT TIÊU CHUẨN NGHIỆM THU (DoD PASSED)!');
    console.log('================================================================================');
  } finally {
    // Dọn dẹp tài nguyên
    if (createdJobId) {
      try {
        for (const filePath of uploadedFiles) {
          if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        if (outputFilePath && fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        await prisma.mixJob.delete({ where: { id: createdJobId } });
        console.log('🧹 [Cleanup]: Đã dọn dẹp sạch sẽ các tệp và bản ghi test trong SQLite.');
      } catch (cleanupErr) {
        console.warn('Cảnh báo dọn dẹp:', cleanupErr.message);
      }
    }
    server.close();
    await prisma.$disconnect();
  }
}

runFullCycleE2ETest().catch((err) => {
  console.error('\n❌ KIỂM THỬ E2E THẤT BẠI:', err);
  process.exit(1);
});
