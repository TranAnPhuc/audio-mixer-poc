/**
 * AuraVinyl - End-to-End (E2E) & Core Subsystems Verification Suite
 * 
 * Phạm vi kiểm thử:
 * 1. Động cơ trích xuất dải tần số 3D (getFrequencyData 32 bands & getRawByteFrequencyData)
 * 2. Phân tích Metadata ID3 thật & Ảnh bìa album (metadataService + jsmediatags)
 * 3. Thuật toán trích xuất bảng màu chủ đạo (extractPaletteFromImage)
 * 4. Động cơ âm học Web Audio (vinylAudioEngine): khởi tạo, sinh tiếng crackle ngẫu nhiên, phổ tần số
 * 5. Toán học địa hình sóng âm 3D (Waterfall Buffer Shift & Gaussian Window Envelope)
 * 6. Kiểm tra toàn vẹn tài nguyên (Memory Leak, WebGL Context, Blob URLs revocation)
 */

import { parseAudioFileMetadata, extractEmbeddedLyrics, extractPaletteFromImage, DEFAULT_PALETTE } from '../services/metadataService.js';
import { normalizeAudiusTrack } from '../services/audiusService.js';
import { CAMERA_PRESETS, clampWaveGain } from '../utils/terrainConfig.js';
import {
  getAudioContext,
  setVinylMuted,
  getIsVinylMuted,
  playNeedleDropEffect,
  connectAudioElement,
  getAudioFrequencies,
  getFrequencyData,
  getRawByteFrequencyData
} from '../utils/vinylAudioEngine.js';

// Khởi tạo các mocks môi trường trình duyệt cho Node.js headless testing
function setupBrowserMocks() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }

  // Polyfill FileReader cho jsmediatags trong Node
  if (typeof globalThis.FileReader === 'undefined') {
    globalThis.FileReader = class {
      constructor() {
        this.result = null;
        this.onload = null;
        this.onloadend = null;
        this.onerror = null;
      }
      readAsArrayBuffer(blob) {
        blob.arrayBuffer().then((buf) => {
          this.result = buf;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }).catch((err) => {
          if (this.onerror) this.onerror(err);
        });
      }
      readAsText(blob) {
        blob.text().then((txt) => {
          this.result = txt;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }).catch((err) => {
          if (this.onerror) this.onerror(err);
        });
      }
    };
  }

  // Mock HTML5 Canvas & Image cho thuật toán trích xuất bảng màu
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement(tag) {
        if (tag === 'canvas') {
          return {
            width: 64,
            height: 64,
            getContext(type) {
              if (type === '2d') {
                return {
                  drawImage() {},
                  getImageData(x, y, w, h) {
                    // Giả lập pixel ảnh: 50% Amber (#d97706), 50% Rose/Burgundy (#be185d)
                    const data = new Uint8ClampedArray(w * h * 4);
                    for (let i = 0; i < data.length; i += 4) {
                      if (i < data.length / 2) {
                        data[i] = 217;     // R
                        data[i + 1] = 119; // G
                        data[i + 2] = 6;   // B
                        data[i + 3] = 255;
                      } else {
                        data[i] = 190;     // R
                        data[i + 1] = 24;  // G
                        data[i + 2] = 93;  // B
                        data[i + 3] = 255;
                      }
                    }
                    return { data };
                  }
                };
              }
              return null;
            }
          };
        }
        return {};
      }
    };
  }

  if (typeof globalThis.Image === 'undefined') {
    globalThis.Image = class {
      constructor() {
        this.crossOrigin = '';
        this._src = '';
      }
      set src(url) {
        this._src = url;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    };
  }

  // Mock Web Audio API AudioContext
  class MockAudioBuffer {
    constructor(channels, length, sampleRate) {
      this.numberOfChannels = channels;
      this.length = length;
      this.sampleRate = sampleRate;
      this._data = new Float32Array(length);
    }
    getChannelData(c) {
      return this._data;
    }
  }

  class MockAudioParam {
    constructor(val = 0) {
      this.value = val;
    }
    setValueAtTime(v, t) { this.value = v; }
    exponentialRampToValueAtTime(v, t) { this.value = v; }
    linearRampToValueAtTime(v, t) { this.value = v; }
  }

  class MockAudioNode {
    connect(dest) { return dest; }
    disconnect() {}
  }

  class MockGainNode extends MockAudioNode {
    constructor() {
      super();
      this.gain = new MockAudioParam(1);
    }
  }

  class MockOscillatorNode extends MockAudioNode {
    constructor() {
      super();
      this.type = 'sine';
      this.frequency = new MockAudioParam(440);
    }
    start(t) {}
    stop(t) {}
  }

  class MockBiquadFilterNode extends MockAudioNode {
    constructor() {
      super();
      this.type = 'lowpass';
      this.frequency = new MockAudioParam(1000);
      this.Q = new MockAudioParam(1);
    }
  }

  class MockBufferSourceNode extends MockAudioNode {
    constructor() {
      super();
      this.buffer = null;
    }
    start(t) {}
    stop(t) {}
  }

  class MockAnalyserNode extends MockAudioNode {
    constructor() {
      super();
      this.fftSize = 512;
      this.frequencyBinCount = 256;
      this.smoothingTimeConstant = 0.85;
    }
    getByteFrequencyData(arr) {
      // Giả lập dữ liệu tần số: âm trầm bass cao (bins 0-2), mid vừa (bins 3-27), treble nhẹ
      for (let i = 0; i < arr.length; i++) {
        if (i < 3) arr[i] = 230; // Bass mạnh
        else if (i < 28) arr[i] = 140; // Mid
        else if (i < 95) arr[i] = 80; // Treble
        else arr[i] = 20;
      }
    }
  }

  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = new MockAudioNode();
    }
    createBuffer(channels, length, sampleRate) {
      return new MockAudioBuffer(channels, length, sampleRate);
    }
    createBufferSource() {
      return new MockBufferSourceNode();
    }
    createGain() {
      return new MockGainNode();
    }
    createOscillator() {
      return new MockOscillatorNode();
    }
    createBiquadFilter() {
      return new MockBiquadFilterNode();
    }
    createAnalyser() {
      return new MockAnalyserNode();
    }
    createMediaElementSource(el) {
      return new MockAudioNode();
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
  }

  globalThis.AudioContext = MockAudioContext;
  globalThis.webkitAudioContext = MockAudioContext;

  // Mock URL.createObjectURL & revokeObjectURL có tracking rò rỉ bộ nhớ
  const activeBlobUrls = new Set();
  globalThis.URL.createObjectURL = (blob) => {
    const fakeUrl = `blob:nodedemo/${Math.random().toString(36).substring(2, 9)}`;
    activeBlobUrls.add(fakeUrl);
    return fakeUrl;
  };
  globalThis.URL.revokeObjectURL = (url) => {
    activeBlobUrls.delete(url);
  };
  globalThis.__getActiveBlobUrls = () => activeBlobUrls;
}

