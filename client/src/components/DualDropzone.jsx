import React, { useState, useRef } from 'react';
import { Mic, Disc3, UploadCloud, FileAudio, X, AlertCircle, Sparkles, Loader2, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { uploadTracksForMixing } from '../services/api';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'];

/**
 * Định dạng dung lượng tệp tin sang KB hoặc MB
 */
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Kiểm định tệp tại client trước khi tải lên
 */
function validateAudioFile(file) {
  if (!file) return 'Vui lòng chọn một tệp âm thanh.';

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAudioMime = file.type.startsWith('audio/') || file.type === '';
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (!isExtValid && !isAudioMime) {
    return 'Định dạng không được hỗ trợ. Chỉ chấp nhận tệp âm thanh .mp3 hoặc .wav.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return `Dung lượng tệp (${formatFileSize(file.size)}) vượt quá giới hạn tối đa 25MB.`;
  }

  return null;
}

/**
 * Sub-component Dropzone đơn lẻ cho từng Track
 */
function SingleDropzone({
  title,
  subtitle,
  icon: Icon,
  themeColor,
  file,
  error,
  onFileSelect,
  onFileRemove,
  disabled
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      onFileSelect(droppedFiles[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isIndigo = themeColor === 'indigo';
  const borderColor = isIndigo
    ? isDragOver
      ? 'border-indigo-400 bg-indigo-950/40'
      : 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/10'
    : isDragOver
    ? 'border-emerald-400 bg-emerald-950/40'
    : 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10';

  const iconColor = isIndigo ? 'text-indigo-400 bg-indigo-500/10' : 'text-emerald-400 bg-emerald-500/10';
  const badgeColor = isIndigo ? 'text-indigo-400 border-indigo-500/30' : 'text-emerald-400 border-emerald-500/30';

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${isIndigo ? 'text-indigo-400' : 'text-emerald-400'}`} />
          {title}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor} font-mono`}>
          {subtitle}
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center min-h-[190px] ${borderColor} ${
          !file && !disabled ? 'cursor-pointer' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />

        {file ? (
          <div className="w-full flex flex-col items-center justify-center">
            <div className={`p-3 rounded-2xl ${iconColor} mb-2 shadow-inner`}>
              <FileAudio className="w-7 h-7" />
            </div>

            <p className="text-sm font-semibold text-slate-100 max-w-[220px] truncate" title={file.name}>
              {file.name}
            </p>

            <span className="text-xs text-slate-400 mt-0.5 font-mono">
              {formatFileSize(file.size)}
            </span>

            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-colors border border-rose-500/20"
              >
                <X className="w-3.5 h-3.5" />
                <span>Gỡ bỏ tệp</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`p-3 rounded-2xl ${iconColor} mb-3 shadow-inner`}>
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Kéo & thả file vào đây, hoặc <span className={isIndigo ? 'text-indigo-400 underline underline-offset-2' : 'text-emerald-400 underline underline-offset-2'}>chọn tệp</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Định dạng MP3 hoặc WAV (Tối đa 25MB)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-shake">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Component chính DualDropzone điều phối tải lên 2 track âm thanh
 */
export default function DualDropzone({ onJobCreated }) {
  const [trackA, setTrackA] = useState({ file: null, error: null });
  const [trackB, setTrackB] = useState({ file: null, error: null });
  const [vocalOffsetMs, setVocalOffsetMs] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [globalError, setGlobalError] = useState(null);

  const handleSelectTrackA = (file) => {
    const error = validateAudioFile(file);
    setTrackA({ file: error ? null : file, error });
    setGlobalError(null);
  };

  const handleSelectTrackB = (file) => {
    const error = validateAudioFile(file);
    setTrackB({ file: error ? null : file, error });
    setGlobalError(null);
  };

  const handleStartMixing = async () => {
    if (!trackA.file || !trackB.file || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setGlobalError(null);

    try {
      const response = await uploadTracksForMixing({
        trackAFile: trackA.file,
        trackBFile: trackB.file,
        vocalOffsetMs,
        onUploadProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      if (response.success && response.data?.jobId) {
        onJobCreated(response.data.jobId);
      } else {
        throw new Error(response.message || 'Không thể tạo tác vụ phối âm.');
      }
    } catch (err) {
      console.error('[Upload Error]:', err);
      const serverMessage = err.response?.data?.error?.message || err.message || 'Đã xảy ra lỗi khi tải tệp lên máy chủ.';
      setGlobalError(serverMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const isReadyToMix = trackA.file && trackB.file && !trackA.error && !trackB.error && !isUploading;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 2 Vùng Dropzone song song */}
      <div className="flex flex-col sm:flex-row gap-5">
        <SingleDropzone
          title="Track A - Vocal"
          subtitle="Giọng Hát / Lead"
          icon={Mic}
          themeColor="indigo"
          file={trackA.file}
          error={trackA.error}
          onFileSelect={handleSelectTrackA}
          onFileRemove={() => setTrackA({ file: null, error: null })}
          disabled={isUploading}
        />

        <SingleDropzone
          title="Track B - Beat"
          subtitle="Nhạc Nền / Beat"
          icon={Disc3}
          themeColor="emerald"
          file={trackB.file}
          error={trackB.error}
          onFileSelect={handleSelectTrackB}
          onFileRemove={() => setTrackB({ file: null, error: null })}
          disabled={isUploading}
        />
      </div>

      {/* Khối Căn Chỉnh Độ Trễ Vocal (Offset Alignment Slider) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Căn Chỉnh Độ Trễ Vocal (Offset Alignment)
            </span>
          </div>
          {vocalOffsetMs !== 0 && (
            <button
              type="button"
              onClick={() => setVocalOffsetMs(0)}
              disabled={isUploading}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại 0s</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Dịch chuyển thời điểm bắt đầu giọng hát sớm (-) hoặc trễ (+) so với phách beat:
          </p>
          <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border inline-flex items-center justify-center self-start sm:self-auto">
            {vocalOffsetMs > 0 && (
              <span className="text-amber-400 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                +{ (vocalOffsetMs / 1000).toFixed(2) }s (Vocal vào trễ)
              </span>
            )}
            {vocalOffsetMs < 0 && (
              <span className="text-sky-400 border-sky-500/30 bg-sky-500/10 px-2 py-0.5 rounded">
                { (vocalOffsetMs / 1000).toFixed(2) }s (Vocal vào sớm)
              </span>
            )}
            {vocalOffsetMs === 0 && (
              <span className="text-slate-300 border-slate-700 bg-slate-800/50 px-2 py-0.5 rounded">
                0.00s (Mặc định - Chuẩn beat)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <input
            type="range"
            min="-3000"
            max="3000"
            step="50"
            value={vocalOffsetMs}
            onChange={(e) => setVocalOffsetMs(parseInt(e.target.value, 10))}
            disabled={isUploading}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1 select-none">
            <span
              className="hover:text-sky-400 cursor-pointer transition-colors"
              onClick={() => !isUploading && setVocalOffsetMs(-3000)}
            >
              -3.0s (Sớm)
            </span>
            <span
              className="hover:text-slate-300 cursor-pointer transition-colors"
              onClick={() => !isUploading && setVocalOffsetMs(0)}
            >
              0.0s (Chuẩn)
            </span>
            <span
              className="hover:text-amber-400 cursor-pointer transition-colors"
              onClick={() => !isUploading && setVocalOffsetMs(3000)}
            >
              +3.0s (Trễ)
            </span>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi tổng quát */}
      {globalError && (
        <div className="flex items-center gap-2 p-3 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Thanh hiển thị tiến độ Upload khi đang tải lên */}
      {isUploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Đang tải tệp lên máy chủ...</span>
            <span className="font-mono text-indigo-400">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Nút bấm Bắt đầu Mix */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={handleStartMixing}
          disabled={!isReadyToMix}
          className={`relative group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg ${
            isReadyToMix
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang tải lên ({uploadProgress}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className={`w-4 h-4 ${isReadyToMix ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>Tạo Bản Mashup</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
