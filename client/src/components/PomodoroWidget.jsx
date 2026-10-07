import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  X,
  Minimize2,
  Maximize2,
  Bell
} from 'lucide-react';
import { playHapticClick, playHoverBlip, playZenBellChime } from '../utils/soundEffects';

const FOCUS_TIME = 25 * 60; // 25 phút
const BREAK_TIME = 5 * 60;  // 5 phút

/**
 * Đồng Hồ Pomodoro Tập Trung (Pomodoro Focus Timer)
 * Hỗ trợ chu kỳ 25 phút tập trung / 5 phút nghỉ ngơi, tự động phát chuông Zen Bell Chime khi hết giờ.
 */
export default function PomodoroWidget({ isOpen = false, onClose }) {
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const timerRef = useRef(null);

  // Đếm ngược từng giây
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Hết giờ!
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, mode]);

  // Xử lý khi hết giờ
  const handleTimerComplete = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    playZenBellChime();

    // Tự động chuyển mode
    if (mode === 'focus') {
      setMode('break');
      setTimeLeft(BREAK_TIME);
    } else {
      setMode('focus');
      setTimeLeft(FOCUS_TIME);
    }
  };

  // Cập nhật title trình duyệt để dễ quan sát từ tab khác
  useEffect(() => {
    if (!isOpen) return;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const icon = mode === 'focus' ? '🍅' : '☕';

    if (isRunning) {
      document.title = `(${timeStr}) ${icon} AuraLofi Focus`;
    } else {
      document.title = 'AuraLofi — 3D Ambient Study Space';
    }

    return () => {
      document.title = 'AuraLofi — 3D Ambient Study Space';
    };
  }, [timeLeft, isRunning, mode, isOpen]);

  if (!isOpen) return null;

  const toggleRun = () => {
    playHapticClick();
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    playHapticClick();
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  };

  const handleSwitchMode = (targetMode) => {
    if (targetMode === mode) return;
    playHapticClick();
    setIsRunning(false);
    setMode(targetMode);
    setTimeLeft(targetMode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const total = mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
  const progressPercent = ((total - timeLeft) / total) * 100;

  // Giao diện khi Thu nhỏ (Minimized Floating Pill)
  if (isMinimized) {
    return (
      <div className="fixed top-20 right-6 z-40 bg-[#11131c]/90 border border-white/20 backdrop-blur-xl px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-white select-none animate-fade-in">
        <span className="text-sm">{mode === 'focus' ? '🍅' : '☕'}</span>
        <span className="font-mono font-bold text-sm tracking-wider text-amber-300">
          {formattedTime}
        </span>
        <button
          type="button"
          onClick={toggleRun}
          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Mở rộng"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-40 w-72 sm:w-80 bg-[#11131c]/95 border border-white/15 backdrop-blur-2xl p-5 rounded-3xl shadow-2xl text-slate-100 select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <h4 className="text-xs font-bold text-white tracking-wider uppercase">
            Đồng Hồ Pomodoro
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Thu nhỏ"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Chuyển Mode */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08]">
        <button
          type="button"
          onClick={() => handleSwitchMode('focus')}
          className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'focus'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Tập Trung (25m)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('break')}
          className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mode === 'break'
              ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Nghỉ Ngơi (5m)</span>
        </button>
      </div>

      {/* Mặt đồng hồ số */}
      <div className="my-6 text-center">
        <div className="font-mono text-5xl font-black tracking-wider text-white tabular-nums drop-shadow-md">
          {formattedTime}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          {mode === 'focus' ? 'Duy trì nhịp làm việc sâu' : 'Uống nước và thư giãn đôi mắt'}
        </p>

        {/* Thanh tiến trình vi mô */}
        <div className="w-full h-1.5 bg-black/50 rounded-full mt-4 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 ${
              mode === 'focus' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cụm nút điều khiển */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleRun}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
            isRunning
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>Tạm Dừng</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Bắt Đầu</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
          title="Đặt lại thời gian"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
