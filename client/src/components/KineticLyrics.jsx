import React, { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { Sparkles, Music, Loader2 } from 'lucide-react';
import { playHapticClick } from '../utils/soundEffects';

/**
 * Component KineticLyrics
 * Trình hiển thị lời bài hát động học phong cách Apple Music / Spotify Lyrics
 * Tự động cuộn mượt bằng GSAP, đổi màu theo bảng màu album và hỗ trợ nhấp để tua nhạc (Click-to-Seek)
 */
export default function KineticLyrics({
  lines = [],
  currentTime = 0,
  onSeek = () => {},
  isLoading = false,
  ambientColors = null,
  isInstrumental = false
}) {
  const containerRef = useRef(null);
  const lineRefs = useRef({});
  const lastActiveIndexRef = useRef(-1);

  // Xác định dòng đang hát dựa trên thời gian thực
  const activeIndex = useMemo(() => {
    if (!lines || lines.length === 0) return -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      // Cho phép độ trễ nhẹ 0.15s để câu hát bừng sáng ăn khớp nhịp ca từ
      if (currentTime >= lines[i].time - 0.15) {
        return i;
      }
    }
    return -1;
  }, [lines, currentTime]);

  // Tự động cuộn mượt mà đưa câu hát đang phát vào trọng tâm khung nhìn
  useEffect(() => {
    if (activeIndex === -1 || activeIndex === lastActiveIndexRef.current) return;
    lastActiveIndexRef.current = activeIndex;

    const container = containerRef.current;
    const activeEl = lineRefs.current[activeIndex];
    if (!container || !activeEl) return;

    const targetTop = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;

    gsap.to(container, {
      scrollTop: Math.max(0, targetTop),
      duration: 0.65,
      ease: 'power2.out'
    });
  }, [activeIndex]);

  // Xử lý nhấp chuột vào câu hát để tua nhạc
  const handleLineClick = (time) => {
    playHapticClick();
    onSeek(time);
  };

  // 1. Trạng thái đang tải lời từ Lrclib
  if (isLoading) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
          ĐANG TÌM LỜI BÀI HÁT ĐỒNG BỘ...
        </p>
        <p className="text-[11px] text-slate-500 font-sans">
          Kết nối với cơ sở dữ liệu lời bài hát quốc tế Lrclib
        </p>
      </div>
    );
  }

  // 2. Trạng thái bản nhạc không lời hoặc không tìm thấy lời (Fallback Ambient Relaxation)
  if (!lines || lines.length === 0 || isInstrumental) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none relative overflow-hidden">
        {/* Hạt bụi ánh sáng trôi nổi thư giãn (Ambient Floating Particles) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-400/40 blur-[1px] absolute top-1/4 left-1/3 animate-ping" />
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400/40 blur-[1px] absolute bottom-1/3 right-1/4 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-amber-300/30 absolute top-2/3 left-1/4 animate-bounce" />
        </div>

        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-amber-400/80 shadow-inner">
          <Music className="w-6 h-6" />
        </div>

        <div className="space-y-1 z-10 max-w-xs">
          <h3 className="text-sm sm:text-base font-semibold text-slate-200">
            {isInstrumental
              ? 'Bản Nhạc Không Lời (Instrumental)'
              : 'Giai Điệu Thuần Khiết Của Đĩa Than'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Tận hưởng âm thanh ấm áp, mộc mạc của mâm đĩa than AuraVinyl với ánh sáng không gian thư thái.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] text-[10px] font-mono text-slate-500">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>AMBIENT VINYL EXPERIENCE</span>
        </div>
      </div>
    );
  }

  const primaryColor = ambientColors?.hexPrimary || '#fde68a';
  const glowColor = ambientColors?.glowColor || 'rgba(251, 191, 36, 0.35)';

  // 3. Khung hiển thị lời bài hát động học đồng bộ
  return (
    <div
      ref={containerRef}
      className="flex-1 w-full overflow-y-auto px-4 py-8 space-y-6 select-none scroll-smooth relative"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 14%, black 86%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 14%, black 86%, transparent)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {/* Khoảng đệm đỉnh */}
      <div className="h-16 pointer-events-none" />

      {lines.map((line, idx) => {
        const isActive = idx === activeIndex;
        const distance = Math.abs(idx - activeIndex);

        // Tính toán độ mờ theo khoảng cách tới dòng đang hát
        let opacityClass = 'opacity-20 text-slate-500 hover:opacity-75';
        let sizeClass = 'text-sm sm:text-base font-medium';

        if (isActive) {
          opacityClass = 'opacity-100 font-bold';
          sizeClass = 'text-lg sm:text-2xl';
        } else if (distance === 1) {
          opacityClass = 'opacity-50 text-slate-300 hover:opacity-85';
          sizeClass = 'text-sm sm:text-lg font-semibold';
        } else if (distance === 2) {
          opacityClass = 'opacity-30 text-slate-400 hover:opacity-75';
        }

        return (
          <div
            key={line.id}
            ref={(el) => (lineRefs.current[idx] = el)}
            onClick={() => handleLineClick(line.time)}
            className={`transition-all duration-300 cursor-pointer text-center px-4 py-2 rounded-2xl group flex flex-col items-center justify-center relative ${opacityClass}`}
          >
            <p
              className={`leading-relaxed transition-all duration-300 ${sizeClass}`}
              style={
                isActive
                  ? {
                      color: primaryColor,
                      textShadow: `0 0 24px ${glowColor}, 0 0 45px ${glowColor}`
                    }
                  : undefined
              }
            >
              {line.text}
            </p>

            {/* Dấu chấm phát sáng nhỏ dưới dòng đang hát */}
            {isActive && (
              <span
                className="w-1.5 h-1.5 rounded-full mt-2 animate-pulse"
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </div>
        );
      })}

      {/* Khoảng đệm đáy */}
      <div className="h-24 pointer-events-none" />
    </div>
  );
}
