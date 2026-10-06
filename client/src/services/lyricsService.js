/**
 * Dịch vụ Tải & Phân Tích Lời Bài Hát Đồng Bộ (Kinetic Synced Lyrics Service)
 * Tích hợp API Lrclib (miễn phí, không cần token) & Parser định dạng LRC chuẩn
 */

/**
 * Phân tích chuỗi LRC thành mảng các dòng có mốc thời gian
 * Hỗ trợ định dạng [mm:ss.xx] và [mm:ss.xxx]
 * @param {string} lrcString 
 * @returns {Array<{ id: number, time: number, text: string }>}
 */
export function parseLrc(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];

  const rawLines = lrcString.split(/\r?\n/);
  const parsed = [];
  let indexCounter = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Tìm tất cả các timestamp trong dòng (hỗ trợ nhiều timestamp trên cùng 1 câu)
    const timestampRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const timestamps = [];
    let match;

    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        // Chuẩn hóa mili-giây
        const msStr = match[3].padEnd(3, '0').slice(0, 3);
        ms = parseInt(msStr, 10) / 1000;
      }
      timestamps.push(mins * 60 + secs + ms);
    }

    if (timestamps.length === 0) continue;

    // Trích xuất nội dung văn bản sau khi bỏ hết timestamp
    const cleanText = trimmed.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    if (!cleanText) continue;

    for (const time of timestamps) {
      parsed.push({
        id: indexCounter++,
        time,
        text: cleanText
      });
    }
  }

  // Sắp xếp các câu hát theo thứ tự thời gian tăng dần
  parsed.sort((a, b) => a.time - b.time);

  // Đánh lại ID theo thứ tự sau khi sắp xếp
  return parsed.map((item, idx) => ({ ...item, id: idx }));
}

/**
 * Đọc tệp .lrc cục bộ thông qua FileReader và phân tích thành mảng dòng lời bài hát
 * @param {File|Blob} file 
 * @returns {Promise<Array<{ id: number, time: number, text: string }>>}
 */
export function readLrcFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const lines = parseLrc(text);
        resolve(lines);
      } else {
        resolve([]);
      }
    };
    reader.onerror = (err) => {
      console.warn('[lyricsService] Lỗi khi đọc file LRC:', err);
      reject(err);
    };
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Tìm kiếm và tải lời bài hát đồng bộ từ Lrclib API
 * @param {Object} params
 * @param {string} params.title Tên bài hát
 * @param {string} [params.artist] Tên nghệ sĩ
 * @param {string} [params.album] Tên album
 * @param {number} [params.duration] Thời lượng tính bằng giây
 * @returns {Promise<{ syncedLyrics: string|null, plainLyrics: string|null, instrumental: boolean, lines: Array }>}
 */
export async function fetchSyncedLyrics({ title, artist = '', album = '', duration = 0 }) {
  if (!title || typeof title !== 'string') {
    return { syncedLyrics: null, plainLyrics: null, instrumental: false, lines: [] };
  }

  // Làm sạch tiêu đề (bỏ phần đuôi như (Official Video), [Audio], [Lyrics], .mp3)
  const cleanTitle = title
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*[\(\[](official\s*(music\s*)?video|audio|lyrics|mv|hd|hq|remaster(ed)?)[\)\]]/gi, '')
    .replace(/\s*-\s*official.*$/gi, '')
    .trim();

  const cleanArtist = artist && artist !== 'Nghệ sĩ chưa rõ' ? artist.trim() : '';

  // 1. Thử gọi endpoint khớp chính xác /api/get
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const queryParams = new URLSearchParams();
    queryParams.append('track_name', cleanTitle);
    if (cleanArtist) queryParams.append('artist_name', cleanArtist);
    if (album && album !== 'Đĩa Than Bản Gốc' && album !== 'AuraVinyl Session') {
      queryParams.append('album_name', album);
    }
    if (duration > 0) {
      queryParams.append('duration', Math.round(duration).toString());
    }

    const response = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AuraVinyl Player v1.0 (https://github.com/TranAnPhuc/audio-mixer-poc)'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.syncedLyrics) {
        return {
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics || null,
          instrumental: Boolean(data.instrumental),
          lines: parseLrc(data.syncedLyrics)
        };
      }
    }
  } catch (err) {
    // Nếu abort hoặc không tìm thấy, tiếp tục với search fallback
  }

  // 2. Fallback: Thử gọi endpoint tìm kiếm /api/search
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const searchQuery = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AuraVinyl Player v1.0 (https://github.com/TranAnPhuc/audio-mixer-poc)'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const results = await response.json();
      if (Array.isArray(results) && results.length > 0) {
        // Tìm bản ghi đầu tiên có syncedLyrics
        const syncedItem = results.find((item) => item.syncedLyrics) || results[0];
        if (syncedItem && syncedItem.syncedLyrics) {
          return {
            syncedLyrics: syncedItem.syncedLyrics,
            plainLyrics: syncedItem.plainLyrics || null,
            instrumental: Boolean(syncedItem.instrumental),
            lines: parseLrc(syncedItem.syncedLyrics)
          };
        }
      }
    }
  } catch (searchErr) {
    console.warn('[lyricsService] Search fallback notice:', searchErr.message);
  }

  return {
    syncedLyrics: null,
    plainLyrics: null,
    instrumental: false,
    lines: []
  };
}
