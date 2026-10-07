import React, { useState, useEffect } from 'react';

/**
 * RetroCrtOsd — Màn hình hiển thị On-Screen Display phong cách Retro CRT Monospace
 * Hiển thị telemetry ở góc màn hình: Đài phát, tên bài hát, nghệ sĩ, thời gian và cảnh nền.
 * Tích hợp Transient Action Feedback banner (chớp sáng 1.5 giây) khi người dùng thao tác phím tắt.
 */
export default function RetroCrtOsd({
  currentTrack,
  radioStation = 'AURALOFI RADIO',
  currentTime = 0,
  duration = 0,
  actionFeedback,
  currentScene,
  className = ''
}) {
  // Trạng thái banner phản hồi phím tắt chớp sáng 1.5 giây
  const [visibleBanner, setVisibleBanner] = useState(null);

  useEffect(() => {
    if (!actionFeedback) return;

    const bannerText =
      typeof actionFeedback === 'object' && actionFeedback !== null
        ? actionFeedback.text
        : actionFeedback;

    if (!bannerText) return;

    setVisibleBanner(bannerText);

    const timer = setTimeout(() => {
      setVisibleBanner(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [actionFeedback]);

  // Định dạng thời gian mm:ss
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const trackTitle = currentTrack?.title || 'Diễm Xưa (Lofi Instrumental)';
  const trackArtist = currentTrack?.artist || 'Aura Chillhop Ensemble';

  // Lấy tên cảnh hiển thị
  const sceneDisplay = currentScene
    ? (currentScene.nameVi || currentScene.name || String(currentScene)).toUpperCase()
    : 'RAINY WINDOW';

  return (
    <aside
      className={`fixed top-4 left-4 z-30 pointer-events-none select-none font-mono ${className}`}
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-black/70 backdrop-blur-md px-3.5 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.12)] text-xs text-emerald-400 min-w-[220px] max-w-xs sm:max-w-sm">
        {/* Lớp tia quét scanline CRT phủ trên OSD */}
        <div className="absolute inset-0 scanline-overlay opacity-30 pointer-events-none" />

        {/* Dòng tiêu đề đài phát thanh & đèn trạng thái tín hiệu */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-1.5 text-[10px] tracking-wider text-emerald-300/80">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-semibold">{radioStation}</span>
          </div>
          <span className="text-amber-400/90 text-[9px] font-bold tracking-widest">[33⅓ RPM]</span>
        </div>

        {/* Thông tin bài hát & Nghệ sĩ */}
        <div className="space-y-0.5">
          <div className="truncate font-semibold text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
            <span className="text-emerald-500/70 mr-1.5">TRACK:</span>
            {trackTitle}
          </div>
          <div className="truncate text-[11px] text-emerald-400/80">
            <span className="text-emerald-500/70 mr-1.5">ARTIST:</span>
            {trackArtist}
          </div>
        </div>

        {/* Telemetry thời gian & Cảnh không gian hiện tại */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400/75 border-t border-emerald-500/15 pt-1.5">
          <div>
            <span className="text-emerald-500/70 mr-1">TIME:</span>
            <span className="text-emerald-300 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="truncate max-w-[130px] text-right">
            <span className="text-emerald-500/70 mr-1">SCENE:</span>
            <span className="text-amber-300/90 font-medium">{sceneDisplay}</span>
          </div>
        </div>

        {/* Banner phản hồi phím tắt chớp sáng 1.5s (Transient Action Feedback) */}
        {visibleBanner && (
          <div className="mt-2 py-1 px-2 rounded bg-emerald-500/20 border border-emerald-400/70 text-emerald-200 font-bold tracking-widest text-center text-[11px] shadow-[0_0_12px_rgba(52,211,153,0.5)] animate-pulse">
            {visibleBanner}
          </div>
        )}
      </div>
    </aside>
  );
}
