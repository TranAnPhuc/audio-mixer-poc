/**
 * Bộ Tổng Hợp Âm Thanh Tương Tác Web Audio API (Synthesized Procedural Audio Engine)
 * Tự động tạo hiệu ứng âm thanh (SFX) bằng OscillatorNode, GainNode và BiquadFilterNode
 * Hoàn toàn không phụ thuộc file MP3/WAV tĩnh, không tốn băng thông, độ trễ bằng 0.
 */

const STORAGE_KEY = 'audio_mixer_sound_muted';

let audioCtx = null;
let isMuted = false;

// Đọc trạng thái tắt tiếng từ localStorage
try {
  isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
} catch (e) {
  isMuted = false;
}

const listeners = new Set();

/**
 * Lấy hoặc khởi tạo AudioContext singleton
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  // Tự động kích hoạt (resume) khi có tương tác đầu tiên của người dùng
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Lắng nghe tương tác đầu tiên để kích hoạt AudioContext tuân thủ Autoplay Policy
 */
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

export function getIsSoundMuted() {
  return isMuted;
}

export function setSoundMuted(muted) {
  isMuted = Boolean(muted);
  try {
    localStorage.setItem(STORAGE_KEY, isMuted ? 'true' : 'false');
  } catch (e) {}
  listeners.forEach((fn) => fn(isMuted));
}

export function toggleSoundMute() {
  const next = !isMuted;
  setSoundMuted(next);
  if (!next) {
    // Phát một âm thanh ngắn khi mở lại tiếng
    playHoverBlip();
  }
  return next;
}

export function subscribeSoundMute(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 1. playHapticClick: Âm thanh click cơ học (mechanical click) ngắn gọn, dứt khoát
 * Tần số: 800Hz -> 180Hz trong 35ms, dốc âm lượng exponential decay
 */
export function playHapticClick() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {
    // Không ném lỗi nếu AudioContext bị chặn
  }
}

/**
 * 2. playHoverBlip: Âm thanh radar quét nhẹ (subtle blip) khi rê chuột qua nút bấm
 * Tần số: 1200Hz, âm lượng nhỏ -24dB trong 20ms
 */
export function playHoverBlip() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.02);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  } catch (err) {}
}

/**
 * 3. playStageSweep: Tiếng quét tần số không gian (spatial filter sweep) khi cuộn qua Stage mới
 * Lọc quét tần số từ 200Hz lên 850Hz với resonance, tạo âm thanh 'whoosh' công nghệ
 */
export function playStageSweep(stageNumber = 1) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Tần số thay đổi linh hoạt theo số thứ tự stage
    const baseFreq = 180 + stageNumber * 60;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);

    // Filter Sweep
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.5, now);
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.22);

    // Gain Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {}
}

/**
 * 4. playWarpLaunch: Âm thanh động cơ không gian bùng nổ khi kích hoạt Studio
 * Kết hợp Sub-bass dive (130Hz -> 38Hz), White Noise Roar và Harmonic Warp Sweep
 */
export function playWarpLaunch() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const DURATION = 0.75;

    // --- A. Sub-bass Dive (Tiếng gầm trầm tần số thấp) ---
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + DURATION);

    subGain.gain.setValueAtTime(0.01, now);
    subGain.gain.linearRampToValueAtTime(0.28, now + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + DURATION);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + DURATION);

    // --- B. Warp Noise Roar (Tiếng rít hạt năng lượng vũ trụ) ---
    const bufferSize = ctx.sampleRate * DURATION;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.setValueAtTime(3.0, now);
    noiseFilter.frequency.setValueAtTime(350, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(3600, now + DURATION);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.18, now + DURATION * 0.7);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + DURATION);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + DURATION);

    // --- C. Harmonic Acceleration Sweep (Tia laser gia tốc) ---
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();

    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(320, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(2200, now + DURATION);

    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.12, now + DURATION * 0.6);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + DURATION);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(ctx.destination);

    sweepOsc.start(now);
    sweepOsc.stop(now + DURATION);
  } catch (err) {}
}
