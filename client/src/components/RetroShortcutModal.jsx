import React, { useEffect } from 'react';
import { X, Terminal } from 'lucide-react';

/**
 * RetroShortcutModal — Bảng tra cứu phím tắt chuẩn lofi.cafe phong cách Retro CRT Terminal
 * Hiển thị toàn bộ các phím tắt điều khiển nhanh và tự động đóng khi bấm phím Escape hoặc click ngoài backdrop.
 */
export default function RetroShortcutModal({ isOpen, onClose }) {
  // Lắng nghe phím Escape để đóng modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      keys: ['Space'],
      label: 'Play / Pause',
      desc: 'Phát hoặc tạm dừng bài hát đang phát'
    },
    {
      keys: ['←', '→'],
      label: 'Lùi / Tiến bài hát (5s)',
      desc: 'Tua lùi 5 giây hoặc tua tiến 5 giây'
    },
    {
      keys: ['↑', '↓'],
      label: 'Tăng / Giảm âm lượng (5%)',
      desc: 'Điều chỉnh âm lượng to hơn hoặc nhỏ hơn'
    },
    {
      keys: ['G'],
      label: 'Đổi cảnh không gian Lofi (Change Scene)',
      desc: 'Chuyển đổi qua lại giữa 4 không gian nghệ thuật'
    },
    {
      keys: ['T'],
      label: 'Bật / Tắt Pomodoro Focus Timer',
      desc: 'Mở bộ đếm thời gian tập trung Solfeggio 528Hz'
    },
    {
      keys: ['M'],
      label: 'Tắt / Bật tiếng (Mute / Unmute)',
      desc: 'Ngắt âm thanh hoặc mở lại âm thanh nhanh'
    },
    {
      keys: ['V'],
      label: 'Mở Trình Chiếu Máy Hát 3D (STL)',
      desc: 'Chiêm ngưỡng mô hình 3D máy phát đĩa than cổ điển thùng bát giác 360°'
    },
    {
      keys: ['H', '?'],
      label: 'Mở bảng trợ giúp này',
      desc: 'Bật bảng tra cứu phím tắt retro CRT'
    },
    {
      keys: ['Esc'],
      label: 'Đóng cửa sổ / Thoát',
      desc: 'Đóng modal phím tắt hoặc các bảng điều khiển đang mở'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Thân hộp thoại phong cách Retro CRT Terminal */}
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-amber-500/40 bg-[#0c0d12]/95 p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.2)] font-mono text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lớp quét dòng CRT Scanline phủ toàn bộ màn hình terminal */}
        <div className="absolute inset-0 scanline-overlay opacity-25 pointer-events-none" />

        {/* Thanh tiêu đề Terminal Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Terminal className="w-5 h-5 animate-pulse" />
            <h2 id="modal-title" className="text-sm sm:text-base font-bold tracking-wider">
              AURALOFI TERMINAL // SHORTCUT MANUAL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="group flex items-center gap-1.5 px-2 py-1 rounded border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-amber-400/80 hover:text-amber-300 text-xs transition-colors"
            title="Đóng bảng phím tắt (Esc)"
          >
            <span className="text-[10px] hidden sm:inline">[ESC]</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Danh sách các phím tắt */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-amber-500/15 hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                {item.keys.map((k, kIdx) => (
                  <React.Fragment key={kIdx}>
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded border border-amber-400/50 bg-amber-500/10 text-amber-300 text-xs font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                      {k}
                    </kbd>
                    {kIdx < item.keys.length - 1 && (
                      <span className="text-amber-500/60 text-xs">hoặc</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="text-right ml-3">
                <div className="text-xs font-semibold text-emerald-300 tracking-wide">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thông tin mẹo Auto-hide UI & Nút đóng */}
        <div className="mt-4 pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-amber-400/80">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Tự động ẩn UI sau 3 giây chuột đứng yên để tối đa tập trung.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded border border-amber-400/60 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-xs tracking-wider transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
          >
            ĐÃ HIỂU [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}
