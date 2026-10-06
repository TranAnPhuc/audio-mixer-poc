import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'fluent-ffmpeg';
import { mixAudioTracks, calculatePitchFactor } from '../src/services/AudioMixerService.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const OUTPUTS_DIR = path.resolve(__dirname, '../storage/outputs');

const SINE_440HZ_FILE = path.join(FIXTURES_DIR, 'sine_440hz.mp3');
const SILENT_BEAT_FILE = path.join(FIXTURES_DIR, 'silent_beat.mp3');
const BEAT_TEST_FILE = path.join(FIXTURES_DIR, 'beat_test.mp3');

const OUTPUT_PLUS2_FILE = path.join(OUTPUTS_DIR, 'test_pitch_plus2.mp3');
const OUTPUT_MINUS2_FILE = path.join(OUTPUTS_DIR, 'test_pitch_minus2.mp3');
const OUTPUT_COMBINED_FILE = path.join(OUTPUTS_DIR, 'test_pitch_combined.mp3');

/**
 * Đảm bảo các tệp fixture cần thiết tồn tại
 */
async function ensureFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

  // 1. Fixture đơn âm thuần túy A4 (440.0 Hz, 5 giây)
  if (!fs.existsSync(SINE_440HZ_FILE)) {
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'lavfi',
      '-i', 'sine=frequency=440:sample_rate=44100:duration=5',
      '-c:a', 'libmp3lame', '-b:a', '320k',
      SINE_440HZ_FILE
    ]);
    console.log('   ✓ Đã tạo fixture đơn âm A4 (440Hz): sine_440hz.mp3');
  }

  // 2. Fixture âm nền im lặng (5 giây) để cô lập kiểm tra tần số Track A
  if (!fs.existsSync(SILENT_BEAT_FILE)) {
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo:d=5',
      '-c:a', 'libmp3lame', '-b:a', '320k',
      SILENT_BEAT_FILE
    ]);
    console.log('   ✓ Đã tạo fixture âm nền im lặng: silent_beat.mp3');
  }

  // 3. Fixture beat mẫu (10 giây)
  if (!fs.existsSync(BEAT_TEST_FILE)) {
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'lavfi',
      '-i', 'sine=frequency=110:sample_rate=44100:duration=10',
      '-c:a', 'libmp3lame', '-b:a', '320k',
      BEAT_TEST_FILE
    ]);
    console.log('   ✓ Đã tạo fixture beat mẫu: beat_test.mp3');
  }
}

/**
 * Đo tần số cơ bản (Fundamental Frequency / Pitch) của file âm thanh
 * Sử dụng giải thuật Tự Tương Quan Chuẩn Hóa (Normalized Autocorrelation)
 * kết hợp nội suy Parabol (Parabolic Interpolation) đạt độ chính xác cấp 0.1 Hz.
 */
async function measurePitchFrequency(filePath, durationSec = 1.0) {
  const chunks = [];
  const stream = ffmpeg(filePath)
    .toFormat('s16le')
    .audioChannels(1)
    .audioFrequency(44100)
    .duration(durationSec)
    .pipe();

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const rawPcm = Buffer.concat(chunks);
  const sampleCount = Math.floor(rawPcm.length / 2);
  const int16 = new Int16Array(rawPcm.buffer, rawPcm.byteOffset, sampleCount);

  const Fs = 44100;
  const N = 4096;
  const minLag = Math.floor(Fs / 1000); // Tương ứng 1000 Hz (~44 mẫu)
  const maxLag = Math.floor(Fs / 150);  // Tương ứng 150 Hz (~294 mẫu)

  let r0 = 0;
  for (let i = 0; i < N; i++) {
    r0 += int16[i] * int16[i];
  }

  const corrs = [];
  let bestLag = 0;
  let maxCorr = -1;
  let pastZero = false;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let eLag = 0;
    for (let i = 0; i < N; i++) {
      corr += int16[i] * int16[i + lag];
      eLag += int16[i + lag] * int16[i + lag];
    }
    const normCorr = corr / Math.sqrt(r0 * eLag);
    corrs[lag] = normCorr;

    if (normCorr < 0) pastZero = true;
    if (pastZero && normCorr > maxCorr) {
      maxCorr = normCorr;
      bestLag = lag;
    }
  }

  if (bestLag <= minLag || bestLag >= maxLag) {
    throw new Error(`[PitchMeasurement] Không tìm thấy đỉnh tự tương quan tin cậy cho: ${filePath}`);
  }

  // Nội suy đỉnh Parabol 3 điểm xung quanh bestLag
  const y0 = corrs[bestLag - 1];
  const y1 = corrs[bestLag];
  const y2 = corrs[bestLag + 1];
  const delta = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
  const refinedLag = bestLag + delta;

  return Fs / refinedLag;
}

