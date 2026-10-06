import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Mic,
  Disc3,
  Clock,
  Loader2,
  SlidersHorizontal,
  MoveHorizontal,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

/**
 * Định dạng số giây sang phút:giây (mm:ss)
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Định dạng số giây trên Thước đo thời gian (Ruler Ticks)
 */
function formatRulerTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  if (mins === 0) return `${secs}s`;
  return `${mins}m${secs.padStart(2, '0')}s`;
}

/**
 * Helper đặt vị trí phát an toàn trên WaveSurfer
 */
function setWsTime(ws, timeSec) {
  if (!ws) return;
  const dur = ws.getDuration();
  if (dur > 0) {
    const clamped = Math.max(0, Math.min(dur, timeSec));
    if (typeof ws.setTime === 'function') {
      ws.setTime(clamped);
    } else if (typeof ws.seekTo === 'function') {
      ws.seekTo(clamped / dur);
    }
  }
}

/**
 * Component Thước đo thời gian (Time Ruler) dạng SVG sắc nét kèm khả năng Seek tương tác
 */
function TimeRuler({ duration, containerWidth, onSeek }) {
  const ticks = useMemo(() => {
    if (!duration || duration <= 0 || !containerWidth || containerWidth <= 0) return [];

    const pixelsPerSecond = containerWidth / duration;
    // Tính toán khoảng cách tối thiểu giữa các vạch để tránh đè chữ
    const targetTickPixels = 60;
    const approxSec = targetTickPixels / pixelsPerSecond;

    const niceSteps = [0.5, 1, 2, 5, 10, 15, 30, 60];
    const step = niceSteps.find((s) => s >= approxSec) || 60;
    const subStep = step / 2;

    const list = [];
    const maxT = Math.ceil(duration);

    for (let t = 0; t <= maxT; t += subStep) {
      const isMajor = Math.abs(t % step) < 0.001 || Math.abs((t % step) - step) < 0.001;
      const x = (t / duration) * containerWidth;
      if (x <= containerWidth) {
        list.push({
          time: t,
          x,
          isMajor
        });
      }
    }
    return list;
  }, [duration, containerWidth]);

  const handleClick = (e) => {
    if (!duration || duration <= 0 || !containerWidth || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(containerWidth, e.clientX - rect.left));
    const seekSec = (clickX / containerWidth) * duration;
    onSeek(seekSec);
  };

  return (
    <div
      onClick={handleClick}
      className="relative w-full h-6 bg-slate-950/90 border-b border-slate-800/80 overflow-hidden select-none cursor-pointer hover:bg-slate-900/90 transition-colors"
      title="Nhấp vào thước để tua (seek) đến mốc thời gian này"
    >
      <svg className="w-full h-full block" width={containerWidth || '100%'} height="24">
        {ticks.map((tick, idx) => (
          <g key={idx}>
            {tick.isMajor ? (
              <>
                <line
                  x1={tick.x}
                  y1={12}
                  x2={tick.x}
                  y2={24}
                  stroke="#64748b"
                  strokeWidth="1"
                />
                <text
                  x={tick.x + 4}
                  y={10}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                >
                  {formatRulerTime(tick.time)}
                </text>
              </>
            ) : (
              <line
                x1={tick.x}
                y1={17}
                x2={tick.x}
                y2={24}
                stroke="#334155"
                strokeWidth="1"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Component Bàn Phối Sóng Âm Đa Tầng (DualWaveformTimeline)
 * Trực quan hóa 2 luồng âm thanh xếp chồng kèm Drag-to-Offset Engine & Zero-Latency Audio Preview
 */
export default function DualWaveformTimeline({
  trackAFile,
  trackBFile,
  vocalOffsetMs = 0,
  onOffsetChange,
  disabled = false
}) {
  const containerRef = useRef(null);
  const containerARef = useRef(null);
  const containerBRef = useRef(null);

  const wavesurferARef = useRef(null);
  const wavesurferBRef = useRef(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [trackDurations, setTrackDurations] = useState({ durA: 0, durB: 0 });
  const [isDecoding, setIsDecoding] = useState(true);

  // States phục vụ tương tác Kéo Trượt (Drag-to-Offset)
  const [isDragging, setIsDragging] = useState(false);
  const [dragClientX, setDragClientX] = useState(0);
  const dragStartRef = useRef({ startX: 0, startOffsetMs: 0 });

  // States & Refs phục vụ phát nhạc nghe thử (Audio Preview Engine)
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const playbackTimeRef = useRef(0);
  const delayTimerRef = useRef(null);

  // Tính toán tổng thời lượng timeline (kèm độ lệch phách của Vocal)
  const maxDuration = useMemo(() => {
    const { durA, durB } = trackDurations;
    if (!durA && !durB) return 0;
    const offsetSec = vocalOffsetMs > 0 ? vocalOffsetMs / 1000 : 0;
    return Math.max(durB, durA + offsetSec, 1);
  }, [trackDurations, vocalOffsetMs]);

  // Theo dõi chiều rộng container để render thước đo và Playhead chính xác
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Khởi tạo và quản lý 2 instance WaveSurfer với cơ chế cô lập bộ nhớ nghiêm ngặt
  useEffect(() => {
    if (!trackAFile || !trackBFile) return;

    setIsDecoding(true);
    setTrackDurations({ durA: 0, durB: 0 });

    // Dừng phát nếu đang chạy bản preview cũ
    if (isPlayingRef.current) {
      if (wavesurferARef.current) wavesurferARef.current.pause();
      if (wavesurferBRef.current) wavesurferBRef.current.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setPlaybackTime(0);
      playbackTimeRef.current = 0;
    }

    // 1. Khởi tạo Blob Object URLs
    const urlA = URL.createObjectURL(trackAFile);
    const urlB = URL.createObjectURL(trackBFile);

    let wsA = null;
    let wsB = null;

    try {
      // 2. Khởi tạo instance WaveSurfer Track A (Vocal - Indigo Tone)
      wsA = WaveSurfer.create({
        container: containerARef.current,
        url: urlA,
        waveColor: '#4f46e5',      // Indigo 600
        progressColor: '#818cf8',  // Indigo 400
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 70,
        normalize: true,
        interact: false,
        cursorWidth: 0
      });

      // 3. Khởi tạo instance WaveSurfer Track B (Beat - Emerald Tone)
      wsB = WaveSurfer.create({
        container: containerBRef.current,
        url: urlB,
        waveColor: '#059669',      // Emerald 600
        progressColor: '#34d399',  // Emerald 400
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 70,
        normalize: true,
        interact: false,
        cursorWidth: 0
      });

      wavesurferARef.current = wsA;
      wavesurferBRef.current = wsB;

      let aLoaded = false;
      let bLoaded = false;

      const checkBothReady = () => {
        if (aLoaded && bLoaded) {
          setIsDecoding(false);
        }
      };

      wsA.on('ready', () => {
        const d = wsA.getDuration();
        setTrackDurations((prev) => ({ ...prev, durA: d }));
        aLoaded = true;
        checkBothReady();
      });

      wsB.on('ready', () => {
        const d = wsB.getDuration();
        setTrackDurations((prev) => ({ ...prev, durB: d }));
        bLoaded = true;
        checkBothReady();
      });

      wsA.on('error', (err) => {
        console.warn('[DualWaveformTimeline] Lỗi giải mã Track A:', err);
      });

      wsB.on('error', (err) => {
        console.warn('[DualWaveformTimeline] Lỗi giải mã Track B:', err);
      });
    } catch (error) {
      console.error('[DualWaveformTimeline] Khởi tạo WaveSurfer thất bại:', error);
      setIsDecoding(false);
    }

    // 4. Cleanup Function: Dừng âm thanh, hủy Canvas, hủy timer và thu hồi Blob URL
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      try {
        if (wsA) {
          wsA.destroy();
          wavesurferARef.current = null;
        }
      } catch (err) {
        console.warn('[DualWaveformTimeline] Lỗi hủy wsA:', err);
      }

      try {
        if (wsB) {
          wsB.destroy();
          wavesurferBRef.current = null;
        }
      } catch (err) {
        console.warn('[DualWaveformTimeline] Lỗi hủy wsB:', err);
      }

      URL.revokeObjectURL(urlA);
      URL.revokeObjectURL(urlB);
    };
  }, [trackAFile, trackBFile]);

  // Dừng phát và dọn dẹp khi bị vô hiệu hóa hoặc unmount
  useEffect(() => {
    if (disabled && isPlayingRef.current) {
      handleStop();
    }
  }, [disabled]);

  // ==========================================
  // AUDIO SCHEDULING & PLAYBACK CONTROLS
  // ==========================================

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    const wsA = wavesurferARef.current;
    const wsB = wavesurferBRef.current;
    if (wsA) {
      wsA.pause();
      setWsTime(wsA, 0);
    }
    if (wsB) {
      wsB.pause();
      setWsTime(wsB, 0);
    }

    setPlaybackTime(0);
    playbackTimeRef.current = 0;
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    if (wavesurferARef.current) wavesurferARef.current.pause();
    if (wavesurferBRef.current) wavesurferBRef.current.pause();
  }, []);

  const handlePlay = useCallback(() => {
    const wsA = wavesurferARef.current;
    const wsB = wavesurferBRef.current;
    if (!wsA || !wsB || !maxDuration || isDecoding) return;

    let startT = playbackTimeRef.current;
    if (startT >= maxDuration - 0.1) {
      startT = 0;
      setPlaybackTime(0);
      playbackTimeRef.current = 0;
    }

    setIsPlaying(true);
    isPlayingRef.current = true;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    const durA = wsA.getDuration();
    const durB = wsB.getDuration();
    const offsetSec = vocalOffsetMs / 1000;
    const tA = startT - offsetSec;

    // 1. Beat (Track B - Anchor Master Clock): Phát ngay từ startT
    if (startT < durB) {
      setWsTime(wsB, startT);
      wsB.play();
    } else {
      wsB.pause();
    }

    // 2. Vocal (Track A - Shifted Track):
    if (tA >= 0) {
      if (tA < durA) {
        setWsTime(wsA, tA);
        wsA.play();
      } else {
        wsA.pause();
      }
    } else {
      // tA < 0: Vocal sẽ vào trễ sau |tA| giây
      setWsTime(wsA, 0);
      wsA.pause();
      const delayMs = Math.abs(tA) * 1000;
      delayTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current && wavesurferARef.current) {
          setWsTime(wavesurferARef.current, 0);
          wavesurferARef.current.play();
        }
      }, delayMs);
    }
  }, [maxDuration, isDecoding, vocalOffsetMs]);

  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  // Tua kim đọc (Seek) tới mốc thời gian cụ thể
  const seekTo = useCallback(
    (seekSec) => {
      if (!maxDuration || maxDuration <= 0) return;
      const clampedSec = Math.max(0, Math.min(maxDuration, seekSec));

      setPlaybackTime(clampedSec);
      playbackTimeRef.current = clampedSec;

      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      const wsA = wavesurferARef.current;
      const wsB = wavesurferBRef.current;
      if (!wsA || !wsB) return;

      const durA = wsA.getDuration();
      const durB = wsB.getDuration();
      const offsetSec = vocalOffsetMs / 1000;
      const tA = clampedSec - offsetSec;

      if (isPlayingRef.current) {
        // Đồng bộ tua khi đang phát
        if (clampedSec < durB) {
          setWsTime(wsB, clampedSec);
          wsB.play();
        } else {
          wsB.pause();
        }

        if (tA >= 0) {
          if (tA < durA) {
            setWsTime(wsA, tA);
            wsA.play();
          } else {
            wsA.pause();
          }
        } else {
          setWsTime(wsA, 0);
          wsA.pause();
          const delayMs = Math.abs(tA) * 1000;
          delayTimerRef.current = setTimeout(() => {
            if (isPlayingRef.current && wavesurferARef.current) {
              setWsTime(wavesurferARef.current, 0);
              wavesurferARef.current.play();
            }
          }, delayMs);
        }
      } else {
        // Tua khi đang tạm dừng
        setWsTime(wsB, clampedSec);
        if (tA >= 0 && tA < durA) {
          setWsTime(wsA, tA);
        } else {
          setWsTime(wsA, 0);
        }
      }
    },
    [maxDuration, vocalOffsetMs]
  );

  // Tự động căn chỉnh luồng âm thanh thời gian thực nếu vocalOffsetMs thay đổi khi đang phát
  useEffect(() => {
    if (!isPlayingRef.current) return;
    const wsA = wavesurferARef.current;
    if (!wsA) return;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    const currentT = playbackTimeRef.current;
    const offsetSec = vocalOffsetMs / 1000;
    const tA = currentT - offsetSec;
    const durA = wsA.getDuration();

    if (tA >= 0) {
      if (tA < durA) {
        setWsTime(wsA, tA);
        wsA.play();
      } else {
        wsA.pause();
      }
    } else {
      setWsTime(wsA, 0);
      wsA.pause();
      const delayMs = Math.abs(tA) * 1000;
      delayTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current && wavesurferARef.current) {
          setWsTime(wavesurferARef.current, 0);
          wavesurferARef.current.play();
        }
      }, delayMs);
    }
  }, [vocalOffsetMs]);

  // Vòng lặp Animation Frame cập nhật kim đọc Playhead thời gian thực ở 60 FPS
  useEffect(() => {
    if (!isPlaying) return;

    let animId;
    let lastTimestamp = performance.now();

    const updatePlayhead = (now) => {
      const wsB = wavesurferBRef.current;
      const wsA = wavesurferARef.current;

      let currentT = playbackTimeRef.current;
      if (wsB && wsB.isPlaying()) {
        currentT = wsB.getCurrentTime();
      } else if (wsA && wsA.isPlaying()) {
        currentT = wsA.getCurrentTime() + (vocalOffsetMs / 1000);
      } else {
        const dt = (now - lastTimestamp) / 1000;
        currentT += dt;
      }
      lastTimestamp = now;

      if (currentT >= maxDuration) {
        handleStop();
        return;
      }

      setPlaybackTime(currentT);
      playbackTimeRef.current = currentT;
      animId = requestAnimationFrame(updatePlayhead);
    };

    animId = requestAnimationFrame(updatePlayhead);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, maxDuration, vocalOffsetMs, handleStop]);

  // ==========================================
  // DRAG-TO-OFFSET ENGINE (POINTER EVENTS)
  // ==========================================

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!maxDuration || maxDuration <= 0 || isDecoding || disabled) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('[DualWaveformTimeline] setPointerCapture warning:', err);
    }

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startOffsetMs: vocalOffsetMs
    };
    setDragClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !maxDuration || maxDuration <= 0 || !containerWidth || containerWidth <= 0) return;

    e.preventDefault();
    setDragClientX(e.clientX);

    const deltaX = e.clientX - dragStartRef.current.startX;
    const pixelsPerSecond = containerWidth / maxDuration;
    if (pixelsPerSecond <= 0) return;

    // 1. Quy đổi delta pixel sang delta milliseconds
    const deltaMs = (deltaX / pixelsPerSecond) * 1000;
    const rawOffset = dragStartRef.current.startOffsetMs + deltaMs;

    // 2. Làm tròn theo bước 50ms
    const steppedOffset = Math.round(rawOffset / 50) * 50;

    // 3. Giới hạn trong khoảng an toàn [-3000ms, +3000ms]
    const clampedOffset = Math.max(-3000, Math.min(3000, steppedOffset));

    if (clampedOffset !== vocalOffsetMs) {
      onOffsetChange?.(clampedOffset);
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
  };

  const handlePointerCancel = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
  };

  // Tính toán vị trí pixel của Track A Vocal offset
  const vocalPixelShift = useMemo(() => {
    if (!maxDuration || maxDuration <= 0 || !containerWidth || containerWidth <= 0) return 0;
    const pixelsPerSecond = containerWidth / maxDuration;
    return (vocalOffsetMs / 1000) * pixelsPerSecond;
  }, [vocalOffsetMs, maxDuration, containerWidth]);

  // Tính toán vị trí pixel của vạch kim đọc Playhead
  const playheadPixelX = useMemo(() => {
    if (!maxDuration || maxDuration <= 0 || !containerWidth || containerWidth <= 0) return 0;
    const pixelsPerSecond = containerWidth / maxDuration;
    return Math.max(0, Math.min(containerWidth, playbackTime * pixelsPerSecond));
  }, [playbackTime, maxDuration, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
    >
      {/* Tiêu đề & Transport Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200 tracking-wide uppercase text-[11px]">
            Bàn Phối Sóng Âm Đa Tầng (Studio Waveform Studio)
          </span>
        </div>

        {/* Thanh Điều Khiển Phát Nhạc (Transport Controls) */}
        <div className="flex items-center gap-2.5 self-center sm:self-auto">
          {/* Nút Play / Pause Preview */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isDecoding || !maxDuration || disabled}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'
            } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
          >
            {isDecoding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang nạp...</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Tạm Dừng</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Nghe Thử Preview</span>
              </>
            )}
          </button>

          {/* Nút Stop / Về Đầu */}
          <button
            type="button"
            onClick={handleStop}
            disabled={isDecoding || !maxDuration || (playbackTime === 0 && !isPlaying) || disabled}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Dừng và về đầu bài (Stop)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Đồng Hồ Mốc Thời Gian (Time Display) */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1">
            <span className="text-sky-400 font-bold">{formatTime(playbackTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTime(maxDuration)}</span>
          </div>

          {/* Badge Trạng Thái Offset */}
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              vocalOffsetMs > 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : vocalOffsetMs < 0
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {vocalOffsetMs > 0 ? `+${(vocalOffsetMs / 1000).toFixed(2)}s` : vocalOffsetMs < 0 ? `${(vocalOffsetMs / 1000).toFixed(2)}s` : '0.00s'}
          </span>
        </div>
      </div>

      {/* Khung chứa Timeline chung với Vạch Playhead xuyên suốt */}
      <div className="relative w-full overflow-hidden select-none">
        {/* Vạch Kim Đọc Phát Nhạc Thời Gian Thực (Global Playhead Line) */}
        {maxDuration > 0 && containerWidth > 0 && (
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none will-change-transform flex flex-col items-center"
            style={{
              transform: `translateX(${playheadPixelX}px)`,
              left: 0,
              transition: isPlaying ? 'none' : 'transform 0.05s ease-out'
            }}
          >
            {/* Đầu kim tam giác màu xanh ngọc bích */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-sky-400 -mt-0.5" />
            {/* Thân vạch kim đọc xuyên suốt cả 2 track */}
            <div className="w-0.5 h-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
          </div>
        )}

        {/* Thước đo thời gian (Time Ruler) */}
        <TimeRuler
          duration={maxDuration}
          containerWidth={containerWidth}
          onSeek={seekTo}
        />

        {/* Track A: Giọng Hát (Vocal - Indigo Tone) có tương tác Drag-to-Offset */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={`relative border-b transition-colors select-none touch-none p-2 sm:p-3 overflow-hidden ${
            isDragging
              ? 'cursor-grabbing bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/30'
              : 'cursor-grab bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/40'
          }`}
          title="Nhấp giữ chuột và kéo sang trái/phải để dịch chuyển phách Vocal"
        >
          {/* Floating Tooltip bám theo con trỏ khi đang kéo */}
          {isDragging && containerRef.current && (
            <div
              className="absolute top-2 z-40 pointer-events-none transform -translate-x-1/2 bg-indigo-950/95 text-indigo-100 border border-indigo-400 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-xl shadow-indigo-950/80 backdrop-blur-md flex items-center gap-1.5 transition-transform"
              style={{
                left: Math.max(
                  60,
                  Math.min(containerWidth - 60, dragClientX - containerRef.current.getBoundingClientRect().left)
                )
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>
                {vocalOffsetMs > 0
                  ? `+${(vocalOffsetMs / 1000).toFixed(2)}s`
                  : vocalOffsetMs < 0
                  ? `${(vocalOffsetMs / 1000).toFixed(2)}s`
                  : '0.00s'}
              </span>
              <span className="text-[10px] text-indigo-300/80 font-normal">
                {vocalOffsetMs > 0 ? '(Vocal vào trễ)' : vocalOffsetMs < 0 ? '(Vocal vào sớm)' : '(Chuẩn phách)'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                <Mic className="w-3 h-3 text-indigo-400" />
                <span>Track A (Vocal)</span>
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[280px]">
                {trackAFile?.name}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
                <MoveHorizontal className="w-3 h-3 text-slate-400" />
                <span>Kéo chuột để căn nhịp</span>
              </span>
            </div>

            <span className="text-[10px] font-mono text-indigo-400/90 font-medium">
              {vocalOffsetMs !== 0 ? `Dịch chuyển: ${(vocalOffsetMs / 1000).toFixed(2)}s` : 'Vị trí gốc (0.0s)'}
            </span>
          </div>

          {/* Khung chứa sóng âm Track A có CSS TranslateX cập nhật mượt mà 60 FPS */}
          <div className="relative w-full overflow-hidden rounded-lg bg-slate-900/60 p-1 pointer-events-none">
            {/* Đường gióng tâm mốc 0s */}
            <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-indigo-500/50 z-10" />

            <div
              style={{
                transform: `translateX(${vocalPixelShift}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              className="w-full will-change-transform"
            >
              <div ref={containerARef} className="w-full pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Track B: Nhạc Nền (Beat Master - Emerald Tone) */}
        <div className="relative bg-slate-950/60 p-2 sm:p-3 overflow-hidden select-none">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <Disc3 className="w-3 h-3 text-emerald-400" />
                <span>Track B (Beat Master)</span>
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                {trackBFile?.name}
              </span>
            </div>

            <span className="text-[10px] font-mono text-emerald-400/80">
              Trục chuẩn thời gian (Anchor 0.0s)
            </span>
          </div>

          {/* Khung chứa sóng âm Track B */}
          <div className="relative w-full rounded-lg bg-slate-900/60 p-1 pointer-events-none">
            {/* Đường gióng tâm mốc 0s */}
            <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-emerald-500/40 z-10" />
            <div ref={containerBRef} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
