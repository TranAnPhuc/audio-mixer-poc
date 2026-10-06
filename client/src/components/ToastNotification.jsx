import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Component ToastNotification
 * Thông báo Glassmorphism sang trọng, không chặn thao tác giao diện người dùng
 */
export default function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 4500;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const { message, type = 'info', actions = [] } = toast;

  // Cấu hình màu sắc & icon theo loại thông báo
  const config = {
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      borderColor: 'border-amber-400/30',
      glowColor: 'shadow-amber-500/10'
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      borderColor: 'border-emerald-400/30',
      glowColor: 'shadow-emerald-500/10'
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      borderColor: 'border-rose-400/30',
      glowColor: 'shadow-rose-500/10'
    },
    info: {
      icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
      borderColor: 'border-sky-400/30',
      glowColor: 'shadow-sky-500/10'
    }
  }[type] || {
    icon: <Info className="w-4 h-4 text-slate-300 shrink-0" />,
    borderColor: 'border-white/10',
    glowColor: 'shadow-black/40'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md animate-fade-in select-none pointer-events-auto">
      <div
        className={`bg-[#121318]/92 backdrop-blur-2xl border ${config.borderColor} rounded-2xl p-4 shadow-2xl ${config.glowColor} flex flex-col gap-2.5 transition-all`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <p className="flex-1 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Cụm Action Buttons cứu cánh (ví dụ: [📝 Dán Lời], [📂 Nạp .LRC]) */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06] pl-7">
            {actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onClose();
                  if (act.onClick) act.onClick();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-amber-400/20 text-slate-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
