import React, { useEffect } from 'react';
import { X, Sparkles, RotateCcw, Check, Palette } from 'lucide-react';
import {
  WOOD_STYLES,
  HORN_STYLES,
  VINYL_STYLES,
  UNDERGLOW_COLORS,
  DEFAULT_TURNTABLE_STYLE
} from '../data/turntableStyles';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

/**
 * TurntableCustomizerDrawer — Ngăn kéo tùy biến máy hát đĩa than 3D
 * Cho phép cá nhân hóa chất liệu vỏ gỗ, loa kèn đồng/bạc, đĩa than và đèn hào quang
 * Xem trước thay đổi trực tiếp (Live 3D Preview) và tự động lưu localStorage.
 */
export default function TurntableCustomizerDrawer({
  isOpen,
  onClose,
  customization,
  onChangeCustomization
}) {
  // Lắng nghe phím Escape để đóng drawer
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

  const current = customization || DEFAULT_TURNTABLE_STYLE;

  const handleSelectWood = (woodId) => {
    playHapticClick();
    onChangeCustomization({ ...current, wood: woodId });
  };

  const handleSelectHorn = (hornId) => {
    playHapticClick();
    onChangeCustomization({ ...current, horn: hornId });
  };

  const handleSelectVinyl = (vinylId) => {
    playHapticClick();
    onChangeCustomization({ ...current, vinyl: vinylId });
  };

  const handleSelectUnderglow = (colorId) => {
    playHapticClick();
    onChangeCustomization({ ...current, underglow: colorId });
  };

  const handleRandomize = () => {
    playHapticClick();
    const randWood = WOOD_STYLES[Math.floor(Math.random() * WOOD_STYLES.length)].id;
    const randHorn = HORN_STYLES[Math.floor(Math.random() * HORN_STYLES.length)].id;
    const randVinyl = VINYL_STYLES[Math.floor(Math.random() * VINYL_STYLES.length)].id;
    const randUg = UNDERGLOW_COLORS[Math.floor(Math.random() * UNDERGLOW_COLORS.length)].id;
    onChangeCustomization({
      wood: randWood,
      horn: randHorn,
      vinyl: randVinyl,
      underglow: randUg
    });
  };

  const handleReset = () => {
    playHapticClick();
    onChangeCustomization({ ...DEFAULT_TURNTABLE_STYLE });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#0c0e17]/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-2xl overflow-hidden animate-slideLeft select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Tùy Biến Máy Hát 3D
              </h3>
              <p className="text-xs text-slate-400">
                Cá nhân hóa chất liệu & màu sắc thời gian thực
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playHapticClick();
              onClose();
            }}
            onMouseEnter={playHoverBlip}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NỘI DUNG CUỘN */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
          {/* MỤC 1: THÂN THÙNG GỖ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                1. Thùng Gỗ Bát Giác
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {WOOD_STYLES.find((w) => w.id === current.wood)?.nameVi}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {WOOD_STYLES.map((w) => {
                const isSelected = current.wood === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSelectWood(w.id)}
                    onMouseEnter={playHoverBlip}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-400/10'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-lg border border-white/20 flex-shrink-0 shadow-inner"
                        style={{ backgroundColor: w.previewHex }}
                      />
                      <div>
                        <div className="text-xs font-semibold">{w.nameVi}</div>
                        <div className="text-[11px] text-slate-400">{w.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MỤC 2: LOA KÈN & KIM LOẠI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                2. Loa Kèn & Kim Loại
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {HORN_STYLES.find((h) => h.id === current.horn)?.nameVi}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {HORN_STYLES.map((h) => {
                const isSelected = current.horn === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelectHorn(h.id)}
                    onMouseEnter={playHoverBlip}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-400/10'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white/30 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: h.previewHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{h.nameVi}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MỤC 3: KIỂU ĐĨA THAN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                3. Chất Liệu Đĩa Than
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {VINYL_STYLES.find((v) => v.id === current.vinyl)?.nameVi}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {VINYL_STYLES.map((v) => {
                const isSelected = current.vinyl === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVinyl(v.id)}
                    onMouseEnter={playHoverBlip}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-400/10'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white/30 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: v.previewHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{v.nameVi}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MỤC 4: HÀO QUANG GẦM MÁY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                4. Ánh Sáng Hào Quang
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {UNDERGLOW_COLORS.find((u) => u.id === current.underglow)?.nameVi}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/10">
              {UNDERGLOW_COLORS.map((u) => {
                const isSelected = current.underglow === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUnderglow(u.id)}
                    onMouseEnter={playHoverBlip}
                    className={`relative w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 border-white shadow-lg'
                        : 'border-transparent hover:scale-105 opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: u.hex,
                      boxShadow: isSelected ? `0 0 12px ${u.hex}` : 'none'
                    }}
                    title={u.nameVi}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            onMouseEnter={playHoverBlip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleRandomize}
            onMouseEnter={playHoverBlip}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Phối Ngẫu Nhiên</span>
          </button>
        </div>
      </div>
    </div>
  );
}
