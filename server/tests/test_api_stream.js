process.env.NODE_ENV = 'test';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from '../src/app.js';
import prisma, { JobStatus } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiStreamAndDownload() {
  console.log('--- Bắt đầu kiểm thử Endpoint GET Status, Stream (HTTP 206) & Download ---');

  const TEST_PORT = 5097;
  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  let mockJobId = null;

  try {
    const fixturePath = path.resolve(__dirname, 'fixtures/vocal_test.mp3');
    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Tệp fixture không tồn tại: ${fixturePath}`);
    }

    const fixtureStats = fs.statSync(fixturePath);
    const fixtureSize = fixtureStats.size;

    // 1. Tạo bản ghi giả lập MixJob hoàn tất (SUCCESS)
    const mockJob = await prisma.mixJob.create({
      data: {
        status: JobStatus.SUCCESS,
        progress: 100,
        trackAOriginalName: 'vocal_test.mp3',
        trackAPath: fixturePath,
        trackAMimeType: 'audio/mpeg',
        trackASize: fixtureSize,
        trackBOriginalName: 'beat_test.mp3',
        trackBPath: fixturePath,
        trackBMimeType: 'audio/mpeg',
        trackBSize: fixtureSize,
        outputFileName: 'vocal_test.mp3',
        outputPath: fixturePath,
        outputDuration: 10.0,
        executionTimeMs: 180
      }
    });

    mockJobId = mockJob.id;
    console.log(`✔ Khởi tạo thành công Mock Job ID: ${mockJobId}`);

    // ==========================================
    // Test 1: GET /api/v1/mix/:jobId (Status & URLs)
    // ==========================================
    console.log('\n[Test 1]: GET /api/v1/mix/:jobId...');
    const statusRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${mockJobId}`);
    const statusData = await statusRes.json();

    console.log(`  → HTTP Status: ${statusRes.status} (Kỳ vọng: 200)`);
    console.log('  → Dữ liệu nhận về:', JSON.stringify(statusData));

    if (statusRes.status !== 200 || !statusData.success) {
      throw new Error('Test 1 thất bại! Không lấy được trạng thái job');
    }
    if (
      statusData.data.status !== 'SUCCESS' ||
      statusData.data.progress !== 100 ||
      statusData.data.result?.streamUrl !== `/api/v1/mix/${mockJobId}/stream` ||
      statusData.data.result?.downloadUrl !== `/api/v1/mix/${mockJobId}/download`
    ) {
      throw new Error('Test 1 thất bại! Cấu trúc dữ liệu kết quả không khớp chuẩn ARCHITECTURE.md');
    }
    console.log('  ✔ Test 1 ĐẠT CHUẨN: Metadata và endpoint URLs chính xác.');

    // ==========================================
    // Test 2: GET /api/v1/mix/:jobId/stream (HTTP 206 Partial Content)
    // ==========================================
    console.log('\n[Test 2]: GET /api/v1/mix/:jobId/stream với Range Header...');
    const streamRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${mockJobId}/stream`, {
      headers: {
        Range: 'bytes=0-1024'
      }
    });

    const contentRange = streamRes.headers.get('content-range');
    const acceptRanges = streamRes.headers.get('accept-ranges');
    const contentLength = streamRes.headers.get('content-length');
    const contentType = streamRes.headers.get('content-type');
    const streamBuffer = await streamRes.arrayBuffer();

    console.log(`  → HTTP Status: ${streamRes.status} (Kỳ vọng: 206)`);
    console.log(`  → Content-Range: ${contentRange} (Kỳ vọng: bytes 0-1024/${fixtureSize})`);
    console.log(`  → Accept-Ranges: ${acceptRanges} (Kỳ vọng: bytes)`);
    console.log(`  → Content-Length: ${contentLength} (Kỳ vọng: 1025)`);
    console.log(`  → Content-Type: ${contentType} (Kỳ vọng: audio/mpeg)`);
    console.log(`  → Kích thước buffer nhận được: ${streamBuffer.byteLength} bytes`);

    if (streamRes.status !== 206) {
      throw new Error(`Test 2 thất bại! Kỳ vọng HTTP 206 nhưng nhận ${streamRes.status}`);
    }
    if (contentRange !== `bytes 0-1024/${fixtureSize}` || contentLength !== '1025' || streamBuffer.byteLength !== 1025) {
      throw new Error('Test 2 thất bại! Dữ liệu byte-range hoặc Content-Range header không chính xác.');
    }
    console.log('  ✔ Test 2 ĐẠT CHUẨN: Hỗ trợ Range Requests và HTTP 206 chuẩn xác.');

    // ==========================================
    // Test 3: GET /api/v1/mix/:jobId/download (File Download)
    // ==========================================
    console.log('\n[Test 3]: GET /api/v1/mix/:jobId/download...');
    const downloadRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mix/${mockJobId}/download`);
    const contentDisposition = downloadRes.headers.get('content-disposition');
    const downloadBuffer = await downloadRes.arrayBuffer();

    console.log(`  → HTTP Status: ${downloadRes.status} (Kỳ vọng: 200)`);
    console.log(`  → Content-Disposition: ${contentDisposition} (Kỳ vọng có chứa attachment và filename)`);
    console.log(`  → Dung lượng tệp tải về: ${downloadBuffer.byteLength} bytes (Khớp với kích thước gốc: ${fixtureSize})`);

    if (downloadRes.status !== 200) {
      throw new Error(`Test 3 thất bại! Kỳ vọng HTTP 200 nhưng nhận ${downloadRes.status}`);
    }
    if (!contentDisposition || !contentDisposition.includes('attachment') || downloadBuffer.byteLength !== fixtureSize) {
      throw new Error('Test 3 thất bại! Header Content-Disposition hoặc dung lượng tải về không khớp.');
    }
    console.log('  ✔ Test 3 ĐẠT CHUẨN: Tải file thành công với header attachment.');

    console.log('\n🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU TASK 3.3 ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } finally {
    if (mockJobId) {
      await prisma.mixJob.delete({ where: { id: mockJobId } });
      console.log('🧹 Đã dọn dẹp bản ghi mock job trong Database.');
    }
    server.close();
    await prisma.$disconnect();
  }
}

testApiStreamAndDownload().catch((err) => {
  console.error('\n❌ Kiểm thử Task 3.3 thất bại:', err);
  process.exit(1);
});
