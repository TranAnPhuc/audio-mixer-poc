import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import prisma, { JobStatus } from '../config/db.js';
import { mixAudioTracks } from '../services/AudioMixerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Xác định thư mục output
const outputDir = process.env.STORAGE_OUTPUT_DIR
  ? path.resolve(process.env.STORAGE_OUTPUT_DIR)
  : path.resolve(__dirname, '../../storage/outputs');

/**
 * Xử lý ngầm tiến trình phối âm thanh (Background Worker)
 * @param {string} jobId ID của bản ghi MixJob
 */
export async function processMixJobInBackground(jobId) {
  let lastDbUpdateTimestamp = 0;
  let lastDbProgress = -1;

  try {
    // 1. Chuyển trạng thái sang PROCESSING
    const job = await prisma.mixJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROCESSING,
        progress: 0
      }
    });

    const outputFileName = `mixed-${jobId}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);

    // 2. Kích hoạt AudioMixerService với cơ chế Throttle cập nhật DB
    const mixResult = await mixAudioTracks({
      trackAPath: job.trackAPath,
      trackBPath: job.trackBPath,
      outputPath,
      onProgress: async (percent) => {
        const now = Date.now();
        // Throttle: Chỉ ghi DB nếu cách lần trước >= 500ms hoặc bước nhảy tiến độ >= 10%
        if (
          percent < 100 &&
          (now - lastDbUpdateTimestamp >= 500 || percent - lastDbProgress >= 10)
        ) {
          lastDbUpdateTimestamp = now;
          lastDbProgress = percent;
          try {
            await prisma.mixJob.update({
              where: { id: jobId },
              data: { progress: percent }
            });
          } catch (updateErr) {
            console.warn(`[MixJob ${jobId}] Cảnh báo: Lỗi cập nhật tiến độ vào DB:`, updateErr.message);
          }
        }
      }
    });

    // 3. Hoàn tất thành công: Cập nhật SUCCESS
    await prisma.mixJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.SUCCESS,
        progress: 100,
        outputPath: mixResult.outputPath,
        outputFileName: mixResult.outputFileName,
        outputDuration: mixResult.outputDuration,
        executionTimeMs: mixResult.executionTimeMs
      }
    });

    console.log(`[MixJob ${jobId}] Hoàn tất thành công trong ${mixResult.executionTimeMs}ms.`);
  } catch (err) {
    console.error(`[MixJob ${jobId}] Xử lý ngầm thất bại:`, err.message);

    // 4. Bắt lỗi và cập nhật FAILED để job không bị treo vô hạn
    try {
      await prisma.mixJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: err.message || 'Đã xảy ra lỗi không xác định trong quá trình phối âm.'
        }
      });
    } catch (dbErr) {
      console.error(`[MixJob ${jobId}] Lỗi nghiêm trọng khi cập nhật trạng thái FAILED:`, dbErr.message);
    }
  }
}

/**
 * Controller tiếp nhận yêu cầu phối âm thanh
 * Endpoint: POST /api/v1/mix
 */
export async function createMixJob(req, res, next) {
  try {
    const trackA = req.files.trackA[0];
    const trackB = req.files.trackB[0];

    // 1. Tạo bản ghi ban đầu với trạng thái PENDING
    const job = await prisma.mixJob.create({
      data: {
        status: JobStatus.PENDING,
        progress: 0,
        trackAOriginalName: trackA.originalname,
        trackAPath: trackA.path,
        trackAMimeType: trackA.mimetype,
        trackASize: trackA.size,
        trackBOriginalName: trackB.originalname,
        trackBPath: trackB.path,
        trackBMimeType: trackB.mimetype,
        trackBSize: trackB.size
      }
    });

    // 2. Kích hoạt tác vụ nền bất đồng bộ (Fire-and-forget, không chặn response)
    setImmediate(() => {
      processMixJobInBackground(job.id).catch((workerErr) => {
        console.error(`[Background Worker Error] Job ${job.id}:`, workerErr);
      });
    });

    // 3. Phản hồi ngay lập tức HTTP 202 Accepted trong < 200ms
    return res.status(202).json({
      success: true,
      statusCode: 202,
      data: {
        jobId: job.id,
        status: JobStatus.PENDING,
        message: 'Files uploaded successfully. Mixing job initiated.'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller truy vấn trạng thái tác vụ phối âm
 * Endpoint: GET /api/v1/mix/:jobId
 */
export async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await prisma.mixJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Không tìm thấy tác vụ với ID: ${jobId}`
        }
      });
    }

    // Trường hợp 1: SUCCESS - Trả về đầy đủ thông tin thành phẩm và URLs
    if (job.status === JobStatus.SUCCESS) {
      return res.status(200).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          result: {
            streamUrl: `/api/v1/mix/${job.id}/stream`,
            downloadUrl: `/api/v1/mix/${job.id}/download`,
            duration: job.outputDuration,
            executionTimeMs: job.executionTimeMs
          },
          createdAt: job.createdAt
        }
      });
    }

    // Trường hợp 2: FAILED - Trả về thông báo lỗi
    if (job.status === JobStatus.FAILED) {
      return res.status(200).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          errorMessage: job.errorMessage || 'Xử lý âm thanh thất bại',
          createdAt: job.createdAt
        }
      });
    }

    // Trường hợp 3: PENDING hoặc PROCESSING
    return res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller truyền phát trực tuyến âm thanh hỗ trợ HTTP 206 Partial Content
 * Endpoint: GET /api/v1/mix/:jobId/stream
 */
