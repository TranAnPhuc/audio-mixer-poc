import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

/**
 * 12 Lớp Cao Độ Chuẩn (12 Pitch Classes): C, C#, D, D#, E, F, F#, G, G#, A, A#, B
 */
const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Vector Trọng Số Khuôn Mẫu Cảm Thụ Âm Học Chuẩn Krumhansl-Schmuckler (Krumhansl Key Profiles)
 * Biểu diễn phân phối xác suất và mức độ ổn định cảm nhận của 12 cao độ đối với âm chủ (Tonic).
 */
const KRUMHANSL_MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88
];

const KRUMHANSL_MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17
];

/**
 * Bảng Ánh Xạ Cung Nhạc Sang Mã Hóa Vòng Tròn Camelot Wheel (Camelot Notation Table)
 * Chuẩn DJ & Sản xuất âm nhạc chuyên nghiệp (Mixed In Key / Rekordbox / Traktor)
 */
const CAMELOT_MAP = {
  major: {
    0: '8B',  // C Major
    1: '3B',  // C# Major / Db
    2: '10B', // D Major
    3: '5B',  // D# Major / Eb
    4: '12B', // E Major
    5: '7B',  // F Major
    6: '2B',  // F# Major / Gb
    7: '9B',  // G Major
    8: '4B',  // G# Major / Ab
    9: '11B', // A Major
    10: '6B', // A# Major / Bb
    11: '1B'  // B Major
  },
  minor: {
    0: '5A',  // C Minor
    1: '12A', // C# Minor
    2: '7A',  // D Minor
    3: '2A',  // D# Minor / Ebm
    4: '9A',  // E Minor
    5: '4A',  // F Minor
    6: '11A', // F# Minor
    7: '6A',  // G Minor
    8: '1A',  // G# Minor / Abm
    9: '8A',  // A Minor
    10: '3A', // A# Minor / Bbm
    11: '10A' // B Minor
  }
};

/**
 * Bảng Ánh Xạ Ngược: Từ Mã Camelot Code sang Pitch Class (0..11) và Mode ('major'|'minor')
 */
const REVERSE_CAMELOT_MAP = {
  '1B': { pc: 11, mode: 'major', name: 'B' },
  '2B': { pc: 6, mode: 'major', name: 'F#' },
  '3B': { pc: 1, mode: 'major', name: 'C#' },
  '4B': { pc: 8, mode: 'major', name: 'G#' },
  '5B': { pc: 3, mode: 'major', name: 'D#' },
  '6B': { pc: 10, mode: 'major', name: 'A#' },
  '7B': { pc: 5, mode: 'major', name: 'F' },
  '8B': { pc: 0, mode: 'major', name: 'C' },
  '9B': { pc: 7, mode: 'major', name: 'G' },
  '10B': { pc: 2, mode: 'major', name: 'D' },
  '11B': { pc: 9, mode: 'major', name: 'A' },
  '12B': { pc: 4, mode: 'major', name: 'E' },

  '1A': { pc: 8, mode: 'minor', name: 'G#' },
  '2A': { pc: 3, mode: 'minor', name: 'D#' },
  '3A': { pc: 10, mode: 'minor', name: 'A#' },
  '4A': { pc: 5, mode: 'minor', name: 'F' },
  '5A': { pc: 0, mode: 'minor', name: 'C' },
  '6A': { pc: 7, mode: 'minor', name: 'G' },
  '7A': { pc: 2, mode: 'minor', name: 'D' },
  '8A': { pc: 9, mode: 'minor', name: 'A' },
  '9A': { pc: 4, mode: 'minor', name: 'E' },
  '10A': { pc: 11, mode: 'minor', name: 'B' },
  '11A': { pc: 6, mode: 'minor', name: 'F#' },
  '12A': { pc: 1, mode: 'minor', name: 'C#' }
};

/**
 * Thuật toán Biến đổi Fourier Nhanh Cooley-Tukey Radix-2 (In-Place Fast Fourier Transform)
 * Tối ưu hóa mảng TypedArray cho tốc độ xử lý cấp micro-giây trong V8 Engine.
 * @param {Float32Array} re Phần thực (Real part, độ dài lũy thừa của 2)
 * @param {Float32Array} im Phần ảo (Imaginary part, độ dài lũy thừa của 2)
 */
