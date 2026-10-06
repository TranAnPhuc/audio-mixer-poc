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

  // Vocal Isolation DSP Filter: Tách giọng hát, triệt tiêu bass 808, kick và hi-hats trước khi gửi cho Whisper
  if (typeof offlineCtx.createBiquadFilter === 'function') {
    // 1. highpass tại 180Hz (Q = 0.707): Triệt tiêu triệt để tiếng bass 808 và kick drum dồn dập
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 180;
    highpass.Q.value = 0.707;

    // 2. lowpass tại 4200Hz: Lọc bỏ hi-hats và tiếng xì của beat
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;

    // 3. peaking tại 1500Hz (Gain +4dB, Q = 1.0): Làm nổi bật dải âm trung của giọng hát tiếng Việt
    const peaking = offlineCtx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 1500;
    peaking.gain.value = 4;
    peaking.Q.value = 1.0;

    // Nối chuỗi: source -> highpass -> lowpass -> peaking -> destination
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(peaking);
    peaking.connect(offlineCtx.destination);
  } else {
    source.connect(offlineCtx.destination);
  }

  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);

  // Peak Normalization: Khuếch đại giọng hát rõ nét, giúp Whisper phân biệt tiếng người với nhạc beat
  let maxAmp = 0;
  for (let i = 0; i < channelData.length; i++) {
    const absVal = Math.abs(channelData[i]);
    if (absVal > maxAmp) maxAmp = absVal;
  }

  if (maxAmp > 0.01) {
    const scale = 0.95 / maxAmp;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] *= scale;
    }
  }

  return channelData;
}

/**
 * Chuyển đổi kết quả chunks từ Whisper AI thành mảng lyric objects chuẩn cho AuraVinyl
 * Lọc triệt để các ảo giác AI (Hallucination tokens, repetitive noise, unvoiced beats)
 * @param {Array<{ timestamp: [number, number|null], text: string }>} chunks 
 * @returns {Array<{ id: number, time: number, text: string }>}
 */
export function convertWhisperChunksToLrc(chunks) {
  if (!chunks || !Array.isArray(chunks)) return [];

  // Helper kiểm tra câu bị lặp từ bất thường (> 3 lần liên tiếp)
  const isExcessiveRepetition = (text) => {
    // 1. Kiểm tra cùng 1 từ lặp lại > 3 lần liên tiếp: "la la la la"
    if (/(\b\S+\b)(?:[\s,.-]+\1){3,}/i.test(text)) return true;

    // 2. Tách các từ riêng lẻ để kiểm tra lặp từ liên tiếp
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      let repeatCount = 1;
      for (let i = 1; i < words.length; i++) {
        if (words[i] === words[i - 1]) {
          repeatCount++;
          if (repeatCount >= 3) return true;
        } else {
          repeatCount = 1;
        }
      }
    }

    return false;
  };

  const lines = [];
  let id = 0;

  for (const chunk of chunks) {
    if (!chunk || typeof chunk.text !== 'string') continue;

    let cleanText = chunk.text;

    // 1. Loại bỏ các thẻ rác âm thanh nền rõ ràng: [music], [song], [applause], (music), (applause)...
    cleanText = cleanText.replace(/\[\s*(music|song|applause|sound|cheering|laughter|instrumental)\s*\]/gi, ' ');
    cleanText = cleanText.replace(/\(\s*(music|song|applause|sound|cheering|laughter|instrumental)\s*\)/gi, ' ');

    // 2. Quét sạch mọi thẻ mở chưa đóng như [S, [s, [music, [Song (nguyên nhân gây ra chữ [S khi Whisper bị cắt cụt)
    cleanText = cleanText.replace(/\[[A-Za-z0-9_]+(?:\s|\]|$)/g, ' ');

    // 3. Loại bỏ các dấu ngoặc vuông và ngoặc đơn lẻ loi còn sót lại
    cleanText = cleanText.replace(/[[\]()]/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    // 4. Bỏ qua các chunk sau khi làm sạch bị rỗng hoặc chỉ chứa dấu câu/khoảng trắng
    const hasWordCharacters = /[\p{L}\p{N}]/u.test(cleanText);
    if (!hasWordCharacters) continue;

    // 5. Lọc bỏ bất kỳ dòng nào chỉ có duy nhất 1 ký tự hoặc chỉ gồm ký tự rác
    if (cleanText.length <= 1) continue;

    // 6. Bỏ qua nếu câu bị lặp từ bất thường (> 3 lần liên tiếp)
    if (isExcessiveRepetition(cleanText)) continue;

    // 7. Bỏ qua nếu trùng hoàn toàn với câu liền trước (Whisper hallucination loop)
    if (lines.length > 0 && lines[lines.length - 1].text.toLowerCase() === cleanText.toLowerCase()) {
      continue;
    }

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
  const processedLines = lines.map((line, idx) => ({ ...line, id: idx }));

  console.log('[aiTranscriptionService] Processed lines:', processedLines);
  return processedLines;
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

          let lines = convertWhisperChunksToLrc(data.chunks);

          // Fallback thông minh: Nếu chunks rỗng nhưng text có nội dung, tự tạo dòng câu hát phân bổ đều theo thời gian
          if (lines.length === 0 && data.text && typeof data.text === 'string' && data.text.trim()) {
            const rawSentences = data.text
              .replace(/\[\s*(music|song|applause|sound|cheering|laughter|instrumental)\s*\]/gi, ' ')
              .replace(/\(\s*(music|song|applause|sound|cheering|laughter|instrumental)\s*\)/gi, ' ')
              .replace(/\[[A-Za-z0-9_]+(?:\s|\]|$)/g, ' ')
              .replace(/[[\]()]/g, ' ')
              .split(/[.\n?!,]+/)
              .map((s) => s.trim())
              .filter((s) => s.length > 1);

            if (rawSentences.length > 0) {
              const duration = audioBuffer.duration || 60;
              const interval = Math.max(2, (duration * 0.85) / rawSentences.length);
              lines = rawSentences.map((sentence, idx) => ({
                id: idx,
                time: Math.round((idx * interval) * 100) / 100,
                text: sentence
              }));
              console.log('[aiTranscriptionService] Fallback sentences generated from text:', lines);
            }
          }

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
