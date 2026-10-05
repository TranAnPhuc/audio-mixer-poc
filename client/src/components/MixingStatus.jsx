import React from 'react';
import { Loader2, CheckCircle2, AlertOctagon, RotateCcw, Clock, Sparkles, AudioWaveform } from 'lucide-react';
import WaveformPlayer from './WaveformPlayer';

/**
 * Component hiển thị tiến trình và trạng thái phối âm thời gian thực
 */
export default function MixingStatus({
  status,
  progress,
  jobId,
  result,
  error,
  onReset
}) {
  const isPending = status === 'PENDING';
  const isProcessing = status === 'PROCESSING';
  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-left">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        {/* Header Thông tin Job ID & Trạng thái */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Tác vụ phối âm</span>
            <div className="font-mono text-xs text-indigo-400 mt-0.5 select-all">
              ID: {jobId}
            </div>
          </div>

          <div>
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xếp hàng chờ xử lý...</span>
              </span>
            )}

            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý âm thanh ({progress}%)</span>
              </span>
            )}

            {isSuccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phối âm hoàn tất 100%</span>
              </span>
            )}

            {isFailed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Xử lý thất bại</span>
              </span>
            )}
          </div>
        </div>

        {/* Thanh tiến trình (Hiển thị khi PENDING hoặc PROCESSING) */}
        {(isPending || isProcessing) && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AudioWaveform className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>FFmpeg ComplexFilter (Resample, Gain Staging, Limiter)</span>
              </span>
              <span className="font-mono font-bold text-indigo-400 text-sm">{progress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg shadow-indigo-500/30"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 text-center italic">
              Đang đồng bộ tần số lấy mẫu 44.1kHz và triệt tiêu méo tiếng số...
            </p>
          </div>
        )}

        {/* Trạng thái SUCCESS: Hiển thị tóm tắt kết quả & WaveformPlayer */}
        {isSuccess && result && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Bản mix đã sẵn sàng để phát trực tuyến!</span>
              </div>
              <p className="text-xs text-slate-400">
                Tệp âm thanh MP3 320kbps đã được render hoàn chỉnh. Bạn có thể nghe thử, kéo tua trực tiếp trên dạng sóng bên dưới hoặc tải về máy.
              </p>
            </div>

            {/* Trình phát WaveformPlayer tương tác */}
            <WaveformPlayer
              streamUrl={result.streamUrl}
              downloadUrl={result.downloadUrl}
              duration={result.duration}
              jobId={jobId}
            />

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Thời lượng bản phối:</span>
                <span className="text-slate-200 font-semibold text-sm">
                  {result.duration ? `${result.duration.toFixed(1)}s` : '10.0s'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Thời gian xử lý:</span>
                <span className="text-slate-200 font-semibold text-sm">
                  {result.executionTimeMs ? `${result.executionTimeMs}ms` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Trạng thái FAILED: Hiển thị lỗi */}
        {isFailed && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertOctagon className="w-4 h-4" />
              <span>Đã xảy ra lỗi trong quá trình xử lý:</span>
            </div>
            <p className="text-xs text-rose-300 font-mono break-words">
              {error || 'Lỗi không xác định khi gọi FFmpeg.'}
            </p>
          </div>
        )}

        {/* Nút hành động Reset */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isSuccess ? 'Tạo bản mix mới' : 'Hủy / Thử lại'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
