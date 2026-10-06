import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import {
  mixAudioTracks,
  getAudioMetadata,
  buildOffsetFilterChain,
  buildAtempoFilterChain
} from '../src/services/AudioMixerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const VOCAL_FIXTURE = path.join(FIXTURES_DIR, 'vocal_test.mp3');
const BEAT_FIXTURE = path.join(FIXTURES_DIR, 'beat_test.mp3');

const OUTPUT_DIR = path.resolve(__dirname, '../storage/outputs');
const DELAYED_VOCAL_OUTPUT = path.join(OUTPUT_DIR, 'test_vocal_delayed_1000ms.mp3');
const TRIMMED_VOCAL_OUTPUT = path.join(OUTPUT_DIR, 'test_vocal_trimmed_1000ms.mp3');
const MIXED_OFFSET_OUTPUT = path.join(OUTPUT_DIR, 'test_mixed_offset.mp3');

/**
 * Trích xuất mức âm lượng cực đại (Max Volume) bằng bộ lọc volumedetect của FFmpeg
 * @param {string} filePath 
 * @returns {Promise<number>} Mức dBFS (ví dụ -9.4 dB)
 */
function probeMaxVolume(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .audioFilters('volumedetect')
      .format('null')
      .output('-')
      .on('error', reject)
      .on('end', (stdout, stderr) => {
        const match = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
        if (match && match[1]) {
          resolve(parseFloat(match[1]));
        } else {
          resolve(0);
        }
      })
      .run();
  });
}

/**
 * Phân tích khoảng âm thanh (startSec đến startSec + durationSec) sang raw PCM 16-bit
 * để đo đạc biên độ mẫu cực đại (Max Absolute Sample) và kiểm tra khoảng lặng (Silence).
 * @param {string} filePath Đường dẫn file âm thanh
 * @param {number} startSec Thời điểm bắt đầu (giây)
 * @param {number} durationSec Thời lượng phân tích (giây)
 * @returns {Promise<{ isSilent: boolean, maxSample: number, sampleCount: number }>}
 */
function analyzeAudioSilence(filePath, startSec = 0, durationSec = 1.0) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const command = ffmpeg(filePath)
      .setStartTime(startSec)
      .duration(durationSec)
      .format('s16le')
      .audioChannels(1)
      .audioFrequency(44100);

    const stream = command.pipe();

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.length / 2));
      let maxSample = 0;

      for (let i = 0; i < int16.length; i++) {
        const absVal = Math.abs(int16[i]);
        if (absVal > maxSample) {
          maxSample = absVal;
        }
      }

      // Thang 16-bit PCM từ 0 đến 32767. Ngưỡng im lặng (silence / compression noise) < 150
      const isSilent = maxSample < 150;
      resolve({
        isSilent,
        maxSample,
        sampleCount: int16.length
      });
    });
  });
}