/**
 * Kiểm tra mức âm lượng đỉnh (Peak Volume) của tệp âm thanh qua bộ lọc volumedetect
 */
async function getPeakVolumeDbfs(filePath) {
  const { stderr } = await execFileAsync('ffmpeg', [
    '-i', filePath,
    '-af', 'volumedetect',
    '-f', 'null',
    '-'
  ]);

  const match = stderr.match(/max_volume:\s+([-\d.]+)\s+dB/);
  if (!match) {
    throw new Error('[VolumeDetect] Không tìm thấy thông số max_volume trong đầu ra FFmpeg.');
  }
  return parseFloat(match[1]);
}

async function runPitchShiftingTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: Pitch Shifting Trong AudioMixerService (Task 10.2)');
  console.log('===============================================================\n');

  // 1. Chuẩn bị các Fixture
  console.log('1. Khởi tạo Fixtures âm thanh chuẩn...');
  await ensureFixtures();
  console.log('   ✓ Fixtures sẵn sàng trên đĩa.\n');

  // Kiểm tra độ chính xác của hàm tính toán hệ số
  console.log('2. Kiểm tra hàm toán học calculatePitchFactor...');
  const factorPlus2 = calculatePitchFactor(2);
  const factorMinus2 = calculatePitchFactor(-2);
  console.log(`   - +2 bán âm: factor = ${factorPlus2.toFixed(4)} (Kỳ vọng: 1.1225)`);
  console.log(`   - -2 bán âm: factor = ${factorMinus2.toFixed(4)} (Kỳ vọng: 0.8909)`);
  if (Math.abs(factorPlus2 - 1.122462) > 0.001 || Math.abs(factorMinus2 - 0.890899) > 0.001) {
    throw new Error('[FAIL] calculatePitchFactor trả về kết quả sai lệch.');
  }
  console.log('   ✓ Hàm tính toán hệ số pitchFactor đạt chuẩn 100%.\n');

  // 3. Ca 1: Dịch +2 bán âm (A4 -> B4: 440.0Hz -> 493.88Hz)
  console.log('3. Ca 1: Kiểm thử dịch cao độ +2 bán âm (A4 lên B4)...');
  const res1 = await mixAudioTracks({
    trackAPath: SINE_440HZ_FILE,
    trackBPath: SILENT_BEAT_FILE,
    outputPath: OUTPUT_PLUS2_FILE,
    tempoRatio: 1.0,
    pitchShiftSemitones: 2
  });

  console.log('   Thông số kết quả Ca 1:', {
    outputDuration: `${res1.outputDuration}s`,
    appliedPitchShiftSemitones: res1.appliedPitchShiftSemitones,
    executionTimeMs: `${res1.executionTimeMs}ms`
  });

  const freq1 = await measurePitchFrequency(OUTPUT_PLUS2_FILE);
  console.log(`   -> Tần số đo đạc qua Autocorrelation: ${freq1.toFixed(2)} Hz (Kỳ vọng: 493.88 Hz ± 2 Hz)`);

  if (Math.abs(freq1 - 493.88) > 2.0) {
    throw new Error(`[FAIL] Tần số dịch +2 bán âm sai lệch: ${freq1.toFixed(2)} Hz (vượt ngoài dải 491.88 - 495.88 Hz)`);
  }
  if (Math.abs(res1.outputDuration - 5.0) > 0.5) {
    throw new Error(`[FAIL] Thời lượng tệp bị co dãn sai: ${res1.outputDuration}s (kỳ vọng 5.0s)`);
  }
  console.log('   ✓ Ca 1 đạt chuẩn 100%: Tần số tăng đúng +2 bán âm, thời lượng được bảo toàn.\n');

  // 4. Ca 2: Dịch -2 bán âm (A4 -> G4: 440.0Hz -> 391.99Hz)
  console.log('4. Ca 2: Kiểm thử dịch cao độ -2 bán âm (A4 xuống G4)...');
  const res2 = await mixAudioTracks({
    trackAPath: SINE_440HZ_FILE,
    trackBPath: SILENT_BEAT_FILE,
    outputPath: OUTPUT_MINUS2_FILE,
    tempoRatio: 1.0,
    pitchShiftSemitones: -2
  });

  console.log('   Thông số kết quả Ca 2:', {
    outputDuration: `${res2.outputDuration}s`,
    appliedPitchShiftSemitones: res2.appliedPitchShiftSemitones,
    executionTimeMs: `${res2.executionTimeMs}ms`
  });

  const freq2 = await measurePitchFrequency(OUTPUT_MINUS2_FILE);
  console.log(`   -> Tần số đo đạc qua Autocorrelation: ${freq2.toFixed(2)} Hz (Kỳ vọng: 391.99 Hz ± 2 Hz)`);

  if (Math.abs(freq2 - 391.99) > 2.0) {
    throw new Error(`[FAIL] Tần số dịch -2 bán âm sai lệch: ${freq2.toFixed(2)} Hz (vượt ngoài dải 389.99 - 393.99 Hz)`);
  }
  if (Math.abs(res2.outputDuration - 5.0) > 0.5) {
    throw new Error(`[FAIL] Thời lượng tệp bị co dãn sai: ${res2.outputDuration}s (kỳ vọng 5.0s)`);
  }
  console.log('   ✓ Ca 2 đạt chuẩn 100%: Tần số giảm đúng -2 bán âm, thời lượng được bảo toàn.\n');

  // 5. Ca 3: Phối trộn phức hợp (Vocal +2 bán âm, tempo 1.25x, offset +500ms) với Beat 10s
  console.log('5. Ca 3: Kiểm thử phối trộn phức hợp đồng thời (Pitch + Tempo + Offset + Beat)...');
  const res3 = await mixAudioTracks({
    trackAPath: SINE_440HZ_FILE,
    trackBPath: BEAT_TEST_FILE,
    outputPath: OUTPUT_COMBINED_FILE,
    tempoRatio: 1.25,
    vocalOffsetMs: 500,
    pitchShiftSemitones: 2
  });

  console.log('   Thông số kết quả Ca 3:', {
    outputDuration: `${res3.outputDuration}s`,
    appliedTempoRatio: res3.appliedTempoRatio,
    appliedVocalOffsetMs: `${res3.appliedVocalOffsetMs}ms`,
    appliedPitchShiftSemitones: res3.appliedPitchShiftSemitones,
    sizeBytes: res3.sizeBytes,
    executionTimeMs: `${res3.executionTimeMs}ms`
  });

  // Xác minh thời lượng đúng bằng Beat (10 giây)
  if (Math.abs(res3.outputDuration - 10.0) > 0.5) {
    throw new Error(`[FAIL] Thời lượng bản mashup Ca 3 sai: ${res3.outputDuration}s (kỳ vọng 10.0s theo Beat)`);
  }

  // Kiểm tra mức âm lượng đỉnh qua volumedetect
  const peakVolumeDbfs = await getPeakVolumeDbfs(OUTPUT_COMBINED_FILE);
  console.log(`   -> Mức âm lượng đỉnh (Peak Volume): ${peakVolumeDbfs} dBFS (Kỳ vọng: < 0.0 dBFS)`);

  if (peakVolumeDbfs >= 0.0) {
    throw new Error(`[FAIL] Phát hiện méo tiếng số (Clipping)! Peak volume: ${peakVolumeDbfs} dBFS >= 0 dBFS`);
  }
  console.log('   ✓ Ca 3 đạt chuẩn 100%: Ghép nối trơn tru cả 4 bộ lọc DSP, thời lượng chuẩn xác, không clipping.\n');

  console.log('===============================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST PITCH SHIFTING ĐÃ VƯỢT QUA 100%!');
  console.log('===============================================================');
}

runPitchShiftingTests().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
