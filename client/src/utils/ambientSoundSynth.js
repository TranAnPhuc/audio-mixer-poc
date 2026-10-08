/**
 * Module Tổng Hợp Âm Thanh Môi Trường Bằng Web Audio API (Procedural Ambient Sound Synth)
 * Tự động tạo 4 luồng âm thanh thư giãn (Mưa, Cafe, Lò sưởi, Gió đêm) bằng thuật toán số học
 * 100% không dùng file tải ngoài, độ trễ bằng 0, không tốn băng thông, tự động ngắt khi volume = 0.
 */

import { getAudioContext } from './vinylAudioEngine.js';

export const AMBIENT_SOUND_KEYS = {
  rain: 'rain',
  cafe: 'cafe',
  fireplace: 'fireplace',
  wind: 'wind'
};

export const AMBIENT_SOUND_INFO = {
  rain: {
    id: 'rain',
    name: 'Mưa Rơi Bên Cửa Sổ',
    icon: '🌧️',
    description: 'Tiếng mưa rào êm dịu gột rửa tâm trí'
  },
  cafe: {
    id: 'cafe',
    name: 'Quán Cà Phê Ấm Cúng',
    icon: '☕',
    description: 'Tiếng rì rầm nhẹ nhàng & ly tách lách cách'
  },
  fireplace: {
    id: 'fireplace',
    name: 'Lò Sưởi Tí Tách',
    icon: '🔥',
    description: 'Tiếng than củi nổ lách tách ấm áp đêm đông'
  },
  wind: {
    id: 'wind',
    name: 'Gió Đêm Qua Kẽ Lá',
    icon: '🍃',
    description: 'Tiếng gió lùa từng đợt ru êm giấc ngủ'
  }
};

// Lưu trữ trạng thái gain nodes và sources
const activeChannels = {
  rain: { gainNode: null, sourceNode: null, volume: 0, cleanup: null },
  cafe: { gainNode: null, sourceNode: null, volume: 0, cleanup: null },
  fireplace: { gainNode: null, sourceNode: null, volume: 0, cleanup: null },
  wind: { gainNode: null, sourceNode: null, volume: 0, cleanup: null }
};

/**
 * Sinh buffer Noise ngẫu nhiên (White / Pink Noise Generator)
 */
function createNoiseBuffer(ctx, duration = 3.0) {
  const sampleRate = ctx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const output = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < numSamples; i++) {
    const white = Math.random() * 2 - 1;
    // Thuật toán Paul Kellet Pink Noise Filter
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
    b6 = white * 0.115926;
  }
  return buffer;
}

/**
 * Tạo StereoPannerNode an toàn với fallback khi môi trường/trình duyệt không hỗ trợ
 */
function createStereoPannerSafe(ctx, panValue = 0) {
  if (ctx && typeof ctx.createStereoPanner === 'function') {
    try {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, ctx.currentTime);
      return panner;
    } catch (e) {}
  }
  return null;
}

export const AMBIENT_SPATIAL_POSITIONS = {
  rain: { pan: -0.65, label: 'Cửa sổ bên trái (-65%)' },
  cafe: { pan: -0.20, label: 'Không gian góc quán (-20%)' },
  fireplace: { pan: 0.60, label: 'Lò sưởi góc phòng (+60%)' },
  wind: { pan: 'LFO ±0.55', label: 'Gió lướt 3D đa chiều' }
};

/**
 * Khởi động kênh âm thanh tiếng Mưa (Rain) — Panned Trái (-0.65)
 */
function startRainChannel(ctx, masterGain) {
  const noiseBuffer = createNoiseBuffer(ctx, 3.5);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Bộ lọc Lowpass tạo âm thanh mưa rào ẩm ướt
  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.setValueAtTime(1100, ctx.currentTime);
  rainFilter.Q.setValueAtTime(0.8, ctx.currentTime);

  // Định vị không gian: Âm mưa bên ô cửa kính góc trái phòng
  const rainPanner = createStereoPannerSafe(ctx, -0.65);

  noiseSource.connect(rainFilter);
  if (rainPanner) {
    rainFilter.connect(rainPanner);
    rainPanner.connect(masterGain);
  } else {
    rainFilter.connect(masterGain);
  }
  noiseSource.start();

  return () => {
    try {
      noiseSource.stop();
      noiseSource.disconnect();
      rainFilter.disconnect();
      if (rainPanner) rainPanner.disconnect();
    } catch (e) {}
  };
}

