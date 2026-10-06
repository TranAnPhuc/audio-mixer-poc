/**
 * Dịch vụ Điều Phối Bóc Lời & Canh Nhịp Bằng AI Whisper (Client-side AI Transcription)
 * Chạy hoàn toàn trên trình duyệt thông qua Web Worker và OfflineAudioContext
 */

/**
 * Giải mã tệp âm thanh (File / Blob) thành AudioBuffer
 * @param {File|Blob} file 
 * @returns {Promise<AudioBuffer>}
 */
export async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close();
    }
  }
}

/**
 * Chuyển đổi và nội suy AudioBuffer về chuẩn 16,000 Hz Mono Float32Array mà Whisper yêu cầu
 * Sử dụng OfflineAudioContext native để xử lý siêu tốc mà không ảnh hưởng luồng âm thanh chính
 * @param {AudioBuffer} audioBuffer 
 * @returns {Promise<Float32Array>}
 */
export async function resampleAudioTo16k(audioBuffer) {
  const targetSampleRate = 16000;
  const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);

  const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    1,
    targetLength,
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

/**
 * Chuyển đổi kết quả chunks từ Whisper AI thành mảng lyric objects chuẩn cho AuraVinyl
 * @param {Array<{ timestamp: [number, number|null], text: string }>} chunks 
 * @returns {Array<{ id: number, time: number, text: string }>}
 */
export function convertWhisperChunksToLrc(chunks) {
  if (!chunks || !Array.isArray(chunks)) return [];

  const lines = [];
  let id = 0;

  for (const chunk of chunks) {
    if (!chunk || !chunk.text) continue;
    const cleanText = chunk.text.trim();
    if (!cleanText) continue;

    // Trích xuất mốc thời gian bắt đầu (giây)
    let startTime = 0;
    if (Array.isArray(chunk.timestamp) && typeof chunk.timestamp[0] === 'number') {
      startTime = Math.max(0, chunk.timestamp[0]);
    }

    lines.push({
      id: id++,
      time: Math.round(startTime * 100) / 100, // Làm tròn 2 số thập phân
      text: cleanText
    });
  }

  // Sắp xếp các câu hát theo thứ tự thời gian tăng dần
  lines.sort((a, b) => a.time - b.time);
  return lines.map((line, idx) => ({ ...line, id: idx }));
}

/**
 * Điều phối toàn bộ quy trình bóc lời AI từ tệp nhạc:
 * Decode -> Resample 16kHz -> Khởi tạo Web Worker -> Gửi tiến trình -> Thu thập kết quả
 * @param {File|Blob} file Tệp âm thanh cần bóc lời
 * @param {Function} onProgress Callback nhận thông báo tiến trình ({ status, message, progress })
 * @returns {Promise<{ lines: Array<{ id: number, time: number, text: string }>, text: string }>}
 */
export function transcribeAudioFile(file, onProgress = () => {}) {
  return new Promise(async (resolve, reject) => {
    let worker = null;

    try {
      onProgress({
        status: 'decoding',
        message: 'Đang giải mã âm thanh...',
        progress: 10
      });

      // 1. Giải mã file audio
      const audioBuffer = await decodeAudioFile(file);

      onProgress({
        status: 'resampling',
        message: 'Đang chuẩn hóa tần số 16kHz Mono...',
        progress: 25
      });

      // 2. Resample sang 16,000 Hz Mono Float32Array
      const audioData = await resampleAudioTo16k(audioBuffer);

      onProgress({
        status: 'loading-model',
        message: 'Đang khởi động AI Whisper...',
        progress: 35
      });

      // 3. Khởi tạo Web Worker (chạy độc lập, không chặn main thread / 3D Canvas)
      worker = new Worker(
        new URL('../workers/whisperWorker.js', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event) => {
        const data = event.data || {};

        if (data.status === 'loading-model') {
          const pct = data.progress ? Math.min(95, 35 + Math.round(data.progress * 0.45)) : 40;
          onProgress({
            status: 'loading-model',
            message: `Đang tải mô hình Whisper AI (${data.progress || 0}%)...`,
            progress: pct
          });
        } else if (data.status === 'transcribing') {
          onProgress({
            status: 'transcribing',
            message: 'AI đang lắng nghe và canh nhịp lời bài hát...',
            progress: 88
          });
        } else if (data.status === 'complete') {
          onProgress({
            status: 'complete',
            message: 'Bóc lời hoàn tất!',
            progress: 100
          });

          const lines = convertWhisperChunksToLrc(data.chunks);
          worker.terminate();
          resolve({
            lines,
            text: data.text || ''
          });
        } else if (data.status === 'error') {
          worker.terminate();
          reject(new Error(data.error || 'Lỗi bóc lời từ AI Whisper'));
        }
      };

      worker.onerror = (err) => {
        if (worker) worker.terminate();
        console.error('[aiTranscriptionService] Worker error:', err);
        reject(err);
      };

      // 4. Chuyển giao Float32Array sang Worker qua Transferable ArrayBuffer
      worker.postMessage(
        {
          type: 'transcribe',
          audio: audioData
        },
        [audioData.buffer]
      );
    } catch (err) {
      if (worker) worker.terminate();
      console.error('[aiTranscriptionService] Ngoại lệ khi bóc lời:', err);
      reject(err);
    }
  });
}
