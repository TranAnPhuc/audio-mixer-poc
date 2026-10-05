import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mixAudioTracks, getAudioMetadata } from '../src/services/AudioMixerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAudioMixerService() {
  console.log('--- Bắt đầu kiểm thử độc lập AudioMixerService ---');

  const fixturesDir = path.join(__dirname, 'fixtures');
  const vocalPath = path.join(fixturesDir, 'vocal_test.mp3');
  const beatPath = path.join(fixturesDir, 'beat_test.mp3');
  const outputDir = path.join(__dirname, '..', 'storage', 'outputs');
  const outputPath = path.join(outputDir, 'test_mixed.mp3');

  // Đảm bảo các file fixture tồn tại
  if (!fs.existsSync(vocalPath) || !fs.existsSync(beatPath)) {
    throw new Error('Thiếu tệp fixture để chạy test! Hãy kiểm tra thư mục server/tests/fixtures/');
  }

  // Xóa tệp output cũ nếu có từ lần chạy trước
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  console.log('• Vocal input:', vocalPath);
  console.log('• Beat input:', beatPath);
  console.log('• Output target:', outputPath);

  const progressUpdates = [];

  try {
    const result = await mixAudioTracks({
      trackAPath: vocalPath,
      trackBPath: beatPath,
      outputPath: outputPath,
      onProgress: (percent) => {
        progressUpdates.push(percent);
        process.stdout.write(`\r[Rendering Progress]: ${percent}% ${percent === 100 ? '\n' : ''}`);
      }
    });

    console.log('\n✔ Quá trình phối âm hoàn tất thành công!');
    console.log('✔ Tên file kết quả:', result.outputFileName);
    console.log(`✔ Thời lượng file kết quả: ${result.outputDuration.toFixed(2)}s`);
    console.log(`✔ Tần số lấy mẫu (Sample Rate): ${result.sampleRate} Hz`);
    console.log(`✔ Số kênh (Channels): ${result.channels}`);
    console.log(`✔ Bitrate: ${result.bitrate} bps (~${Math.round(result.bitrate / 1000)} kbps)`);
    console.log(`✔ Dung lượng file: ${(result.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`✔ Thời gian xử lý thực tế: ${result.executionTimeMs} ms`);

    // Tiêu chuẩn nghiệm thu (Acceptance Criteria Assertions)
    if (!fs.existsSync(outputPath)) {
      throw new Error('Tệp thành phẩm không được tạo ra trên đĩa!');
    }
    if (result.sampleRate !== 44100) {
      throw new Error(`Sample rate không đạt chuẩn 44100 Hz (thực tế: ${result.sampleRate})`);
    }
    if (result.channels !== 2) {
      throw new Error(`Số kênh không đạt chuẩn Stereo 2 kênh (thực tế: ${result.channels})`);
    }
    if (result.outputDuration < 9.5 || result.outputDuration > 10.5) {
      throw new Error(`Độ dài không đạt chuẩn xấp xỉ 10 giây (thực tế: ${result.outputDuration}s)`);
    }
    if (progressUpdates.length === 0 || !progressUpdates.includes(100)) {
      throw new Error('Callback tiến độ không nhận được mốc hoàn thành 100%');
    }

    console.log('🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU AUDIOMIXERSERVICE ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } catch (err) {
    console.error('\n❌ Kiểm thử AudioMixerService thất bại:');
    console.error(err.message);
    process.exit(1);
  }
}

testAudioMixerService();
