/**
 * Động cơ Xử lý Âm học Đĩa Than & Phân Tích Phổ Tần Số (Vinyl Audio DSP Engine)
 * Tự động tổng hợp âm thanh kim đĩa than (Procedural Crackle & Needle Drop) bằng Web Audio API
 * và bắc cầu phân tích dải tần (AnalyserNode Bridge) cho mâm đĩa 3D.
 */

let audioCtx = null;
let analyserNode = null;
let frequencyData = null;
const mediaSourceMap = new WeakMap();
let isMuted = false;

/**
 * Lấy hoặc khởi tạo Web Audio AudioContext singleton
 */
export function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Tự động resume AudioContext khi có tương tác đầu tiên
if (typeof window !== 'undefined') {
  const resumeOnInteraction = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', resumeOnInteraction, { once: true, passive: true });
  window.addEventListener('keydown', resumeOnInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', resumeOnInteraction, { once: true, passive: true });
}

export function setVinylMuted(muted) {
  isMuted = Boolean(muted);
}

export function getIsVinylMuted() {
  return isMuted;
}

/**
 * Thuật toán tổng hợp tiếng nổ lách tách và xì rãnh nhựa (Procedural Vinyl Crackle Buffer)
 * Không dùng file ngoài (0kb asset, tải tức thì)
 */
function createVinylCrackleBuffer(ctx, duration) {
  const sampleRate = ctx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Mật độ hạt bụi ngẫu nhiên (Crackle pop probability)
  const crackleDensity = 0.0022;

  for (let i = 0; i < numSamples; i++) {
    // 1. Tiếng xì bề mặt nhựa dẻo (Surface hiss)
    let sample = (Math.random() * 2 - 1) * 0.016;

    // 2. Các hạt bụi nổ lách tách ngẫu nhiên (Impulse pops & clicks)
    if (Math.random() < crackleDensity) {
      const popAmplitude = (Math.random() > 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.55);
      sample += popAmplitude;

      // Đường dốc suy giảm exponential tự nhiên qua 4 - 8 mẫu kế tiếp
      const decayLen = Math.floor(4 + Math.random() * 8);
      for (let j = 1; j <= decayLen && i + j < numSamples; j++) {
        data[i + j] += popAmplitude * Math.exp(-j / 2.2);
      }
    }

    data[i] = sample;
  }

  return buffer;
}

/**
 * Tiếng chạm kim mộc mạc khi đầu kim vừa tiếp xúc mặt đĩa (Needle Contact Thud)
 */
function playNeedleContactThud(ctx, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(105, time);
  osc.frequency.exponentialRampToValueAtTime(32, time + 0.075);

  gain.gain.setValueAtTime(0.24, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.08);
}

/**
 * 1. playNeedleDropEffect: Kích hoạt tiếng nổ lách tách và tiếng chạm kim mộc mạc
 * Khi kim vừa hạ xuống đĩa, sau đó fade-out êm dịu khi bài hát chính cất lên
 */
export function playNeedleDropEffect({ duration = 1.8 } = {}) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  try {
    // 1. Tiếng chạm kim cơ học
    playNeedleContactThud(ctx, now);

    // 2. Buffer tiếng nổ lách tách
    const crackleBuffer = createVinylCrackleBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = crackleBuffer;

    // Bộ lọc dải thông (Bandpass filter) định hình âm thanh ấm áp đặc trưng của đĩa than
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(0.9, now);

    // Envelope âm lượng: chạm đĩa -> nổ giòn giã -> fade out êm ái khi nhạc vào
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.32, now + 0.12);
    gainNode.gain.setValueAtTime(0.32, now + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.05);
  } catch (err) {
    console.warn('[vinylAudioEngine] playNeedleDropEffect notice:', err);
  }
}

/**
 * 2. connectAudioElement: Kết nối thẻ <audio> vào đồ thị Web Audio API AnalyserNode
 */
export function connectAudioElement(audioElement) {
  if (!audioElement) return null;
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Khởi tạo AnalyserNode nếu chưa có
  if (!analyserNode) {
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.85;
    frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
  }

  // Chỉ kết nối MediaElementSource một lần duy nhất cho mỗi HTMLAudioElement
  if (!mediaSourceMap.has(audioElement)) {
    try {
      const sourceNode = ctx.createMediaElementSource(audioElement);
      sourceNode.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      mediaSourceMap.set(audioElement, sourceNode);
    } catch (err) {
      console.warn('[vinylAudioEngine] MediaElementAudioSourceNode already connected or bypassed:', err);
    }
  }

  return analyserNode;
}

/**
 * 3. getAudioFrequencies: Trích xuất năng lượng âm thanh theo dải tần thời gian thực
 * Trả về: { bassEnergy, midEnergy, trebleEnergy } từ 0.0 đến 1.0
 */
export function getAudioFrequencies() {
  if (!analyserNode || !frequencyData) {
    return { bassEnergy: 0, midEnergy: 0, trebleEnergy: 0 };
  }

  analyserNode.getByteFrequencyData(frequencyData);

  // 1. Dải Trầm (Bass / Kick drum: 20Hz - 160Hz) -> Bins 0, 1, 2
  const bassSum = frequencyData[0] + frequencyData[1] + frequencyData[2];
  const bassEnergy = Math.min(1, Math.max(0, bassSum / (3 * 255)));

  // 2. Dải Trung (Mids: 200Hz - 2500Hz) -> Bins 3 đến 28
  let midSum = 0;
  for (let i = 3; i < 28; i++) {
    midSum += frequencyData[i];
  }
  const midEnergy = Math.min(1, Math.max(0, midSum / (25 * 255)));

  // 3. Dải Cao (Treble: > 2500Hz) -> Bins 28 đến 95
  let trebleSum = 0;
  for (let i = 28; i < 95; i++) {
    trebleSum += frequencyData[i];
  }
  const trebleEnergy = Math.min(1, Math.max(0, trebleSum / (67 * 255)));

  return { bassEnergy, midEnergy, trebleEnergy };
}

/**
 * 4. getFrequencyData: Trích xuất mảng phổ tần số chi tiết cho địa hình 3D (Audio Terrain)
 * @param {number} numBands - Số dải tần cần lấy mẫu (mặc định 32)
 * @returns {Float32Array} - Mảng giá trị biên độ chuẩn hóa từ 0.0 đến 1.0
 */
export function getFrequencyData(numBands = 32) {
  const result = new Float32Array(numBands);
  if (!analyserNode || !frequencyData) {
    return result;
  }

  analyserNode.getByteFrequencyData(frequencyData);

  // Phân bố phi tuyến trên dải tần hoạt động (dày ở bass/mid, trải đều đến treble)
  const binCount = Math.min(128, frequencyData.length);
  for (let i = 0; i < numBands; i++) {
    const t = i / (numBands - 1);
    const binIndex = Math.min(binCount - 1, Math.floor(Math.pow(t, 1.4) * (binCount - 1)));
    result[i] = frequencyData[binIndex] / 255.0;
  }

  return result;
}

/**
 * 5. getRawByteFrequencyData: Trả về Uint8Array thô từ AnalyserNode
 */
export function getRawByteFrequencyData() {
  if (!analyserNode || !frequencyData) {
    return new Uint8Array(256);
  }
  analyserNode.getByteFrequencyData(frequencyData);
  return frequencyData;
}
