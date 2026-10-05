import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'fluent-ffmpeg';

const execFileAsync = promisify(execFile);

/**
 * Trợ giúp tìm đường dẫn thực thi của binary trên hệ điều hành
 * @param {string} binaryName Tên binary cần định vị ('ffmpeg' hoặc 'ffprobe')
 * @returns {Promise<string>} Đường dẫn tuyệt đối đến tệp binary
 */
async function locateBinaryPath(binaryName) {
  const isWindows = process.platform === 'win32';
  const locatorCommand = isWindows ? 'where.exe' : 'which';

  try {
    const { stdout } = await execFileAsync(locatorCommand, [binaryName]);
    const lines = stdout.trim().split(/\r?\n/);
    return lines[0]?.trim() || 'In system PATH';
  } catch {
    return 'In system PATH (Path resolution unavailable)';
  }
}

/**
 * Kiểm tra và trích xuất phiên bản của binary
 * @param {string} binaryName 'ffmpeg' hoặc 'ffprobe'
 * @returns {Promise<{ version: string, path: string }>}
 */
async function probeBinary(binaryName) {
  try {
    const { stdout } = await execFileAsync(binaryName, ['-version']);
    const firstLine = stdout.trim().split(/\r?\n/)[0] || '';
    
    // Trích xuất chuỗi version (ví dụ: 'ffmpeg version 9.0.2-full...')
    const versionMatch = firstLine.match(new RegExp(`${binaryName}\\s+version\\s+([^\\s]+)`, 'i'));
    const version = versionMatch ? versionMatch[1] : firstLine;
    const binaryPath = await locateBinaryPath(binaryName);

    return {
      version,
      rawHeader: firstLine,
      path: binaryPath
    };
  } catch (error) {
    throw new Error(`Binary '${binaryName}' không thể thực thi hoặc không tìm thấy trong hệ thống ($PATH): ${error.message}`);
  }
}

/**
 * Kiểm tra sự tồn tại và tính hợp lệ của cả 2 binary FFmpeg và FFprobe
 * Tuân thủ nguyên lý Fail-Fast: Dừng ứng dụng ngay nếu thiếu thành phần cốt lõi.
 * @returns {Promise<{ ready: boolean, ffmpeg: object, ffprobe: object }>}
 */
export async function verifyFfmpegInstallation() {
  const errors = [];
  let ffmpegInfo = null;
  let ffprobeInfo = null;

  try {
    ffmpegInfo = await probeBinary('ffmpeg');
  } catch (err) {
    errors.push(err.message);
  }

  try {
    ffprobeInfo = await probeBinary('ffprobe');
  } catch (err) {
    errors.push(err.message);
  }

  if (errors.length > 0) {
    const errorMessage = [
      '================================================================================',
      '[CRITICAL ERROR] HỆ THỐNG THIẾU TIỆN ÍCH XỬ LÝ ÂM THANH CỐT LÕI (FFmpeg / FFprobe)',
      '================================================================================',
      'Chi tiết lỗi:',
      ...errors.map((e) => `  - ${e}`),
      '',
      'Hướng dẫn cài đặt bổ sung theo từng nền tảng:',
      '  • Windows: Chạy lệnh `winget install Gyan.FFmpeg` hoặc tải từ https://ffmpeg.org/download.html và cấu hình PATH.',
      '  • macOS: Chạy lệnh `brew install ffmpeg`',
      '  • Ubuntu / Debian: Chạy lệnh `sudo apt update && sudo apt install -y ffmpeg`',
      '================================================================================'
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Tùy chọn: Đồng bộ đường dẫn thực thi cho fluent-ffmpeg nếu có đường dẫn tuyệt đối
  if (ffmpegInfo.path && !ffmpegInfo.path.startsWith('In system PATH')) {
    ffmpeg.setFfmpegPath(ffmpegInfo.path);
  }
  if (ffprobeInfo.path && !ffprobeInfo.path.startsWith('In system PATH')) {
    ffmpeg.setFfprobePath(ffprobeInfo.path);
  }

  return {
    ready: true,
    ffmpeg: ffmpegInfo,
    ffprobe: ffprobeInfo
  };
}

export default verifyFfmpegInstallation;