/**
 * Khởi động kênh âm thanh Quán Cà Phê (Cozy Cafe) — Panned Hơi Lệch Trái (-0.20)
 */
function startCafeChannel(ctx, masterGain) {
  const noiseBuffer = createNoiseBuffer(ctx, 4.0);
  const murmurSource = ctx.createBufferSource();
  murmurSource.buffer = noiseBuffer;
  murmurSource.loop = true;

  // Lọc dải trung mô phỏng tiếng người trò chuyện rì rầm xa xa
  const cafeFilter = ctx.createBiquadFilter();
  cafeFilter.type = 'bandpass';
  cafeFilter.frequency.setValueAtTime(550, ctx.currentTime);
  cafeFilter.Q.setValueAtTime(1.8, ctx.currentTime);

  const cafePanner = createStereoPannerSafe(ctx, -0.20);

  murmurSource.connect(cafeFilter);
  if (cafePanner) {
    cafeFilter.connect(cafePanner);
    cafePanner.connect(masterGain);
  } else {
    cafeFilter.connect(masterGain);
  }
  murmurSource.start();

  return () => {
    try {
      murmurSource.stop();
      murmurSource.disconnect();
      cafeFilter.disconnect();
      if (cafePanner) cafePanner.disconnect();
    } catch (e) {}
  };
}

/**
 * Khởi động kênh âm thanh Lò Sưởi (Fireplace Crackle & Warmth) — Panned Phải (+0.60)
 */
function startFireplaceChannel(ctx, masterGain) {
  const sampleRate = ctx.sampleRate;
  const dur = 3.0;
  const numSamples = Math.floor(sampleRate * dur);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Sinh tiếng than nổ tí tách ngẫu nhiên
  for (let i = 0; i < numSamples; i++) {
    let sample = (Math.random() * 2 - 1) * 0.012; // Tiếng lửa liếm nhẹ
    if (Math.random() < 0.0035) {
      // Tia than nổ
      const pop = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.45);
      sample += pop;
      const decay = Math.floor(6 + Math.random() * 12);
      for (let j = 1; j <= decay && i + j < numSamples; j++) {
        data[i + j] += pop * Math.exp(-j / 3.0);
      }
    }
    data[i] = sample;
  }

  const fireSource = ctx.createBufferSource();
  fireSource.buffer = buffer;
  fireSource.loop = true;

  const fireFilter = ctx.createBiquadFilter();
  fireFilter.type = 'lowpass';
  fireFilter.frequency.setValueAtTime(1600, ctx.currentTime);

  // Định vị không gian: Lò sưởi ấm cúng góc phòng bên phải
  const firePanner = createStereoPannerSafe(ctx, 0.60);

  fireSource.connect(fireFilter);
  if (firePanner) {
    fireFilter.connect(firePanner);
    firePanner.connect(masterGain);
  } else {
    fireFilter.connect(masterGain);
  }
  fireSource.start();

  return () => {
    try {
      fireSource.stop();
      fireSource.disconnect();
      fireFilter.disconnect();
      if (firePanner) firePanner.disconnect();
    } catch (e) {}
  };
}

/**
 * Khởi động kênh âm thanh Gió Đêm (Night Wind) với LFO quét tần số & LFO Panning 3D
 */
