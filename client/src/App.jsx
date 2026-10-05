import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import DualDropzone from './components/DualDropzone';
import MixingStatus from './components/MixingStatus';
import { useJobPolling } from './hooks/useJobPolling';

export default function App() {
  const [currentJobId, setCurrentJobId] = useState(null);

  // Kích hoạt polling tự động khi currentJobId có giá trị
  const { status, progress, tempo, result, error, reset } = useJobPolling(currentJobId, {
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
  };

  const handleReset = () => {
    setCurrentJobId(null);
    reset();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 -z-10" />

      <div className="w-full max-w-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/20 text-center">
        {/* Header Icon & Title */}
        <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
          <Sliders className="w-7 h-7 animate-pulse" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
          Audio Mashup Studio
        </h1>

        <p className="mt-2 text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Tải lên bản Acappella (Vocal) và Instrumental (Beat), hệ thống sẽ tự động cân bằng biên độ và phối âm chuẩn 44.1kHz.
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
              jobId={currentJobId}
              result={result}
              error={error}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Core Audio Engine: FFmpeg 44.1kHz / 320kbps CBR</span>
          </div>
          <span>Giới hạn tối đa 25MB / tệp</span>
        </div>
      </div>
    </main>
  );
}
