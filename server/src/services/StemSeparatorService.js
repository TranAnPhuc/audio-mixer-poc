import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Đường dẫn tuyệt đối tới runner script Python tách stem
 */
const PYTHON_RUNNER_SCRIPT = path.resolve(__dirname, '../scripts/separate_stems.py');

/**
 * Dịch vụ Tách Thân Âm AI (StemSeparatorService)
 * Điều phối tiến trình con Python thực thi Demucs v4 hoặc cơ chế Fallback DSP.
 *
 * @param {object} params
 * @param {string} params.inputPath Đường dẫn tệp âm thanh đầu vào (.mp3 hoặc .wav)
 * @param {string} params.outputDir Thư mục lưu trữ các tệp stem đầu ra
 * @param {'vocal'|'beat'} [params.trackType='vocal'] Loại track mục tiêu cần lấy:
 *        - 'vocal': Giữ lại giọng hát sạch (vocals.wav)
 *        - 'beat': Giữ lại phần hòa âm không lời (no_vocals.wav)
 * @param {number} [params.timeoutMs=120000] Thời gian chờ tối đa (mặc định 2 phút)
 * @param {function} [params.onProgress] Callback nhận thông báo tiến trình / logs
 * @returns {Promise<{
 *   success: boolean,
 *   engine: 'demucs'|'dsp_fallback',
 *   vocalsPath: string,
 *   instrumentalPath: string,
 *   targetStemPath: string,
 *   durationSec: number,
 *   executionTimeMs: number
 * }>}
 */
export async function separateStems({
  inputPath,
  outputDir,
  trackType = 'vocal',
  timeoutMs = 120000,
  onProgress
}) {
  const startTime = performance.now();

  // 1. Kiểm định các tham số đầu vào
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('[StemSeparatorService] inputPath là bắt buộc và phải là một chuỗi đường dẫn.');
  }

  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`[StemSeparatorService] Tệp âm thanh đầu vào không tồn tại: ${resolvedInputPath}`);
  }

  if (!outputDir || typeof outputDir !== 'string') {
    throw new Error('[StemSeparatorService] outputDir là bắt buộc và phải là một chuỗi đường dẫn.');
  }

  const resolvedOutputDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  if (!fs.existsSync(PYTHON_RUNNER_SCRIPT)) {
    throw new Error(`[StemSeparatorService] Không tìm thấy runner script: ${PYTHON_RUNNER_SCRIPT}`);
  }

  // 2. Xác định trình thông dịch Python
  const pythonExecutable = process.env.PYTHON_PATH || 'python';

  return new Promise((resolve, reject) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let isTimedOut = false;

    const args = [
      PYTHON_RUNNER_SCRIPT,
      '--input', resolvedInputPath,
      '--output-dir', resolvedOutputDir,
      '--mode', 'both'
    ];

    // Khởi tạo tiến trình con Python
    const child = spawn(pythonExecutable, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Thiết lập bộ đếm thời gian Timeout bảo vệ hệ thống
    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        child.kill('SIGTERM');
        // Ép hủy nếu sau 2 giây chưa thoát
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }, 2000);
      } catch (err) {
        console.warn('[StemSeparatorService] Lỗi khi kill tiến trình quá hạn:', err.message);
      }
      reject(new Error(`[StemSeparatorService] Quá trình bóc tách thân âm bị timeout sau ${timeoutMs}ms.`));
    }, timeoutMs);

    // Thu thập dữ liệu stdout
    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString('utf-8');
    });

    // Thu thập log và thông báo stderr
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf-8');
      stderrBuffer += text;
      if (onProgress) {
        onProgress(text.trim());
      }
    });

    // Xử lý lỗi khởi chạy tiến trình con (ví dụ không tìm thấy python)
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`[StemSeparatorService] Không thể khởi chạy tiến trình Python (${pythonExecutable}): ${err.message}`));
    });

    // Xử lý khi tiến trình hoàn tất
    child.on('close', (code) => {
      clearTimeout(timer);
      if (isTimedOut) return;

      if (code !== 0) {
        const errorMsg = stderrBuffer.trim() || `Tiến trình Python thoát với mã lỗi: ${code}`;
        return reject(new Error(`[StemSeparatorService] Lỗi thực thi Python: ${errorMsg}`));
      }

      try {
        // Tìm chuỗi JSON trong stdout (tránh trường hợp thư viện in thêm dòng text phía trước)
        const jsonMatch = stdoutBuffer.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(`Không thể tìm thấy kết quả JSON từ stdout của separate_stems.py. Raw output: ${stdoutBuffer}`);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.success) {
          throw new Error(parsed.error || 'Tách stem thất bại mà không có thông điệp lỗi rõ ràng.');
        }

        const vocalsPath = parsed.vocalsPath;
        const instrumentalPath = parsed.instrumentalPath;

        // Xác thực sự tồn tại của các file kết quả
        if (!fs.existsSync(vocalsPath)) {
          throw new Error(`Tệp vocals trích xuất không tồn tại trên đĩa: ${vocalsPath}`);
        }
        if (!fs.existsSync(instrumentalPath)) {
          throw new Error(`Tệp instrumental trích xuất không tồn tại trên đĩa: ${instrumentalPath}`);
        }

        // Chọn tệp thân âm mục tiêu theo trackType
        const targetStemPath = trackType === 'vocal' ? vocalsPath : instrumentalPath;
        const totalExecutionTimeMs = Math.round(performance.now() - startTime);

        resolve({
          success: true,
          engine: parsed.engine || 'dsp_fallback',
          vocalsPath,
          instrumentalPath,
          targetStemPath,
          durationSec: parsed.durationSec || 0,
          executionTimeMs: parsed.executionTimeMs || totalExecutionTimeMs
        });
      } catch (parseErr) {
        reject(new Error(`[StemSeparatorService] Lỗi bóc tách kết quả JSON: ${parseErr.message}. Stdout: ${stdoutBuffer}`));
      }
    });
  });
}

export default {
  separateStems
};
