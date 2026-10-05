import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import MusicTempo from 'music-tempo';

/**
 * Service phân tích và nhận diện nhịp độ (BPM - Beats Per Minute) của tệp âm thanh.
 * Sử dụng FFmpeg xuất luồng raw PCM trực tiếp vào bộ nhớ (in-memory stream) để giải mã,
 * sau đó áp dụng thuật toán Spectral Flux Onset Detection kết hợp Autocorrelation của MusicTempo.
 */
export class BpmDetectorService {
  /**
   * Phát hiện BPM của một tệp âm thanh
   * @param {string} filePath Đường dẫn tệp âm thanh cần phân tích
   * @param {object} [options] Tùy chọn cấu hình
   * @param {number} [options.sampleRate=44100] Tần số lấy mẫu raw PCM (Hz)
   * @param {number} [options.maxDuration=60] Thời lượng tối đa cần trích xuất để phân tích (giây)
   * @param {number} [options.fallbackBpm=null] Giá trị BPM mặc định khi không tìm thấy phách
   * @param {number} [options.minBpm=60] Giới hạn BPM tối thiểu (mặc định 60 BPM)
   * @param {number} [options.maxBpm=180] Giới hạn BPM tối đa (mặc định 180 BPM)
   * @returns {Promise<{
   *   bpm: number|null,
   *   rawTempo: number|null,
   *   beatsCount: number,
   *   durationSec: number,
   *   executionTimeMs: number,
   *   isAmbiguous: boolean,
   *   warning?: string
   * }>}
   */
  static async detectBpm(filePath, options = {}) {
    const startTime = performance.now();
    const sampleRate = options.sampleRate || 44100;
    const maxDuration = options.maxDuration ?? 60;
    const fallbackBpm = options.fallbackBpm ?? null;
    const minBpm = options.minBpm || 60;
    const maxBpm = options.maxBpm || 180;

    // 1. Kiểm tra sự tồn tại và tính hợp lệ của tệp đầu vào
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('[BpmDetectorService] Đường dẫn tệp âm thanh không hợp lệ.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`[BpmDetectorService] Tệp âm thanh không tồn tại trên đĩa: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error(`[BpmDetectorService] Tệp âm thanh rỗng (0 bytes): ${filePath}`);
    }

    // 2. Trích xuất luồng raw PCM 16-bit Mono trực tiếp qua stream (không tạo file trung gian)
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
          reject(new Error(`[BpmDetectorService] FFmpeg giải mã PCM thất bại: ${err.message}`));
        });

        const stream = cmd.pipe();

        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        stream.on('error', (err) => {
          reject(new Error(`[BpmDetectorService] Lỗi luồng dữ liệu PCM stream: ${err.message}`));
        });

        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (streamErr) {
      throw new Error(`[BpmDetectorService] Quá trình trích xuất PCM bị gián đoạn: ${streamErr.message}`);
    }

    // 3. Xử lý ca biên: Thời lượng audio quá ngắn (< 2 giây)
    const minBytesRequired = sampleRate * 2 * 2; // 2 giây * 2 bytes/sample (16-bit)
    if (rawPcmBuffer.length < minBytesRequired) {
      const actualDuration = Number((rawPcmBuffer.length / (sampleRate * 2)).toFixed(2));
      return {
        bpm: fallbackBpm,
        rawTempo: null,
        beatsCount: 0,
        durationSec: actualDuration,
        executionTimeMs: Math.round(performance.now() - startTime),
        isAmbiguous: true,
        warning: `Thời lượng âm thanh (${actualDuration}s) quá ngắn (< 2s) để xác định nhịp độ tin cậy.`
      };
    }

    // 4. Chuyển đổi mảng Int16 (pcm_s16le) sang Float32Array chuẩn hóa trong khoảng [-1.0, 1.0]
    const sampleCount = Math.floor(rawPcmBuffer.length / 2);
    const int16View = new Int16Array(
      rawPcmBuffer.buffer,
      rawPcmBuffer.byteOffset,
      sampleCount
    );

    const float32Data = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      float32Data[i] = int16View[i] / 32768.0;
    }

    // 5. Khởi tạo thuật toán phân tích nhịp MusicTempo
    let calc;
    try {
      calc = new MusicTempo(float32Data, {
        minBeatInterval: 60 / maxBpm, // Giới hạn nhịp cao nhất (ví dụ 180 BPM -> 0.333s)
        maxBeatInterval: 60 / minBpm  // Giới hạn nhịp thấp nhất (ví dụ 60 BPM -> 1.000s)
      });
    } catch (analysisErr) {
      // Trường hợp tệp không có phách rõ ràng (nhạc ambient, drone, tĩnh lặng hoặc tiếng ngắt quãng)
      const durationSec = Number((sampleCount / sampleRate).toFixed(2));
      return {
        bpm: fallbackBpm,
        rawTempo: null,
        beatsCount: 0,
        durationSec,
        executionTimeMs: Math.round(performance.now() - startTime),
        isAmbiguous: true,
        warning: `Không nhận diện được phách nhịp đặc trưng (Onset peaks): ${analysisErr?.message || analysisErr}`
      };
    }

    // 6. Trích xuất và làm tròn BPM chuẩn xác
    const rawTempo = typeof calc.tempo === 'string' ? parseFloat(calc.tempo) : Number(calc.tempo);
    const beatsCount = Array.isArray(calc.beats) ? calc.beats.length : 0;
    const durationSec = Number((sampleCount / sampleRate).toFixed(2));
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (!rawTempo || isNaN(rawTempo) || rawTempo <= 0 || !isFinite(rawTempo)) {
      return {
        bpm: fallbackBpm,
        rawTempo: null,
        beatsCount,
        durationSec,
        executionTimeMs,
        isAmbiguous: true,
        warning: 'Giá trị nhịp độ trả về không hợp lệ.'
      };
    }

    // Làm tròn 1 chữ số thập phân theo yêu cầu FR-04
    const roundedBpm = parseFloat(rawTempo.toFixed(1));

    return {
      bpm: roundedBpm,
      rawTempo,
      beatsCount,
      durationSec,
      executionTimeMs,
      isAmbiguous: false
    };
  }
}

export default BpmDetectorService;
