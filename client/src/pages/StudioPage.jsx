import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sliders, ArrowLeft, Disc3 } from 'lucide-react';
import DualDropzone from '../components/DualDropzone';
import MixingStatus from '../components/MixingStatus';
import ThemeToggle from '../components/ThemeToggle';
import { useJobPolling } from '../hooks/useJobPolling';

/**
 * Trang Phòng Thu Studio Độc Lập (/studio)
 * Môi trường làm việc chuyên dụng, tập trung 100% vào năng suất sản xuất âm nhạc
 */
export default function StudioPage() {
  const [currentJobId, setCurrentJobId] = useState(null);

  // Kích hoạt polling tự động khi currentJobId có giá trị
  const { status, progress, tempo, vocalOffsetMs, result, error, reset } = useJobPolling(currentJobId, {
    intervalMs: 1500,
    onSuccess: (res) => {
      console.log('[Studio] Tác vụ phối âm hoàn tất:', res);
    },
    onError: (err) => {
      console.error('[Studio] Tác vụ thất bại:', err);
    }
  });

  const handleJobCreated = (jobId) => {
    setCurrentJobId(jobId);
  };

  const handleReset = () => {
    setCurrentJobId(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col items-center selection:bg-indigo-500 selection:text-white">
      {/* 1. Nền Ambient Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-200/40 via-slate-50 to-slate-100 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 -z-10 pointer-events-none" />

      {/* 2. Studio Top Bar Chuyên Dụng */}
      <header className="w-full backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Nút Quay Lại Trang Chủ */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trang Chủ</span>
          </Link>

          {/* Tiêu Đề Trung Tâm */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Disc3 className="w-4 h-4 animate-spin" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-slate-100">
              Phòng Thu Mashup (Studio DAW)
            </span>
          </div>

          {/* Điều Khiển Phải: Trạng Thái DSP & Theme Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Ready</span>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 3. Vùng Làm Việc Chính (Studio Workspace) */}
      <main className="w-full max-w-4xl py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center flex-1">
        <div className="w-full bg-white/90 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-indigo-950/40 text-center transition-colors">
          {/* Header Icon & Title */}
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
            <Sliders className="w-7 h-7 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 dark:from-indigo-400 dark:via-purple-300 dark:to-emerald-400 bg-clip-text text-transparent">
            Bàn Phối Âm Kỹ Thuật Số (Digital Studio)
          </h1>

          <p className="mt-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
            Tải lên bản Acappella (Vocal) và Instrumental (Beat), hệ thống sẽ tự động cân bằng biên độ, căn phách và phối âm chuẩn 44.1kHz.
          </p>

          {/* Khối Dropzone hoặc Khối MixingStatus hiển thị tiến độ thời gian thực */}
          <div className="mt-8">
            {!currentJobId ? (
              <DualDropzone onJobCreated={handleJobCreated} />
            ) : (
              <MixingStatus
                status={status}
                progress={progress}
                tempo={tempo}
                vocalOffsetMs={vocalOffsetMs}
                jobId={currentJobId}
                result={result}
                error={error}
                onReset={handleReset}
              />
            )}
          </div>

          {/* Card Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Core Audio Engine: FFmpeg 44.1kHz / 320kbps CBR</span>
            </div>
            <span>Giới hạn tối đa 25MB / tệp</span>
          </div>
        </div>
      </main>

      {/* 4. Footer Nhẹ */}
      <footer className="w-full py-6 border-t border-slate-200 dark:border-slate-900 bg-white/50 dark:bg-slate-950/80 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 Audio Mashup Studio • Engineered with Node.js, Express, FFmpeg, React 18 & Three.js</p>
      </footer>
    </div>
  );
}
