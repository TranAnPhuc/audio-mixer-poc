import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { BpmDetectorService } from '../src/services/BpmDetectorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const VOCAL_FIXTURE = path.join(FIXTURES_DIR, 'vocal_test.mp3');
const BEAT_FIXTURE = path.join(FIXTURES_DIR, 'beat_test.mp3');
const RHYTHM_120_FIXTURE = path.join(FIXTURES_DIR, 'rhythm_120bpm.mp3');

async function runBpmTests() {
  console.log('='.repeat(70));
  console.log('  TEST SUITE: BpmDetectorService (Onset Detection & Tempo Extraction)');
  console.log('='.repeat(70));

  let passedTests = 0;
  let totalTests = 0;

  // TEST 1: Đo BPM của Track A (vocal_test.mp3)
  totalTests++;
  try {
    console.log('\n[TEST 1] Đo BPM cho file mẫu Track A (vocal_test.mp3)...');
    const result = await BpmDetectorService.detectBpm(VOCAL_FIXTURE);

    console.log(`  -> Kết quả BPM        : ${result.bpm}`);
    console.log(`  -> Số lượng phách     : ${result.beatsCount}`);
    console.log(`  -> Thời lượng phân tích: ${result.durationSec}s`);
    console.log(`  -> Thời gian thực thi : ${result.executionTimeMs}ms`);

    if (result.bpm !== null && result.executionTimeMs <= 2000) {
      console.log('  PASS: Đo BPM thành công trong giới hạn thời gian (<= 2000ms).');
      passedTests++;
    } else {
      console.error('  FAIL: Kết quả không đạt tiêu chuẩn DoD.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 1]: ${err.message}`);
  }

  // TEST 2: Đo BPM của Track B (beat_test.mp3)
  totalTests++;
  try {
    console.log('\n[TEST 2] Đo BPM cho file mẫu Track B (beat_test.mp3)...');
    const result = await BpmDetectorService.detectBpm(BEAT_FIXTURE);

    console.log(`  -> Kết quả BPM        : ${result.bpm}`);
    console.log(`  -> Số lượng phách     : ${result.beatsCount}`);
    console.log(`  -> Thời lượng phân tích: ${result.durationSec}s`);
    console.log(`  -> Thời gian thực thi : ${result.executionTimeMs}ms`);

    if (result.bpm !== null && result.executionTimeMs <= 2000) {
      console.log('  PASS: Đo BPM thành công trong giới hạn thời gian (<= 2000ms).');
      passedTests++;
    } else {
      console.error('  FAIL: Kết quả không đạt tiêu chuẩn DoD.');
    }
  } catch (err) {
    console.error(`  FAIL [TEST 2]: ${err.message}`);
  }

  // TEST 3: Kiểm chứng độ chính xác với file nhịp chuẩn 120 BPM (rhythm_120bpm.mp3)
  if (fs.existsSync(RHYTHM_120_FIXTURE)) {
    totalTests++;
    try {
      console.log('\n[TEST 3] Kiểm chứng độ chính xác với tệp nhịp chuẩn 120 BPM...');
      const result = await BpmDetectorService.detectBpm(RHYTHM_120_FIXTURE);

      console.log(`  -> Kết quả BPM        : ${result.bpm} (Kỳ vọng ~ 120.0 BPM)`);
      console.log(`  -> Số lượng phách     : ${result.beatsCount}`);
      console.log(`  -> Thời gian thực thi : ${result.executionTimeMs}ms`);

      // Độ lệch cho phép không quá 2 BPM so với 120.0
      if (Math.abs(result.bpm - 120.0) <= 2.0 && result.executionTimeMs <= 2000) {
        console.log('  PASS: Độ chính xác đạt chuẩn (sai số <= 2 BPM).');
        passedTests++;
      } else {
        console.error('  FAIL: Sai lệch BPM vượt quá ngưỡng cho phép.');
      }
    } catch (err) {
      console.error(`  FAIL [TEST 3]: ${err.message}`);
    }
  }

  // TEST 4: Kiểm thử ca biên - File không tồn tại
  totalTests++;
  try {
    console.log('\n[TEST 4] Kiểm thử an toàn ca biên: File không tồn tại...');
    await BpmDetectorService.detectBpm(path.join(FIXTURES_DIR, 'non_existent_file.mp3'));
    console.error('  FAIL: Lẽ ra phải throw Exception khi file không tồn tại.');
  } catch (err) {
    if (err.message.includes('không tồn tại')) {
      console.log(`  PASS: Bắt đúng ngoại lệ an toàn (${err.message}).`);
      passedTests++;
    } else {
      console.error(`  FAIL: Ngoại lệ không đúng kỳ vọng: ${err.message}`);
    }
  }

  // TỔNG KẾT
  console.log('\n' + '='.repeat(70));
  console.log(`  KẾT QUẢ: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('='.repeat(70));

  if (passedTests === totalTests) {
    console.log('>> [DOD VERIFIED] BpmDetectorService đáp ứng 100% tiêu chuẩn nghiệm thu!\n');
    process.exit(0);
  } else {
    console.error('>> [DOD FAILED] Có test case không đạt yêu cầu!\n');
    process.exit(1);
  }
}

runBpmTests();
