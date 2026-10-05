import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Xác định thư mục upload (ưu tiên biến môi trường STORAGE_UPLOAD_DIR)
const uploadDir = process.env.STORAGE_UPLOAD_DIR
  ? path.resolve(process.env.STORAGE_UPLOAD_DIR)
  : path.resolve(__dirname, '../../storage/uploads');

// Đảm bảo thư mục lưu trữ luôn tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Cấu hình DiskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueFilename = `${file.fieldname}-${uuidv4()}-${Date.now()}${ext}`;
    cb(null, uniqueFilename);
  }
});

// 2. Cấu hình Bộ lọc định dạng tệp (MIME & Extension Validation)
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave'
]);

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Chỉ chấp nhận tệp âm thanh định dạng MP3 hoặc WAV (MIME: audio/mpeg, audio/wav).');
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    error.statusCode = 415;
    cb(error, false);
  }
};

// 3. Giới hạn dung lượng tệp
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25;
const limits = {
  fileSize: maxFileSizeMB * 1024 * 1024, // chuyển sang bytes
  files: 2
};

// 4. Khởi tạo Multer instance với cấu hình fields
const upload = multer({
  storage,
  fileFilter,
  limits
}).fields([
  { name: 'trackA', maxCount: 1 },
  { name: 'trackB', maxCount: 1 }
]);

/**
 * Middleware tiếp nhận tệp tải lên, kiểm định tính toàn vẹn và bắt lỗi Multer
 */
export const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      // 4.1. Lỗi từ Multer
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            statusCode: 413,
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Dung lượng tệp vượt quá giới hạn tối đa cho phép (${maxFileSizeMB}MB).`
            }
          });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            statusCode: 400,
            error: {
              code: 'UNEXPECTED_FILE',
              message: `Trường tệp không hợp lệ: '${err.field}'. Hệ thống chỉ chấp nhận 2 trường: 'trackA' và 'trackB'.`
            }
          });
        }

        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: {
            code: err.code || 'BAD_REQUEST',
            message: err.message
          }
        });
      }

      // 4.2. Lỗi sai định dạng tệp (415 Unsupported Media Type)
      if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
        return res.status(415).json({
          success: false,
          statusCode: 415,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: err.message
          }
        });
      }

      // 4.3. Các lỗi không lường trước khác
      return res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: 'UPLOAD_FAILED',
          message: err.message || 'Đã xảy ra lỗi khi tải lên tệp tin.'
        }
      });
    }

    // 5. Kiểm tra bắt buộc có đủ cả 2 file: trackA và trackB
    const trackA = req.files?.trackA?.[0];
    const trackB = req.files?.trackB?.[0];

    if (!trackA || !trackB) {
      // Dọn dẹp tệp nếu upload bị dở dang (orphan file) để bảo toàn dung lượng đĩa
      if (trackA?.path && fs.existsSync(trackA.path)) fs.unlinkSync(trackA.path);
      if (trackB?.path && fs.existsSync(trackB.path)) fs.unlinkSync(trackB.path);

      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: {
          code: 'MISSING_REQUIRED_FILES',
          message: "Both 'trackA' and 'trackB' audio files are required."
        }
      });
    }

    next();
  });
};

export default uploadMiddleware;
