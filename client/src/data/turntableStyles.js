/**
 * Định nghĩa các phong cách tùy biến cho Máy Hát Đĩa Than Cổ Điển 3D (Vintage Gramophone Customization)
 * Cho phép người dùng tùy biến vật liệu thùng gỗ, chất liệu kim loại loa kèn, đĩa than và màu hào quang.
 */

export const WOOD_STYLES = [
  {
    id: 'oak',
    name: 'Nordic Light Oak',
    nameVi: 'Gỗ Sồi Sáng Bắc Âu',
    description: 'Vân gỗ sồi mộc mạc, tươi sáng, mang lại cảm giác thanh thoát và ngập tràn năng lượng.',
    color: 0x9c6d48,
    roughness: 0.54,
    metalness: 0.06,
    previewHex: '#b4815a'
  },
  {
    id: 'white',
    name: 'Scandinavian Lacquer White',
    nameVi: 'Sơn Mài Trắng Tinh Tế',
    description: 'Trắng kem phong cách tối giản hiện đại, phản chiếu ánh sáng tự nhiên dịu nhẹ.',
    color: 0xf1f5f9,
    roughness: 0.32,
    metalness: 0.12,
    previewHex: '#f8fafc'
  },
  {
    id: 'walnut',
    name: 'Classic Walnut',
    nameVi: 'Gỗ Óc Chó Cổ Điển',
    description: 'Nâu sẫm ấm áp sang trọng đặc trưng của máy hát thập niên 1920.',
    color: 0x4a2c19,
    roughness: 0.62,
    metalness: 0.10,
    previewHex: '#4a2c19'
  },
  {
    id: 'cherry',
    name: 'Vintage Mahogany',
    nameVi: 'Gỗ Anh Đào Hoàng Gia',
    description: 'Đỏ rượu vang quý phái, bề mặt bóng mờ cổ điển.',
    color: 0x581c1c,
    roughness: 0.48,
    metalness: 0.08,
    previewHex: '#7f1d1d'
  },
  {
    id: 'ebony',
    name: 'Piano Ebony',
    nameVi: 'Gỗ Mun Đen Sơn Mài',
    description: 'Đen bóng sâu lắng phong cách đàn dương cầm cổ điển.',
    color: 0x18181b,
    roughness: 0.18,
    metalness: 0.22,
    previewHex: '#27272a'
  }
];

export const HORN_STYLES = [
  {
    id: 'brass',
    name: 'Imperial Polished Brass',
    nameVi: 'Đồng Thau Hoàng Gia',
    description: 'Vàng đồng bóng bẩy kinh điển, phản xạ ánh sáng ấm rực rỡ.',
    color: 0xd4af37,
    darkColor: 0xb8860b,
    metalness: 0.90,
    roughness: 0.22,
    previewHex: '#d4af37'
  },
  {
    id: 'chrome',
    name: 'Polished Silver Chrome',
    nameVi: 'Bạc Crom Sáng Bóng',
    description: 'Ánh bạc kim loại hiện đại sáng loáng, tôn lên vẻ thanh tao tươi sáng.',
    color: 0xe2e8f0,
    darkColor: 0x94a3b8,
    metalness: 0.96,
    roughness: 0.14,
    previewHex: '#cbd5e1'
  },
  {
    id: 'rosegold',
    name: 'Romantic Rose Gold',
    nameVi: 'Vàng Hồng Thời Thượng',
    description: 'Sắc vàng hồng lãng mạn, nhẹ nhàng và ấm cúng.',
    color: 0xda8a8a,
    darkColor: 0xb76e79,
    metalness: 0.88,
    roughness: 0.24,
    previewHex: '#e09898'
  },
  {
    id: 'copper',
    name: 'Antique Smoked Bronze',
    nameVi: 'Đồng Cổ Hun Khói',
    description: 'Nâu đồng trầm hoài niệm, vết thời gian trang nhã.',
    color: 0xb45309,
    darkColor: 0x78350f,
    metalness: 0.84,
    roughness: 0.36,
    previewHex: '#b45309'
  }
];