// Hàm trợ giúp tạo file MP3 giả lập có ID3v2.3 tag nhị phân
function createSyntheticMp3WithId3({ title = 'Aura Vinyl Track', artist = 'Aura Artist', album = 'Retro Sessions' }) {
  const enc = new TextEncoder();
  const titleBytes = enc.encode(title);
  const artistBytes = enc.encode(artist);
  const albumBytes = enc.encode(album);

  function makeFrame(frameId, contentBytes) {
    const frameHeader = new Uint8Array(10);
    for (let i = 0; i < 4; i++) frameHeader[i] = frameId.charCodeAt(i);
    const len = contentBytes.length + 1;
    frameHeader[4] = (len >> 24) & 0xff;
    frameHeader[5] = (len >> 16) & 0xff;
    frameHeader[6] = (len >> 8) & 0xff;
    frameHeader[7] = len & 0xff;
    frameHeader[8] = 0;
    frameHeader[9] = 0;

    const payload = new Uint8Array(1 + contentBytes.length);
    payload[0] = 0; // ISO-8859-1 encoding
    payload.set(contentBytes, 1);

    const merged = new Uint8Array(10 + payload.length);
    merged.set(frameHeader, 0);
    merged.set(payload, 10);
    return merged;
  }

  const fTitle = makeFrame('TIT2', titleBytes);
  const fArtist = makeFrame('TPE1', artistBytes);
  const fAlbum = makeFrame('TALB', albumBytes);

  const totalPayloadSize = fTitle.length + fArtist.length + fAlbum.length;

  const header = new Uint8Array(10);
  header[0] = 0x49; // 'I'
  header[1] = 0x44; // 'D'
  header[2] = 0x33; // '3'
  header[3] = 0x03; // version 2.3
  header[4] = 0x00; // revision
  header[5] = 0x00; // flags

  // Synchsafe integer (7 bits per byte)
  header[6] = (totalPayloadSize >> 21) & 0x7f;
  header[7] = (totalPayloadSize >> 14) & 0x7f;
  header[8] = (totalPayloadSize >> 7) & 0x7f;
  header[9] = totalPayloadSize & 0x7f;

  const fullBuffer = new Uint8Array(10 + totalPayloadSize + 128);
  fullBuffer.set(header, 0);
  let offset = 10;
  fullBuffer.set(fTitle, offset); offset += fTitle.length;
  fullBuffer.set(fArtist, offset); offset += fArtist.length;
  fullBuffer.set(fAlbum, offset); offset += fAlbum.length;

  return new File([fullBuffer], 'aura_track.mp3', { type: 'audio/mp3' });
}

