import React from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertOctagon,
  RotateCcw,
  Clock,
  Sparkles,
  AudioWaveform,
  Mic,
  Disc,
  Gauge,
  Activity,
  SlidersHorizontal,
  Music2,
  Bot,
  Cpu
} from 'lucide-react';
import WaveformPlayer from './WaveformPlayer';

/**
 * Component hiển thị tiến trình và trạng thái phối âm thời gian thực
 */
export default function MixingStatus({
  status,
  progress,
  tempo,
  harmonic,
  stems,
  vocalOffsetMs = 0,
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
                <span>FFmpeg ComplexFilter (Resample, Tempo Match, Gain Staging, Limiter)</span>
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
              {stems?.enabled
                ? 'Đang bóc tách thân âm qua mô hình AI Demucs, phân tích BPM và căn chỉnh hòa âm...'
                : 'Đang phân tích BPM, co dãn nhịp điệu và phối ghép luồng âm thanh...'}
            </p>
          </div>
        )}

        {/* Trạng thái SUCCESS: Hiển thị tóm tắt kết quả, BPM Badges & WaveformPlayer */}
        {isSuccess && result && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Bản mix đã sẵn sàng để phát trực tuyến!</span>
                </div>
                {stems?.enabled && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start sm:self-auto">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span>AI Stems Separated ({stems.separationTimeMs ? `${stems.separationTimeMs}ms` : 'Demucs v4'})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Tệp âm thanh MP3 320kbps đã được render hoàn chỉnh. Bạn có thể nghe thử, kéo tua trực tiếp trên dạng sóng bên dưới hoặc tải về máy.
              </p>
            </div>

            {/* Khối Thông số Đồng bộ Nhịp điệu & Căn chỉnh Phách */}
            {(tempo || typeof vocalOffsetMs === 'number') && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>Đồng bộ Nhịp điệu & Căn chỉnh Phách</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      vocalOffsetMs > 0 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : vocalOffsetMs < 0 
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      Offset: {vocalOffsetMs > 0 ? `+${(vocalOffsetMs / 1000).toFixed(2)}s` : vocalOffsetMs < 0 ? `${(vocalOffsetMs / 1000).toFixed(2)}s` : 'Chuẩn 0.0s'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">WSOLA atempo</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Track A: Vocal BPM */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-400/80 uppercase font-semibold block">Track A (Vocal)</span>
                      <span className="font-mono font-bold text-sm text-indigo-200">
                        {tempo && typeof tempo.trackABpm === 'number' ? `${tempo.trackABpm} BPM` : 'Không rõ (Tự nhiên)'}
                      </span>
                    </div>
                  </div>

                  {/* Track B: Beat BPM */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Disc className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400/80 uppercase font-semibold block">Track B (Beat Master)</span>
                      <span className="font-mono font-bold text-sm text-emerald-200">
                        {tempo && typeof tempo.trackBBpm === 'number' ? `${tempo.trackBBpm} BPM` : 'Không rõ (Tự nhiên)'}
                      </span>
                    </div>
                  </div>

                  {/* Mức độ cân chỉnh (Adjustment Badge) */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cân chỉnh Tempo</span>
                      {(() => {
                        const r = tempo?.appliedTempoRatio;
                        if (!r || r === 1.0) {
                          return (
                            <span className="inline-flex items-center text-xs font-semibold text-slate-300 font-mono">
                              Tốc độ gốc (1.0x)
                            </span>
                          );
                        }
                        if (r > 1.0) {
                          const pct = ((r - 1) * 100).toFixed(1);
                          return (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-400 font-mono">
                              +{pct}% (Co ngắn)
                            </span>
                          );
                        }
                        const pct = ((1 - r) * 100).toFixed(1);
                        return (
                          <span className="inline-flex items-center text-xs font-semibold text-sky-400 font-mono">
                            -{pct}% (Dãn dài)
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Độ trễ Vocal (Vocal Offset) */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Độ trễ Vocal</span>
                      {vocalOffsetMs > 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold text-amber-400 font-mono">
                          +{(vocalOffsetMs / 1000).toFixed(2)}s (Vào trễ)
                        </span>
                      ) : vocalOffsetMs < 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold text-sky-400 font-mono">
                          {(vocalOffsetMs / 1000).toFixed(2)}s (Vào sớm)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-slate-300 font-mono">
                          Chuẩn phách (0.0s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Khối Thông số Đồng bộ Cao độ & Vòng Tròn Camelot (Harmonic Key Matching) */}
            {harmonic && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Music2 className="w-4 h-4 text-purple-400" />
                    <span>Đồng Bộ Hòa Âm (Harmonic Key Matching)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      harmonic.appliedPitchShiftSemitones > 0
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : harmonic.appliedPitchShiftSemitones < 0
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {harmonic.appliedPitchShiftSemitones > 0
                        ? `Pitch Shift: +${harmonic.appliedPitchShiftSemitones} st`
                        : harmonic.appliedPitchShiftSemitones < 0
                        ? `Pitch Shift: ${harmonic.appliedPitchShiftSemitones} st`
                        : 'Chuẩn tông (0 st)'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">Camelot Wheel</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Track A: Vocal Key & Camelot */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-indigo-400/80 uppercase font-semibold block">Track A (Vocal Key)</span>
                        {stems?.enabled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-semibold">
                            Clean Vocals
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {harmonic.trackACamelot && (
                          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-indigo-500/30 border border-indigo-500/40 text-indigo-200">
                            {harmonic.trackACamelot}
                          </span>
                        )}
                        <span className="font-mono font-bold text-sm text-indigo-100">
                          {harmonic.trackAKey || 'Không rõ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Track B: Beat Key & Camelot */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Disc className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-400/80 uppercase font-semibold block">Track B (Beat Key Master)</span>
                        {stems?.enabled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-semibold">
                            Pure Instrumental
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {harmonic.trackBCamelot && (
                          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-emerald-500/30 border border-emerald-500/40 text-emerald-200">
                            {harmonic.trackBCamelot}
                          </span>
                        )}
                        <span className="font-mono font-bold text-sm text-emerald-100">
                          {harmonic.trackBKey || 'Không rõ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mức độ dịch chuyển cao độ thực tế */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                      <Music2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dịch chuyển cao độ</span>
                      {(() => {
                        const shift = harmonic.appliedPitchShiftSemitones ?? 0;
                        if (shift === 0) {
                          return (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-400 font-mono">
                              Khớp tự nhiên (0 st)
                            </span>
                          );
                        }
                        if (shift > 0) {
                          return (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-400 font-mono">
                              +{shift} bán âm (Tăng)
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center text-xs font-semibold text-sky-400 font-mono">
                            {shift} bán âm (Giảm)
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Trạng thái hòa âm Camelot */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hòa âm Camelot</span>
                      <span className="inline-flex items-center text-xs font-semibold text-slate-200 font-mono">
                        {harmonic.appliedPitchShiftSemitones === 0
                          ? (harmonic.trackACamelot && harmonic.trackBCamelot && harmonic.trackACamelot === harmonic.trackBCamelot
                              ? 'Trùng mã tông'
                              : 'Tự nhiên / Chuẩn')
                          : 'Đã khớp hợp âm'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trình phát WaveformPlayer tương tác */}
            <WaveformPlayer
              streamUrl={result.streamUrl}
              downloadUrl={result.downloadUrl}
              duration={result.duration}
              jobId={jobId}
              tempo={tempo}
            />

            <div className={`grid grid-cols-2 ${stems?.enabled ? 'sm:grid-cols-3' : ''} gap-3 text-xs font-mono`}>
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
              {stems?.enabled && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-purple-900/40 col-span-2 sm:col-span-1 bg-purple-950/10">
                  <span className="text-purple-400 block flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    AI Stem Separator:
                  </span>
                  <span className="text-purple-200 font-semibold text-sm">
                    {stems.separationTimeMs ? `${stems.separationTimeMs}ms` : 'Demucs v4'}
                  </span>
                </div>
              )}
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
