import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import DualDropzone from './components/DualDropzone';
import MixingStatus from './components/MixingStatus';
import ThreeAudioVisualizer from './components/ThreeAudioVisualizer';
import LandingPage from './components/LandingPage';
import { useJobPolling } from './hooks/useJobPolling';

export default function App() {
  const [currentJobId, setCurrentJobId] = useState(null);

  // Kích hoạt polling tự động khi currentJobId có giá trị
  const { status, progress, tempo, vocalOffsetMs, result, error, reset } = useJobPolling(currentJobId, {
    intervalMs: 1500,
    onSuccess: (res) => {
      console.log('[App] Tác vụ phối âm hoàn tất:', res);
    },
    onError: (err) => {
      console.error('[App] Tác vụ thất bại:', err);
    }
  });

  const handleJobCreated = (jobId) => {
    setCurrentJobId(jobId);
    // Tự động cuộn đến khu vực tiến trình xử lý
    setTimeout(() => {
      document.getElementById('studio-workspace')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReset = () => {
    setCurrentJobId(null);
    reset();
  };

  const handleOpenStudio = () => {
    document.getElementById('studio-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* 1. Nền Sóng Hạt 3D Three.js */}
      <ThreeAudioVisualizer />

      {/* 2. Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950/80 to-slate-950/90 -z-10 pointer-events-none" />

      {/* 3. Trang Giới Thiệu & Điều Hướng (Landing Page) */}
      <LandingPage onOpenStudio={handleOpenStudio} />

      {/* 4. Không Gian Làm Việc Studio (Workspace Area) */}
      <section
        id="studio-workspace"
        className="w-full max-w-4xl py-16 px-4 sm:px-6 flex flex-col items-center scroll-mt-20"
      >
        <div className="w-full bg-slate-900/70 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/30 text-center">
          {/* Header Icon & Title */}
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
            <Sliders className="w-7 h-7 animate-pulse" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
            Bàn Phối Âm Kỹ Thuật Số (Digital Studio)
          </h2>

          <p className="mt-2 text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
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
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Core Audio Engine: FFmpeg 44.1kHz / 320kbps CBR</span>
            </div>
            <span>Giới hạn tối đa 25MB / tệp</span>
          </div>
        </div>
      </section>

      {/* 5. Chân Trang Toàn Cục (Global Footer) */}
      <footer className="w-full py-8 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 Audio Mashup Studio • Engineered with Node.js, Express, FFmpeg, React 18 & Three.js</p>
      </footer>
    </main>
  );
}