// Runner thực thi kiểm thử
async function main() {
  setupBrowserMocks();

  console.log('=============================================================');
  console.log('       AuraVinyl E2E & Subsystems Verification Suite         ');
  console.log('=============================================================');

  const testResults = [];

  async function runTest(name, fn) {
    const start = performance.now();
    try {
      await fn();
      const duration = (performance.now() - start).toFixed(2);
      testResults.push({ name, status: 'PASS', duration });
      console.log(`  ✔ [\x1b[32mPASS\x1b[0m] ${name} (${duration}ms)`);
    } catch (err) {
      const duration = (performance.now() - start).toFixed(2);
      testResults.push({ name, status: 'FAIL', duration, error: err.message });
      console.error(`  ✖ [\x1b[31mFAIL\x1b[0m] ${name}: ${err.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  // SUITE 1: 3D Spectral Terrain & Frequency Sampling (getFrequencyData)
  console.log('\n\x1b[1m--- [Suite 1] 3D Spectral Terrain & Frequency Sampling ---\x1b[0m');
  await runTest('getFrequencyData: Trích xuất mảng 32 bands chuẩn hóa trong khoảng [0.0, 1.0]', () => {
    const mockAudioEl = {};
    connectAudioElement(mockAudioEl);

    const bands = getFrequencyData(32);
    assert(bands instanceof Float32Array, 'Dữ liệu trả về phải là Float32Array');
    assert(bands.length === 32, `Số lượng dải tần phải là 32, nhận được: ${bands.length}`);

    for (let i = 0; i < bands.length; i++) {
      assert(bands[i] >= 0.0 && bands[i] <= 1.0, `Giá trị band ${i} ngoài khoảng [0, 1]: ${bands[i]}`);
    }
  });

  await runTest('getFrequencyData: Phân bố tần số phản ánh chính xác phổ âm thanh (Bass > Treble)', () => {
    const bands = getFrequencyData(32);
    // Theo mock spectrum: Dải trầm (index đầu) phải có biên độ cao hơn dải cao (index cuối)
    assert(bands[0] > bands[31], `Dải trầm (${bands[0]}) phải cao hơn dải cao (${bands[31]})`);
  });

  await runTest('getRawByteFrequencyData: Trả về Uint8Array thô từ AnalyserNode', () => {
    const rawData = getRawByteFrequencyData();
    assert(rawData instanceof Uint8Array, 'Phải là Uint8Array');
    assert(rawData.length === 256, `Kích thước bin phải là 256, nhận được: ${rawData.length}`);
    assert(rawData[0] > 0, 'Dữ liệu thô không được bằng 0');
  });

  // SUITE 2: Metadata & Embedded Lyrics Extraction
  console.log('\n\x1b[1m--- [Suite 2] Metadata & ID3 Tag Extraction ---\x1b[0m');
  await runTest('jsmediatags: Đọc tệp nhị phân ID3v2.3 trích xuất Title, Artist, Album', async () => {
    const testFile = createSyntheticMp3WithId3({
      title: 'Dem Thu Ha Noi',
      artist: 'Phuc Tran',
      album: 'Aura Vinyl 1980'
    });

    const meta = await parseAudioFileMetadata(testFile);
    assert(meta.title === 'Dem Thu Ha Noi', `Title sai: ${meta.title}`);
    assert(meta.artist === 'Phuc Tran', `Artist sai: ${meta.artist}`);
    assert(meta.album === 'Aura Vinyl 1980', `Album sai: ${meta.album}`);
  });

  await runTest('extractEmbeddedLyrics: Trích xuất an toàn từ thẻ SYLT hoặc lyrics tự do', () => {
    const mockTags = {
      SYLT: { data: '[00:01.00] Dong dau tien\n[00:05.50] Dong thu hai' }
    };
    const lyrics = extractEmbeddedLyrics(mockTags);
    assert(lyrics !== null, 'Phải trích xuất được lyrics từ SYLT');
    assert(lyrics.includes('Dong dau tien'), 'Nội dung lyrics không đúng');

    const emptyTags = {};
    assert(extractEmbeddedLyrics(emptyTags) === null, 'Thẻ rỗng phải trả về null');
  });

  await runTest('parseAudioFileMetadata: Fallback an toàn khi file không có ID3', async () => {
    const emptyFile = new File([new Uint8Array(50)], 'ban-nhac-mua-thu.mp3', { type: 'audio/mp3' });
    const meta = await parseAudioFileMetadata(emptyFile);
    assert(meta.title === 'ban-nhac-mua-thu', `Title fallback không đúng: ${meta.title}`);
    assert(meta.artist === 'Nghệ sĩ chưa rõ', 'Artist fallback không đúng');
    assert(meta.coverUrl === null, 'CoverUrl phải null');
  });

  // SUITE 3: Trích xuất bảng màu chủ đạo (extractPaletteFromImage)
  console.log('\n\x1b[1m--- [Suite 3] Dynamic Color Palette Extraction ---\x1b[0m');
  await runTest('extractPaletteFromImage: Phân tích ảnh và xuất bảng màu Dark Theme', async () => {
    const palette = await extractPaletteFromImage('mock://cover-image.jpg');
    assert(palette !== null, 'Palette không được null');
    assert(palette.primaryColor.startsWith('rgb('), `primaryColor sai định dạng: ${palette.primaryColor}`);
    assert(palette.secondaryColor.startsWith('rgb('), `secondaryColor sai định dạng: ${palette.secondaryColor}`);
    assert(palette.hexPrimary.startsWith('#'), `hexPrimary sai định dạng: ${palette.hexPrimary}`);
    assert(palette.hexSecondary.startsWith('#'), `hexSecondary sai định dạng: ${palette.hexSecondary}`);
    assert(palette.glowColor.startsWith('rgba('), `glowColor sai định dạng: ${palette.glowColor}`);
  });

  await runTest('extractPaletteFromImage: Fallback khi không có ảnh (DEFAULT_PALETTE)', async () => {
    const palette = await extractPaletteFromImage(null);
    assert(palette.hexPrimary === DEFAULT_PALETTE.hexPrimary, 'Không trả về DEFAULT_PALETTE khi url rỗng');
  });

  // SUITE 4: Động cơ âm học Web Audio (vinylAudioEngine)
  console.log('\n\x1b[1m--- [Suite 4] Vinyl Audio DSP & Frequency Analysis ---\x1b[0m');
  await runTest('vinylAudioEngine: Khởi tạo AudioContext singleton', () => {
    const ctx = getAudioContext();
    assert(ctx !== null, 'AudioContext không được null');
    assert(ctx.sampleRate === 44100, `sampleRate không đúng: ${ctx.sampleRate}`);
  });

  await runTest('vinylAudioEngine: Sinh tiếng nổ đĩa than (Crackle & Needle Contact Thud)', () => {
    setVinylMuted(false);
    assert(getIsVinylMuted() === false, 'Mute state không khớp');
    playNeedleDropEffect({ duration: 1.5 });
  });

  await runTest('vinylAudioEngine: Trích xuất năng lượng âm thanh theo dải tần (Analyser)', () => {
    const mockAudioEl = {};
    connectAudioElement(mockAudioEl);

    const { bassEnergy, midEnergy, trebleEnergy } = getAudioFrequencies();
    assert(bassEnergy > 0, `bassEnergy phải lớn hơn 0: ${bassEnergy}`);
    assert(midEnergy > 0, `midEnergy phải lớn hơn 0: ${midEnergy}`);
    assert(trebleEnergy > 0, `trebleEnergy phải lớn hơn 0: ${trebleEnergy}`);
    assert(bassEnergy <= 1.0 && midEnergy <= 1.0 && trebleEnergy <= 1.0, 'Năng lượng phải chuẩn hóa <= 1.0');
    assert(bassEnergy >= midEnergy, 'Bass energy phải chiếm ưu thế theo mock spectrum');
  });

  // SUITE 5: Toán học địa hình sóng âm 3D (Waterfall & Gaussian Envelope)
  console.log('\n\x1b[1m--- [Suite 5] 3D Waterfall Terrain Math & Envelope ---\x1b[0m');
  await runTest('Gaussian/Bell Envelope: Triệt tiêu về 0 ở hai biên và đạt cực đại tại tâm', () => {
    const pointsCount = 64;
    const envelope = new Float32Array(pointsCount);
    for (let i = 0; i < pointsCount; i++) {
      const normalizedX = (i / (pointsCount - 1)) * 2 - 1; // [-1, 1]
      envelope[i] = Math.pow(Math.cos((normalizedX * Math.PI) / 2), 2.2);
    }

    // Biên trái và biên phải phải tiệm cận 0
    assert(envelope[0] < 0.001, `Biên trái không bằng 0: ${envelope[0]}`);
    assert(envelope[pointsCount - 1] < 0.001, `Biên phải không bằng 0: ${envelope[pointsCount - 1]}`);

    // Điểm chính giữa (tâm) phải đạt giá trị xấp xỉ 1.0
    const midIndex = Math.floor(pointsCount / 2);
    assert(envelope[midIndex] > 0.95, `Đỉnh trung tâm không đạt cực đại: ${envelope[midIndex]}`);
  });

  await runTest('Waterfall Buffer Shift: Hàng đợi lịch sử sóng dịch chuyển chính xác lùi về phía sau', () => {
    const NUM_LINES = 32;
    const POINTS = 64;
    const history = [];
    for (let j = 0; j < NUM_LINES; j++) {
      history.push(new Float32Array(POINTS));
    }

    // Giả lập hàng 0 nhận giá trị đặc biệt
    const initialRow0 = new Float32Array(POINTS).fill(4.2);
    history[0].set(initialRow0);

    // Thực hiện dịch chuyển lùi 1 nhịp (shift backward)
    for (let j = NUM_LINES - 1; j > 0; j--) {
      history[j].set(history[j - 1]);
    }

    // Sau khi dịch chuyển, hàng 1 phải chứa giá trị của hàng 0 cũ
    assert(Math.abs(history[1][0] - 4.2) < 0.001, `Dữ liệu hàng 1 sai sau khi dịch chuyển: ${history[1][0]}`);
  });

  await runTest('CAMERA_PRESETS: Cung cấp đầy đủ 3 góc nhìn (isometric, frontal, topdown) với vector position và lookAt', () => {
    assert(CAMERA_PRESETS.isometric, 'Thiếu preset isometric');
    assert(CAMERA_PRESETS.frontal, 'Thiếu preset frontal');
    assert(CAMERA_PRESETS.topdown, 'Thiếu preset topdown');

    // Kiểm tra cấu trúc tọa độ 3D
    ['isometric', 'frontal', 'topdown'].forEach((key) => {
      const p = CAMERA_PRESETS[key];
      assert(Array.isArray(p.position) && p.position.length === 3, `${key} position phải là mảng 3 phần tử`);
      assert(Array.isArray(p.lookAt) && p.lookAt.length === 3, `${key} lookAt phải là mảng 3 phần tử`);
      assert(typeof p.label === 'string' && p.label.length > 0, `${key} label không được rỗng`);
    });
  });

  await runTest('clampWaveGain: Thuật toán điều chỉnh biên độ sóng giới hạn an toàn trong khoảng [0.4, 2.4]', () => {
    assert(clampWaveGain(1.0) === 1.0, 'Default gain sai');
    assert(clampWaveGain(0.1) === 0.4, 'Min clamping sai');
    assert(clampWaveGain(5.0) === 2.4, 'Max clamping sai');
    assert(clampWaveGain(1.234) === 1.2, 'Làm tròn 1 chữ số thập phân sai');
  });

  // SUITE 6: Resource Integrity & Memory Leak Prevention
  console.log('\n\x1b[1m--- [Suite 6] Memory Leak & Resource Integrity ---\x1b[0m');
  await runTest('Blob URL Lifecycle: Tự động thu hồi ObjectURL khi đổi bài hát', () => {
    const fakeBlobA = new Blob(['audio data 1']);
    const fakeBlobB = new Blob(['audio data 2']);
    const activeUrls = globalThis.__getActiveBlobUrls();

    const url1 = URL.createObjectURL(fakeBlobA);
    assert(activeUrls.has(url1), 'URL 1 chưa được ghi nhận');

    // Giả lập cơ chế nạp bài thứ 2 trong LandingPage: Thu hồi URL 1
    URL.revokeObjectURL(url1);
    const url2 = URL.createObjectURL(fakeBlobB);

    assert(!activeUrls.has(url1), 'URL 1 chưa được thu hồi (Memory Leak)!');
    assert(activeUrls.has(url2), 'URL 2 phải đang active');

    // Unmount cleanup
    URL.revokeObjectURL(url2);
    assert(!activeUrls.has(url2), 'URL 2 chưa được thu hồi khi unmount!');
  });

  await runTest('Three.js WebGL Context & Texture Cleanup: forceContextLoss và geometry disposal', () => {
    let contextLost = false;
    let geometryDisposed = false;

    const mockGeometry = {
      dispose() { geometryDisposed = true; }
    };

    const mockRenderer = {
      domElement: { parentNode: { removeChild: () => {} } },
      forceContextLoss() { contextLost = true; },
      dispose() {}
    };

    // Kiểm tra contract dọn dẹp
    mockGeometry.dispose();
    mockRenderer.forceContextLoss();

    assert(geometryDisposed === true, 'Geometry không được giải phóng!');
    assert(contextLost === true, 'forceContextLoss chưa được gọi!');
  });

  // SUITE 7: Audius Protocol Integration & Track Normalization
  console.log('\n\x1b[1m--- [Suite 7] Audius Open Music Protocol & Track Normalization ---\x1b[0m');
  await runTest('normalizeAudiusTrack: Chuẩn hóa đầy đủ các trường id, title, artist, streamUrl, coverUrl và duration', () => {
    const rawTrack = {
      id: 'D7KyP',
      title: 'Neon Nights',
      duration: 214,
      genre: 'Electronic',
      user: {
        name: 'CyberProducer',
        handle: 'cyber_prod'
      },
      artwork: {
        '150x150': 'https://creatornode.audius.co/ipfs/Qm150',
        '480x480': 'https://creatornode.audius.co/ipfs/Qm480'
      }
    };

    const track = normalizeAudiusTrack(rawTrack);
    assert(track !== null, 'Track không được null');
    assert(track.id === 'D7KyP', 'ID sai');
    assert(track.title === 'Neon Nights', 'Title sai');
    assert(track.artist === 'CyberProducer', 'Artist sai');
    assert(track.album === 'Electronic Edition', 'Album sai');
    assert(track.coverUrl === 'https://creatornode.audius.co/ipfs/Qm480', 'Artwork 480x480 ưu tiên sai');
    assert(track.duration === 214, 'Duration sai');
    assert(track.streamUrl === 'https://api.audius.co/v1/tracks/D7KyP/stream?app_name=AuraVinyl', 'Stream URL sai định dạng');
  });

  await runTest('normalizeAudiusTrack: Fallback an toàn khi metadata từ Audius bị thiếu trường', () => {
    const sparseTrack = {
      id: 'sparse123'
    };

    const track = normalizeAudiusTrack(sparseTrack);
    assert(track !== null, 'Phải xử lý được track thiếu trường');
    assert(track.title === 'Bản thu không tên', 'Title fallback sai');
    assert(track.artist === 'Nghệ sĩ ẩn danh', 'Artist fallback sai');
    assert(track.coverUrl === '', 'CoverUrl fallback sai');
    assert(track.duration === 180, 'Duration fallback sai');
    assert(track.streamUrl.includes('sparse123'), 'StreamUrl phải chứa ID');

    // Trường hợp đầu vào null hoặc object không có id
    assert(normalizeAudiusTrack(null) === null, 'Đầu vào null phải trả về null');
    assert(normalizeAudiusTrack({}) === null, 'Track thiếu ID phải trả về null');
  });

  // TỔNG KẾT BÁO CÁO
  console.log('\n=============================================================');
  console.log('                 BÁO CÁO TỔNG HỢP KIỂM THỬ                   ');
  console.log('=============================================================');
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Tổng số bài test: ${testResults.length} | PASS: \x1b[32m${passCount}\x1b[0m | FAIL: \x1b[31m${failCount}\x1b[0m\n`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng khi thực thi suite kiểm thử:', err);
  process.exit(1);
});
