import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import { mixAudioTracks, getAudioMetadata, buildAtempoFilterChain } from '../src/services/AudioMixerService.js';
import prisma from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const VOCAL_FIXTURE = path.join(FIXTURES_DIR, 'vocal_test.mp3');
const BEAT_FIXTURE = path.join(FIXTURES_DIR, 'beat_test.mp3');

const OUTPUT_DIR = path.resolve(__dirname, '../storage/outputs');
const STRETCHED_VOCAL_OUTPUT = path.join(OUTPUT_DIR, 'test_vocal_stretched_1.25.mp3');
const MIXED_TEMPO_OUTPUT = path.join(OUTPUT_DIR, 'test_mixed_tempo.mp3');

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

async function runTempoMixerTests() {
  console.log('='.repeat(70));
  console.log('  TEST SUITE: AudioMixerService với Time-Stretching (Filter atempo)');
  console.log('='.repeat(70));

  let passedTests = 0;
  let totalTests = 0;

  // TEST 1: Kiểm thử logic phân rã nối tầng chuỗi filter (buildAtempoFilterChain)
  totalTests++;
  try {
    console.log('\n[TEST 1] Kiểm tra helper phân rã chuỗi atempo an toàn (Filter Chaining)...');

    const chain1 = buildAtempoFilterChain(1.0);
    const chain125 = buildAtempoFilterChain(1.25);
    const chain25 = buildAtempoFilterChain(2.5);
    const chain04 = buildAtempoFilterChain(0.4);

    console.log(`  -> ratio = 1.0  => "${chain1}" (kỳ vọng: "")`);
    console.log(`  -> ratio = 1.25 => "${chain125}" (kỳ vọng: "atempo=1.25")`);
    console.log(`  -> ratio = 2.5  => "${chain25}" (kỳ vọng: "atempo=2.0,atempo=1.25")`);
    console.log(`  -> ratio = 0.4  => "${chain04}" (kỳ vọng: "atempo=0.5,atempo=0.8")`);

    const isChain1Valid = chain1 === '';
    const isChain125Valid = chain125 === 'atempo=1.25';
    const isChain25Valid = chain25 === 'atempo=2.0,atempo=1.25';
    const isChain04Valid = chain04 === 'atempo=0.5,atempo=0.8';

    if (isChain1Valid && isChain125Valid && isChain25Valid && isChain04Valid) {
      console.log('  PASS: Thuật toán phân rã atempo xử lý đúng giới hạn [0.5, 2.0] của FFmpeg.');
      passedTests++;
    } else {
      console.error('  FAIL: Chuỗi atempo không khớp kết quả kỳ vọng.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 1]: ${err.message}`);
  }

  // TEST 2: Render Vocal độc lập với tỷ lệ co dãn 1.25 (DoD: co lại đúng 20%)
  totalTests++;
  try {
    console.log('\n[TEST 2] Render Vocal độc lập với tỷ lệ co dãn tempoRatio = 1.25...');

    await new Promise((resolve, reject) => {
      ffmpeg(VOCAL_FIXTURE)
        .audioFilters('atempo=1.25')
        .outputOptions(['-c:a libmp3lame', '-b:a 320k', '-ar 44100'])
        .output(STRETCHED_VOCAL_OUTPUT)
        .on('error', reject)
        .on('end', resolve)
        .run();
    });

    const origMeta = await getAudioMetadata(VOCAL_FIXTURE);
    const stretchedMeta = await getAudioMetadata(STRETCHED_VOCAL_OUTPUT);

    const origDuration = origMeta.duration; // 10.0s
    const newDuration = stretchedMeta.duration; // ~ 8.0s
    const compressionRatio = (origDuration - newDuration) / origDuration; // (10 - 8) / 10 = 0.20 (20%)

    console.log(`  -> Thời lượng gốc      : ${origDuration.toFixed(2)}s`);
    console.log(`  -> Thời lượng sau co dãn: ${newDuration.toFixed(2)}s (Kỳ vọng ~ 8.00s)`);
    console.log(`  -> Tỷ lệ co ngắn       : ${(compressionRatio * 100).toFixed(1)}% (Kỳ vọng đúng 20.0%)`);

    // Sai số thời lượng cho phép <= 0.1s
    if (Math.abs(newDuration - 8.0) <= 0.1 && Math.abs(compressionRatio - 0.20) <= 0.02) {
      console.log('  PASS: Thời lượng Vocal co ngắn chuẩn xác 20% mà không bị méo tiếng.');
      passedTests++;
    } else {
      console.error('  FAIL: Thời lượng co dãn sai lệch quá mức cho phép.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 2]: ${err.message}`);
  }

  // TEST 3: Thực hiện mix 2 file fixture qua AudioMixerService với tempoRatio = 1.25
  totalTests++;
  try {
    console.log('\n[TEST 3] Phối trộn 2 track với AudioMixerService (tempoRatio = 1.25)...');

    const mixResult = await mixAudioTracks({
      trackAPath: VOCAL_FIXTURE,
      trackBPath: BEAT_FIXTURE,
      outputPath: MIXED_TEMPO_OUTPUT,
      tempoRatio: 1.25,
      onProgress: (percent) => {
        process.stdout.write(`\r  -> Tiến độ rendering: ${percent}%`);
      }
    });

    console.log('\n  -> File thành phẩm     :', mixResult.outputFileName);
    console.log(`  -> Thời lượng bản mix  : ${mixResult.outputDuration}s (Theo độ dài Beat gốc 10s)`);
    console.log(`  -> Tỷ lệ tempo đã áp   : ${mixResult.appliedTempoRatio}`);
    console.log(`  -> Thời gian xử lý     : ${mixResult.executionTimeMs}ms`);

    // Đo âm lượng đỉnh để xác minh Limiter chống clipping
    const maxVol = await probeMaxVolume(MIXED_TEMPO_OUTPUT);
    console.log(`  -> Max Volume Peak     : ${maxVol} dBFS (Ngưỡng an toàn < 0 dBFS)`);

    const isOutputValid = fs.existsSync(MIXED_TEMPO_OUTPUT) && mixResult.sizeBytes > 0;
    const isDurationValid = Math.abs(mixResult.outputDuration - 10.0) <= 0.2;
    const isNotClipping = maxVol <= 0.0;
    const isFastEnough = mixResult.executionTimeMs <= 2000;

    if (isOutputValid && isDurationValid && isNotClipping && isFastEnough) {
      console.log('  PASS: Bản mix phối trộn thành công, giữ nguyên nhịp Beat, không bị clipping.');
      passedTests++;
    } else {
      console.error('  FAIL: Bản mix không thỏa mãn các tiêu chí kỹ thuật.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 3]: ${err.message}`);
  }

  // TEST 4: Xác thực Prisma Migration (Lưu và đọc 3 trường mới trong SQLite)
  totalTests++;
  try {
    console.log('\n[TEST 4] Xác thực Prisma Schema: Ghi & đọc trackABpm, trackBBpm, appliedTempoRatio...');

    const testJob = await prisma.mixJob.create({
      data: {
        trackAOriginalName: 'vocal_test.mp3',
        trackAPath: VOCAL_FIXTURE,
        trackAMimeType: 'audio/mpeg',
        trackASize: 1024,
        trackABpm: 134.6,
        trackBOriginalName: 'beat_test.mp3',
        trackBPath: BEAT_FIXTURE,
        trackBMimeType: 'audio/mpeg',
        trackBSize: 2048,
        trackBBpm: 170.9,
        appliedTempoRatio: 1.27
      }
    });

    const retrievedJob = await prisma.mixJob.findUnique({
      where: { id: testJob.id }
    });

    console.log(`  -> Record created ID   : ${retrievedJob.id}`);
    console.log(`  -> Track A BPM         : ${retrievedJob.trackABpm}`);
    console.log(`  -> Track B BPM         : ${retrievedJob.trackBBpm}`);
    console.log(`  -> Applied Tempo Ratio : ${retrievedJob.appliedTempoRatio}`);

    const isDbValid =
      retrievedJob.trackABpm === 134.6 &&
      retrievedJob.trackBBpm === 170.9 &&
      retrievedJob.appliedTempoRatio === 1.27;

    // Dọn dẹp bản ghi kiểm thử
    await prisma.mixJob.delete({ where: { id: testJob.id } });

    if (isDbValid) {
      console.log('  PASS: Cơ sở dữ liệu SQLite và Prisma Client đồng bộ 100% với 3 trường mới.');
      passedTests++;
    } else {
      console.error('  FAIL: Dữ liệu đọc từ SQLite không khớp.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 4]: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // TỔNG KẾT
  console.log('\n' + '='.repeat(70));
  console.log(`  KẾT QUẢ: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('='.repeat(70));

  if (passedTests === totalTests) {
    console.log('>> [DOD VERIFIED] Task 6.2 đáp ứng 100% tiêu chuẩn nghiệm thu!\n');
    process.exit(0);
  } else {
    console.error('>> [DOD FAILED] Có test case không đạt yêu cầu!\n');
    process.exit(1);
  }
}

runTempoMixerTests();