function radix2FFT(re, im) {
  const n = re.length;

  // 1. Hoán vị đảo bit (Bit-reversal permutation)
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  // 2. Các tầng bướm FFT (Butterfly operations)
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlen_r = Math.cos(ang);
    const wlen_i = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const u_r = re[i + j];
        const u_i = im[i + j];
        const v_r = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
        const v_i = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
        re[i + j] = u_r + v_r;
        im[i + j] = u_i + v_i;
        re[i + j + len / 2] = u_r - v_r;
        im[i + j + len / 2] = u_i - v_i;
        const nwr = wr * wlen_r - wi * wlen_i;
        wi = wr * wlen_i + wi * wlen_r;
        wr = nwr;
      }
    }
  }
}

/**
 * Tính Hệ Số Tương Quan Tuyến Tính Pearson (Pearson Correlation Coefficient)
 * Đo lường mức độ tương đồng giữa vector Chroma quan sát được và vector Profile khuôn mẫu.
 * @param {Float32Array|number[]} x Vector 12 phần tử quan sát
 * @param {Float32Array|number[]} y Vector 12 phần tử khuôn mẫu
 * @returns {number} Giá trị hệ số tương quan trong khoảng [-1.0, 1.0]
 */
function calculatePearsonCorrelation(x, y) {
  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < 12; i++) {
    meanX += x[i];
    meanY += y[i];
  }
  meanX /= 12;
  meanY /= 12;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < 12; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denominator = Math.sqrt(denX * denY);
  if (denominator === 0) return 0;
  return num / denominator;
}

/**
 * Service Phân Tích & Nhận Diện Tông Nhạc (Key & Harmonic Detector Service)
 * Kết hợp giải mã luồng PCM âm thanh, trích xuất đặc trưng phổ Chroma (STFT 12-Bin)
 * và so khớp khuôn mẫu Krumhansl-Schmuckler để định danh Key, Scale và mã Camelot.
 */
