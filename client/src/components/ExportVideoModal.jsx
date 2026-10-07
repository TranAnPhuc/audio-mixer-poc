import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Download,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
  Radio,
  Play,
  RotateCcw,
  Film
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  DURATION_OPTIONS,
  createCompositeCanvasRenderer,
  startCanvasRecording
} from '../utils/videoRecorder';
import {
  createAudioDestinationStream,
  disconnectAudioDestinationStream
} from '../utils/vinylAudioEngine';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

/**
 * Modal Xuất Video Visualizer (Audio-to-Video Studio)
 * Hỗ trợ các nhà sáng tạo nội dung xuất video 60 FPS chuẩn 9:16, 16:9, 1:1
 */
export default function ExportVideoModal({
  isOpen = false,
  onClose,
  trackInfo = {},
  ambientColors = {},
  audioRef,
  isPlaying,
  onStartPlayback
}) {
  const [selectedRatio, setSelectedRatio] = useState('portrait');
  const [selectedDuration, setSelectedDuration] = useState('15');
  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'finished'
  const [progress, setProgress] = useState({ elapsedSeconds: 0, totalSeconds: 15, percent: 0 });
  const [videoResult, setVideoResult] = useState(null); // { url, blob, duration, mimeType }
  const [errorMessage, setErrorMessage] = useState(null);

  const recorderControlRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const audioDestRef = useRef(null);

  // Thu hồi URL video khi đóng hoặc unmount
  useEffect(() => {
    return () => {
      if (videoResult?.url) {
        URL.revokeObjectURL(videoResult.url);
      }
      cancelAnimationFrame(animFrameIdRef.current);
      if (audioDestRef.current) {
        disconnectAudioDestinationStream(audioDestRef.current);
      }
    };
  }, [videoResult]);

  // Reset khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage(null);
      setProgress({ elapsedSeconds: 0, totalSeconds: 15, percent: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý Bắt Đầu Ghi Video
  const handleStartRecording = () => {
    playHapticClick();
    setErrorMessage(null);

    // 1. Tìm các canvas hiện có trong DOM (Turntable3D & AudioTerrain3D)
    const canvases = document.querySelectorAll('canvas');
    if (!canvases || canvases.length === 0) {
      setErrorMessage('Không tìm thấy khung hình 3D Visualizer trên màn hình để thu.');
      return;
    }

    // Giả định: Canvas đầu là Turntable, Canvas thứ 2 là Terrain (hoặc canvas bất kỳ)
    let turntableCanvas = canvases[0];
    let terrainCanvas = canvases[1] || canvases[0];

    // 2. Tạo Composite Canvas theo tỉ lệ đã chọn
    const composite = createCompositeCanvasRenderer({
      turntableCanvas,
      terrainCanvas,
      aspectRatio: selectedRatio,
      trackInfo,
      ambientColors
    });

    // Vòng lặp render composite canvas liên tục 60 FPS
    const loopRender = () => {
      composite.renderFrame();
      animFrameIdRef.current = requestAnimationFrame(loopRender);
    };
    loopRender();

    // 3. Khởi tạo MediaStream Audio Destination từ Web Audio DSP
    const audioDest = createAudioDestinationStream();
    audioDestRef.current = audioDest;

    // 4. Xác định thời lượng
    const durOption = DURATION_OPTIONS.find((d) => d.id === selectedDuration);
    const durationSeconds = durOption?.seconds || (audioRef?.current?.duration ? Math.floor(audioRef.current.duration) : 30);

    // 5. Đảm bảo âm thanh đang phát
    if (audioRef?.current) {
      if (!isPlaying) {
        onStartPlayback?.();
      }
    }

    setStatus('recording');
    setProgress({ elapsedSeconds: 0, totalSeconds: durationSeconds, percent: 0 });

    // 6. Kích hoạt tiện ích ghi hình
    const recorder = startCanvasRecording({
      canvas: composite.canvas,
      audioDestinationNode: audioDest,
      durationSeconds,
      fps: 60,
      onProgress: (p) => {
        setProgress(p);
      },
      onComplete: (res) => {
        cancelAnimationFrame(animFrameIdRef.current);
        if (audioDestRef.current) {
          disconnectAudioDestinationStream(audioDestRef.current);
          audioDestRef.current = null;
        }
        setVideoResult(res);
        setStatus('finished');
      },
      onError: (err) => {
        cancelAnimationFrame(animFrameIdRef.current);
        if (audioDestRef.current) {
          disconnectAudioDestinationStream(audioDestRef.current);
          audioDestRef.current = null;
        }
        setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình ghi video.');
        setStatus('idle');
      }
    });

    recorderControlRef.current = recorder;
  };

  // Hủy hoặc dừng sớm
  const handleStopRecordingEarly = () => {
    playHapticClick();
    if (recorderControlRef.current) {
      recorderControlRef.current.stop();
    }
  };

  // Tải file video về máy
  const handleDownload = () => {
    if (!videoResult?.url) return;
    playHapticClick();

    const ext = videoResult.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const cleanTitle = (trackInfo.title || 'auravinyl-session').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    const fileName = `${cleanTitle}_visualizer_${selectedRatio}.${ext}`;

    const a = document.createElement('a');
    a.href = videoResult.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#131622]/95 border border-white/15 p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col gap-6 text-slate-100 overflow-hidden">
        
        {/* Vầng sáng Ambient viền */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[90px] pointer-events-none opacity-40"
          style={{ backgroundColor: ambientColors?.hexPrimary || '#f59e0b' }}
        />

        {/* 1. Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Xuất Video Visualizer Studio
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                60 FPS Video • Direct Hi-Fi Audio • Multi-Ratio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={status === 'recording'}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Nội dung tùy chọn theo trạng thái */}
        {status === 'idle' && (
          <div className="space-y-6 relative z-10">
            {/* Tùy chọn Tỉ lệ khung hình */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Chọn Tỉ Lệ Khung Hình:</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {Object.values(ASPECT_RATIOS).map((ratio) => {
                  const isSelected = selectedRatio === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        setSelectedRatio(ratio.id);
                      }}
                      onMouseEnter={playHoverBlip}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/15'
                          : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="text-xl mb-1.5">{ratio.icon}</div>
                      <div className="text-xs font-bold text-white">{ratio.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{ratio.subLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tùy chọn Thời lượng ghi */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Chọn Thời Lượng Cắt Xuất:</span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((dur) => {
                  const isSelected = selectedDuration === dur.id;
                  return (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        setSelectedDuration(dur.id);
                      }}
                      onMouseEnter={playHoverBlip}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{dur.label}</div>
                      <div className="text-[9px] text-slate-500 line-clamp-1">{dur.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Nút Bắt Đầu Ghi */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartRecording}
                onMouseEnter={playHoverBlip}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.98]"
              >
                <div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
                <span>Bắt Đầu Thu Video 60 FPS</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Trạng thái Đang Ghi (Recording in Progress) */}
        {status === 'recording' && (
          <div className="space-y-6 py-4 text-center relative z-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 rounded-full bg-rose-500 animate-ping" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">Đang Thu Video Trực Tiếp...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Visualizer đang render 60 FPS kết hợp âm thanh phòng thu
              </p>
            </div>

            {/* Thanh tiến trình */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>{progress.elapsedSeconds}s</span>
                <span className="text-amber-400 font-bold">{progress.percent}%</span>
                <span>{progress.totalSeconds}s</span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleStopRecordingEarly}
                className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-rose-500/20 hover:border-rose-500/50 border border-white/15 text-xs text-slate-300 hover:text-rose-200 transition-all cursor-pointer font-semibold"
              >
                Dừng & Xuất Ngay
              </button>
            </div>
          </div>
        )}

        {/* 4. Trạng thái Hoàn Tất (Finished Video Ready) */}
        {status === 'finished' && videoResult && (
          <div className="space-y-5 text-center relative z-10">
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-base font-bold">Thu Video Thành Công!</span>
            </div>

            {/* Video Preview */}
            <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
              <video
                src={videoResult.url}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-auto max-h-[260px] object-contain"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Thời lượng: {videoResult.duration}s • Định dạng: {videoResult.mimeType.split(';')[0]} • 60 FPS
            </div>

            {/* Cụm nút tải & làm lại */}
            <div className="flex items-center gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleDownload}
                onMouseEnter={playHoverBlip}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Tải Video Ngay</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('idle')}
                onMouseEnter={playHoverBlip}
                className="py-3 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thu Đoạn Khác</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
