/**
 * Dịch Vụ Khám Phá & Truyền Phát Âm Nhạc Trực Tuyến Audius (Audius API Service)
 * Kết nối mạng lưới phân tán Audius (Decentralized Open Audio Network)
 * Hoàn toàn miễn phí, không yêu cầu API Key.
 */

const AUDIUS_GATEWAY = 'https://api.audius.co/v1';
const APP_NAME = 'AuraVinyl';
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Hàm gọi fetch an toàn kèm bộ đếm thời gian timeout (AbortController)
 */
async function fetchWithTimeout(url, { timeoutMs = REQUEST_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Audius API phản hồi mã lỗi HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Yêu cầu đến Audius Gateway bị quá thời gian (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

/**
 * Chuẩn hóa cấu trúc bản ghi bài hát từ Audius sang schema chuẩn của AuraVinyl
 * @param {Object} track - Dữ liệu track gốc từ Audius API
 * @returns {Object|null}
 */
export function normalizeAudiusTrack(track) {
  if (!track || typeof track !== 'object' || !track.id) return null;

  const artwork = track.artwork || {};
  const coverUrl =
    artwork['480x480'] ||
    artwork['150x150'] ||
    artwork['1000x1000'] ||
    '';

  return {
    id: track.id,
    title: track.title ? track.title.trim() : 'Bản thu không tên',
    artist: (track.user && (track.user.name || track.user.handle))
      ? (track.user.name || track.user.handle).trim()
      : 'Nghệ sĩ ẩn danh',
    album: track.genre ? `${track.genre} Edition` : 'Audius Release',
    coverUrl,
    streamUrl: `${AUDIUS_GATEWAY}/tracks/${track.id}/stream?app_name=${APP_NAME}`,
    duration: typeof track.duration === 'number' && track.duration > 0 ? track.duration : 180,
    genre: track.genre || 'All'
  };
}

/**
 * Lấy danh sách các bài hát thịnh hành (Trending Tracks)
 * @param {Object} options
 * @param {string} options.genre - Thể loại (ví dụ: 'Electronic', 'Lo-Fi', 'Hip-Hop/Rap', 'Rock')
 * @param {number} options.limit - Số lượng bài cần lấy (mặc định 16)
 * @returns {Promise<Array>}
 */
export async function fetchTrendingTracks({ genre = '', limit = 16 } = {}) {
  try {
    const params = new URLSearchParams({
      app_name: APP_NAME,
      limit: String(limit)
    });

    if (genre && genre !== 'Trending' && genre !== 'All') {
      params.append('genre', genre);
    }

    const url = `${AUDIUS_GATEWAY}/tracks/trending?${params.toString()}`;
    const json = await fetchWithTimeout(url);

    if (json && Array.isArray(json.data)) {
      return json.data
        .map(normalizeAudiusTrack)
        .filter(Boolean);
    }

    return [];
  } catch (err) {
    console.warn('[audiusService] Lỗi khi nạp trending tracks:', err);
    throw err;
  }
}

/**
 * Tìm kiếm bài hát trên Audius theo từ khóa
 * @param {string} query - Từ khóa tìm kiếm
 * @param {Object} options
 * @param {number} options.limit - Số lượng bài tối đa (mặc định 16)
 * @returns {Promise<Array>}
 */
export async function searchAudiusTracks(query, { limit = 16 } = {}) {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      query: query.trim(),
      app_name: APP_NAME,
      limit: String(limit)
    });

    const url = `${AUDIUS_GATEWAY}/tracks/search?${params.toString()}`;
    const json = await fetchWithTimeout(url);

    if (json && Array.isArray(json.data)) {
      return json.data
        .map(normalizeAudiusTrack)
        .filter(Boolean);
    }

    return [];
  } catch (err) {
    console.warn('[audiusService] Lỗi khi tìm kiếm bài hát Audius:', err);
    throw err;
  }
}
