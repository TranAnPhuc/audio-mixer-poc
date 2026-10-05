import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/uploadMiddleware.js';
import {
  createMixJob,
  getJobStatus,
  streamAudio,
  downloadAudio
} from '../controllers/mixController.js';

const router = Router();

// POST /api/v1/mix - Khởi tạo tác vụ phối âm thanh bất đồng bộ
router.post('/', uploadMiddleware, createMixJob);

// GET /api/v1/mix/:jobId - Truy vấn trạng thái tác vụ
router.get('/:jobId', getJobStatus);

// GET /api/v1/mix/:jobId/stream - Truyền phát âm thanh hỗ trợ tua nhạc (HTTP 206 Partial Content)
router.get('/:jobId/stream', streamAudio);

// GET /api/v1/mix/:jobId/download - Tải file âm thanh thành phẩm
router.get('/:jobId/download', downloadAudio);

export default router;
