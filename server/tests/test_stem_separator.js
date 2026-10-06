import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { separateStems } from '../src/services/StemSeparatorService.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const TEST_STORAGE_DIR = path.resolve(__dirname, '../storage/test_stems');
const SYNTHETIC_SONG_FILE = path.join(FIXTURES_DIR, 'synthetic_song_test.wav');

/**
 * Sinh file âm thanh tổng hợp đa tầng gồm Giọng hát (440Hz ở giữa) và Beat (110Hz hai bên)
 */
async function generateSyntheticSongFixture(filePath, duration = 3) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const filterComplex = [
    '[0:a]volume=0.8,pan=stereo|c0=c0|c1=c0[v_stereo];',
    '[1:a]volume=0.8,pan=stereo|c0=c0|c1=-1*c0[b_side];',
    '[v_stereo][b_side]amix=inputs=2:weights=1.0 1.0:dropout_transition=0[out]'
  ].join('');

  const args = [
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=440:duration=${duration}`,
    '-f', 'lavfi', '-i', `sine=frequency=110:duration=${duration}`,
    '-filter_complex', filterComplex,
    '-map', '[out]',
    '-c:a', 'pcm_s16le',
    filePath
  ];

  await execFileAsync('ffmpeg', args);
  console.log(`[Fixture] Đã sinh tệp âm thanh hỗn hợp mẫu: ${path.basename(filePath)} (${duration}s)`);
}

/**
 * Đo mức năng lượng trung bình (mean_volume theo dB) tại một tần số xác định bằng FFmpeg
 */
async function measureEnergyAtFrequency(audioPath, frequency) {
  const args = [
    '-i', audioPath,
    '-af', `bandpass=f=${frequency}:width_type=q:w=5,volumedetect`,
    '-f', 'null',
    '-'
  ];

  try {
    const { stderr } = await execFileAsync('ffmpeg', args);
    const meanMatch = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    if (meanMatch) {
      return parseFloat(meanMatch[1]);
    }
  } catch (err) {
    if (err.stderr) {
      const meanMatch = err.stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
      if (meanMatch) {
        return parseFloat(meanMatch[1]);
      }
    }
  }
  return -99.0;
}

async function runStemSeparatorTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: StemSeparatorService & Demucs Runner (Task 11.1)');
  console.log('===============================================================\n');

  fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });

  try {
    // 1. Chuẩn bị Fixture bài hát tổng hợp
    console.log('1. Khởi tạo Fixture âm thanh hỗn hợp (Vocal 440Hz + Beat 110Hz)...');
    await generateSyntheticSongFixture(SYNTHETIC_SONG_FILE, 3);
    console.log('   ✓ Fixture đã sẵn sàng trên đĩa.\n');

    // 2. Kiểm thử Ca 1: Tách Stem cho Track A (vocal)
    console.log('2. Kiểm thử tách thân âm với trackType = "vocal"...');
    const outDirA = path.join(TEST_STORAGE_DIR, 'job_vocal_test');
    
    const startTimeA = Date.now();
    const resultA = await separateStems({
      inputPath: SYNTHETIC_SONG_FILE,
      outputDir: outDirA,
      trackType: 'vocal'
    });
    const elapsedA = Date.now() - startTimeA;

    console.log(`   - Engine thực thi: ${resultA.engine}`);
    console.log(`   - Thời gian xử lý: ${resultA.executionTimeMs}ms (Thực tế: ${elapsedA}ms)`);
    console.log(`   - Vocals Path: ${path.basename(resultA.vocalsPath)}`);
    console.log(`   - Instrumental Path: ${path.basename(resultA.instrumentalPath)}`);
    console.log(`   - Target Stem Path: ${path.basename(resultA.targetStemPath)}`);

    if (!resultA.success) {
      throw new Error('Kết quả trả về success !== true');
    }
    if (resultA.targetStemPath !== resultA.vocalsPath) {
      throw new Error(`Với trackType="vocal", targetStemPath phải trỏ tới vocalsPath. Nhận được: ${resultA.targetStemPath}`);
    }
    if (!fs.existsSync(resultA.vocalsPath) || !fs.existsSync(resultA.instrumentalPath)) {
      throw new Error('Cả 2 tệp vocals.wav và no_vocals.wav phải tồn tại trên đĩa.');
    }

    const statVocals = fs.statSync(resultA.vocalsPath);
    const statInst = fs.statSync(resultA.instrumentalPath);
    if (statVocals.size < 50000 || statInst.size < 50000) {
      throw new Error('Kích thước tệp stem quá nhỏ, có thể bị lỗi khi render.');
    }
    console.log(`   ✓ Tệp Vocals dung lượng: ${(statVocals.size / 1024).toFixed(1)} KB`);
    console.log(`   ✓ Tệp Instrumental dung lượng: ${(statInst.size / 1024).toFixed(1)} KB`);

    // 3. Phân tích quang phổ năng lượng (Spectral RMS Verification)
    console.log('\n3. Phân tích năng lượng RMS xác thực độ phân tách tần số...');
    const voc440 = await measureEnergyAtFrequency(resultA.vocalsPath, 440);
    const voc110 = await measureEnergyAtFrequency(resultA.vocalsPath, 110);

    const inst440 = await measureEnergyAtFrequency(resultA.instrumentalPath, 440);
    const inst110 = await measureEnergyAtFrequency(resultA.instrumentalPath, 110);

    console.log(`   - Vocals Stem:`);
    console.log(`     + Tần số Vocal (440Hz): ${voc440.toFixed(1)} dB`);
    console.log(`     + Tần số Beat  (110Hz): ${voc110.toFixed(1)} dB (Suy giảm: ${(voc440 - voc110).toFixed(1)} dB)`);

    console.log(`   - Instrumental Stem:`);
    console.log(`     + Tần số Beat  (110Hz): ${inst110.toFixed(1)} dB`);
    console.log(`     + Tần số Vocal (440Hz): ${inst440.toFixed(1)} dB (Triệt tiêu: ${(inst110 - inst440).toFixed(1)} dB)`);

    // Độ suy giảm phải đạt ít nhất 15 dB
    if (voc440 - voc110 < 15) {
      throw new Error(`Vocals stem chưa lọc sạch tiếng beat (Độ suy giảm chỉ đạt ${(voc440 - voc110).toFixed(1)} dB < 15 dB).`);
    }
    if (inst110 - inst440 < 15) {
      throw new Error(`Instrumental stem chưa triệt tiêu tiếng vocal (Độ triệt tiêu chỉ đạt ${(inst110 - inst440).toFixed(1)} dB < 15 dB).`);
    }
    console.log('   ✓ Độ tách bạch tần số đạt chuẩn phòng thu (Suy giảm > 15 dB)!\n');

    // 4. Kiểm thử Ca 2: Tách Stem cho Track B (beat)
    console.log('4. Kiểm thử tách thân âm với trackType = "beat"...');
    const outDirB = path.join(TEST_STORAGE_DIR, 'job_beat_test');
    const resultB = await separateStems({
      inputPath: SYNTHETIC_SONG_FILE,
      outputDir: outDirB,
      trackType: 'beat'
    });

    if (resultB.targetStemPath !== resultB.instrumentalPath) {
      throw new Error(`Với trackType="beat", targetStemPath phải trỏ tới instrumentalPath. Nhận được: ${resultB.targetStemPath}`);
    }
    console.log(`   ✓ targetStemPath trỏ chính xác về: ${path.basename(resultB.targetStemPath)}`);
    console.log('   ✓ Ca 2 đạt chuẩn 100%.\n');

    console.log('===============================================================');
    console.log('🎉 TẤT CẢ TIÊU CHUẨN NGHIỆM THU (DoD) CỦA TASK 11.1 ĐÃ ĐẠT 100%!');
    console.log('===============================================================\n');
  } finally {
    // 5. Dọn dẹp tài nguyên và các tệp thử nghiệm
    console.log('[DỌN DẸP] Đang dọn dẹp các tệp tạm thời...');
    if (fs.existsSync(SYNTHETIC_SONG_FILE)) {
      try { fs.unlinkSync(SYNTHETIC_SONG_FILE); } catch { /* ignore */ }
    }
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      try { fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    console.log('   ✓ Dọn dẹp hoàn tất.');
  }
}

runStemSeparatorTests().catch((err) => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err.message);
  process.exit(1);
});