export class KeyDetectorService {
  /**
   * Phân tích và phát hiện tông nhạc của tệp âm thanh
   * @param {string} filePath Đường dẫn tệp âm thanh
   * @param {object} [options] Tùy chọn cấu hình
   * @param {number} [options.sampleRate=22050] Tần số lấy mẫu tối ưu cho phân tích nốt nhạc (Hz)
   * @param {number} [options.maxDuration=60] Thời lượng tối đa trích xuất để phân tích (giây)
   * @param {number} [options.frameSize=4096] Kích thước cửa sổ FFT (samples, 4096 tương đương ~185ms tại 22.05kHz)
   * @param {number} [options.hopSize=2048] Độ trượt phân tích (samples, 50% overlap)
   * @returns {Promise<{
   *   key: string,
   *   scale: 'major'|'minor',
   *   camelot: string,
   *   confidence: number,
   *   chroma: number[],
   *   durationSec: number,
   *   executionTimeMs: number
   * }>}
   */
  static async detectKey(filePath, options = {}) {
    const startTime = performance.now();
    const sampleRate = options.sampleRate || 22050;
    const maxDuration = options.maxDuration ?? 60;
    const frameSize = options.frameSize || 4096;
    const hopSize = options.hopSize || 2048;

    // 1. Kiểm tra tính hợp lệ của tệp đầu vào
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('[KeyDetectorService] Đường dẫn tệp âm thanh không hợp lệ.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`[KeyDetectorService] Tệp âm thanh không tồn tại trên đĩa: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error(`[KeyDetectorService] Tệp âm thanh rỗng (0 bytes): ${filePath}`);
    }

    // 2. Trích xuất luồng raw PCM 16-bit Mono (22,050 Hz) trực tiếp qua Stream
    let rawPcmBuffer;
    try {
      rawPcmBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const cmd = ffmpeg(filePath)
          .toFormat('s16le')
          .audioChannels(1)
          .audioFrequency(sampleRate);

        if (maxDuration && maxDuration > 0) {
          cmd.duration(maxDuration);
        }

        cmd.on('error', (err) => {
          reject(new Error(`[KeyDetectorService] FFmpeg giải mã PCM thất bại: ${err.message}`));
        });

        const stream = cmd.pipe();

        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        stream.on('error', (err) => {
          reject(new Error(`[KeyDetectorService] Lỗi luồng PCM stream: ${err.message}`));
        });

        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (streamErr) {
      throw new Error(`[KeyDetectorService] Quá trình trích xuất PCM bị gián đoạn: ${streamErr.message}`);
    }

    const sampleCount = Math.floor(rawPcmBuffer.length / 2);
    const durationSec = Number((sampleCount / sampleRate).toFixed(2));

    // Xử lý ca biên: Thời lượng audio quá ngắn (< 0.5s)
    if (sampleCount < frameSize) {
      return {
        key: 'C',
        scale: 'major',
        camelot: '8B',
        confidence: 0,
        chroma: new Array(12).fill(0),
        durationSec,
        executionTimeMs: Math.round(performance.now() - startTime)
      };
    }

    // 3. Chuyển đổi Int16Array sang Float32Array chuẩn hóa [-1.0, 1.0]
    const int16View = new Int16Array(
      rawPcmBuffer.buffer,
      rawPcmBuffer.byteOffset,
      sampleCount
    );
    const float32Data = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      float32Data[i] = int16View[i] / 32768.0;
    }

    // 4. Khởi tạo Cửa sổ Hanning (Hanning Window) giảm thiểu hiện tượng rò rỉ phổ (Spectral Leakage)
    const hanning = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      hanning[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
    }

    // Khởi tạo bộ đệm FFT và mảng tích lũy Chroma toàn bài
    const re = new Float32Array(frameSize);
    const im = new Float32Array(frameSize);
    const globalChroma = new Float32Array(12);

    // Dải tần số nốt nhạc cần phân tích: Từ C2 (~65.41 Hz) đến B6 (~1975.53 Hz)
    const minBin = Math.max(1, Math.round((65.41 * frameSize) / sampleRate));
    const maxBin = Math.min(frameSize / 2 - 1, Math.round((1975.53 * frameSize) / sampleRate));

    // 5. Vòng lặp STFT (Short-Time Fourier Transform) trượt qua các khung âm thanh
    for (let pos = 0; pos + frameSize <= sampleCount; pos += hopSize) {
      // Áp dụng cửa sổ Hanning
      for (let i = 0; i < frameSize; i++) {
        re[i] = float32Data[pos + i] * hanning[i];
        im[i] = 0;
      }

      // Thực thi Fast Fourier Transform
      radix2FFT(re, im);

      // Gom năng lượng vào 12 lớp cao độ (Pitch Class Profile)
      for (let k = minBin; k <= maxBin; k++) {
        const freq = (k * sampleRate) / frameSize;
        const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);

        // Tính số thứ tự MIDI tương ứng: m = 12 * log2(f / 440) + 69
        const midi = 12 * Math.log2(freq / 440) + 69;
        const nearestMidi = Math.round(midi);
        const deviation = Math.abs(midi - nearestMidi);

        // Chỉ tích lũy các vạch năng lượng nằm gần tần số nốt chuẩn (độ lệch < 0.45 bán âm)
        if (deviation < 0.45) {
          const pitchClass = ((nearestMidi % 12) + 12) % 12;
          const weight = Math.cos(Math.PI * deviation); // Trọng số cosin theo độ lệch tâm
          globalChroma[pitchClass] += mag * mag * weight;
        }
      }
    }

    // 6. Chuẩn hóa vector Chroma toàn bài theo L2-norm
    let chromaNorm = 0;
    for (let i = 0; i < 12; i++) {
      chromaNorm += globalChroma[i] * globalChroma[i];
    }
    chromaNorm = Math.sqrt(chromaNorm);

    if (chromaNorm > 0) {
      for (let i = 0; i < 12; i++) {
        globalChroma[i] /= chromaNorm;
      }
    }

    // 7. Thuật toán So Khớp Tông Krumhansl-Schmuckler (Key Profile Matching)
    let bestCorrelation = -2;
    let detectedRootIndex = 0;
    let detectedScale = 'major';

