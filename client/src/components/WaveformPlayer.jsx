import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Download, Volume2, Loader2, RotateCcw } from 'lucide-react';

/**
 * Định dạng số giây sang dạng phút:giây (mm:ss)
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Component hiển thị sóng âm thanh tương tác và điều khiển phát nhạc
 */
export default function WaveformPlayer({ streamUrl, downloadUrl, duration: initialDuration, jobId, tempo }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);

  useEffect(() => {
    if (!containerRef.current || !streamUrl) return;

    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);

    // Khởi tạo instance WaveSurfer với giao diện Studio Dark hiện đại
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: streamUrl,
      waveColor: '#475569',      // Slate 600
      progressColor: '#6366f1',  // Indigo 500
      cursorColor: '#38bdf8',    // Sky 400
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 80,
      normalize: true
    });

    wavesurferRef.current = ws;

    // Lắng nghe các sự kiện âm thanh
    ws.on('ready', () => {
      setIsLoading(false);
      const dur = ws.getDuration();
      if (dur > 0) {
        setTotalDuration(dur);
      }
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTime(time));
    ws.on('seeking', (time) => setCurrentTime(time));
    ws.on('finish', () => {
      setIsPlaying(false);
      ws.seekTo(0);
      setCurrentTime(0);
    });

    // Cleanup Function: Hủy đối tượng và giải phóng AudioContext khi unmount
    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [streamUrl]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-inner animate-fade-in text-left">
      {/* Header trực quan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-semibold flex items-center gap-1.5 text-indigo-400">
          <Volume2 className="w-4 h-4" />
          <span>Dạng Sóng Trực Quan Hóa (Interactive Audio Waveform)</span>
        </span>
        <div className="flex items-center gap-2">
          {tempo?.appliedTempoRatio && tempo.appliedTempoRatio !== 1.0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono">
              {tempo.appliedTempoRatio}x Tempo Matched
            </span>
          )}
          <span className="font-mono text-slate-500">320kbps CBR • 44.1kHz Stereo</span>
        </div>
      </div>

      {/* Vùng Canvas hiển thị sóng âm */}
      <div className="relative w-full rounded-xl bg-slate-900/80 p-3 border border-slate-800/80">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-xl z-10 gap-2 text-xs text-indigo-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang phân tích dạng sóng từ audio stream...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full cursor-pointer" />
      </div>

      {/* Thanh điều khiển Playback & Download */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
          {/* Nút Play/Pause */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? 'Tạm dừng (Pause)' : 'Phát nhạc (Play)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Nút tua về đầu */}
          <button
            type="button"
            onClick={handleRestart}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
            title="Phát lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Mốc thời gian mm:ss */}
          <div className="font-mono text-sm font-semibold text-slate-300 ml-1">
            <span className="text-indigo-400">{formatTime(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-400">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Nút Tải file thành phẩm */}
        <a
          href={downloadUrl}
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Tải Xuống Bản Mix (.mp3)</span>
        </a>
      </div>
    </div>
  );
}
