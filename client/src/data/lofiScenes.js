/**
 * Cấu hình các cảnh không gian Lofi nghệ thuật (AuraLofi Atmospheric Scenes)
 * Lấy cảm hứng từ triết lý lofi.cafe & LifeAt: tươi sáng, tĩnh lặng, không chia hộp, ánh sáng hoài niệm.
 * Cung cấp bộ màu gradient nền, ánh sáng Three.js và preset bộ trộn âm thanh môi trường 4 kênh.
 */

export const LOFI_SCENES = [
  {
    id: 'sunny-loft',
    name: 'Warm Amber Studio',
    nameVi: 'Studio Ánh Đèn Vàng Ấm',
    description: 'Không gian phòng nghe nhạc riêng tư với ánh đèn spotlight 2700K ấm áp rọi nhẹ xuống mâm đĩa than.',
    icon: '💡',
    canvasEffect: 'dust',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 35%, #2a241e 0%, #171412 55%, #0a0908 100%)',
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
    name: 'Espresso Lounge',
    nameVi: 'Phòng Nghe Gỗ Óc Chó & Cafe',
    description: 'Tông màu gỗ mun và nâu espresso trầm lắng, hoàn hảo cho những bản thu âm acoustic mộc mạc.',
    icon: '☕',
    canvasEffect: 'bokeh',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 35%, #2b1d16 0%, #19100c 55%, #0c0806 100%)',
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
    name: 'Twilight Jazz Bar',
    nameVi: 'Quán Bar Jazz Hoàng Hôn',
    description: 'Ánh tím than và hổ phách hoài niệm của một quán bar jazz tĩnh lặng lúc chập tối.',
    icon: '🎷',
    canvasEffect: 'dust',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 35%, #281822 0%, #180d14 55%, #0b0609 100%)',
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
    name: 'Midnight Obsidian',
    nameVi: 'Đêm Mưa Obsidian Tĩnh Lặng',
    description: 'Màu đá núi lửa đen sâu thẳm hòa cùng tiếng mưa đêm tí tách bên ngoài căn phòng.',
    icon: '🌧️',
    canvasEffect: 'rain',
    theme: {
      bgGradient: 'radial-gradient(ellipse at 50% 35%, #151e28 0%, #0d141b 55%, #070a0e 100%)',
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
