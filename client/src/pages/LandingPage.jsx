import React, { useState, useRef, useEffect } from 'react';
import {
  Disc3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Upload,
  Maximize2,
  Minimize2,
  Radio,
  Sparkles
} from 'lucide-react';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';
import Turntable3D from '../components/Turntable3D';
import AudioTerrain3D from '../components/AudioTerrain3D';
import AudiusCratesDrawer from '../components/AudiusCratesDrawer';
import {
  connectAudioElement,
  playNeedleDropEffect,
  setVinylMuted
} from '../utils/vinylAudioEngine';
import {
  parseAudioFileMetadata,
  extractPaletteFromImage,
  DEFAULT_PALETTE
} from '../services/metadataService';
import ToastNotification from '../components/ToastNotification';

/**
 * AuraVinyl — 3D Interactive Vinyl & Generative Audio Terrain Studio
 * Giao diện Dark Minimalist kết hợp mâm đĩa than 3D, sóng âm địa hình Joy Division 3D
 * và khay đĩa than trực tuyến Audius Open Protocol
 */
export default function LandingPage() {
  // Trạng thái thông báo Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = ({ message, type = 'info', actions = [], duration = 4000 }) => {
    setToast({ message, type, actions, duration });
  };

  // Trạng thái phát nhạc
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ambientColors, setAmbientColors] = useState(DEFAULT_PALETTE);
  const [isZenMode, setIsZenMode] = useState(false);

  // Trạng thái khay đĩa Audius
  const [isCratesDrawerOpen, setIsCratesDrawerOpen] = useState(false);
  const [currentOnlineTrackId, setCurrentOnlineTrackId] = useState(null);

  // Thông tin bài hát hiện tại
  const [trackInfo, setTrackInfo] = useState({
    title: 'Chưa có bản thu',
    artist: 'Kéo thả file MP3 hoặc khám phá Audius',
    album: 'AuraVinyl Session',
    fileName: '',
    coverUrl: null
  });

  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const needleDropTimerRef = useRef(null);
  const currentAudioFileRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const currentCoverUrlRef = useRef(null);

  // Thu hồi tài nguyên Blob URLs khi unmount trang để triệt tiêu memory leak
  useEffect(() => {
    return () => {
      clearTimeout(needleDropTimerRef.current);
      if (currentAudioUrlRef.current && currentAudioUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
      if (currentCoverUrlRef.current && currentCoverUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentCoverUrlRef.current);
        currentCoverUrlRef.current = null;
      }
    };
  }, []);

  // Khởi động phát bài hát đồng bộ với động học hạ cần kim
  const startPlayback = () => {
    if (!audioRef.current || !audioRef.current.src) return;

    // 1. Kết nối thẻ audio với Web Audio AnalyserNode
    connectAudioElement(audioRef.current);
    setIsPlaying(true);

    // 2. Kích hoạt tiếng nổ lách tách và tiếng chạm kim lúc cần hạ (sau 800ms)
    clearTimeout(needleDropTimerRef.current);
    needleDropTimerRef.current = setTimeout(() => {
      playNeedleDropEffect({ duration: 1.8 });
    }, 800);

    // 3. Bắt đầu phát bài hát chính lúc kim đã tiếp xúc với rãnh đĩa (sau 1.2s) kèm Fade-in 50ms
    setTimeout(() => {
      if (audioRef.current) {
        const targetVol = isMuted ? 0 : volume;
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          // Audio Gain Fade-in (50ms) loại bỏ tiếng giật cục
          const startFade = performance.now();
          const fadeDuration = 50;
          const fadeInStep = () => {
            const elapsed = performance.now() - startFade;
            const progress = Math.min(1, elapsed / fadeDuration);
            if (audioRef.current && !isMuted) {
              audioRef.current.volume = progress * targetVol;
            }
            if (progress < 1) {
              requestAnimationFrame(fadeInStep);
            }
          };
          requestAnimationFrame(fadeInStep);
        }).catch(console.error);
      }
    }, 1200);
  };

  const stopPlayback = () => {
    clearTimeout(needleDropTimerRef.current);
    if (audioRef.current) {
      // Audio Gain Fade-out (50ms) êm ái trước khi pause
      const currentVol = audioRef.current.volume;
      const startFade = performance.now();
      const fadeDuration = 50;
      const fadeOutStep = () => {
        const elapsed = performance.now() - startFade;
        const progress = Math.min(1, elapsed / fadeDuration);
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, currentVol * (1 - progress));
        }
        if (progress < 1) {
          requestAnimationFrame(fadeOutStep);
        } else {
          audioRef.current.pause();
        }
      };
      requestAnimationFrame(fadeOutStep);
    }
    setIsPlaying(false);
  };

  // Nạp tệp âm thanh máy cục bộ và trích xuất thông tin
  const processAudioFile = async (audioFile) => {
    playHapticClick();
    currentAudioFileRef.current = audioFile;
    setCurrentOnlineTrackId(null);

    // Thu hồi Blob URL âm thanh trước đó (nếu có) để giải phóng RAM
    if (currentAudioUrlRef.current && currentAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(audioFile);
    currentAudioUrlRef.current = objectUrl;

    // Bước 1: Trích xuất metadata ID3 tags và ảnh bìa album
    const meta = await parseAudioFileMetadata(audioFile);

    // Thu hồi Blob URL ảnh bìa trước đó (nếu có)
    if (currentCoverUrlRef.current && currentCoverUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentCoverUrlRef.current);
    }
    currentCoverUrlRef.current = meta.coverUrl;

    setTrackInfo({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      fileName: meta.fileName,
      coverUrl: meta.coverUrl
    });

    // Bước 2: Trích xuất bảng màu chủ đạo (Color Palette) từ ảnh bìa
    if (meta.coverUrl) {
      const palette = await extractPaletteFromImage(meta.coverUrl);
      setAmbientColors(palette);
    } else {
      setAmbientColors(DEFAULT_PALETTE);
    }

    // Bước 3: Nạp audio và tự động kích hoạt hạ cần kim, quay đĩa than
    if (audioRef.current) {
      audioRef.current.src = objectUrl;
      audioRef.current.load();
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration || 0);
      };
      startPlayback();
    }

    showToast({
      message: `Đang phát: ${meta.title} — ${meta.artist}`,
      type: 'success'
    });
  };

  // Phát bài hát trực tuyến từ khay đĩa Audius
  const playOnlineTrack = async (track) => {
    playHapticClick();
    currentAudioFileRef.current = null;
    setCurrentOnlineTrackId(track.id);

    // Thu hồi Blob URL âm thanh cũ (nếu trước đó là file upload)
    if (currentAudioUrlRef.current && currentAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
    }
    currentAudioUrlRef.current = track.streamUrl;

    // Thu hồi Blob URL ảnh bìa cũ nếu có
    if (currentCoverUrlRef.current && currentCoverUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentCoverUrlRef.current);
    }
    currentCoverUrlRef.current = track.coverUrl;

    setTrackInfo({
      title: track.title,
      artist: track.artist,
      album: track.album || `${track.genre || 'Audius'} Edition`,
      fileName: `audius-${track.id}.mp3`,
      coverUrl: track.coverUrl
    });

    // Trích xuất bảng màu từ ảnh bìa online để đổi màu nền Ambient Aurora
    if (track.coverUrl) {
      const palette = await extractPaletteFromImage(track.coverUrl);
      setAmbientColors(palette);
    } else {
      setAmbientColors(DEFAULT_PALETTE);
    }

    // Nạp stream URL vào thẻ <audio> và bắt đầu phát nhạc
    if (audioRef.current) {
      audioRef.current.src = track.streamUrl;
      audioRef.current.load();
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration || track.duration || 0);
      };
      startPlayback();
    }

    showToast({
      message: `Đang phát từ Audius: ${track.title} — ${track.artist}`,
      type: 'success'
    });
  };

  // Xử lý tập hợp tệp được người dùng kéo thả hoặc chọn qua file dialog
  const handleIncomingFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    const audioFile = files.find((f) =>
      f.type.includes('audio') || f.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)
    );

    if (audioFile) {
      await processAudioFile(audioFile);
      return;
    }

    showToast({
      message: 'Vui lòng chọn tệp âm thanh (.mp3, .wav, .ogg, .flac)!',
      type: 'info'
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    playHapticClick();
    if (!audioRef.current || !audioRef.current.src) {
      setIsCratesDrawerOpen(true);
      return;
    }

    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Cập nhật thời gian phát
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Tua nhạc (Timeline Scrubber)
  const handleSeek = (timeOrEvent) => {
    let seekTime = 0;
    if (typeof timeOrEvent === 'number') {
      seekTime = timeOrEvent;
    } else if (timeOrEvent && timeOrEvent.target) {
      seekTime = parseFloat(timeOrEvent.target.value);
    }
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  // Điều chỉnh âm lượng
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) {
      setIsMuted(true);
      setVinylMuted(true);
    } else {
      setIsMuted(false);
      setVinylMuted(false);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    playHapticClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setVinylMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : (volume > 0 ? volume : 0.8);
    }
  };

  // Format thời gian mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format thời gian Studio Digital dạng mm:ss.ff (fractional seconds) cho Audiophile Master Console
  const formatStudioTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Lắng nghe phím tắt toàn cục
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua nếu đang gõ trong input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) {
          const newTime = Math.max(0, currentTime - 5);
          handleSeek(newTime);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current && duration) {
          const newTime = Math.min(duration, currentTime + 5);
          handleSeek(newTime);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(1, volume + 0.05);
        setVolume(newVol);
        if (audioRef.current) audioRef.current.volume = newVol;
        setIsMuted(false);
        setVinylMuted(false);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, volume - 0.05);
        setVolume(newVol);
        if (audioRef.current) audioRef.current.volume = newVol;
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        playHapticClick();
        setIsZenMode((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (isCratesDrawerOpen) {
          setIsCratesDrawerOpen(false);
        } else if (isZenMode) {
          setIsZenMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, volume, isMuted, isZenMode, isCratesDrawerOpen]);

  return (
    <div
      className={`min-h-screen bg-[#0e111a] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black overflow-x-hidden relative transition-colors duration-1000 ${
        isZenMode ? 'cursor-auto' : ''
      }`}
    >
      {/* Thẻ Audio Ẩn Điều Khiển Bằng Mã Nguồn */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => console.error('Lỗi phần tử audio HTML5:', e)}
        crossOrigin="anonymous"
        preload="metadata"
      />

      {/* Input Ẩn Để Chọn Tệp Âm Thanh Cục Bộ */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleIncomingFiles(e.target.files);
          }
        }}
      />

      {/* 1. LỚP NỀN ÁNH SÁNG AMBIENT AURORA KHUẾCH ĐẠI ĐỔI MÀU THEO BẢNG MÀU ALBUM */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-1000 ease-out z-0"
        style={{
          background: `
            radial-gradient(circle at 25% 35%, ${ambientColors.glowColor ? ambientColors.glowColor.replace('0.15', '0.48').replace('0.25', '0.52') : 'rgba(245, 158, 11, 0.48)'} 0%, transparent 72%),
            radial-gradient(circle at 75% 65%, ${ambientColors.secondaryColor ? ambientColors.secondaryColor.replace('rgb', 'rgba').replace(')', ', 0.40)') : 'rgba(190, 24, 93, 0.40)'} 0%, transparent 75%),
            radial-gradient(circle at 50% 50%, rgba(18, 22, 33, 0.65) 0%, #0e111a 100%)
          `
        }}
      />

      {/* 2. TOP NAV: Minimalist Header (Ẩn trong Zen Mode) */}
      {!isZenMode && (
        <header className="relative z-20 w-full h-16 border-b border-white/10 bg-[#131622]/80 backdrop-blur-xl px-6 sm:px-10 flex items-center justify-between transition-opacity duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Disc3 className={`w-5 h-5 text-slate-950 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                AuraVinyl
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase -mt-0.5 font-semibold">
                3D TURNTABLE // SPECTRAL TERRAIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Nút Mở Khay Đĩa Than Trực Tuyến Audius & Nhạc Việt */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsCratesDrawerOpen(true);
              }}
              onMouseEnter={playHoverBlip}
              className="anodize-btn inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-400/40 border border-amber-400/50 hover:border-amber-300 text-xs font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md shadow-amber-500/15"
              title="Mở khay đĩa than tuyển chọn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Khám Phá Đĩa Than</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-[11px] font-mono text-slate-200 font-semibold shadow-inner">
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isPlaying ? 'led-indicator-active animate-pulse' : 'led-indicator-idle'}`} />
              <span className="tracking-wider">{isPlaying ? '33⅓ RPM LOCKED' : 'SYSTEM STANDBY'}</span>
            </div>

            {/* Nút Kích Hoạt Zen Mode Toàn Màn Hình */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsZenMode(true);
              }}
              onMouseEnter={playHoverBlip}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-amber-400/60 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              title="Chế độ Zen Mode toàn màn hình (Phím F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Nút Thoát Zen Mode Nổi Ở Góc Màn Hình Khi Đang Trong Zen Mode */}
      {isZenMode && (
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsZenMode(false);
          }}
          className="fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-black/40 hover:bg-black/70 border border-white/10 hover:border-amber-400/50 text-slate-400 hover:text-white transition-all backdrop-blur-md cursor-pointer group"
          title="Thoát chế độ Zen Mode (Phím Esc hoặc F)"
        >
          <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* MAIN CONTAINER: Audiophile Master Console Chassis */}
      <main className={`relative z-10 flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center transition-all duration-700 ${
        isZenMode ? 'max-w-none p-4 h-screen' : ''
      }`}>
        
        {/* Khung máy Master Console kim loại phay xước titan than chì & 4 góc ốc vít kỹ thuật chìm */}
        <div className={`relative w-full rounded-3xl transition-all duration-700 ${
          isZenMode 
            ? 'bg-transparent border-transparent' 
            : 'console-chassis border border-white/15 shadow-2xl p-4 sm:p-6 lg:p-7 flex flex-col gap-5'
        }`}>

          {/* 4 ốc vít kỹ thuật chìm 4 góc khi ở Normal Mode */}
          {!isZenMode && (
            <>
              <div className="screw-bolt absolute top-3 left-3" title="Chassis Hex Bolt" />
              <div className="screw-bolt absolute top-3 right-3" title="Chassis Hex Bolt" />
              <div className="screw-bolt absolute bottom-3 left-3" title="Chassis Hex Bolt" />
              <div className="screw-bolt absolute bottom-3 right-3" title="Chassis Hex Bolt" />

              {/* Dải Thước Đo Tần Số & Telemetry Khắc Chìm (Frequency Scale Etching) */}
              <div className="w-full flex items-center justify-between px-6 pt-1 pb-2 border-b border-white/10 text-[10px] font-mono tracking-widest text-slate-200 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-extrabold tracking-widest">MASTER CONSOLE</span>
                  <span className="text-slate-400">//</span>
                  <span className="hidden sm:inline text-slate-300 font-medium">DISCRETE ANALOG STAGE</span>
                </div>

                <div className="hidden md:flex items-center gap-3 text-slate-300 font-semibold">
                  <span>20Hz</span>
                  <div className="w-10 h-[2px] frequency-ticks opacity-60" />
                  <span>100Hz</span>
                  <div className="w-14 h-[2px] frequency-ticks opacity-60" />
                  <span>1kHz</span>
                  <div className="w-14 h-[2px] frequency-ticks opacity-60" />
                  <span>10kHz</span>
                  <div className="w-10 h-[2px] frequency-ticks opacity-60" />
                  <span>20kHz</span>
                </div>

                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <span className="text-amber-300 font-bold">RPM: 33.333</span>
                  <span className="text-slate-500 hidden sm:inline">|</span>
                  <span className="hidden sm:inline text-slate-300">PITCH: ±0.0%</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-amber-300 font-bold">DAC: 24-BIT / 96kHz</span>
                </div>
              </div>
            </>
          )}

          {/* Khối 2 cột: Cột Trái (Mâm đĩa 3D) và Cột Phải (AudioTerrain3D) */}
          <div className="w-full flex flex-col lg:flex-row items-center gap-6 lg:gap-7 justify-center">
            {/* CỘT TRÁI: Khu Vực Mâm Đĩa Than 3D & Dropzone */}
            <section
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex-1 w-full rounded-2xl transition-all duration-700 flex flex-col items-center justify-center relative overflow-hidden group ${
                isZenMode
                  ? 'h-[80vh] lg:h-[88vh] bg-transparent border-transparent'
                  : `h-[520px] lg:h-[580px] bg-[#11131c]/80 border ${
                      isDragging
                        ? 'border-amber-400/80 bg-amber-500/[0.08] shadow-2xl shadow-amber-500/15'
                        : 'border-white/10 hover:border-white/20'
                    } p-5 sm:p-6`
              }`}
            >
              {/* Mâm Đĩa Than 3D Tương Tác (Three.js WebGL Turntable) */}
              <Turntable3D
                isPlaying={isPlaying}
                coverUrl={trackInfo?.coverUrl}
                ambientColors={ambientColors}
                currentTime={currentTime}
                duration={duration}
                isZenMode={isZenMode}
              />

              {/* Dropzone & Cụm Nút Nhôm Anodize */}
              {!isZenMode && (
                <div className="mt-5 text-center space-y-2 z-10 flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        fileInputRef.current?.click();
                      }}
                      onMouseEnter={playHoverBlip}
                      className="anodize-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-white/[0.10] via-white/[0.15] to-white/[0.08] hover:from-white/[0.18] hover:to-white/[0.12] border border-white/25 hover:border-amber-300 text-xs text-white transition-all cursor-pointer font-semibold shadow-md shadow-black/50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>Nạp Tệp Cục Bộ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        setIsCratesDrawerOpen(true);
                      }}
                      onMouseEnter={playHoverBlip}
                      className="anodize-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-600/25 hover:from-amber-500/35 hover:to-amber-400/45 border border-amber-400/50 hover:border-amber-300 text-xs text-amber-200 hover:text-white transition-all cursor-pointer font-bold shadow-md shadow-amber-500/15"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>Khám Phá Đĩa Than</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 tracking-wider uppercase font-semibold">
                    DIRECT DRIVE // 0.025% WRMS // HIGH FIDELITY DSP
                  </p>
                </div>
              )}
            </section>

            {/* CỘT PHẢI: Thông Tin Bài Hát & Sóng Âm Địa Hình Thác Nước 3D (AudioTerrain3D) */}
            <section
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex-1 w-full rounded-2xl transition-all duration-700 flex flex-col justify-between overflow-hidden ${
                isZenMode
                  ? 'h-[80vh] lg:h-[88vh] bg-transparent border-transparent p-4 sm:p-6'
                  : 'h-[520px] lg:h-[580px] bg-[#11131c]/80 border border-white/10 hover:border-white/20 p-5 sm:p-6'
              }`}
            >
              {/* 1. Header Thông Tin Bài Hát */}
              <div className="space-y-2 border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 px-2.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 font-extrabold shadow-sm">
                    {currentOnlineTrackId ? 'ONLINE AUDIO STREAM' : 'NOW PLAYING'}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 font-extrabold px-2.5 py-0.5 rounded bg-black/70 border border-white/20 shadow-inner">
                    {formatStudioTime(currentTime)} / {formatStudioTime(duration)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white line-clamp-1 drop-shadow-md">
                  {trackInfo.title}
                </h2>
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span className="text-slate-100">{trackInfo.artist}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-medium">{trackInfo.album}</span>
                </p>
              </div>

              {/* 2. Sóng Âm Địa Hình Thác Nước 3D (AudioTerrain3D) */}
              <div className="flex-1 w-full min-h-0 relative my-2 overflow-hidden flex items-center justify-center">
                <AudioTerrain3D
                  ambientColors={ambientColors}
                  isPlaying={isPlaying}
                />
              </div>

              {/* 3. Footer Thống Kê & Spec Kỹ Thuật */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-300 shrink-0 select-none font-semibold">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>3D SPECTRAL TERRAIN // 32 BANDS // 44.1 KHZ</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-amber-300">
                    {currentOnlineTrackId ? 'DIRECT CDN STREAM' : 'WATERFALL CASCADE'}
                  </span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-slate-200">DSP 44.1 KHZ</span>
                </div>
              </div>
            </section>
          </div>

        </div>

      </main>

      {/* 3. BOTTOM CONTROL BAR: Master Transport Deck (Ẩn trong Zen Mode) */}
      {!isZenMode && (
        <footer className="relative z-20 w-full h-24 border-t border-white/15 console-chassis px-4 sm:px-8 flex items-center justify-between gap-4 select-none">
        
        {/* Khối Trái: Mini Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[140px] max-w-[240px]">
          <div className="relative w-12 h-12 rounded-xl bg-black/70 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
            {trackInfo.coverUrl ? (
              <img
                src={trackInfo.coverUrl}
                alt={trackInfo.title}
                className={`w-full h-full object-cover rounded-xl ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
              />
            ) : (
              <Disc3 className={`w-6 h-6 text-amber-400 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">
              {trackInfo.title}
            </h4>
            <p className="text-[11px] font-medium text-slate-300 truncate">
              {trackInfo.artist}
            </p>
          </div>
        </div>

        {/* Khối Giữa: Cụm Phím Cơ Học Master Transport & Scrubber Timeline */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-2">
          {/* Cụm Phím Điều Khiển Tactile Mechanical Switches */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              onMouseEnter={playHoverBlip}
              className="mechanical-key w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
              title="Lùi 10 giây (Skip Back 10s)"
            >
              <SkipBack className="w-4 h-4 text-slate-200" />
            </button>

            {/* Nút Play / Pause Trung Tâm Audiophile Console */}
            <button
              type="button"
              onClick={togglePlay}
              onMouseEnter={playHoverBlip}
              className="mechanical-key px-6 h-11 rounded-2xl flex items-center gap-3 text-white font-black tracking-wider text-xs cursor-pointer border border-amber-400/50 shadow-lg shadow-amber-500/20 group"
              title={isPlaying ? 'Tạm dừng (Mâm đĩa đang quay)' : 'Phát đĩa than (Drop Needle)'}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isPlaying ? 'led-indicator-active animate-pulse' : 'led-indicator-idle'}`} />
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span className="font-mono text-amber-300 text-xs uppercase tracking-widest font-black">PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-amber-300 text-amber-300 ml-0.5" />
                  <span className="font-mono text-amber-300 text-xs uppercase tracking-widest font-black">PLAY</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playHapticClick();
                if (audioRef.current && duration) {
                  audioRef.current.currentTime = Math.min(duration, currentTime + 10);
                }
              }}
              onMouseEnter={playHoverBlip}
              className="mechanical-key w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
              title="Tiến 10 giây (Skip Forward 10s)"
            >
              <SkipForward className="w-4 h-4 text-slate-200" />
            </button>
          </div>

          {/* Thanh Tiến Trình (Timeline Scrubber) với LED Studio Timer & Vạch Sóng */}
          <div className="w-full flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-amber-300 font-bold tracking-wider text-[11px] shadow-inner">
              {formatStudioTime(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400 focus:outline-none relative z-10"
              />
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-slate-200 font-semibold tracking-wider text-[11px] shadow-inner">
              {formatStudioTime(duration)}
            </span>
          </div>
        </div>

        {/* Khối Phải: Âm Lượng Fader Cơ Khí */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[120px]">
          <button
            type="button"
            onClick={toggleMute}
            onMouseEnter={playHoverBlip}
            className="mechanical-key w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng (Mute)'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-200" />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            />
            <span className="hidden sm:inline text-[10px] font-mono text-amber-300 font-bold w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

      </footer>
      )}

      {/* 4. KHAY ĐĨA THAN TRỰC TUYẾN AUDIUS (AUDIUS CRATES DRAWER) */}
      <AudiusCratesDrawer
        isOpen={isCratesDrawerOpen}
        onClose={() => setIsCratesDrawerOpen(false)}
        onSelectTrack={(track) => {
          playOnlineTrack(track);
          setIsCratesDrawerOpen(false);
        }}
        currentTrackId={currentOnlineTrackId}
      />

      {/* 5. TOAST NOTIFICATION CAO CẤP */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
