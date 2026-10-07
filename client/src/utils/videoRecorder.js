/**
 * Module Ghi Hình & Đóng Gói Video Visualizer (Canvas & Web Audio MediaRecorder)
 * Hỗ trợ xuất video chuẩn tỷ lệ 9:16 (TikTok/Reels), 16:9 (YouTube) và 1:1 (Instagram)
 * kết hợp luồng hình ảnh 60 FPS từ Three.js Canvas và âm thanh stereo phòng thu trực tiếp.
 */

export const ASPECT_RATIOS = {
  portrait: {
    id: 'portrait',
    label: '9:16 Dọc',
    subLabel: 'TikTok • Reels • Shorts',
    icon: '📱',
    width: 720,
    height: 1280
  },
  landscape: {
    id: 'landscape',
    label: '16:9 Ngang',
    subLabel: 'YouTube • Màn hình ngang',
    icon: '📺',
    width: 1280,
    height: 720
  },
  square: {
    id: 'square',
    label: '1:1 Vuông',
    subLabel: 'Instagram Feed • Bìa đĩa',
    icon: '⏹️',
    width: 1080,
    height: 1080
  }
};

export const DURATION_OPTIONS = [
  { id: '15', seconds: 15, label: '15 Giây', desc: 'Teaser / Intro' },
  { id: '30', seconds: 30, label: '30 Giây', desc: 'Hook / Điệp khúc' },
  { id: '60', seconds: 60, label: '60 Giây', desc: 'TikTok / Shorts' },
  { id: 'full', seconds: null, label: 'Trọn Bài', desc: 'Toàn bộ thời lượng' }
];

/**
 * Tìm kiếm mimeType tối ưu nhất mà trình duyệt hỗ trợ
 */
export function getSupportedMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4'
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Khởi tạo Canvas tổng hợp (Composite Canvas) và trả về hàm vẽ từng khung hình
 */
export function createCompositeCanvasRenderer({
  turntableCanvas,
  terrainCanvas,
  aspectRatio = 'portrait',
  trackInfo = {},
  ambientColors = {}
}) {
  const config = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS.portrait;
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d', { alpha: false });

  const primaryColor = ambientColors?.hexPrimary || '#f59e0b';
  const secondaryColor = ambientColors?.hexSecondary || '#ec4899';

  // Hàm render 1 khung hình tổng hợp
  const renderFrame = () => {
    const { width: W, height: H } = canvas;

    // 1. Nền Background Gradient mô phỏng phòng thu ấm cúng
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.1, W * 0.5, H * 0.5, W * 0.85);
    bgGrad.addColorStop(0, '#1c1f2e');
    bgGrad.addColorStop(0.5, '#12141d');
    bgGrad.addColorStop(1, '#090a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Vầng hào quang Ambient Aurora phản xạ mờ ảo đổi màu theo bìa album
    const auraGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.6);
    auraGrad.addColorStop(0, primaryColor + '35'); // 20% opacity
    auraGrad.addColorStop(0.6, secondaryColor + '18');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Bố cục theo Tỉ lệ khung hình
    if (aspectRatio === 'portrait') {
      // BỐ CỤC 9:16 DỌC (TikTok / Reels / Shorts)
      // Nửa trên: Mâm đĩa than 3D
      if (turntableCanvas && turntableCanvas.width > 0) {
        const targetH = H * 0.46;
        const targetW = W * 0.96;
        const x = (W - targetW) / 2;
        const y = H * 0.05;
        ctx.drawImage(turntableCanvas, x, y, targetW, targetH);
      }

      // Giữa: Typography bài hát và nghệ sĩ
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      const title = trackInfo.title || 'AuraVinyl Session';
      ctx.fillText(title, W * 0.5, H * 0.54, W * 0.85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      const artist = trackInfo.artist || 'Acoustic Fidelity';
      ctx.fillText(artist, W * 0.5, H * 0.575, W * 0.85);

      // Nhãn Hi-Fi nhỏ
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = primaryColor;
      ctx.fillText('33⅓ RPM • HI-FI STEREO DIRECT STREAM', W * 0.5, H * 0.605);

      // Nửa dưới: Dải lụa cực quang hữu cơ (Fluid Aurora Ribbon)
      if (terrainCanvas && terrainCanvas.width > 0) {
        const targetH = H * 0.36;
        const targetW = W * 0.94;
        const x = (W - targetW) / 2;
        const y = H * 0.62;
        ctx.drawImage(terrainCanvas, x, y, targetW, targetH);
      }
    } else if (aspectRatio === 'landscape') {
      // BỐ CỤC 16:9 NGANG (YouTube / Wide Display)
      // Bên trái: Mâm đĩa than
      if (turntableCanvas && turntableCanvas.width > 0) {
        const targetW = W * 0.48;
        const targetH = H * 0.82;
        const x = W * 0.03;
        const y = (H - targetH) / 2;
        ctx.drawImage(turntableCanvas, x, y, targetW, targetH);
      }

      // Bên phải: Dải lụa cực quang
      if (terrainCanvas && terrainCanvas.width > 0) {
        const targetW = W * 0.46;
        const targetH = H * 0.68;
        const x = W * 0.51;
        const y = H * 0.24;
        ctx.drawImage(terrainCanvas, x, y, targetW, targetH);
      }

      // Góc trên bên phải: Tên bài hát & Nghệ sĩ
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(trackInfo.title || 'AuraVinyl Session', W * 0.52, H * 0.12, W * 0.44);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(trackInfo.artist || 'Acoustic Fidelity', W * 0.52, H * 0.17, W * 0.44);
    } else {
      // BỐ CỤC 1:1 VUÔNG (Instagram / Square Cover)
      // Mâm đĩa than chiếm trung tâm
      if (turntableCanvas && turntableCanvas.width > 0) {
        const targetW = W * 0.88;
        const targetH = H * 0.58;
        const x = (W - targetW) / 2;
        const y = H * 0.04;
        ctx.drawImage(turntableCanvas, x, y, targetW, targetH);
      }

      // Thông tin bài hát
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(trackInfo.title || 'AuraVinyl Session', W * 0.5, H * 0.65, W * 0.88);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(trackInfo.artist || 'Acoustic Fidelity', W * 0.5, H * 0.695, W * 0.88);

      // Dải lụa cực quang bên dưới
      if (terrainCanvas && terrainCanvas.width > 0) {
        const targetW = W * 0.90;
        const targetH = H * 0.26;
        const x = (W - targetW) / 2;
        const y = H * 0.72;
        ctx.drawImage(terrainCanvas, x, y, targetW, targetH);
      }
    }

    // Watermark góc nhỏ thanh lịch
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('AURAVINYL STUDIO', W - 24, H - 18);
  };

  return {
    canvas,
    renderFrame
  };
}

