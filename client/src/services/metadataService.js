import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

/**
 * Bảng màu mặc định hoài niệm (Amber Gold & Rose Burgundy)
 * Dùng khi bài hát không có ảnh bìa album
 */
export const DEFAULT_PALETTE = {
  primaryColor: 'rgb(217, 119, 6)', // Amber 600
  secondaryColor: 'rgb(190, 24, 93)', // Rose 700
  glowColor: 'rgba(245, 158, 11, 0.22)',
  hexPrimary: '#d97706',
  hexSecondary: '#be185d'
};

/**
 * Trích xuất nội dung lời bài hát nhúng trong metadata ID3 (USLT, SYLT, lyrics)
 * @param {Object} tags 
 * @returns {string|null}
 */
export function extractEmbeddedLyrics(tags) {
  if (!tags || typeof tags !== 'object') return null;

  // 1. Kiểm tra tags.lyrics (một số tagger gán trực tiếp hoặc bọc trong object)
  if (tags.lyrics) {
    if (typeof tags.lyrics === 'string' && tags.lyrics.trim()) {
      return tags.lyrics.trim();
    }
    if (typeof tags.lyrics.lyrics === 'string' && tags.lyrics.lyrics.trim()) {
      return tags.lyrics.lyrics.trim();
    }
    if (typeof tags.lyrics.data?.lyrics === 'string' && tags.lyrics.data.lyrics.trim()) {
      return tags.lyrics.data.lyrics.trim();
    }
    if (typeof tags.lyrics.data === 'string' && tags.lyrics.data.trim()) {
      return tags.lyrics.data.trim();
    }
  }

  // 2. Kiểm tra thẻ ID3 USLT (Unsynchronised lyric/text transcription)
  if (tags.USLT) {
    if (typeof tags.USLT === 'string' && tags.USLT.trim()) {
      return tags.USLT.trim();
    }
    if (typeof tags.USLT.lyrics === 'string' && tags.USLT.lyrics.trim()) {
      return tags.USLT.lyrics.trim();
    }
    if (typeof tags.USLT.data?.lyrics === 'string' && tags.USLT.data.lyrics.trim()) {
      return tags.USLT.data.lyrics.trim();
    }
    if (typeof tags.USLT.data === 'string' && tags.USLT.data.trim()) {
      return tags.USLT.data.trim();
    }
  }

  // 3. Kiểm tra thẻ ID3 SYLT (Synchronised lyric/text)
  if (tags.SYLT) {
    if (typeof tags.SYLT === 'string' && tags.SYLT.trim()) {
      return tags.SYLT.trim();
    }
    if (typeof tags.SYLT.data === 'string' && tags.SYLT.data.trim()) {
      return tags.SYLT.data.trim();
    }
    if (typeof tags.SYLT.lyrics === 'string' && tags.SYLT.lyrics.trim()) {
      return tags.SYLT.lyrics.trim();
    }
  }

  // 4. Quét tổng quát qua tất cả các thuộc tính xem có chứa lyrics hay không
  for (const key of Object.keys(tags)) {
    if (/lyrics|uslt|sylt/i.test(key)) {
      const val = tags[key];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
      if (val && typeof val === 'object') {
        const text = val.lyrics || val.data?.lyrics || val.data;
        if (typeof text === 'string' && text.trim().length > 0) {
          return text.trim();
        }
      }
    }
  }

  return null;
}

/**
 * Trích xuất Metadata ID3 từ tệp âm thanh (File / Blob) trực tiếp trên trình duyệt
 * Đọc tiêu đề, ca sĩ, album, ảnh bìa album (Cover Art) và lời bài hát nhúng sẵn
 * @param {File|Blob} file 
 * @returns {Promise<{ title: string, artist: string, album: string, fileName: string, coverUrl: string|null, lyrics: string|null }>}
 */
