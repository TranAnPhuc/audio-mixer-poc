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
  Sparkles,
  Film,
  HelpCircle,
  Box
} from 'lucide-react';
import { playHapticClick, playHoverBlip, playHeavyMetalSwitch } from '../utils/soundEffects';
import Turntable3D from '../components/Turntable3D';
import AudiusCratesDrawer from '../components/AudiusCratesDrawer';
import ExportVideoModal from '../components/ExportVideoModal';
import AmbientMixerDrawer from '../components/AmbientMixerDrawer';
import PomodoroWidget from '../components/PomodoroWidget';
import MinimalTodoWidget from '../components/MinimalTodoWidget';
import AtmosphericBackground from '../components/AtmosphericBackground';
import RetroCrtOsd from '../components/RetroCrtOsd';
import RetroShortcutModal from '../components/RetroShortcutModal';
import GramophoneViewerModal from '../components/GramophoneViewerModal';
import { LOFI_SCENES, DEFAULT_SCENE, getNextScene, getSceneById } from '../data/lofiScenes';
import { setAmbientVolume } from '../utils/ambientSoundSynth';
import { VIETNAMESE_TRACKS } from '../data/vietnameseTracks';
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

  // Trạng thái khay đĩa Audius & Modal Xuất Video
  const [isCratesDrawerOpen, setIsCratesDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [currentOnlineTrackId, setCurrentOnlineTrackId] = useState('vn-diem-xua');

  // Trạng thái AuraLofi Focus Widgets
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [isTodoOpen, setIsTodoOpen] = useState(false);

  // Trạng thái AuraLofi Fullscreen Scene & Auto-Hide UI
  const [currentScene, setCurrentScene] = useState(DEFAULT_SCENE);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isGramophoneModalOpen, setIsGramophoneModalOpen] = useState(false);

  // Kích hoạt thông báo phím tắt transient trên Retro CRT OSD
  const triggerActionFeedback = (text) => {
    setActionFeedback({ text, timestamp: Date.now() });
  };

  // Chuyển đổi cảnh không gian Lofi nghệ thuật (vòng lặp 4 cảnh)
  const handleCycleScene = () => {
    playHapticClick();
    const nextScene = getNextScene(currentScene?.id || 'rainy-window');
    setCurrentScene(nextScene);
    if (nextScene?.theme?.ambientPreset) {
      Object.entries(nextScene.theme.ambientPreset).forEach(([key, val]) => {
        setAmbientVolume(key, val);
      });
    }
    triggerActionFeedback(`[SCENE: ${(nextScene.name || nextScene.id).toUpperCase()}]`);
  };

  // Mặc định nạp bản Lofi Study Beats êm dịu
  const defaultLofiTrack = VIETNAMESE_TRACKS[1] || VIETNAMESE_TRACKS[0];
  const [trackInfo, setTrackInfo] = useState({
    title: defaultLofiTrack?.title || 'Diễm Xưa (Lofi Instrumental)',
    artist: defaultLofiTrack?.artist || 'Aura Chillhop Ensemble',
    album: defaultLofiTrack?.album || 'Trịnh Ca Trong Mưa',
    fileName: 'diem-xua-lofi.mp3',
    coverUrl: defaultLofiTrack?.coverUrl || null
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

  // Xử lý cào đĩa than bằng tay (Tactile Vinyl Scratching)
  const handleScratch = ({ isScratching, playbackRate, deltaAngle }) => {
    if (!audioRef.current) return;
    if (isScratching) {
      // Tua vị trí phát khi ngón tay chà xoay đĩa
      if (audioRef.current.duration && Math.abs(deltaAngle) > 0.003) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration,
          Math.max(0, audioRef.current.currentTime + deltaAngle * 0.22)
        );
      }
      // Điều chỉnh tốc độ phát âm thanh theo lực quay
      const rate = Math.min(2.5, Math.max(0.2, Math.abs(playbackRate)));
      audioRef.current.playbackRate = isNaN(rate) || rate === 0 ? 0.25 : rate;
    } else {
      // Buông tay: Khôi phục vận tốc phát 1.0x chuẩn
      audioRef.current.playbackRate = 1.0;
    }
  };

  // Kéo kim đĩa than để tua bài hát (Tonearm Scrubbing)
  const handleSeekFromTurntable = (progress) => {
    if (audioRef.current && duration) {
      handleSeek(progress * duration);
    }
  };

  // Toggle Play / Pause với âm học công tắc gạt kim loại nặng ASMR
  const togglePlay = () => {
    playHeavyMetalSwitch();
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

  // 1. Cơ chế Auto-Hide UI sau 3 giây không tương tác (3-Second Activity Timer)
  useEffect(() => {
    let timerId = null;

    const resetTimer = () => {
      setIsUiVisible(true);
      if (timerId) clearTimeout(timerId);

      // Nếu có bất kỳ modal, drawer nào đang mở hoặc đang kéo thả tệp, giữ UI hiển thị
      if (
        isCratesDrawerOpen ||
        isMixerOpen ||
        isPomodoroOpen ||
        isTodoOpen ||
        isExportModalOpen ||
        isShortcutModalOpen ||
        isDragging
      ) {
        return;
      }

      timerId = setTimeout(() => {
        setIsUiVisible(false);
      }, 3000);
    };

    resetTimer();

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [
    isCratesDrawerOpen,
    isMixerOpen,
    isPomodoroOpen,
    isTodoOpen,
    isExportModalOpen,
    isShortcutModalOpen,
    isDragging
  ]);

  // 2. Lắng nghe phím tắt toàn cục chuẩn lofi.cafe (Keyboard-First Navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bảo vệ nghiêm ngặt: Bỏ qua phím tắt nếu đang gõ trong input, textarea hoặc contentEditable
      if (
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName?.toUpperCase()) ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        triggerActionFeedback(isPlaying ? '[❚❚ PAUSE]' : '[► PLAY]');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) {
          const newTime = Math.max(0, currentTime - 5);
          handleSeek(newTime);
          triggerActionFeedback('[◄◄ -5s]');
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current && duration) {
          const newTime = Math.min(duration, currentTime + 5);
          handleSeek(newTime);
          triggerActionFeedback('[►► +5s]');
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
        setVolume(newVol);
        if (audioRef.current) audioRef.current.volume = newVol;
        setIsMuted(false);
        setVinylMuted(false);
        triggerActionFeedback(`[VOL: ${Math.round(newVol * 100)}%]`);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
        setVolume(newVol);
        if (audioRef.current) audioRef.current.volume = newVol;
        if (newVol === 0) {
          setIsMuted(true);
          setVinylMuted(true);
        }
        triggerActionFeedback(`[VOL: ${Math.round(newVol * 100)}%]`);
      } else if (e.code === 'KeyG' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleCycleScene();
      } else if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        playHapticClick();
        setIsPomodoroOpen((prev) => {
          const next = !prev;
          triggerActionFeedback(next ? '[POMODORO: ON]' : '[POMODORO: OFF]');
          return next;
        });
      } else if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        triggerActionFeedback(isMuted ? '[UNMUTED]' : '[MUTED]');
      } else if (
        e.code === 'KeyH' ||
        e.key === 'h' ||
        e.key === 'H' ||
        e.key === '?'
      ) {
        e.preventDefault();
        playHapticClick();
        setIsShortcutModalOpen(true);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        playHapticClick();
        setIsZenMode((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        playHapticClick();
        setIsGramophoneModalOpen((prev) => {
          const next = !prev;
          triggerActionFeedback(next ? '[3D GRAMOPHONE: OPEN]' : '[3D GRAMOPHONE: CLOSE]');
          return next;
        });
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        if (isGramophoneModalOpen) {
          setIsGramophoneModalOpen(false);
        } else if (isShortcutModalOpen) {
          setIsShortcutModalOpen(false);
        } else if (isCratesDrawerOpen) {
          setIsCratesDrawerOpen(false);
        } else if (isMixerOpen) {
          setIsMixerOpen(false);
        } else if (isPomodoroOpen) {
          setIsPomodoroOpen(false);
        } else if (isTodoOpen) {
          setIsTodoOpen(false);
        } else if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isZenMode) {
          setIsZenMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isZenMode,
    isCratesDrawerOpen,
    isMixerOpen,
    isPomodoroOpen,
    isTodoOpen,
    isExportModalOpen,
    isShortcutModalOpen,
    currentScene
  ]);

  return (
    <div
      className={`min-h-screen bg-[#0a0c13] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black overflow-x-hidden relative transition-colors duration-1000 ${
        !isUiVisible && !isZenMode ? 'cursor-none' : ''
      }`}
    >
      {/* Thẻ Audio Ẩn Điều Khiển Bằng Mã Nguồn */}
      <audio
        ref={audioRef}
        src={defaultLofiTrack?.streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 188)}
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

      {/* 1. NỀN KHÔNG GIAN NGHỆ THUẬT TOÀN MÀN HÌNH (ATMOSPHERIC BACKGROUND CANVAS) */}
      <AtmosphericBackground currentScene={currentScene} className="!z-0" />

      {/* 2. ON-SCREEN DISPLAY (RETRO CRT HUD OSD) */}
      <RetroCrtOsd
        currentTrack={trackInfo}
        radioStation="AURALOFI RADIO"
        currentTime={currentTime}
        duration={duration}
        actionFeedback={actionFeedback}
        currentScene={currentScene}
        className={`${!isZenMode ? '!top-20' : '!top-4'} transition-opacity duration-700 ease-in-out ${
          isUiVisible ? 'opacity-100' : 'opacity-30'
        }`}
      />

      {/* 3. MODAL HƯỚNG DẪN PHÍM TẮT RETRO CRT */}
      <RetroShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
      />

      {/* 4. TOP NAV: Minimalist Header (Ẩn trong Zen Mode hoặc khi UI tự động ẩn) */}
      {!isZenMode && (
        <header
          className={`relative z-20 w-full h-16 border-b border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between transition-opacity duration-700 ease-in-out ${
            isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Disc3 className={`w-5 h-5 text-slate-950 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                AuraLofi
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase -mt-0.5 font-semibold">
                3D AMBIENT STUDY & FOCUS SPACE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nút Đổi Cảnh Nền Nghệ Thuật */}
            <button
              type="button"
              onClick={handleCycleScene}
              onMouseEnter={playHoverBlip}
              className="anodize-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-amber-400/50 text-xs font-semibold text-amber-200 hover:text-white transition-all cursor-pointer shadow-sm"
              title="Đổi cảnh không gian nghệ thuật (Phím G)"
            >
              <span>{currentScene?.icon || '🌧️'}</span>
              <span className="hidden md:inline font-mono text-[11px]">{currentScene?.nameVi || currentScene?.name || 'Đổi Cảnh'}</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/50 border border-white/20 text-slate-300">G</kbd>
            </button>

            {/* Nút Mở Khay Đĩa Than Trực Tuyến Audius & Nhạc Việt */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsCratesDrawerOpen(true);
              }}
              onMouseEnter={playHoverBlip}
              className="anodize-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-400/40 border border-amber-400/50 hover:border-amber-300 text-xs font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md shadow-amber-500/15"
              title="Mở khay đĩa than tuyển chọn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Khám Phá Đĩa Than</span>
              <span className="sm:hidden">Đĩa Than</span>
            </button>

            {/* Nút Nạp Tệp Âm Thanh Cục Bộ */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                fileInputRef.current?.click();
              }}
              onMouseEnter={playHoverBlip}
              className="anodize-btn hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-amber-300 text-xs text-white transition-all cursor-pointer font-semibold shadow-sm"
              title="Nạp tệp âm thanh từ máy (.mp3, .wav, .flac)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>Nạp Tệp</span>
            </button>

            {/* Nút Xem Mô Hình 3D Máy Hát Cổ Điển STL */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsGramophoneModalOpen(true);
              }}
              onMouseEnter={playHoverBlip}
              className="anodize-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/25 via-amber-400/35 to-amber-600/25 hover:from-amber-600/35 hover:to-amber-400/45 border border-amber-400/50 hover:border-amber-300 text-xs font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md shadow-amber-500/15"
              title="Xem mô hình 3D máy phát đĩa than cổ điển STL (Phím V)"
            >
              <Box className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Máy Hát 3D (STL)</span>
              <span className="sm:hidden">3D STL</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/50 border border-white/20 text-slate-300">V</kbd>
            </button>

            {/* Nút Mở Modal Xuất Video Visualizer */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsExportModalOpen(true);
              }}
              onMouseEnter={playHoverBlip}
              className="anodize-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 via-amber-400/25 to-rose-500/20 hover:from-rose-500/30 hover:to-amber-400/35 border border-amber-400/40 hover:border-amber-300 text-xs font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md shadow-rose-500/10"
              title="Xuất video Visualizer 60 FPS (TikTok/Reels/YouTube)"
            >
              <Film className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Xuất Video 60FPS</span>
              <span className="sm:hidden">Xuất Video</span>
            </button>

            {/* Nút Hướng Dẫn Phím Tắt */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsShortcutModalOpen(true);
              }}
              onMouseEnter={playHoverBlip}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-amber-400/60 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              title="Bảng tra cứu phím tắt (Phím H hoặc ?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-[11px] font-mono text-slate-200 font-semibold shadow-inner">
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isPlaying ? 'led-indicator-active animate-pulse' : 'led-indicator-idle'}`} />
              <span className="tracking-wider">{isPlaying ? '33⅓ RPM' : 'STANDBY'}</span>
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
          className={`fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-black/50 hover:bg-black/80 border border-white/15 hover:border-amber-400/50 text-slate-300 hover:text-white backdrop-blur-md cursor-pointer group transition-opacity duration-700 ease-in-out ${
            isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          title="Thoát chế độ Zen Mode (Phím Esc hoặc F)"
        >
          <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* 5. MAIN CONTAINER: Fullscreen Seamless Turntable Centerpiece */}
      <main
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden select-none"
      >
        <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] relative">
          {/* Mâm Đĩa Than 3D Gỗ Óc Chó & Đồng Thau Tương Tác Vật Lý */}
          <Turntable3D
            isPlaying={isPlaying}
            coverUrl={trackInfo?.coverUrl}
            albumCoverUrl={trackInfo?.coverUrl}
            ambientColors={ambientColors}
            currentTime={currentTime}
            duration={duration}
            isZenMode={isZenMode}
            onScratch={handleScratch}
            onSeek={handleSeekFromTurntable}
          />
        </div>
      </main>

      {/* Lớp Overlay Kéo Thả Tệp Toàn Màn Hình */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md border-2 border-dashed border-amber-400 text-amber-300 font-mono text-base pointer-events-none animate-fadeIn">
          <Upload className="w-12 h-12 mb-3 text-amber-400 animate-bounce" />
          <span className="font-bold tracking-wider">THẢ TỆP ÂM THANH VÀO ĐÂY ĐỂ PHÁT</span>
          <span className="text-xs text-slate-300 mt-1">Hỗ trợ .mp3, .wav, .flac, .ogg</span>
        </div>
      )}

      {/* 6. BOTTOM CONTROL BAR: Master Transport Deck (Ẩn trong Zen Mode hoặc khi UI tự động ẩn) */}
      {!isZenMode && (
        <footer
          className={`relative z-20 w-full h-24 border-t border-white/10 bg-[#0c0e17]/85 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4 select-none transition-opacity duration-700 ease-in-out ${
            isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
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

      {/* 7. FLOATING FOCUS DOCK (AuraLofi Study Space Quick Navigation) */}
      <div
        className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0f121a]/90 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 transition-opacity duration-700 ease-in-out ${
          isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Nút 1: Đổi Cảnh Nền Nghệ Thuật */}
        <button
          type="button"
          onClick={handleCycleScene}
          onMouseEnter={playHoverBlip}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
          title="Đổi cảnh không gian nghệ thuật (Phím G)"
        >
          <span>{currentScene?.icon || '🌧️'}</span>
          <span className="hidden sm:inline">Cảnh [G]</span>
        </button>

        {/* Nút 2: Bộ Trộn Âm Môi Trường */}
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsMixerOpen((prev) => !prev);
          }}
          onMouseEnter={playHoverBlip}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isMixerOpen
              ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Pha trộn tiếng mưa, quán cà phê, lò sưởi, gió đêm"
        >
          <span>🎧</span>
          <span className="hidden sm:inline">Trộn Âm</span>
        </button>

        {/* Nút 3: Đồng Hồ Pomodoro */}
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsPomodoroOpen((prev) => !prev);
          }}
          onMouseEnter={playHoverBlip}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isPomodoroOpen
              ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Đồng hồ tập trung Pomodoro Solfeggio 528Hz (Phím T)"
        >
          <span>🍅</span>
          <span className="hidden sm:inline">Pomodoro [T]</span>
        </button>

        {/* Nút 4: Ghi Chú To-Do */}
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsTodoOpen((prev) => !prev);
          }}
          onMouseEnter={playHoverBlip}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isTodoOpen
              ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Sổ tay mục tiêu học tập và làm việc"
        >
          <span>📝</span>
          <span className="hidden sm:inline">Ghi Chú</span>
        </button>

        {/* Nút 5: Phím Tắt */}
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsShortcutModalOpen(true);
          }}
          onMouseEnter={playHoverBlip}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
          title="Bảng tra cứu phím tắt (Phím H hoặc ?)"
        >
          <span>⌨️</span>
          <span className="hidden sm:inline">[H]</span>
        </button>

        {/* Nút 6: Chế Độ Zen Mode Toàn Màn Hình */}
        <button
          type="button"
          onClick={() => {
            playHapticClick();
            setIsZenMode((prev) => !prev);
          }}
          onMouseEnter={playHoverBlip}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isZenMode
              ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Chế độ Zen Mode toàn màn hình (Phím F)"
        >
          <span>🪟</span>
          <span className="hidden sm:inline">Zen [F]</span>
        </button>
      </div>

      {/* 8. CÁC WIDGET AURALOFI TẬP TRUNG */}
      <AmbientMixerDrawer
        isOpen={isMixerOpen}
        onClose={() => setIsMixerOpen(false)}
      />

      <PomodoroWidget
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
      />

      <MinimalTodoWidget
        isOpen={isTodoOpen}
        onClose={() => setIsTodoOpen(false)}
      />

      <AudiusCratesDrawer
        isOpen={isCratesDrawerOpen}
        onClose={() => setIsCratesDrawerOpen(false)}
        onSelectTrack={playOnlineTrack}
        currentTrackId={currentOnlineTrackId}
      />

      <ExportVideoModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        trackInfo={trackInfo}
        ambientColors={ambientColors}
        audioRef={audioRef}
        isPlaying={isPlaying}
        onStartPlayback={startPlayback}
      />

      {/* 9. MODAL TRÌNH CHIẾU 3D MÁY PHÁT ĐĨA THAN CỔ ĐIỂN STL */}
      <GramophoneViewerModal
        isOpen={isGramophoneModalOpen}
        onClose={() => setIsGramophoneModalOpen(false)}
      />

      {toast && (
        <ToastNotification
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
