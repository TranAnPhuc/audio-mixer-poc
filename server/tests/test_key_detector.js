import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { KeyDetectorService } from '../src/services/KeyDetectorService.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const C_MAJOR_FILE = path.join(FIXTURES_DIR, 'c_major_test.mp3');
const A_MINOR_FILE = path.join(FIXTURES_DIR, 'a_minor_test.mp3');

/**
 * Sinh file âm thanh hợp âm bằng FFmpeg nếu chưa tồn tại
 */
async function ensureChordFixture(filePath, expression, duration = 3) {
  if (fs.existsSync(filePath)) {
    return;
  }
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `aevalsrc=${expression}:s=44100:d=${duration}`,
    '-c:a', 'libmp3lame',
    '-b:a', '192k',
    filePath
  ];

  await execFileAsync('ffmpeg', args);
  console.log(`[Fixture] Đã sinh tệp âm thanh mẫu: ${path.basename(filePath)}`);
}

async function runKeyDetectorTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: KeyDetectorService (Task 10.1)');
  console.log('===============================================================\n');

  // 1. Chuẩn bị 2 fixture hợp âm chuẩn: Đô trưởng (C Major) và La thứ (A Minor)
  console.log('1. Khởi tạo / Xác thực Fixtures âm thanh chuẩn...');
  // Hợp âm Đô trưởng: C4 (261.63Hz) + E4 (329.63Hz) + G4 (392.00Hz)
  await ensureChordFixture(
    C_MAJOR_FILE,
    'sin(261.63*2*PI*t)+sin(329.63*2*PI*t)+sin(392.00*2*PI*t)'
  );

  // Hợp âm La thứ: A3 (220.00Hz) + C4 (261.63Hz) + E4 (329.63Hz)
  await ensureChordFixture(
    A_MINOR_FILE,
    'sin(220.00*2*PI*t)+sin(261.63*2*PI*t)+sin(329.63*2*PI*t)'
  );
  console.log('   ✓ Fixtures sẵn sàng trên đĩa.\n');

  // 2. Kiểm thử nhận diện hợp âm Đô trưởng (C Major)
  console.log('2. Kiểm thử phát hiện tông Đô trưởng (C Major / 8B)...');
  const cMajorResult = await KeyDetectorService.detectKey(C_MAJOR_FILE);
  console.log('   Kết quả phân tích C Major:', {
    key: cMajorResult.key,
    scale: cMajorResult.scale,
    camelot: cMajorResult.camelot,
    confidence: cMajorResult.confidence,
    executionTimeMs: `${cMajorResult.executionTimeMs}ms`
  });

  if (cMajorResult.key !== 'C' || cMajorResult.scale !== 'major' || cMajorResult.camelot !== '8B') {
    throw new Error(
      `[FAIL] Phát hiện sai tông C Major! Kỳ vọng C Major / 8B, thực tế: ${cMajorResult.key} ${cMajorResult.scale} / ${cMajorResult.camelot}`
    );
  }
  if (cMajorResult.confidence < 0.7) {
    throw new Error(
      `[FAIL] Độ tin cậy (confidence) của C Major quá thấp: ${cMajorResult.confidence} (< 0.70)`
    );
  }
  if (cMajorResult.executionTimeMs > 2000) {
    throw new Error(
      `[FAIL] Thời gian xử lý vượt quá 2 giây: ${cMajorResult.executionTimeMs}ms`
    );
  }
  console.log('   ✓ Nhận diện chính xác 100% C Major (8B) trong thời gian quy định.\n');

  // 3. Kiểm thử nhận diện hợp âm La thứ (A Minor)
  console.log('3. Kiểm thử phát hiện tông La thứ (A Minor / 8A)...');
  const aMinorResult = await KeyDetectorService.detectKey(A_MINOR_FILE);
  console.log('   Kết quả phân tích A Minor:', {
    key: aMinorResult.key,
    scale: aMinorResult.scale,
    camelot: aMinorResult.camelot,
    confidence: aMinorResult.confidence,
    executionTimeMs: `${aMinorResult.executionTimeMs}ms`
  });

  if (aMinorResult.key !== 'Am' || aMinorResult.scale !== 'minor' || aMinorResult.camelot !== '8A') {
    throw new Error(
      `[FAIL] Phát hiện sai tông A Minor! Kỳ vọng Am / 8A, thực tế: ${aMinorResult.key} ${aMinorResult.scale} / ${aMinorResult.camelot}`
    );
  }
  if (aMinorResult.confidence < 0.7) {
    throw new Error(
      `[FAIL] Độ tin cậy (confidence) của A Minor quá thấp: ${aMinorResult.confidence} (< 0.70)`
    );
  }
  if (aMinorResult.executionTimeMs > 2000) {
    throw new Error(
      `[FAIL] Thời gian xử lý vượt quá 2 giây: ${aMinorResult.executionTimeMs}ms`
    );
  }
  console.log('   ✓ Nhận diện chính xác 100% A Minor (8A) trong thời gian quy định.\n');

  // 4. Kiểm thử thuật toán tính bán âm tối ưu calculateOptimalPitchShift
  console.log('4. Kiểm thử hàm calculateOptimalPitchShift theo quy tắc Camelot Wheel...');

  // Ca 1: Cùng mã Camelot (8B và 8B) -> Kỳ vọng 0 bán âm
  const shiftSame = KeyDetectorService.calculateOptimalPitchShift('8B', '8B');
  console.log(`   - 8B (C) vs 8B (C): shift = ${shiftSame} (Kỳ vọng: 0)`);
  if (shiftSame !== 0) {
    throw new Error(`[FAIL] Ca cùng mã Camelot 8B vs 8B phải trả về 0, nhận: ${shiftSame}`);
  }

  // Ca 2: Cùng vòng tròn tương thích lân cận (8B và 9B - C sang G) -> Kỳ vọng 0 bán âm (đã hòa âm)
  const shiftAdjacent = KeyDetectorService.calculateOptimalPitchShift('8B', '9B');
  console.log(`   - 8B (C) vs 9B (G): shift = ${shiftAdjacent} (Kỳ vọng: 0 - Đã là lân cận hòa âm an toàn)`);
  if (shiftAdjacent !== 0) {
    throw new Error(`[FAIL] Ca lân cận 8B vs 9B phải trả về 0, nhận: ${shiftAdjacent}`);
  }

  // Ca 3: Cặp Trưởng / Thứ tương đối (8A - Am và 8B - C) -> Kỳ vọng 0 bán âm
  const shiftRelative = KeyDetectorService.calculateOptimalPitchShift('8A', '8B');
  console.log(`   - 8A (Am) vs 8B (C): shift = ${shiftRelative} (Kỳ vọng: 0 - Cặp cung tương đối)`);
  if (shiftRelative !== 0) {
    throw new Error(`[FAIL] Ca tương đối 8A vs 8B phải trả về 0, nhận: ${shiftRelative}`);
  }

  // Ca 4: Vocal 1B (B Major) vs Beat 8B (C Major) -> Dịch +1 bán âm để thành C Major (8B)
  const shiftBtoC = KeyDetectorService.calculateOptimalPitchShift('1B', '8B');
  console.log(`   - 1B (B) vs 8B (C): shift = ${shiftBtoC} (Kỳ vọng: +1)`);
  if (shiftBtoC !== 1) {
    throw new Error(`[FAIL] Ca 1B vs 8B phải dịch +1 bán âm, nhận: ${shiftBtoC}`);
  }

  // Ca 5: Vocal 10B (D Major) vs Beat 8B (C Major) -> Dịch -2 bán âm để thành C Major (8B)
  const shiftDtoC = KeyDetectorService.calculateOptimalPitchShift('10B', '8B');
  console.log(`   - 10B (D) vs 8B (C): shift = ${shiftDtoC} (Kỳ vọng: -2)`);
  if (shiftDtoC !== -2) {
    throw new Error(`[FAIL] Ca 10B vs 8B phải dịch -2 bán âm, nhận: ${shiftDtoC}`);
  }

  // Ca 6: Vocal 10A (B Minor) vs Beat 8B (C Major) -> Dịch -2 bán âm để thành A Minor (8A, tương đối của 8B)
  const shiftBmtoC = KeyDetectorService.calculateOptimalPitchShift('10A', '8B');
  console.log(`   - 10A (Bm) vs 8B (C): shift = ${shiftBmtoC} (Kỳ vọng: -2)`);
  if (shiftBmtoC !== -2) {
    throw new Error(`[FAIL] Ca 10A vs 8B phải dịch -2 bán âm, nhận: ${shiftBmtoC}`);
  }

  // Ca 7: Kiểm tra kết quả chi tiết options.detailed: true
  const detailedResult = KeyDetectorService.calculateOptimalPitchShift('1B', '8B', { detailed: true });
  console.log('   - Kết quả chi tiết 1B vs 8B:', detailedResult);
  if (!detailedResult.isCompatible || detailedResult.semitones !== 1 || detailedResult.shiftedVocalCamelot !== '8B') {
    throw new Error(`[FAIL] options.detailed trả về kết quả không chính xác`);
  }

  console.log('\n===============================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST KEY DETECTOR & PITCH SHIFT ĐÃ VƯỢT QUA 100%!');
  console.log('===============================================================');
}

runKeyDetectorTests().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