function startWindChannel(ctx, masterGain) {
  const noiseBuffer = createNoiseBuffer(ctx, 4.0);
  const windSource = ctx.createBufferSource();
  windSource.buffer = noiseBuffer;
  windSource.loop = true;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(320, ctx.currentTime);
  windFilter.Q.setValueAtTime(2.5, ctx.currentTime);

  // LFO dao động tần số lọc tạo cảm giác gió thổi từng luồng
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.22, ctx.currentTime); // Chu kỳ ~4.5s
  lfoGain.gain.setValueAtTime(180, ctx.currentTime); // Biên độ quét +/- 180Hz

  lfo.connect(lfoGain);
  lfoGain.connect(windFilter.frequency);

  // LFO 3D Spatial Panning: Gió lướt nhẹ nhàng từ trái sang phải và ngược lại
  const windPanner = createStereoPannerSafe(ctx, 0);
  let panLfo = null;
  let panLfoGain = null;
  if (windPanner && typeof ctx.createOscillator === 'function' && typeof ctx.createGain === 'function') {
    try {
      panLfo = ctx.createOscillator();
      panLfoGain = ctx.createGain();
      panLfo.frequency.setValueAtTime(0.07, ctx.currentTime); // Chu kỳ ~14 giây
      panLfoGain.gain.setValueAtTime(0.55, ctx.currentTime); // Dao động [-0.55, +0.55]
      panLfo.connect(panLfoGain);
      panLfoGain.connect(windPanner.pan);
      panLfo.start();
    } catch (e) {
      panLfo = null;
      panLfoGain = null;
    }
  }

  windSource.connect(windFilter);
  if (windPanner) {
    windFilter.connect(windPanner);
    windPanner.connect(masterGain);
  } else {
    windFilter.connect(masterGain);
  }

  windSource.start();
  lfo.start();

  return () => {
    try {
      windSource.stop();
      windSource.disconnect();
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      windFilter.disconnect();
      if (panLfo) {
        panLfo.stop();
        panLfo.disconnect();
      }
      if (panLfoGain) panLfoGain.disconnect();
      if (windPanner) windPanner.disconnect();
    } catch (e) {}
  };
}

/**
 * Điều chỉnh âm lượng cho một kênh âm thanh môi trường cụ thể
 * @param {string} soundKey - 'rain' | 'cafe' | 'fireplace' | 'wind'
 * @param {number} volume - Giá trị từ 0.0 đến 1.0
 */
export function setAmbientVolume(soundKey, volume) {
  const channel = activeChannels[soundKey];
  if (!channel) return;

  const clampedVol = Math.min(1.0, Math.max(0.0, Number(volume) || 0));
  channel.volume = clampedVol;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (clampedVol > 0) {
    // Khởi tạo kênh nếu chưa có
    if (!channel.gainNode) {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(clampedVol, ctx.currentTime);
      gainNode.connect(ctx.destination);
      channel.gainNode = gainNode;

      if (soundKey === 'rain') channel.cleanup = startRainChannel(ctx, gainNode);
      else if (soundKey === 'cafe') channel.cleanup = startCafeChannel(ctx, gainNode);
      else if (soundKey === 'fireplace') channel.cleanup = startFireplaceChannel(ctx, gainNode);
      else if (soundKey === 'wind') channel.cleanup = startWindChannel(ctx, gainNode);
    } else {
      // Đã có -> Lerp âm lượng mượt mà
      channel.gainNode.gain.setTargetAtTime(clampedVol, ctx.currentTime, 0.05);
    }
  } else {
    // Volume = 0 -> Dập tắt và ngắt kết nối để tiết kiệm 100% CPU
    if (channel.gainNode) {
      channel.gainNode.gain.setValueAtTime(0, ctx.currentTime);
      setTimeout(() => {
        if (channel.volume === 0 && channel.cleanup) {
          channel.cleanup();
          channel.cleanup = null;
          try {
            channel.gainNode.disconnect();
          } catch (e) {}
          channel.gainNode = null;
        }
      }, 100);
    }
  }
}

/**
 * Đọc toàn bộ trạng thái âm lượng môi trường hiện tại
 */
export function getAmbientVolumes() {
  return {
    rain: activeChannels.rain.volume,
    cafe: activeChannels.cafe.volume,
    fireplace: activeChannels.fireplace.volume,
    wind: activeChannels.wind.volume
  };
}

/**
 * Dập tắt toàn bộ các kênh âm thanh môi trường
 */
export function stopAllAmbientSounds() {
  Object.keys(activeChannels).forEach((k) => {
    setAmbientVolume(k, 0);
  });
}