/**
 * Bắt đầu quá trình ghi hình Canvas và Audio Stream bằng MediaRecorder
 */
export function startCanvasRecording({
  canvas,
  audioDestinationNode,
  durationSeconds = 15,
  fps = 60,
  onProgress = () => {},
  onComplete = () => {},
  onError = () => {}
}) {
  if (!canvas) {
    onError(new Error('Canvas không tồn tại để bắt đầu ghi hình.'));
    return { stop: () => {} };
  }

  // 1. Trích xuất luồng video stream từ Canvas
  let canvasStream;
  try {
    canvasStream = canvas.captureStream(fps);
  } catch (err) {
    onError(new Error(`Không thể captureStream từ canvas: ${err.message}`));
    return { stop: () => {} };
  }

  // 2. Trích xuất luồng âm thanh audio tracks
  const audioTracks = audioDestinationNode?.stream?.getAudioTracks() || [];

  // 3. Kết hợp thành MediaStream thống nhất
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks
  ]);

  // 4. Khởi tạo MediaRecorder
  const mimeType = getSupportedMimeType();
  const options = {
    mimeType,
    videoBitsPerSecond: 6000000 // 6 Mbps cho chất lượng hình ảnh sắc nét
  };

  let mediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(combinedStream, options);
  } catch (err) {
    // Fallback không truyền options nếu trình duyệt gặp hạn chế
    try {
      mediaRecorder = new MediaRecorder(combinedStream);
    } catch (e2) {
      onError(new Error(`MediaRecorder khởi tạo thất bại: ${e2.message}`));
      return { stop: () => {} };
    }
  }

  const recordedChunks = [];
  const startTime = performance.now();
  let progressInterval = null;
  let isStopped = false;

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    clearInterval(progressInterval);
    const elapsedSeconds = Math.round((performance.now() - startTime) / 1000);

    const blob = new Blob(recordedChunks, { type: mimeType });
    const videoUrl = URL.createObjectURL(blob);

    // Giải phóng tracks
    combinedStream.getTracks().forEach((track) => track.stop());

    onComplete({
      blob,
      url: videoUrl,
      mimeType,
      duration: elapsedSeconds
    });
  };

  mediaRecorder.onerror = (err) => {
    clearInterval(progressInterval);
    onError(err);
  };

  // Khởi động MediaRecorder (ghi mỗi chunk 250ms để buffer an toàn)
  mediaRecorder.start(250);

  // Bộ đếm tiến trình thời gian thực
  progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const total = durationSeconds || 60;
    const percent = Math.min(100, Math.round((elapsed / total) * 100));

    onProgress({
      elapsedSeconds: Math.floor(elapsed),
      totalSeconds: total,
      percent
    });

    if (durationSeconds && elapsed >= durationSeconds) {
      stopRecording();
    }
  }, 200);

  const stopRecording = () => {
    if (isStopped) return;
    isStopped = true;
    clearInterval(progressInterval);
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  return {
    stop: stopRecording
  };
}
