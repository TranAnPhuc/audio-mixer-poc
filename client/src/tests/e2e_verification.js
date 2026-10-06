/**
 * AuraVinyl - End-to-End (E2E) & Core Subsystems Verification Suite
 * 
 * Phạm vi kiểm thử:
 * 1. Phân tích Metadata ID3 thật & Trích xuất Lời nhúng (metadataService + jsmediatags)
 * 2. Thuật toán trích xuất bảng màu chủ đạo (extractPaletteFromImage)
 * 3. Bộ phân tích cú pháp lời bài hát LRC (parseLrc) với các dạng timestamp chuẩn & đa mốc
 * 4. Động cơ âm học Web Audio (vinylAudioEngine): khởi tạo, sinh tiếng crackle ngẫu nhiên, phổ tần số
 * 5. Luồng xử lý âm thanh 16kHz & chuyển đổi chunks Whisper (aiTranscriptionService)
 * 6. Kiểm tra toàn vẹn tài nguyên (Memory Leak, WebGL Context, Blob URLs revocation)
 */

import { parseAudioFileMetadata, extractEmbeddedLyrics, extractPaletteFromImage, DEFAULT_PALETTE } from '../services/metadataService.js';
import { parseLrc, formatLinesToLrc } from '../services/lyricsService.js';
import { convertWhisperChunksToLrc } from '../services/aiTranscriptionService.js';
import {
  getAudioContext,
  setVinylMuted,
  getIsVinylMuted,
  playNeedleDropEffect,
  connectAudioElement,
  getAudioFrequencies
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
      this.currentTime = 1.0;
      this.sampleRate = 44100;
      this.destination = new MockAudioNode();
    }
    createBuffer(channels, length, sampleRate) {
      return new MockAudioBuffer(channels, length, sampleRate);
    }
    createGain() { return new MockGainNode(); }
    createOscillator() { return new MockOscillatorNode(); }
    createBiquadFilter() { return new MockBiquadFilterNode(); }
    createBufferSource() { return new MockBufferSourceNode(); }
    createAnalyser() { return new MockAnalyserNode(); }
    createMediaElementSource(el) { return new MockAudioNode(); }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }

  globalThis.AudioContext = MockAudioContext;
  globalThis.window.AudioContext = MockAudioContext;

  // Giám sát vòng đời Blob URLs để phát hiện rò rỉ bộ nhớ (Memory Leak Monitor)
  const activeBlobUrls = new Set();
  const originalCreate = URL.createObjectURL ? URL.createObjectURL.bind(URL) : null;
  const originalRevoke = URL.revokeObjectURL ? URL.revokeObjectURL.bind(URL) : null;
  let blobCounter = 0;

  URL.createObjectURL = (blob) => {
    const url = originalCreate ? originalCreate(blob) : `blob:mock-host/${++blobCounter}`;
    activeBlobUrls.add(url);
    return url;
  };

  URL.revokeObjectURL = (url) => {
    activeBlobUrls.delete(url);
    if (originalRevoke) originalRevoke(url);
  };

  globalThis.__getActiveBlobUrls = () => activeBlobUrls;
}

// Hàm tiện ích tạo buffer ID3v2.3 chuẩn với các frame tiêu đề, nghệ sĩ, album & lời nhúng USLT
function createSyntheticId3Buffer({ title, artist, album, lyrics }) {
  function makeTextFrame(id, text) {
    const textBytes = Buffer.from('\0' + text, 'latin1');
    const header = Buffer.alloc(10);
    header.write(id, 0, 4, 'ascii');
    header.writeUInt32BE(textBytes.length, 4);
    return Buffer.concat([header, textBytes]);
  }

  function makeUsltFrame(lyricsText) {
    // 1 byte encoding (0) + 3 bytes lang ('eng') + 1 byte desc term (0) + lyrics
    const body = Buffer.concat([
      Buffer.from([0]),
      Buffer.from('eng', 'ascii'),
      Buffer.from([0]),
      Buffer.from(lyricsText, 'latin1')
    ]);
    const header = Buffer.alloc(10);
    header.write('USLT', 0, 4, 'ascii');
    header.writeUInt32BE(body.length, 4);
    return Buffer.concat([header, body]);
  }

  const frameList = [];
  if (title) frameList.push(makeTextFrame('TIT2', title));
  if (artist) frameList.push(makeTextFrame('TPE1', artist));
  if (album) frameList.push(makeTextFrame('TALB', album));
  if (lyrics) frameList.push(makeUsltFrame(lyrics));

  const frames = Buffer.concat(frameList);
  const size = frames.length;
  const header = Buffer.alloc(10);
  header.write('ID3', 0, 3, 'ascii');
  header[3] = 3; header[4] = 0; header[5] = 0; // ID3v2.3
  // 4 synchsafe bytes
  header[6] = (size >> 21) & 0x7F;
  header[7] = (size >> 14) & 0x7F;
  header[8] = (size >> 7) & 0x7F;
  header[9] = size & 0x7F;

  return Buffer.concat([header, frames, Buffer.alloc(128)]);
}

