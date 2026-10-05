import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Đường dẫn file
const vocalPath = path.join(__dirname, 'inputs', 'vocal.mp3');
const beatPath = path.join(__dirname, 'inputs', 'beat.mp3');
const outputDir = path.join(__dirname, 'outputs');
const outputPath = path.join(outputDir, `mixed-${Date.now()}.mp3`);

// Đảm bảo thư mục outputs tồn tại
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Kiểm tra file đầu vào
if (!fs.existsSync(vocalPath) || !fs.existsSync(beatPath)) {
  console.error('Lỗi: Vui lòng đặt đủ 2 file vocal.mp3 và beat.mp3 vào thư mục inputs/');
  process.exit(1);
}

console.log('--- Bắt đầu quy trình trộn âm thanh ---');

// 2. Khởi tạo pipeline FFmpeg
ffmpeg()
  .input(vocalPath)
  .input(beatPath)
  .complexFilter([
    // Luồng 0 (vocal): Giữ nguyên 100% âm lượng
    {
      filter: 'volume',
      options: ['1.0'],
      inputs: '0:a',
      outputs: 'vocal_scaled'
    },
    // Luồng 1 (beat): Giảm âm lượng xuống 75% để không lấn át vocal
    {
      filter: 'volume',
      options: ['0.75'],
      inputs: '1:a',
      outputs: 'beat_scaled'
    },
    // Trộn 2 luồng âm thanh
    {
      filter: 'amix',
      options: {
        inputs: 2,               // Số lượng luồng trộn
        duration: 'longest',     // Độ dài file ra theo bài dài hơn ('shortest' hoặc 'longest')
        dropout_transition: 2    // Số giây chuyển mượt khi 1 trong 2 bài kết thúc trước
      },
      inputs: ['vocal_scaled', 'beat_scaled'],
      outputs: 'mixed_output'
    }
  ], 'mixed_output')
  .outputOptions([
    '-c:a libmp3lame',  // Sử dụng codec MP3 chuẩn
    '-b:a 320k'         // Đặt bitrate 320kbps cho chất lượng cao
  ])
  .on('start', (commandLine) => {
    console.log('[FFmpeg Command]:', commandLine);
  })
  .on('progress', (progress) => {
    if (progress.percent) {
      console.log(`Đang xử lý: ${Math.floor(progress.percent)}%`);
    } else {
      console.log(`Đã render đến: ${progress.timemark}`);
    }
  })
  .on('error', (err, stdout, stderr) => {
    console.error('Đã xảy ra lỗi khi mix:', err.message);
    console.error('Chi tiết FFmpeg stderr:', stderr);
  })
  .on('end', () => {
    console.log('--- Hoàn tất! ---');
    console.log(`File xuất bản: ${outputPath}`);
  })
  .save(outputPath);