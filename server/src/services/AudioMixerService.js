import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

/**
 * Phân tích chuỗi timemark của FFmpeg (dạng HH:MM:SS.ms) sang giây
 * @param {string} timemark 
 * @returns {number} Thời lượng tính theo giây
 */
function parseTimemarkToSeconds(timemark) {
  if (!timemark || typeof timemark !== 'string') return 0;
  const parts = timemark.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Trích xuất siêu dữ liệu (metadata) của tệp âm thanh qua ffprobe
 * @param {string} filePath Đường dẫn tuyệt đối đến tệp âm thanh
 * @returns {Promise<{ duration: number, sampleRate: number, channels: number, bitrate: number, format: string }>}
 */
export function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`[AudioMixerService] Không thể đọc metadata file: ${filePath}. Lỗi: ${err.message}`));
      }

      const stream = metadata.streams?.find((s) => s.codec_type === 'audio') || metadata.streams?.[0];
      const duration = parseFloat(metadata.format?.duration || stream?.duration || 0);
      const sampleRate = parseInt(stream?.sample_rate || 44100, 10);
      const channels = parseInt(stream?.channels || 2, 10);
      const bitrate = parseInt(metadata.format?.bit_rate || stream?.bit_rate || 320000, 10);
      const format = metadata.format?.format_name || '';

      resolve({
        duration,
        sampleRate,
        channels,
        bitrate,
        format
      });
    });
  });
}

/**
 * Dịch vụ phối trộn âm thanh chuyên nghiệp sử dụng FFmpeg FilterGraph
 * @param {object} params
 * @param {string} params.trackAPath Đường dẫn file Vocal (Track A)
 * @param {string} params.trackBPath Đường dẫn file Beat (Track B)
 * @param {string} params.outputPath Đường dẫn xuất file MP3 thành phẩm
 * @param {function} [params.onProgress] Callback nhận tiến độ xử lý (0 -> 100%)
 * @returns {Promise<{ outputPath: string, outputFileName: string, outputDuration: number, executionTimeMs: number, sizeBytes: number }>}
 */
export async function mixAudioTracks({ trackAPath, trackBPath, outputPath, onProgress }) {
  if (!fs.existsSync(trackAPath)) {
    throw new Error(`[AudioMixerService] Tệp Vocal không tồn tại tại: ${trackAPath}`);
  }
  if (!fs.existsSync(trackBPath)) {
    throw new Error(`[AudioMixerService] Tệp Beat không tồn tại tại: ${trackBPath}`);
  }

  // Đảm bảo thư mục lưu output tồn tại
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Đo thời lượng ban đầu của 2 tệp để tính toán tiến trình chính xác
  let expectedTotalDuration = 0;
  try {
    const [metaA, metaB] = await Promise.all([
      getAudioMetadata(trackAPath),
      getAudioMetadata(trackBPath)
    ]);
    expectedTotalDuration = Math.max(metaA.duration, metaB.duration) || 1;
  } catch (probeErr) {
    console.warn('[AudioMixerService] Cảnh báo: Không thể probe độ dài tệp đầu vào, sử dụng ước lượng mặc định:', probeErr.message);
    expectedTotalDuration = 10;
  }

  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    let lastReportedPercent = -1;

    ffmpeg()
      .input(trackAPath)
      .input(trackBPath)
      .complexFilter([
        // 1. Resample về 44.1kHz và Gain Staging
        '[0:a]aresample=44100,volume=1.0[vocal_norm]',
        '[1:a]aresample=44100,volume=0.75[beat_norm]',
        // 2. Amix 2 luồng âm thanh theo độ dài lớn nhất
        '[vocal_norm][beat_norm]amix=inputs=2:duration=longest:dropout_transition=2:weights=1.0 0.75[raw_mixed]',
        // 3. Peak Limiter chống méo tiếng / clipping biên độ đỉnh
        '[raw_mixed]alimiter=limit=0.95:level=true[final_output]'
      ], 'final_output')
      .outputOptions([
        '-c:a libmp3lame',
        '-b:a 320k',
        '-ar 44100'
      ])
      .on('start', (commandLine) => {
        console.log('[AudioMixerService Spawned]:', commandLine);
      })
      .on('progress', (progress) => {
        let percent = 0;

        if (typeof progress.percent === 'number' && !isNaN(progress.percent) && progress.percent > 0) {
          percent = Math.floor(progress.percent);
        } else if (progress.timemark && expectedTotalDuration > 0) {
          const currentSec = parseTimemarkToSeconds(progress.timemark);
          percent = Math.floor((currentSec / expectedTotalDuration) * 100);
        }

        // Kẹp giá trị trong khoảng an toàn 0 -> 99% (100% dành cho sự kiện 'end')
        percent = Math.min(99, Math.max(0, percent));

        if (percent > lastReportedPercent) {
          lastReportedPercent = percent;
          if (typeof onProgress === 'function') {
            onProgress(percent);
          }
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[AudioMixerService Failure]:', err.message);
        console.error('[FFmpeg Stderr]:', stderr);
        reject(new Error(`[FFmpeg Execution Error]: ${err.message}. Chi tiết: ${stderr || 'N/A'}`));
      })
      .on('end', async () => {
        const executionTimeMs = Math.round(performance.now() - startTime);

        // Báo cáo hoàn tất 100%
        if (typeof onProgress === 'function') {
          onProgress(100);
        }

        try {
          const outputMeta = await getAudioMetadata(outputPath);
          const fileStats = fs.statSync(outputPath);

          resolve({
            outputPath,
            outputFileName: path.basename(outputPath),
            outputDuration: outputMeta.duration,
            sampleRate: outputMeta.sampleRate,
            channels: outputMeta.channels,
            bitrate: outputMeta.bitrate,
            sizeBytes: fileStats.size,
            executionTimeMs
          });
        } catch (metaErr) {
          // Trường hợp file render xong nhưng không probe được vẫn resolve metadata cơ bản
          resolve({
            outputPath,
            outputFileName: path.basename(outputPath),
            outputDuration: expectedTotalDuration,
            executionTimeMs,
            sizeBytes: fs.statSync(outputPath).size
          });
        }
      })
      .save(outputPath);
  });
}

export default {
  mixAudioTracks,
  getAudioMetadata
};
