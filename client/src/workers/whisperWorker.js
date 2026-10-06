import { pipeline, env } from '@xenova/transformers';

// Cấu hình môi trường Web Worker:
// 1. Tắt tìm kiếm model local để tự động tải từ Hugging Face CDN
// 2. Bật lưu trữ mô hình vào Cache API của trình duyệt (chỉ tải 1 lần ~73MB cho whisper-base)
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Singleton quản lý pipeline Whisper để tránh khởi tạo nhiều lần
 * Nâng cấp lên whisper-base lượng tử hóa (~73MB) để tối ưu hóa nhận diện tiếng Việt vượt trội
 */
class WhisperPipelineSingleton {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-base';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (!this.instance) {
      this.instance = await pipeline(this.task, this.model, {
        quantized: true,
        progress_callback
      });
    }
    return this.instance;
  }
}

// Lắng nghe thông điệp từ Main Thread
self.addEventListener('message', async (event) => {
  const { type, audio } = event.data || {};

  if (type === 'transcribe') {
    try {
      // 1. Khởi tạo / Tải mô hình Whisper (gửi tiến trình % về UI)
      const transcriber = await WhisperPipelineSingleton.getInstance((progressData) => {
        if (progressData.status === 'progress' || progressData.status === 'download') {
          self.postMessage({
            status: 'loading-model',
            progress: progressData.progress ? Math.round(progressData.progress) : 0,
            file: progressData.file || ''
          });
        }
      });

      // 2. Thông báo chuyển sang trạng thái inference lắng nghe & chép lời
      self.postMessage({
        status: 'transcribing',
        progress: 0
      });

      // 3. Thực thi inference nhận diện lời với Language & Prompt Biasing tiếng Việt
      const output = await transcriber(audio, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
        language: 'vietnamese',
        initial_prompt: 'Bài hát tiếng Việt, lời ca khúc, rap, có dấu đầy đủ: anh, em, yêu, thương, đời, người.',
        condition_on_previous_text: false,
        temperature: 0.0
      });

      console.log('[WhisperWorker] Raw output chunks:', output?.chunks);
      console.log('[WhisperWorker] Raw output text:', output?.text);

      // 4. Trả về kết quả chunks hoàn tất cho Main Thread
      self.postMessage({
        status: 'complete',
        chunks: output?.chunks || [],
        text: output?.text || ''
      });
    } catch (error) {
      console.error('[whisperWorker] Lỗi thực thi Whisper inference:', error);
      self.postMessage({
        status: 'error',
        error: error?.message || String(error)
      });
    }
  }
});
