/**
 * Cấu hình các cảnh không gian Lofi nghệ thuật (AuraLofi Atmospheric Scenes)
 * Lấy cảm hứng từ triết lý lofi.cafe: tĩnh lặng, không chia hộp, ánh sáng hoài niệm.
 * Cung cấp bộ màu gradient nền, ánh sáng Three.js và preset bộ trộn âm thanh môi trường 4 kênh.
 */

export const LOFI_SCENES = [
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    nameVi: 'Cửa sổ mưa đêm',
    description: 'Mưa đêm rơi tí tách bên ô cửa kính mờ, ánh đèn phố thị lấp lánh phản chiếu không gian tĩnh lặng.',
    icon: '🌧️',
    canvasEffect: 'rain',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 30%, #151c2e 0%, #0d121f 55%, #06080e 100%)',
      primaryColor: '#38bdf8',
      accentColor: '#818cf8',
      glowColor: 'rgba(56, 189, 248, 0.25)',
      lightingColor: '#93c5fd',
      phosphorColor: 'cyan',
      ambientPreset: {
        rain: 0.65,
        fireplace: 0.20,
        cafe: 0.0,
        wind: 0.15
      }
    }
  },
  {
    id: 'cozy-cafe',
    name: 'Cozy Cafe',
    nameVi: 'Quán cà phê đêm',
    description: 'Góc quán quen ấm cúng, hương cà phê thoang thoảng cùng tiếng tách lách cách đêm muộn.',
    icon: '☕',
    canvasEffect: 'bokeh',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 35%, #2a1b14 0%, #180f0b 55%, #0a0604 100%)',
      primaryColor: '#f59e0b',
      accentColor: '#d97706',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      lightingColor: '#fed7aa',
      phosphorColor: 'amber',
      ambientPreset: {
        cafe: 0.60,
        rain: 0.25,
        fireplace: 0.0,
        wind: 0.10
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
      bgGradient: 'radial-gradient(ellipse at 50% 30%, #351c2d 0%, #201124 50%, #0d0711 100%)',
      primaryColor: '#f97316',
      accentColor: '#c084fc',
      glowColor: 'rgba(249, 115, 22, 0.25)',
      lightingColor: '#fdba74',
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
    id: 'zen-deck',
    name: 'Zen Vinyl Deck',
    nameVi: 'Mâm đĩa than Zen',
    description: 'Không gian tối giản thuần khiết, ánh đèn vàng ấm 2700K tập trung trọn vẹn vào đĩa than đang quay.',
    icon: '🧘',
    canvasEffect: 'zen',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 45%, #181412 0%, #0d0c0c 60%, #050505 100%)',
      primaryColor: '#fbbf24',
      accentColor: '#a3e635',
      glowColor: 'rgba(251, 191, 36, 0.20)',
      lightingColor: '#fef3c7',
      phosphorColor: 'emerald',
      ambientPreset: {
        rain: 0.15,
        fireplace: 0.20,
        cafe: 0.0,
        wind: 0.10
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
