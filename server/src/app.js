import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyFfmpegInstallation } from './utils/checkFfmpeg.js';
import mixRoutes from './routes/mixRoutes.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// 1. Core Middlewares
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Health Check Endpoint (FR / System Diagnostics)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. API Routes
app.use('/api/v1/mix', mixRoutes);

// 4. Fallback 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// 5. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    statusCode: err.status || 500,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    }
  });
});

// 6. Server Lifecycle & Bootstrap (Fail-Fast Verification)
let server = null;

async function bootstrap() {
  try {
    console.log('[AudioMixer Server] Đang kiểm tra các dependency hệ thống...');
    const ffmpegStatus = await verifyFfmpegInstallation();
    console.log(`[FFmpeg Ready] Binary: ${ffmpegStatus.ffmpeg.version} (${ffmpegStatus.ffmpeg.path})`);
    console.log(`[FFprobe Ready] Binary: ${ffmpegStatus.ffprobe.version} (${ffmpegStatus.ffprobe.path})`);

    server = app.listen(PORT, () => {
      console.log(`[AudioMixer Server] Running on http://localhost:${PORT}`);
      console.log(`[Environment]: ${process.env.NODE_ENV || 'development'} | CORS Origin: ${CORS_ORIGIN}`);
    });
  } catch (err) {
    console.error('[FATAL BOOTSTRAP ERROR]: Máy chủ không thể khởi động do thiếu phụ thuộc bắt buộc:');
    console.error(err.message);
    process.exit(1);
  }
}

// Khởi chạy server nếu không ở chế độ test
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { app, server, bootstrap };