export function parseAudioFileMetadata(file) {
  const fallbackTitle = file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'Bản thu đĩa than';
  const defaultMeta = {
    title: fallbackTitle,
    artist: 'Nghệ sĩ chưa rõ',
    album: 'AuraVinyl Session',
    fileName: file?.name || '',
    coverUrl: null,
    lyrics: null
  };

  if (!file) {
    return Promise.resolve(defaultMeta);
  }

  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          const tags = tag?.tags || {};
          const title = tags.title?.trim() || fallbackTitle;
          const artist = tags.artist?.trim() || 'Nghệ sĩ chưa rõ';
          const album = tags.album?.trim() || 'Đĩa Than Bản Gốc';
          const embeddedLyrics = extractEmbeddedLyrics(tags);

          let coverUrl = null;
          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              const byteArray = new Uint8Array(data);
              const blob = new Blob([byteArray], { type: format || 'image/jpeg' });
              coverUrl = URL.createObjectURL(blob);
            } catch (imgErr) {
              console.warn('[metadataService] Lỗi chuyển đổi Blob ảnh bìa:', imgErr);
            }
          }

          resolve({
            title,
            artist,
            album,
            fileName: file.name || '',
            coverUrl,
            lyrics: embeddedLyrics
          });
        },
        onError: (error) => {
          console.warn('[metadataService] Không tìm thấy thẻ ID3, dùng fallback tên file:', error);
          resolve(defaultMeta);
        }
      });
    } catch (err) {
      console.warn('[metadataService] Ngoại lệ khi đọc tags:', err);
      resolve(defaultMeta);
    }
  });
}

/**
 * Trích xuất Bảng Màu Chủ Đạo (Color Palette Extraction) từ Ảnh Bìa Album
 * Sử dụng HTML5 Offscreen Canvas mini (64x64) để phân tích màu với độ bão hòa hài hòa
 * @param {string|null} imageUrl 
 * @returns {Promise<{ primaryColor: string, secondaryColor: string, glowColor: string, hexPrimary: string, hexSecondary: string }>}
 */
export function extractPaletteFromImage(imageUrl) {
  if (!imageUrl) {
    return Promise.resolve(DEFAULT_PALETTE);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        ctx.drawImage(img, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64).data;

        // Thu thập các pixel có màu sắc rõ ràng (bỏ qua pixel quá tối hoặc quá sáng)
        const colorBuckets = {};

        for (let i = 0; i < imgData.length; i += 16) { // Bước nhảy 4 pixel để tối ưu
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

          // Bỏ qua màu đen sâu (< 25) hoặc màu trắng chói (> 240)
          if (brightness < 25 || brightness > 240) continue;

          // Tính độ bão hòa màu cơ bản (Saturation)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;

          // Chỉ lấy màu có độ bão hòa nhất định
          if (saturation < 0.15) continue;

          // Lượng tử hóa màu về các khối 32
          const qr = Math.floor(r / 32) * 32;
          const qg = Math.floor(g / 32) * 32;
          const qb = Math.floor(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;

          if (!colorBuckets[key]) {
            colorBuckets[key] = {
              r: qr,
              g: qg,
              b: qb,
              count: 0,
              score: 0
            };
          }

          colorBuckets[key].count += 1;
          colorBuckets[key].score += 1 + saturation * 2.5; // Ưu tiên màu rực rỡ
        }

        const sortedColors = Object.values(colorBuckets).sort((a, b) => b.score - a.score);

        if (sortedColors.length === 0) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        // Màu chủ đạo
        const c1 = sortedColors[0];
        // Màu phụ (chọn màu cách xa màu 1 để tạo độ tương phản êm dịu)
        let c2 = sortedColors[1] || sortedColors[0];
        for (let i = 1; i < sortedColors.length; i++) {
          const diff = Math.abs(sortedColors[i].r - c1.r) + Math.abs(sortedColors[i].g - c1.g) + Math.abs(sortedColors[i].b - c1.b);
          if (diff > 80) {
            c2 = sortedColors[i];
            break;
          }
        }

        // Điều chỉnh độ sáng vừa phải cho Dark Theme (Scale xuống nếu quá chói)
        const clamp = (val, max = 220) => Math.min(max, Math.max(40, val));
        const r1 = clamp(c1.r);
        const g1 = clamp(c1.g);
        const b1 = clamp(c1.b);

        const r2 = clamp(c2.r);
        const g2 = clamp(c2.g);
        const b2 = clamp(c2.b);

        const toHex = (n) => n.toString(16).padStart(2, '0');
        const hex1 = `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
        const hex2 = `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;

        resolve({
          primaryColor: `rgb(${r1}, ${g1}, ${b1})`,
          secondaryColor: `rgb(${r2}, ${g2}, ${b2})`,
          glowColor: `rgba(${r1}, ${g1}, ${b1}, 0.28)`,
          hexPrimary: hex1,
          hexSecondary: hex2
        });
      } catch (err) {
        console.warn('[metadataService] Lỗi trích xuất màu canvas:', err);
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_PALETTE);
    };

    img.src = imageUrl;
  });
}