export async function streamAudio(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await prisma.mixJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Không tìm thấy tác vụ với ID: ${jobId}`
        }
      });
    }

    if (job.status !== JobStatus.SUCCESS || !job.outputPath) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: {
          code: 'JOB_NOT_READY',
          message: `Tác vụ chưa hoàn thành hoặc xử lý thất bại (Trạng thái hiện tại: ${job.status})`
        }
      });
    }

    const filePath = path.resolve(job.outputPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: {
          code: 'AUDIO_FILE_NOT_FOUND',
          message: 'Tệp âm thanh thành phẩm không còn tồn tại trên máy chủ.'
        }
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Hỗ trợ HTTP 206 Partial Content phục vụ việc kéo tua (Seeking)
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Kiểm tra tính hợp lệ của byte range
      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({
          success: false,
          statusCode: 416,
          error: {
            code: 'RANGE_NOT_SATISFIABLE',
            message: 'Khoảng byte yêu cầu nằm ngoài dung lượng tệp tin.'
          }
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg'
      });

      fileStream.pipe(res);
    } else {
      // Phân phối toàn bộ file nếu không có Range header
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes'
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Controller tải trực tiếp file thành phẩm về máy người dùng
 * Endpoint: GET /api/v1/mix/:jobId/download
 */
export async function downloadAudio(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await prisma.mixJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Không tìm thấy tác vụ với ID: ${jobId}`
        }
      });
    }

    if (job.status !== JobStatus.SUCCESS || !job.outputPath) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: {
          code: 'JOB_NOT_READY',
          message: `Tác vụ chưa hoàn thành hoặc xử lý thất bại (Trạng thái hiện tại: ${job.status})`
        }
      });
    }

    const filePath = path.resolve(job.outputPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: {
          code: 'AUDIO_FILE_NOT_FOUND',
          message: 'Tệp âm thanh thành phẩm không còn tồn tại trên máy chủ.'
        }
      });
    }

    const downloadFilename = `mashup-${job.id}.mp3`;
    res.download(filePath, downloadFilename);
  } catch (error) {
    next(error);
  }
}

export default {
  createMixJob,
  getJobStatus,
  streamAudio,
  downloadAudio,
  processMixJobInBackground
};
