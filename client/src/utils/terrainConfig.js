/**
 * Cấu hình Camera Presets & Tham Số Địa Hình Sóng Âm 3D
 */

export const CAMERA_PRESETS = {
  isometric: {
    id: 'isometric',
    label: 'ISO 3D',
    icon: '📐',
    position: [0, 4.2, 7.0],
    lookAt: [0, 0, -2.2]
  },
  frontal: {
    id: 'frontal',
    label: 'JOY DIVISION',
    icon: '📻',
    position: [0, 1.4, 8.2],
    lookAt: [0, 1.1, 0]
  },
  topdown: {
    id: 'topdown',
    label: 'CONTOUR',
    icon: '🗺️',
    position: [0, 8.8, 0.8],
    lookAt: [0, 0, -2.5]
  }
};

/**
 * Giới hạn an toàn hệ số khuếch đại biên độ sóng waveGain
 * @param {number} gain
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampWaveGain(gain, min = 0.4, max = 2.4) {
  const rounded = Math.round(gain * 10) / 10;
  return Math.min(max, Math.max(min, rounded));
}