export const VINYL_STYLES = [
  {
    id: 'black',
    name: 'Classic Black Shellac',
    nameVi: 'Đĩa Than Đen Cổ Điển',
    description: 'Đĩa nhựa đen bóng truyền thống với vi rãnh phản quang.',
    color: 0x090a0d,
    roughness: 0.14,
    metalness: 0.92,
    transparent: false,
    opacity: 1.0,
    previewHex: '#0f172a'
  },
  {
    id: 'clear',
    name: 'Crystal Transparent',
    nameVi: 'Pha Lê Trong Suốt',
    description: 'Nhựa đĩa trong suốt hiện đại nhìn thấu cơ chế mâm quay.',
    color: 0xe2e8f0,
    roughness: 0.10,
    metalness: 0.15,
    transparent: true,
    opacity: 0.72,
    previewHex: '#93c5fd'
  },
  {
    id: 'gold',
    name: "Collector's 24K Gold",
    nameVi: 'Đĩa Mạ Vàng Kỷ Niệm',
    description: 'Đĩa than vinh danh mạ vàng lấp lánh phản chiếu.',
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.94,
    transparent: false,
    opacity: 1.0,
    previewHex: '#fbbf24'
  },
  {
    id: 'marble',
    name: 'Pastel Rose Marble',
    nameVi: 'Cẩm Thạch Hồng Pastel',
    description: 'Tông màu hồng pastel loang nhẹ nhàng, trẻ trung và tươi sáng.',
    color: 0xf472b6,
    roughness: 0.26,
    metalness: 0.40,
    transparent: false,
    opacity: 1.0,
    previewHex: '#f472b6'
  }
];

export const UNDERGLOW_COLORS = [
  { id: 'amber', nameVi: 'Nắng Ấm', hex: '#f59e0b' },
  { id: 'cyan', nameVi: 'Biển Xanh', hex: '#06b6d4' },
  { id: 'rose', nameVi: 'Hồng Đào', hex: '#f43f5e' },
  { id: 'emerald', nameVi: 'Xanh Lá Zen', hex: '#10b981' },
  { id: 'violet', nameVi: 'Tím Khói', hex: '#8b5cf6' },
  { id: 'white', nameVi: 'Ánh Trắng', hex: '#f8fafc' }
];

export const DEFAULT_TURNTABLE_STYLE = {
  wood: 'oak', // Mặc định gỗ sồi sáng tươi sáng
  horn: 'brass', // Loa kèn đồng thau bóng
  vinyl: 'black', // Đĩa than đen truyền thống
  underglow: 'amber' // Hào quang nắng ấm
};

const STORAGE_KEY = 'auralofi_turntable_customization';

/**
 * Đọc cấu hình tùy biến từ localStorage hoặc trả về mặc định
 */
export function getSavedTurntableStyle() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        wood: WOOD_STYLES.some((w) => w.id === parsed.wood) ? parsed.wood : DEFAULT_TURNTABLE_STYLE.wood,
        horn: HORN_STYLES.some((h) => h.id === parsed.horn) ? parsed.horn : DEFAULT_TURNTABLE_STYLE.horn,
        vinyl: VINYL_STYLES.some((v) => v.id === parsed.vinyl) ? parsed.vinyl : DEFAULT_TURNTABLE_STYLE.vinyl,
        underglow: UNDERGLOW_COLORS.some((u) => u.id === parsed.underglow) ? parsed.underglow : DEFAULT_TURNTABLE_STYLE.underglow
      };
    }
  } catch (err) {
    console.warn('Lỗi đọc cấu hình tùy biến máy hát:', err);
  }
  return { ...DEFAULT_TURNTABLE_STYLE };
}

/**
 * Lưu cấu hình tùy biến vào localStorage
 */
export function saveTurntableStyle(style) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  } catch (err) {
    console.warn('Lỗi lưu cấu hình tùy biến máy hát:', err);
  }
}