async function runOffsetMixerTests() {
  console.log('='.repeat(75));
  console.log('  TEST SUITE: AudioMixerService với Cơ Chế Vocal Offset Alignment');
  console.log('='.repeat(75));

  let passedTests = 0;
  let totalTests = 0;

  // TEST 1: Kiểm thử logic sinh chuỗi filter của buildOffsetFilterChain
  totalTests++;
  try {
    console.log('\n[TEST 1] Kiểm tra helper sinh filter căn chỉnh offset (buildOffsetFilterChain)...');

    const chainZero = buildOffsetFilterChain(0);
    const chainPos1000 = buildOffsetFilterChain(1000);
    const chainPos500 = buildOffsetFilterChain(500);
    const chainNeg1000 = buildOffsetFilterChain(-1000);
    const chainNeg500 = buildOffsetFilterChain(-500);
    const chainInvalid = buildOffsetFilterChain(null);

    console.log(`  -> offset = 0ms     => "${chainZero}" (kỳ vọng: "")`);
    console.log(`  -> offset = +1000ms => "${chainPos1000}" (kỳ vọng: "adelay=1000|1000")`);
    console.log(`  -> offset = +500ms  => "${chainPos500}" (kỳ vọng: "adelay=500|500")`);
    console.log(`  -> offset = -1000ms => "${chainNeg1000}" (kỳ vọng: "atrim=start=1.0000,asetpts=PTS-STARTPTS")`);
    console.log(`  -> offset = -500ms  => "${chainNeg500}" (kỳ vọng: "atrim=start=0.5000,asetpts=PTS-STARTPTS")`);
    console.log(`  -> offset = null    => "${chainInvalid}" (kỳ vọng: "")`);

    const isZeroValid = chainZero === '';
    const isPos1000Valid = chainPos1000 === 'adelay=1000|1000';
    const isPos500Valid = chainPos500 === 'adelay=500|500';
    const isNeg1000Valid = chainNeg1000 === 'atrim=start=1.0000,asetpts=PTS-STARTPTS';
    const isNeg500Valid = chainNeg500 === 'atrim=start=0.5000,asetpts=PTS-STARTPTS';
    const isInvalidValid = chainInvalid === '';

    if (isZeroValid && isPos1000Valid && isPos500Valid && isNeg1000Valid && isNeg500Valid && isInvalidValid) {
      console.log('  PASS: Helper buildOffsetFilterChain xử lý chuẩn xác cả 3 trường hợp: 0, dương, và âm.');
      passedTests++;
    } else {
      console.error('  FAIL: Chuỗi filter offset không khớp với đặc tả kỹ thuật.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 1]: ${err.message}`);
  }

  // TEST 2 (Ca 1): Render vocalOffsetMs = +1000ms (+1s trễ), phân tích PCM buffer 1 giây đầu tiên
  totalTests++;
  try {
    console.log('\n[TEST 2 - Ca 1] Render Vocal với vocalOffsetMs = +1000ms (+1 giây trễ) & phân tích khoảng lặng...');

    const delayFilter = buildOffsetFilterChain(1000); // adelay=1000|1000

    await new Promise((resolve, reject) => {
      ffmpeg(VOCAL_FIXTURE)
        .audioFilters(['aresample=44100', delayFilter])
        .outputOptions(['-c:a libmp3lame', '-b:a 320k', '-ar 44100'])
        .output(DELAYED_VOCAL_OUTPUT)
        .on('error', reject)
        .on('end', resolve)
        .run();
    });

    const origMeta = await getAudioMetadata(VOCAL_FIXTURE);
    const delayedMeta = await getAudioMetadata(DELAYED_VOCAL_OUTPUT);

    console.log(`  -> Thời lượng file gốc       : ${origMeta.duration.toFixed(2)}s`);
    console.log(`  -> Thời lượng file sau delay : ${delayedMeta.duration.toFixed(2)}s (Kỳ vọng ~ 11.00s)`);

    // Phân tích PCM buffer 1 giây đầu tiên của file bị delay
    const firstSecAnalysis = await analyzeAudioSilence(DELAYED_VOCAL_OUTPUT, 0, 1.0);
    console.log(`  -> Phân tích 1 giây đầu (0 - 1.0s):`);
    console.log(`     • Tổng số mẫu PCM phân tích : ${firstSecAnalysis.sampleCount} samples`);
    console.log(`     • Biên độ cực đại (Peak)   : ${firstSecAnalysis.maxSample} / 32767`);
    console.log(`     • Trạng thái khoảng lặng   : ${firstSecAnalysis.isSilent ? 'HOÀN TOÀN IM LẶNG (SILENCE)' : 'CÓ TÍN HIỆU'}`);

    // Phân tích 1 giây tiếp theo (1.0 - 2.0s) để xác minh giọng hát bắt đầu vang lên
    const secondSecAnalysis = await analyzeAudioSilence(DELAYED_VOCAL_OUTPUT, 1.0, 1.0);
    console.log(`  -> Phân tích giây thứ hai (1.0 - 2.0s):`);
    console.log(`     • Biên độ cực đại (Peak)   : ${secondSecAnalysis.maxSample} / 32767`);
    console.log(`     • Trạng thái âm thanh      : ${!secondSecAnalysis.isSilent ? 'CÓ TÍN HIỆU ÂM THANH' : 'IM LẶNG'}`);

    const isDurationProlonged = Math.abs(delayedMeta.duration - (origMeta.duration + 1.0)) <= 0.15;
    const isFirstSecSilent = firstSecAnalysis.isSilent;
    const isSecondSecActive = !secondSecAnalysis.isSilent && secondSecAnalysis.maxSample > 500;

    if (isDurationProlonged && isFirstSecSilent && isSecondSecActive) {
      console.log('  PASS: Bộ lọc adelay tạo đúng 1.0 giây khoảng lặng ở đầu và dịch chuyển giọng hát chuẩn xác.');
      passedTests++;
    } else {
      console.error('  FAIL: Kiểm tra khoảng lặng 1 giây đầu hoặc thời lượng file delay không đạt yêu cầu.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 2]: ${err.message}`);
  }

  // TEST 3 (Ca 2): Render vocalOffsetMs = -1000ms (-1s sớm), kiểm tra thời lượng bị cắt ngắn
  totalTests++;
  try {
    console.log('\n[TEST 3 - Ca 2] Render Vocal với vocalOffsetMs = -1000ms (-1 giây sớm) & xác minh cắt ngắn...');

    const trimFilter = buildOffsetFilterChain(-1000); // atrim=start=1.0000,asetpts=PTS-STARTPTS

    await new Promise((resolve, reject) => {
      ffmpeg(VOCAL_FIXTURE)
        .audioFilters(['aresample=44100', ...trimFilter.split(',')])
        .outputOptions(['-c:a libmp3lame', '-b:a 320k', '-ar 44100'])
        .output(TRIMMED_VOCAL_OUTPUT)
        .on('error', reject)
        .on('end', resolve)
        .run();
    });

    const origMeta = await getAudioMetadata(VOCAL_FIXTURE);
    const trimmedMeta = await getAudioMetadata(TRIMMED_VOCAL_OUTPUT);

    console.log(`  -> Thời lượng file gốc     : ${origMeta.duration.toFixed(2)}s`);
    console.log(`  -> Thời lượng file sau trim: ${trimmedMeta.duration.toFixed(2)}s (Kỳ vọng ~ 9.00s)`);

    const expectedTrimmedDuration = origMeta.duration - 1.0;
    const isDurationShortened = Math.abs(trimmedMeta.duration - expectedTrimmedDuration) <= 0.15;

    if (isDurationShortened) {
      console.log('  PASS: Bộ lọc atrim + asetpts cắt đúng 1.0 giây đầu của Vocal, giúp giọng hát vào sớm hơn.');
      passedTests++;
    } else {
      console.error('  FAIL: Thời lượng sau khi trim không giảm đúng 1.0 giây.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 3]: ${err.message}`);
  }

  // TEST 4 (Ca 3): Render phối trộn hoàn chỉnh với Beat qua AudioMixerService (vocalOffsetMs = 500ms)
  totalTests++;
  try {
    console.log('\n[TEST 4 - Ca 3] Phối trộn đầy đủ Beat & Vocal với AudioMixerService (vocalOffsetMs = +500ms)...');

    const mixResult = await mixAudioTracks({
      trackAPath: VOCAL_FIXTURE,
      trackBPath: BEAT_FIXTURE,
      outputPath: MIXED_OFFSET_OUTPUT,
      tempoRatio: 1.25,
      vocalOffsetMs: 500,
      onProgress: (percent) => {
        process.stdout.write(`\r  -> Tiến độ rendering: ${percent}%`);
      }
    });

    console.log('\n  -> File thành phẩm         :', mixResult.outputFileName);
    console.log(`  -> Thời lượng bản mix      : ${mixResult.outputDuration.toFixed(2)}s`);
    console.log(`  -> Tỷ lệ tempo đã áp       : ${mixResult.appliedTempoRatio}x`);
    console.log(`  -> Offset vocal đã áp      : +${mixResult.appliedVocalOffsetMs}ms`);
    console.log(`  -> Thời gian xử lý         : ${mixResult.executionTimeMs}ms`);

    // Đo âm lượng đỉnh để kiểm tra chống clipping
    const maxVol = await probeMaxVolume(MIXED_OFFSET_OUTPUT);
    console.log(`  -> Max Volume Peak         : ${maxVol} dBFS (Ngưỡng an toàn <= 0 dBFS)`);

    const isOutputValid = fs.existsSync(MIXED_OFFSET_OUTPUT) && mixResult.sizeBytes > 0;
    const isOffsetReported = mixResult.appliedVocalOffsetMs === 500;
    const isNotClipping = maxVol <= 0.0;
    const isFastEnough = mixResult.executionTimeMs <= 2500;

    if (isOutputValid && isOffsetReported && isNotClipping && isFastEnough) {
      console.log('  PASS: Bản mix phối trộn thành công với Offset Alignment, không bị clipping, âm lượng chuẩn.');
      passedTests++;
    } else {
      console.error('  FAIL: Bản mix phối trộn không thỏa mãn các tiêu chuẩn kỹ thuật.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 4]: ${err.message}`);
  }

  // TỔNG KẾT KẾT QUẢ KIỂM THỬ
  console.log('\n' + '='.repeat(75));
  console.log(`  KẾT QUẢ TEST SUITE OFFSET: ĐẠT ${passedTests}/${totalTests} TIÊU CHUẨN (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('='.repeat(75));

  if (passedTests === totalTests) {
    console.log('🎉 TẤT CẢ TIÊU CHUẨN NGHIỆM THU (DoD) CỦA TASK 7.1 ĐÃ ĐẠT 100%!\n');
    process.exit(0);
  } else {
    console.error('❌ MỘT SỐ TEST CASE CHƯA ĐẠT. VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT.\n');
    process.exit(1);
  }
}

runOffsetMixerTests().catch((err) => {
  console.error('[Fatal Error in test_mixer_offset]:', err);
  process.exit(1);
});