    // Tạo 24 khuôn mẫu (12 Major + 12 Minor) bằng Circular Shift
    for (let root = 0; root < 12; root++) {
      // A. Kiểm tra cung Trưởng (Major)
      const shiftedMajor = new Float32Array(12);
      for (let i = 0; i < 12; i++) {
        shiftedMajor[i] = KRUMHANSL_MAJOR_PROFILE[(i - root + 12) % 12];
      }
      const rMajor = calculatePearsonCorrelation(globalChroma, shiftedMajor);
      if (rMajor > bestCorrelation) {
        bestCorrelation = rMajor;
        detectedRootIndex = root;
        detectedScale = 'major';
      }

      // B. Kiểm tra cung Thứ (Minor)
      const shiftedMinor = new Float32Array(12);
      for (let i = 0; i < 12; i++) {
        shiftedMinor[i] = KRUMHANSL_MINOR_PROFILE[(i - root + 12) % 12];
      }
      const rMinor = calculatePearsonCorrelation(globalChroma, shiftedMinor);
      if (rMinor > bestCorrelation) {
        bestCorrelation = rMinor;
        detectedRootIndex = root;
        detectedScale = 'minor';
      }
    }

    const noteName = PITCH_CLASS_NAMES[detectedRootIndex];
    const keyName = detectedScale === 'major' ? noteName : `${noteName}m`;
    const camelotCode = CAMELOT_MAP[detectedScale][detectedRootIndex];
    const confidence = Math.max(0, Math.min(1, Number(bestCorrelation.toFixed(2))));
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      key: keyName,
      scale: detectedScale,
      camelot: camelotCode,
      confidence,
      chroma: Array.from(globalChroma).map((val) => Number(val.toFixed(4))),
      durationSec,
      executionTimeMs
    };
  }

  /**
   * Phân tích mã Camelot Wheel thành cấu trúc đối tượng
   * @param {string} code Mã Camelot (ví dụ: '8B', '8A', '9B')
   * @returns {{ num: number, letter: 'A'|'B', code: string }|null}
   */
  static parseCamelot(code) {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim().toUpperCase();
    const match = clean.match(/^(\d{1,2})([AB])$/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 12) return null;
    return { num, letter: match[2], code: clean };
  }

  /**
   * Tính khoảng cách giờ trên Vòng Tròn Camelot (ngắn nhất giữa 2 mã)
   * @param {string} codeA
   * @param {string} codeB
   * @returns {number} Khoảng cách giờ từ 0 đến 6
   */
  static camelotDistance(codeA, codeB) {
    const a = this.parseCamelot(codeA);
    const b = this.parseCamelot(codeB);
    if (!a || !b) return 99;
    let diff = Math.abs(a.num - b.num);
    if (diff > 6) diff = 12 - diff;
    return diff;
  }

  /**
   * Đánh giá mức độ tương thích hòa âm giữa 2 mã Camelot theo quy tắc DJ Harmonix
   * @param {string} vocalCamelot
   * @param {string} beatCamelot
   * @returns {{ score: number, relation: 'exact'|'relative'|'adjacent'|'diagonal'|'incompatible' }}
   */
  static evaluateCompatibility(vocalCamelot, beatCamelot) {
    const v = this.parseCamelot(vocalCamelot);
    const b = this.parseCamelot(beatCamelot);
    if (!v || !b) return { score: 0, relation: 'incompatible' };

    // Cùng chính xác mã Camelot (ví dụ: 8B và 8B)
    if (v.code === b.code) {
      return { score: 100, relation: 'exact' };
    }

    // Cùng giờ nhưng khác Mode: Cặp Trưởng / Thứ tương đối (ví dụ: 8A và 8B - Am và C)
    if (v.num === b.num && v.letter !== b.letter) {
      return { score: 90, relation: 'relative' };
    }

    const dist = this.camelotDistance(v.code, b.code);

    // Cùng Mode và cách nhau đúng 1 giờ (ví dụ: 8B và 9B, hoặc 8B và 7B)
    if (dist === 1 && v.letter === b.letter) {
      return { score: 80, relation: 'adjacent' };
    }

    // Khác Mode và cách nhau 1 giờ (Diagonal shift, ví dụ: 8A sang 9B)
    if (dist === 1 && v.letter !== b.letter) {
      return { score: 60, relation: 'diagonal' };
    }

    return { score: 0, relation: 'incompatible' };
  }

  /**
   * Tính toán khoảng cách dịch chuyển bán âm tối ưu (Optimal Pitch Shift)
   * Tìm số bán âm dịch chuyển tối thiểu trong khoảng (-3 ... +3) để đưa Vocal
   * về cung hòa âm tương thích tốt nhất với Beat theo quy tắc vòng tròn Camelot.
   *
   * @param {string} vocalCamelot Mã Camelot của bài Vocal (ví dụ: '8B', '10A')
   * @param {string} beatCamelot Mã Camelot của bài Beat (ví dụ: '8B', '9B')
   * @param {object} [options] Tùy chọn
   * @param {boolean} [options.detailed=false] Nếu true, trả về object chi tiết
   * @returns {number|{
   *   semitones: number,
   *   originalVocalCamelot: string,
   *   targetBeatCamelot: string,
   *   shiftedVocalCamelot: string,
   *   relation: string,
   *   isCompatible: boolean
   * }}
   */
  static calculateOptimalPitchShift(vocalCamelot, beatCamelot, options = {}) {
    const vParsed = this.parseCamelot(vocalCamelot);
    const bParsed = this.parseCamelot(beatCamelot);

    if (!vParsed || !bParsed) {
      return options.detailed
        ? {
            semitones: 0,
            originalVocalCamelot: vocalCamelot,
            targetBeatCamelot: beatCamelot,
            shiftedVocalCamelot: vocalCamelot,
            relation: 'incompatible',
            isCompatible: false
          }
        : 0;
    }

    const vInfo = REVERSE_CAMELOT_MAP[vParsed.code];
    const bInfo = REVERSE_CAMELOT_MAP[bParsed.code];

    if (!vInfo || !bInfo) {
      return options.detailed
        ? {
            semitones: 0,
            originalVocalCamelot: vocalCamelot,
            targetBeatCamelot: beatCamelot,
            shiftedVocalCamelot: vocalCamelot,
            relation: 'incompatible',
            isCompatible: false
          }
        : 0;
    }

    // 1. Kiểm tra nếu ở mức 0 bán âm đã tương thích an toàn (Exact, Relative, Adjacent)
    const zeroCompat = this.evaluateCompatibility(vParsed.code, bParsed.code);
    if (zeroCompat.score >= 80) {
      return options.detailed
        ? {
            semitones: 0,
            originalVocalCamelot: vParsed.code,
            targetBeatCamelot: bParsed.code,
            shiftedVocalCamelot: vParsed.code,
            relation: zeroCompat.relation,
            isCompatible: true
          }
        : 0;
    }

    // 2. Thử nghiệm các mức dịch chuyển trong khoảng [-3, +3] ưu tiên số bán âm nhỏ nhất
    const shiftCandidates = [0, 1, -1, 2, -2, 3, -3];
    let bestShift = 0;
    let bestScore = zeroCompat.score;
    let bestRelation = zeroCompat.relation;
    let bestShiftedCamelot = vParsed.code;

    for (const shift of shiftCandidates) {
      const shiftedPc = ((vInfo.pc + shift) % 12 + 12) % 12;
      const shiftedCamelot = CAMELOT_MAP[vInfo.mode][shiftedPc];
      const compat = this.evaluateCompatibility(shiftedCamelot, bParsed.code);

      // Phạt điểm nhẹ theo độ lệch bán âm để ưu tiên dịch ít bán âm hơn
      const penalizedScore = compat.score - Math.abs(shift) * 3;

      if (penalizedScore > bestScore) {
        bestScore = penalizedScore;
        bestShift = shift;
        bestRelation = compat.relation;
        bestShiftedCamelot = shiftedCamelot;
      }
    }

    if (options.detailed) {
      return {
        semitones: bestShift,
        originalVocalCamelot: vParsed.code,
        targetBeatCamelot: bParsed.code,
        shiftedVocalCamelot: bestShiftedCamelot,
        relation: bestRelation,
        isCompatible: bestScore > 0
      };
    }

    return bestShift;
  }
}

export default KeyDetectorService;
