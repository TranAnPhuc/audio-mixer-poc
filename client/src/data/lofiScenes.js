/**
 * Cấu hình các cảnh không gian Lofi nghệ thuật (AuraLofi Atmospheric Scenes)
 * Lấy cảm hứng từ triết lý lofi.cafe & LifeAt: tươi sáng, tĩnh lặng, không chia hộp, ánh sáng hoài niệm.
 * Cung cấp bộ màu gradient nền, ánh sáng Three.js và preset bộ trộn âm thanh môi trường 4 kênh.
 */

export const LOFI_SCENES = [
  {
    id: 'sunny-loft',
    name: 'Sunny Loft',
    nameVi: 'Phòng học đón nắng sáng',
    description: 'Nắng sớm chan hòa qua khung cửa sổ, không gian học tập sáng bừng năng lượng tích cực và thư thái.',
    icon: '☀️',
    canvasEffect: 'dust',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 25%, #4b5d7a 0%, #2d3b50 50%, #161e2a 100%)',
      primaryColor: '#f59e0b',
      accentColor: '#38bdf8',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      lightingColor: '#fffbeb',
      phosphorColor: 'amber',
      ambientPreset: {
        rain: 0.0,
        cafe: 0.30,
        fireplace: 0.15,
        wind: 0.35
      }
    }
  },
  {
    id: 'cozy-cafe',
    name: 'Cozy Cafe',
    nameVi: 'Quán cà phê đón nắng',
    description: 'Góc quán quen ấm cúng chan hòa ánh sáng tự nhiên, hương cà phê thoang thoảng cùng tiếng nhạc êm đềm.',
    icon: '☕',
    canvasEffect: 'bokeh',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 30%, #5d4037 0%, #3e2723 50%, #1e130d 100%)',
      primaryColor: '#fbbf24',
      accentColor: '#f97316',
      glowColor: 'rgba(251, 191, 36, 0.35)',
      lightingColor: '#fef3c7',
      phosphorColor: 'amber',
      ambientPreset: {
        cafe: 0.60,
        rain: 0.10,
        fireplace: 0.10,
        wind: 0.15
      }
    }
  },
  {
    id: 'sunset-loft',
    name: 'Sunset Loft',
    nameVi: 'Bàn học hoàng hôn',
    description: 'Bàn học nhìn ra bầu trời hoàng hôn ấm áp, ánh mật ong buông dài cùng gió chiều lộng.',
    icon: '🌇',
    canvasEffect: 'dust',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 30%, #68304b 0%, #3e1b30 50%, #1c0d1b 100%)',
      primaryColor: '#f97316',
      accentColor: '#c084fc',
      glowColor: 'rgba(249, 115, 22, 0.35)',
      lightingColor: '#fed7aa',
      phosphorColor: 'amber',
      ambientPreset: {
        wind: 0.35,
        fireplace: 0.30,
        rain: 0.0,
        cafe: 0.15
      }
    }
  },
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    nameVi: 'Cửa sổ mưa chiều',
    description: 'Mưa rào mùa hạ tí tách bên ô cửa kính mờ, phản chiếu ánh sáng dịu êm thanh tịnh.',
    icon: '🌧️',
    canvasEffect: 'rain',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 30%, #334661 0%, #1d2a3c 55%, #101824 100%)',
      primaryColor: '#38bdf8',
      accentColor: '#818cf8',
      glowColor: 'rgba(56, 189, 248, 0.35)',
      lightingColor: '#bae6fd',
      phosphorColor: 'cyan',
      ambientPreset: {
        rain: 0.65,
        fireplace: 0.15,
        cafe: 0.0,
        wind: 0.20
      }
    }
  }
];

export const DEFAULT_SCENE = LOFI_SCENES[0];

/**
 * Tìm scene theo ID, nếu không tìm thấy trả về DEFAULT_SCENE
 * @param {string} id
 * @returns {object} Scene object
 */
export function getSceneById(id) {
  if (!id) return DEFAULT_SCENE;
  const found = LOFI_SCENES.find((scene) => scene.id === id);
  return found || DEFAULT_SCENE;
}

/**
 * Lấy scene tiếp theo theo vòng tròn (cycling 0 -> 1 -> 2 -> 3 -> 0)
 * @param {string} currentId
 * @returns {object} Scene object kế tiếp
 */
export function getNextScene(currentId) {
  const currentIndex = LOFI_SCENES.findIndex((scene) => scene.id === currentId);
  if (currentIndex === -1) {
    return LOFI_SCENES[1] || DEFAULT_SCENE;
  }
  const nextIndex = (currentIndex + 1) % LOFI_SCENES.length;
  return LOFI_SCENES[nextIndex];
}