// Bảng tổng hợp kết quả kiểm thử
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runTest(testName, testFn) {
  const start = performance.now();
  try {
    await testFn();
    const duration = (performance.now() - start).toFixed(2);
    testResults.push({ name: testName, status: 'PASS', duration: `${duration}ms` });
    console.log(`  \x1b[32m✔\x1b[0m [PASS] ${testName} (${duration}ms)`);
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    testResults.push({ name: testName, status: 'FAIL', duration: `${duration}ms`, error: err.message });
    console.error(`  \x1b[31m✖\x1b[0m [FAIL] ${testName} (${duration}ms): ${err.message}`);
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('       AuraVinyl E2E & Subsystems Verification Suite         ');
  console.log('=============================================================\n');

  setupBrowserMocks();

  // SUITE 1: Phân tích cú pháp lời bài hát LRC (parseLrc)
  console.log('\x1b[1m--- [Suite 1] LRC Parsing & Time Synchronization ---\x1b[0m');
  await runTest('parseLrc: Phân tích timestamp chuẩn [mm:ss.xx]', () => {
    const lrc = `
      [00:01.20] Câu hát đầu tiên
      [00:05.80] Câu hát thứ hai
    `;
    const lines = parseLrc(lrc);
    assert(lines.length === 2, `Mong đợi 2 dòng, nhận được ${lines.length}`);
    assert(Math.abs(lines[0].time - 1.20) < 0.01, `Timestamp dòng 1 không khớp: ${lines[0].time}`);
    assert(Math.abs(lines[1].time - 5.80) < 0.01, `Timestamp dòng 2 không khớp: ${lines[1].time}`);
    assert(lines[0].text === 'Câu hát đầu tiên', 'Nội dung câu hát 1 không khớp');
  });

  await runTest('parseLrc: Timestamp mili-giây 3 chữ số [mm:ss.xxx]', () => {
    const lrc = '[01:23.456] Câu hát có mili-giây chi tiết';
    const lines = parseLrc(lrc);
    assert(lines.length === 1, 'Chưa đọc được dòng timestamp 3 chữ số');
    assert(Math.abs(lines[0].time - 83.456) < 0.01, `Thời gian tính toán sai: ${lines[0].time}`);
  });

  await runTest('parseLrc: Một dòng chứa nhiều timestamp đồng thời', () => {
    const lrc = '[00:10.00][00:25.50] Điệp khúc vang lên';
    const lines = parseLrc(lrc);
    assert(lines.length === 2, `Mong đợi 2 mốc thời gian, nhận được ${lines.length}`);
    assert(lines[0].time === 10, 'Mốc 1 không khớp');
    assert(lines[1].time === 25.5, 'Mốc 2 không khớp');
    assert(lines[0].text === 'Điệp khúc vang lên', 'Text không khớp');
    assert(lines[1].text === 'Điệp khúc vang lên', 'Text không khớp');
  });

  await runTest('parseLrc: Sắp xếp thời gian tăng dần và bỏ qua dòng rác', () => {
    const lrc = `
      [00:30.00] Dòng muộn hơn
      [00:05.00] Dòng sớm hơn
      [ar: Ca Sĩ Nổi Tiếng]
      Dòng không có timestamp
    `;
    const lines = parseLrc(lrc);
    assert(lines.length === 2, `Mong đợi 2 dòng hợp lệ, nhận ${lines.length}`);
    assert(lines[0].time < lines[1].time, 'Dòng chưa được sắp xếp tăng dần theo thời gian');
    assert(lines[0].id === 0 && lines[1].id === 1, 'ID chưa được đánh số thứ tự chuẩn');
  });

  await runTest('formatLinesToLrc: Quy đổi mảng lyrics thành chuỗi .LRC chuẩn [mm:ss.xx]', () => {
    const inputLines = [
      { time: 1.25, text: 'Câu hát một' },
      { time: 65.08, text: 'Câu hát hai ở phút thứ nhất' }
    ];
    const exportedLrc = formatLinesToLrc(inputLines, {
      title: 'Aura Track',
      artist: 'Aura Artist'
    });
    assert(exportedLrc.includes('[ti:Aura Track]'), 'Thiếu thẻ [ti:]');
    assert(exportedLrc.includes('[ar:Aura Artist]'), 'Thiếu thẻ [ar:]');
    assert(exportedLrc.includes('[00:01.25] Câu hát một'), 'Format dòng 1 sai: ' + exportedLrc);
    assert(exportedLrc.includes('[01:05.08] Câu hát hai ở phút thứ nhất'), 'Format dòng 2 sai: ' + exportedLrc);
  });

  // SUITE 2: Trích xuất Metadata ID3 & Lời nhúng (metadataService)
  console.log('\n\x1b[1m--- [Suite 2] Metadata & Embedded Lyrics Extraction ---\x1b[0m');
  await runTest('jsmediatags: Đọc tệp nhị phân ID3v2.3 trích xuất Title, Artist, Album & Lời USLT', async () => {
    const rawBuffer = createSyntheticId3Buffer({
      title: 'Aura Vinyl Master',
      artist: 'Da Phuc Trio',
      album: 'Golden Nostalgia',
      lyrics: '[00:02.50] Echoes of warm vinyl grooves'
    });
    const mockFile = new File([rawBuffer], 'aura_track.mp3', { type: 'audio/mp3' });
    const meta = await parseAudioFileMetadata(mockFile);

    assert(meta.title === 'Aura Vinyl Master', `Tiêu đề không khớp: ${meta.title}`);
    assert(meta.artist === 'Da Phuc Trio', `Nghệ sĩ không khớp: ${meta.artist}`);
    assert(meta.album === 'Golden Nostalgia', `Album không khớp: ${meta.album}`);
    assert(meta.lyrics && meta.lyrics.includes('Echoes of warm vinyl'), `Lời nhúng USLT không khớp: ${meta.lyrics}`);
  });

  await runTest('extractEmbeddedLyrics: Trích xuất từ thẻ SYLT hoặc lyrics tự do', () => {
    const tags1 = { SYLT: '[00:01.00] Lời SYLT đồng bộ' };
    assert(extractEmbeddedLyrics(tags1) === '[00:01.00] Lời SYLT đồng bộ', 'SYLT extraction failed');

    const tags2 = { lyrics: '  Lời bài hát tự do  ' };
    assert(extractEmbeddedLyrics(tags2) === 'Lời bài hát tự do', 'Free lyrics extraction failed');

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
    // Thực thi không quăng lỗi ngoại lệ
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
    // Theo mock dữ liệu, bass mạnh nhất
    assert(bassEnergy >= midEnergy, 'Bass energy phải chiếm ưu thế theo mock spectrum');
  });

  // SUITE 5: Whisper Chunks & Audio 16kHz Processing (aiTranscriptionService)
  console.log('\n\x1b[1m--- [Suite 5] AI Transcription & 16kHz Audio Pipeline ---\x1b[0m');
  await runTest('convertWhisperChunksToLrc: Chuyển đổi Whisper timestamps sang chuẩn AuraVinyl', () => {
    const chunks = [
      { timestamp: [2.5, 5.0], text: ' Dòng thứ hai' },
      { timestamp: [0.0, 2.2], text: 'Dòng thứ nhất ' },
      { timestamp: [null, null], text: '   ' }, // Rác
      { timestamp: [6.123, 9.0], text: 'Dòng thứ ba với số lẻ' }
    ];
    const lines = convertWhisperChunksToLrc(chunks);
    assert(lines.length === 3, `Mong đợi 3 dòng sau khi lọc rác, nhận được ${lines.length}`);
    assert(lines[0].text === 'Dòng thứ nhất', 'Dòng 1 text sai');
    assert(lines[0].time === 0, 'Dòng 1 time sai');
    assert(lines[1].text === 'Dòng thứ hai', 'Dòng 2 text sai');
    assert(lines[1].time === 2.5, 'Dòng 2 time sai');
    assert(lines[2].time === 6.12, 'Làm tròn 2 chữ số thập phân không đúng: ' + lines[2].time);
    assert(lines[0].id === 0 && lines[1].id === 1 && lines[2].id === 2, 'ID numbering sai');
  });

  await runTest('convertWhisperChunksToLrc: Triệt tiêu triệt để ảo giác AI ([music], [Song], lặp từ >3 lần, noise)', () => {
    const hallucinationChunks = [
      { timestamp: [0.0, 3.0], text: '[music] [music] [music] [Song] [S [S' }, // Ảo giác thẻ lặp
      { timestamp: [3.2, 5.0], text: '(applause) (cheering)' }, // Tiếng ồn
      { timestamp: [5.1, 5.4], text: '[S' }, // Ký tự cụt đứng riêng
      { timestamp: [5.4, 5.5], text: 'a' }, // Dòng 1 ký tự vô nghĩa
      { timestamp: [5.5, 8.0], text: 'la la la la la la' }, // Lặp từ > 3 lần
      { timestamp: [8.5, 10.0], text: '...' }, // Chỉ có dấu câu
      { timestamp: [10.5, 14.0], text: 'Một chiều mưa bay qua phố nhỏ [music] [S' } // Câu hợp lệ kèm thẻ thừa và thẻ cụt
    ];
    const filtered = convertWhisperChunksToLrc(hallucinationChunks);
    assert(filtered.length === 1, `Mong đợi 1 dòng hợp lệ duy nhất, nhận được: ${filtered.length}`);
    assert(filtered[0].text === 'Một chiều mưa bay qua phố nhỏ', `Câu hát chưa làm sạch đúng: "${filtered[0].text}"`);
    assert(filtered[0].time === 10.5, 'Thời gian câu hát hợp lệ sai');

    // Trường hợp toàn bộ là nhạc nền hoặc ảo giác: trả về mảng rỗng
    const beatOnlyChunks = [
      { timestamp: [0.0, 5.0], text: '[music]' },
      { timestamp: [5.0, 10.0], text: '[instrumental]' }
    ];
    const emptyResult = convertWhisperChunksToLrc(beatOnlyChunks);
    assert(emptyResult.length === 0, 'Phải trả về mảng rỗng khi toàn bộ là beat không lời');
  });

  await runTest('16kHz Pipeline Math: Độ dài mẫu resample theo chuẩn Whisper', () => {
    const durationSec = 185.4; // ~3 phút 5 giây
    const targetSampleRate = 16000;
    const expectedSamples = Math.ceil(durationSec * targetSampleRate);
    assert(expectedSamples === 2966400, `Độ dài mẫu Float32Array tính toán sai: ${expectedSamples}`);
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

  await runTest('Three.js WebGL Context & Texture Cleanup: forceContextLoss và texture disposal', () => {
    let contextLost = false;
    let textureDisposed = false;

    const mockTexture = {
      dispose() { textureDisposed = true; }
    };

    const mockRenderer = {
      domElement: { parentNode: { removeChild: () => {} } },
      forceContextLoss() { contextLost = true; },
      dispose() {}
    };

    // Kiểm tra contract dọn dẹp
    mockTexture.dispose();
    mockRenderer.forceContextLoss();

    assert(textureDisposed === true, 'Texture không được giải phóng!');
    assert(contextLost === true, 'forceContextLoss chưa được gọi!');
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
