import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Sliders,
  RotateCcw,
  Sparkles,
  CloudRain,
  Coffee,
  Flame,
  Wind
} from 'lucide-react';
import {
  AMBIENT_SOUND_INFO,
  setAmbientVolume,
  getAmbientVolumes,
  stopAllAmbientSounds
} from '../utils/ambientSoundSynth';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

const STORAGE_KEY = 'auralofi_ambient_volumes';

/**
 * Bộ Trộn Âm Thanh Môi Trường Thư Giãn (Ambient Soundscape Mixer)
 * Cho phép người dùng pha trộn tiếng mưa, quán cafe, lò sưởi và gió đêm
 * hòa cùng bài hát đĩa than đang phát.
 */
export default function AmbientMixerDrawer({ isOpen = false, onClose }) {
  const [volumes, setVolumes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      rain: 0,
      cafe: 0,
      fireplace: 0,
      wind: 0
    };
  });

  // Đồng bộ với localStorage và Web Audio Synth
  const handleVolumeChange = (key, val) => {
    const numVal = Math.min(1, Math.max(0, parseFloat(val) || 0));
    const nextVolumes = { ...volumes, [key]: numVal };
    setVolumes(nextVolumes);
    setAmbientVolume(key, numVal);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextVolumes));
    } catch (e) {}
  };

  // Toggle nhanh bật 30% / tắt 0% cho 1 kênh
  const handleToggleChannel = (key) => {
    playHapticClick();
    const current = volumes[key] || 0;
    const nextVal = current > 0 ? 0 : 0.45;
    handleVolumeChange(key, nextVal);
  };

  // Tắt toàn bộ âm thanh môi trường
  const handleResetAll = () => {
    playHapticClick();
    stopAllAmbientSounds();
    const resetVols = { rain: 0, cafe: 0, fireplace: 0, wind: 0 };
    setVolumes(resetVols);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetVols));
    } catch (e) {}
  };

  // Preset "Đêm Mưa Bên Lò Sưởi" (Rainy Cozy Night)
  const applyPresetRainyNight = () => {
    playHapticClick();
    const preset = { rain: 0.55, cafe: 0, fireplace: 0.40, wind: 0.25 };
    setVolumes(preset);
    Object.entries(preset).forEach(([k, v]) => setAmbientVolume(k, v));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
    } catch (e) {}
  };

  if (!isOpen) return null;

  const totalActive = Object.values(volumes).filter((v) => v > 0).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#11131c]/95 border-l border-white/15 backdrop-blur-2xl shadow-2xl p-6 flex flex-col justify-between text-slate-100 animate-fade-in select-none">
      
      {/* 1. Header Drawer */}
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Bộ Trộn Âm Môi Trường
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                {totalActive > 0 ? `Đang phát ${totalActive} luồng âm nền` : 'Chưa bật âm nền nào'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Phổ Biến Nhanh */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={applyPresetRainyNight}
            onMouseEnter={playHoverBlip}
            className="flex-1 py-1.5 px-3 rounded-xl bg-white/[0.05] hover:bg-amber-400/20 hover:border-amber-400/40 border border-white/10 text-xs text-amber-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Preset: Đêm Mưa Lò Sưởi</span>
          </button>

          {totalActive > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="py-1.5 px-3 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/10 text-xs text-slate-300 hover:text-rose-200 transition-all cursor-pointer"
              title="Tắt toàn bộ âm thanh môi trường"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Danh Sách 4 Faders Âm Lượng */}
        <div className="mt-6 space-y-5">
          {Object.entries(AMBIENT_SOUND_INFO).map(([key, info]) => {
            const vol = volumes[key] || 0;
            const isActive = vol > 0;

            return (
              <div
                key={key}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-white/[0.08] border-amber-400/40 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleChannel(key)}
                      className="text-lg transition-transform active:scale-90 cursor-pointer"
                      title={isActive ? 'Bấm để tắt kênh này' : 'Bấm để bật kênh này'}
                    >
                      {info.icon}
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {info.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-amber-400 font-bold tabular-nums min-w-[32px] text-right">
                    {Math.round(vol * 100)}%
                  </span>
                </div>

                {/* Thanh trượt Fader âm lượng */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleChannel(key)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isActive ? (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vol}
                    onChange={(e) => handleVolumeChange(key, e.target.value)}
                    className="flex-1 h-2 bg-black/50 rounded-full appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Footer Ghi Chú Tinh Tế */}
      <div className="border-t border-white/10 pt-4 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Tự động điều phối với bài hát lofi đang phát • 0kb asset Web Audio
        </p>
      </div>

    </div>
  );
}
