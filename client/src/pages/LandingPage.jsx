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
  Music,
  Maximize2,
  Sparkles,
  Sliders,
  Radio,
  FileAudio
} from 'lucide-react';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';
import Turntable3D from '../components/Turntable3D';
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
import KineticLyrics from '../components/KineticLyrics';
import { fetchSyncedLyrics } from '../services/lyricsService';

/**
 * AuraVinyl — 3D Interactive Vinyl & Kinetic Lyrics Player
 * Giao diện Dark Minimalist chuẩn phong cách nghệ thuật đĩa than hoài niệm
 */
export default function LandingPage() {
  // Trạng thái phát nhạc
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ambientColors, setAmbientColors] = useState(DEFAULT_PALETTE);

  // Trạng thái lời bài hát đồng bộ (Kinetic Synced Lyrics)
  const [lyricsLines, setLyricsLines] = useState([]);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Thông tin bài hát hiện tại
  const [trackInfo, setTrackInfo] = useState({
    title: 'Chưa có bản thu',
    artist: 'Kéo thả file MP3 để phát đĩa than',
    album: 'AuraVinyl Session',
    fileName: '',
    coverUrl: null
  });

  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const needleDropTimerRef = useRef(null);

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

    // 3. Bắt đầu phát bài hát chính lúc kim đã tiếp xúc với rãnh đĩa (sau 1.2s)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }, 1200);
  };

  const stopPlayback = () => {
    clearTimeout(needleDropTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  // Xử lý nạp file âm thanh & trích xuất Metadata ID3
  const handleFileSelect = async (file) => {
    if (!file || !file.type.includes('audio') && !file.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
      alert('Vui lòng chọn tệp âm thanh hợp lệ (.mp3, .wav, .ogg, .flac)!');
      return;
    }

    playHapticClick();
    const objectUrl = URL.createObjectURL(file);

    // 1. Trích xuất metadata ID3 tags & ảnh bìa album trực tiếp trên trình duyệt
    const meta = await parseAudioFileMetadata(file);

    setTrackInfo({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      fileName: meta.fileName,
      coverUrl: meta.coverUrl
    });

    // 2. Trích xuất bảng màu chủ đạo (Color Palette) từ ảnh bìa để đổi màu nền Ambient Aurora
    if (meta.coverUrl) {
      const palette = await extractPaletteFromImage(meta.coverUrl);
      setAmbientColors(palette);
    } else {
      setAmbientColors(DEFAULT_PALETTE);
    }

    // 3. Tải lời bài hát đồng bộ từ Lrclib API (Kinetic Synced Lyrics)
    setIsLyricsLoading(true);
    setLyricsLines([]);
    setIsInstrumental(false);

    fetchSyncedLyrics({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      duration: 0
    })
      .then((lyricsData) => {
        setIsLyricsLoading(false);
        if (lyricsData && lyricsData.lines && lyricsData.lines.length > 0) {
          setLyricsLines(lyricsData.lines);
          setIsInstrumental(false);
        } else {
          setLyricsLines([]);
          setIsInstrumental(Boolean(lyricsData?.instrumental));
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải lời bài hát:', err);
        setIsLyricsLoading(false);
        setLyricsLines([]);
      });

    // 4. Nạp audio và tự động kích hoạt hạ cần kim, phát đĩa than
    if (audioRef.current) {
      audioRef.current.src = objectUrl;
      audioRef.current.load();
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration || 0);
      };
      startPlayback();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
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
      fileInputRef.current?.click();
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

  // Tua nhạc (Timeline Scrubber hoặc Click-to-Seek từ câu hát KineticLyrics)
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

  return (
    <div className="relative w-full min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden font-sans">
      {/* Thẻ audio ẩn phục vụ phát âm thanh */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={stopPlayback}
        className="hidden"
      />

      {/* Input tệp ẩn */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* Ánh sáng Aurora nền biến đổi màu theo ảnh bìa album (Dynamic Ambient Aurora) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-1000">
        <div
          className={`absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[140px] opacity-25 transition-all duration-1000 ${
            isPlaying ? 'scale-110' : 'scale-95'
          }`}
          style={{ backgroundColor: ambientColors.primaryColor }}
        />
        <div
          className={`absolute bottom-1/3 right-1/4 w-[550px] h-[550px] rounded-full blur-[150px] opacity-20 transition-all duration-1000 ${
            isPlaying ? 'scale-105' : 'scale-90'
          }`}
          style={{ backgroundColor: ambientColors.secondaryColor }}
        />
      </div>

      {/* 1. TOP BAR: Header Tối Giản Sang Trọng */}
      <header className="relative z-20 w-full h-16 border-b border-white/[0.06] bg-[#090a0f]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        {/* Logo AuraVinyl */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>AuraVinyl</span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.06] text-amber-300/80 border border-white/[0.08]">
                3D PLAYER
              </span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">
              KINETIC LYRICS & TURNTABLE
            </p>
          </div>
        </div>

        {/* Trạng thái đĩa than ở giữa */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span>{isPlaying ? 'TURNTABLE ROTATING // 33⅓ RPM' : 'TURNTABLE STANDBY // READY'}</span>
        </div>

        {/* Cụm Action Nút Tải Lên & Thông Tin */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playHapticClick();
              fileInputRef.current?.click();
            }}
            onMouseEnter={playHoverBlip}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-white/[0.08] hover:border-amber-400/30 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Chọn File Nhạc</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN PLAYER STAGE: Khung Layout 2 Cột (Mâm Đĩa Than 3D & Lời Bài Hát Kinetic) */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 min-h-0">
        
        {/* CỘT TRÁI: Khu Vực Mâm Đĩa Than 3D & Dropzone */}
        <section
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex-1 w-full h-[540px] lg:h-[600px] rounded-3xl bg-white/[0.02] border transition-all duration-300 flex flex-col items-center justify-center p-6 relative overflow-hidden group ${
            isDragging
              ? 'border-amber-400/60 bg-amber-500/[0.04] shadow-2xl shadow-amber-500/10'
              : 'border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          {/* Mâm Đĩa Than 3D Tương Tác (Three.js WebGL Turntable) */}
          <Turntable3D isPlaying={isPlaying} coverUrl={trackInfo?.coverUrl} ambientColors={ambientColors} />

          {/* Dropzone Hint & Nút Tải Tệp */}
          <div className="mt-6 text-center space-y-2 z-10">
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                fileInputRef.current?.click();
              }}
              onMouseEnter={playHoverBlip}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-amber-400/40 text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-medium"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Thả tệp MP3/WAV hoặc nhấp để tải đĩa</span>
            </button>
            <p className="text-[11px] font-mono text-slate-500">
              AUDIO METADATA & 3D TURNTABLE STAGE READY
            </p>
          </div>
        </section>

        {/* CỘT PHẢI: Thông Tin Bài Hát & Lời Bài Hát Kinetic */}
        <section className="flex-1 w-full h-[540px] lg:h-[600px] rounded-3xl bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
          {/* 1. Header Thông Tin Bài Hát */}
          <div className="space-y-2 border-b border-white/[0.06] pb-5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/90 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                NOW PLAYING
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white line-clamp-1">
              {trackInfo.title}
            </h2>
            <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <span>{trackInfo.artist}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-500 font-normal">{trackInfo.album}</span>
            </p>
          </div>

          {/* 2. Khung Lời Bài Hát Động Học (Kinetic Lyrics Component) */}
          <KineticLyrics
            lines={lyricsLines}
            currentTime={currentTime}
            onSeek={handleSeek}
            isLoading={isLyricsLoading}
            ambientColors={ambientColors}
            isInstrumental={isInstrumental}
          />

          {/* 3. Footer Thống Kê & Spec Kỹ Thuật */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>KINETIC LYRICS // LRCLIB SYNC</span>
            </div>
            <span>DSP 44.1 KHZ STEREO</span>
          </div>
        </section>

      </main>

      {/* 3. BOTTOM CONTROL BAR: Thanh Điều Khiển Phát Nhạc Tinh Tế */}
      <footer className="relative z-20 w-full h-24 border-t border-white/[0.06] bg-[#090a0f]/95 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between gap-4">
        
        {/* Khối Trái: Mini Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[140px] max-w-[240px]">
          <div className="relative w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            {trackInfo.coverUrl ? (
              <img
                src={trackInfo.coverUrl}
                alt={trackInfo.title}
                className={`w-full h-full object-cover rounded-xl ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
              />
            ) : (
              <Disc3 className={`w-6 h-6 text-amber-400/80 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
              {trackInfo.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              {trackInfo.artist}
            </p>
          </div>
        </div>

        {/* Khối Giữa: Nút Play/Pause & Scrubber Timeline */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          {/* Cụm Nút Playback */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              onMouseEnter={playHoverBlip}
              className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
              title="Lùi 10 giây"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Nút Play / Pause Trung Tâm */}
            <button
              type="button"
              onClick={togglePlay}
              onMouseEnter={playHoverBlip}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold"
              title={isPlaying ? 'Tạm dừng' : 'Phát đĩa than'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
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
              className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
              title="Tiến 10 giây"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Thanh Tiến Trình (Timeline Scrubber) */}
          <div className="w-full flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            />
            <span className="w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Khối Phải: Âm Lượng & Thao Tác Phụ */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[120px]">
          <button
            type="button"
            onClick={toggleMute}
            onMouseEnter={playHoverBlip}
            className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
        </div>

      </footer>
    </div>
  );
}
