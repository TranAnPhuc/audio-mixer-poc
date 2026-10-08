import React, { useEffect } from 'react';
import { X, Play, Music, Sparkles, Disc3, Heart, Disc, Volume2 } from 'lucide-react';
import { VIETNAMESE_TRACKS } from '../data/vietnameseTracks';
import { playHapticClick, playHoverBlip, playPaperRustleASMR } from '../utils/soundEffects';

/**
 * LinerNotesDrawer — Ngăn kéo bìa đĩa than & ghi chú tác phẩm (Liner Notes)
 * Trình bày câu chuyện văn hóa, tác giả Trịnh Công Sơn và thông số âm học
 * theo phong cách Gatefold Sleeve & Booklet đính kèm trong các bộ đĩa than vinyl cao cấp.
 */
export default function LinerNotesDrawer({
  isOpen,
  onClose,
  onSelectTrack,
  currentTrackId
}) {
  // Lắng nghe phím Escape để đóng
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => {
          playHapticClick();
          onClose();
        }}
      />

      {/* Ngăn kéo Booklet giấy da sang trọng */}
      <div className="relative z-10 w-full max-w-xl bg-[#0f121d]/95 backdrop-blur-2xl text-slate-100 border-l border-amber-500/30 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl animate-[fadeIn_200ms_ease-out]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/25 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-serif text-base shadow-inner">
                ◎
              </div>
              <div>
                <h3 className="font-serif text-lg text-slate-100 font-medium tracking-wide">
                  AuraLofi • Liner Notes
                </h3>
                <span className="font-mono text-[10px] text-amber-400/80 uppercase tracking-widest">
                  Ghi chú bìa đĩa & di sản âm nhạc
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playHapticClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full border border-white/10 hover:border-amber-400/50 hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Phần 1: Câu chuyện văn hóa Trịnh Công Sơn */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                Tuyển tập di sản Trịnh Công Sơn
              </span>
            </div>
            <p className="text-sm font-sans font-light text-slate-300 leading-relaxed mb-4">
              Những giai điệu bất hủ của cố nhạc sĩ <strong>Trịnh Công Sơn</strong> (Diễm Xưa, Hạ Trắng, Biển Nhớ) được phối khí mộc mạc phong cách Lofi Chillhop, hòa cùng tiếng nổ đĩa than analog đưa bạn về miền ký ức sâu lắng.
            </p>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 font-serif italic leading-relaxed">
              &ldquo;Sống trong đời sống cần có một tấm lòng, để làm gì em biết không? Để gió cuốn đi...&rdquo;
            </div>
          </section>

          {/* Phần 2: Danh sách các bản thu Gatefold Sleeve */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-amber-400" />
                Bao Bìa Gatefold (33⅓ RPM)
              </span>
              <span className="font-mono text-[10px] text-amber-400">
                {VIETNAMESE_TRACKS.length} Bản Thu Tuyển Chọn
              </span>
            </div>

            <div className="space-y-3">
              {VIETNAMESE_TRACKS.map((track, idx) => {
                const isCurrent = currentTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      playPaperRustleASMR();
                      if (onSelectTrack) onSelectTrack(track);
                    }}
                    onMouseEnter={playHoverBlip}
                    className={`group relative overflow-hidden p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                      isCurrent
                        ? 'bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-[#121624] border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-[#141210]/70 hover:bg-[#1c1814] border-amber-950/60 hover:border-amber-500/40 hover:shadow-lg'
                    }`}
                  >
                    {/* Tem gáy đĩa Obi strip phong cách cổ điển */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 transition-colors ${
                        isCurrent ? 'bg-amber-400' : 'bg-amber-600/40 group-hover:bg-amber-400/70'
                      }`}
                    />

                    {/* Khối bìa jacket và thông tin */}
                    <div className="flex items-center gap-3.5 pl-2 z-10">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-xs font-bold border transition-all ${
                            isCurrent
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                              : 'bg-amber-950/40 text-amber-200/90 border-amber-500/20 group-hover:border-amber-400/50'
                          }`}
                        >
                          <span className="font-serif text-sm">#{idx + 1}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-100 font-serif tracking-wide group-hover:text-amber-200 transition-colors">
                            {track.title}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse">
                              On Deck
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{track.artist}</span>
                          <span className="text-amber-500/50">•</span>
                          <span className="text-[10px] text-amber-500/80 uppercase">
                            TCS-33RPM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Đĩa than vật lý trượt hé từ khe bao bìa (Physical Vinyl Slide-out) */}
                    <div className="flex items-center gap-3 z-10">
                      <div
                        className={`relative w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 border border-neutral-700/80 shadow-inner flex items-center justify-center transition-all duration-300 transform ${
                          isCurrent
                            ? 'translate-x-0 scale-105 ring-1 ring-amber-400 shadow-amber-900/30'
                            : 'translate-x-2 group-hover:translate-x-0 opacity-75 group-hover:opacity-100'
                        }`}
                        title="Đĩa than Vinyl 33⅓ RPM"
                      >
                        {/* Rãnh âm vi mô (Grooves) */}
                        <div className="absolute inset-1 rounded-full border border-neutral-700/40 pointer-events-none" />
                        {/* Nhãn tem tâm đĩa */}
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-amber-400 animate-spin'
                              : 'bg-amber-600/70 group-hover:bg-amber-400'
                          }`}
                          style={{ animationDuration: '3s' }}
                        >
                          <div className="w-1 h-1 rounded-full bg-neutral-950" />
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                            : 'border border-amber-500/20 text-slate-300 group-hover:border-amber-400/60 group-hover:text-amber-300 bg-white/[0.02]'
                        }`}
                      >
                        {isCurrent ? 'Đang quay' : 'Rút đĩa'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Phần 3: Cơ khí âm học analog */}
          <section className="mb-6">
            <div className="font-mono text-[11px] text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
              Đặc tả cơ khí âm học
            </div>
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-amber-400/70 block mb-1 text-[10px] uppercase">Mâm Đĩa Than</span>
                <span className="text-slate-200">Gỗ óc chó & Mâm đồng</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-amber-400/70 block mb-1 text-[10px] uppercase">Vận Tốc Quay</span>
                <span className="text-slate-200">33⅓ RPM Chuẩn Analog</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-amber-400/70 block mb-1 text-[10px] uppercase">Chuông Thiền</span>
                <span className="text-slate-200">Solfeggio 528Hz</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-amber-400/70 block mb-1 text-[10px] uppercase">Âm Thanh Mộc</span>
                <span className="text-slate-200">Web Audio API 0KB</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-slate-400">
          <span>Nhấn <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 border border-white/20 font-bold">L</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 border border-white/20 font-bold">Esc</kbd> để đóng</span>
          <span>AuraLofi © 2026</span>
        </div>
      </div>
    </div>
  );
}
