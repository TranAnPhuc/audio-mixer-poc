import { verifyFfmpegInstallation } from '../src/utils/checkFfmpeg.js';

async function testFfmpegVerification() {
  console.log('--- Bắt đầu kiểm tra Module verifyFfmpegInstallation ---');

  try {
    const result = await verifyFfmpegInstallation();

    console.log('✔ Kiểm tra hoàn tất thành công!');
    console.log('✔ Trạng thái hệ sinh thái FFmpeg:', result.ready ? 'SẴN SÀNG (READY)' : 'CHƯA SẴN SÀNG');
    console.log('✔ FFmpeg Version:', result.ffmpeg.version);
    console.log('  → Đường dẫn binary FFmpeg:', result.ffmpeg.path);
    console.log('✔ FFprobe Version:', result.ffprobe.version);
    console.log('  → Đường dẫn binary FFprobe:', result.ffprobe.path);

    if (!result.ready || !result.ffmpeg.version || !result.ffprobe.version) {
      throw new Error('Dữ liệu xác thực FFmpeg không đầy đủ hoặc thiếu trường bắt buộc!');
    }

    console.log('🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU KIỂM TRA FFMPEG ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } catch (error) {
    console.error('❌ Kiểm tra FFmpeg thất bại:');
    console.error(error.message);
    process.exit(1);
  }
}

testFfmpegVerification();
