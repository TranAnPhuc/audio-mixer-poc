import React from 'react';

/**
 * Binh đoàn Phi hành gia hoạt họa (Interactive Astronaut Characters)
 * Thiết kế đồ họa vector SVG viễn tưởng chuẩn phong cách Sci-Fi Cinematic.
 * Hỗ trợ chuyển động dao động không trọng lực (Zero-g Floating) và Pointer Parallax.
 */

/**
 * 1. Phi hành gia Giai đoạn 1: Lơ lửng cô đơn trong không gian âm thanh hỗn loạn (The Chaos)
 */
export function AstronautChaos({ mouseNorm = { x: 0, y: 0 }, className = '' }) {
  const offsetX = mouseNorm.x * 12;
  const offsetY = mouseNorm.y * 12;

  return (
    <div
      className={`relative pointer-events-none select-none transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
    >
      <div className="relative animate-astronaut-float">
        {/* Nhãn Định danh Phi hành gia */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-[9px] font-mono text-indigo-300 shadow-lg backdrop-blur-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>[CREW_01: LOST IN SOUND CHAOS]</span>
        </div>

        {/* Dây cáp sinh mệnh uốn lượn vô định (Tether Cable) */}
        <svg
          className="absolute -top-16 -left-20 w-32 h-32 overflow-visible pointer-events-none opacity-40 dark:opacity-60"
          viewBox="0 0 120 120"
        >
          <path
            d="M 110 90 C 80 40, 20 100, 0 10"
            fill="none"
            stroke="url(#tether-grad-1)"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            className="animate-cable-pulse"
          />
          <defs>
            <linearGradient id="tether-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Vector SVG Phi hành gia 1 */}
        <svg
          className="w-28 h-36 sm:w-32 sm:h-40 drop-shadow-[0_10px_20px_rgba(99,102,241,0.25)]"
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bình dưỡng khí & Ba lô (Life Support Backpack) */}
          <rect x="24" y="32" width="52" height="54" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <rect x="28" y="38" width="12" height="38" rx="4" fill="#334155" />
          <rect x="60" y="38" width="12" height="38" rx="4" fill="#334155" />
          {/* Anten ba lô */}
          <line x1="72" y1="32" x2="78" y2="14" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="78" cy="14" r="2.5" fill="#f59e0b" className="animate-pulse" />

          {/* Cặp chân lơ lửng buông lỏng */}
          <path d="M 38 84 L 32 112 L 24 116" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 62 84 L 66 114 L 76 118" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          {/* Giày từ tính */}
          <rect x="18" y="112" width="14" height="7" rx="3" fill="#475569" />
          <rect x="70" y="114" width="14" height="7" rx="3" fill="#475569" />

          {/* Thân áo phi hành gia */}
          <rect x="30" y="44" width="40" height="42" rx="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Bảng điều khiển ngực với đèn LED nhấp nháy */}
          <rect x="38" y="52" width="24" height="18" rx="4" fill="#0f172a" />
          <circle cx="44" cy="58" r="1.8" fill="#10b981" className="animate-pulse" />
          <circle cx="50" cy="58" r="1.8" fill="#f43f5e" />
          <circle cx="56" cy="58" r="1.8" fill="#06b6d4" className="animate-pulse" />
          <line x1="42" y1="64" x2="58" y2="64" stroke="#6366f1" strokeWidth="1.5" />

          {/* Cánh tay trái vẫy chào / với tới quả cầu */}
          <path d="M 30 50 L 14 36 L 10 24" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="24" r="4.5" fill="#475569" />

          {/* Cánh tay phải thả lỏng */}
          <path d="M 70 50 L 84 62 L 88 74" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="88" cy="74" r="4.5" fill="#475569" />

          {/* Mũ bảo hiểm vũ trụ (Helmet) */}
          <circle cx="50" cy="28" r="21" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Kính bảo hộ cong phản chiếu dải ngân hà (Gold/Cyan Visor) */}
          <ellipse cx="50" cy="28" rx="16" ry="13" fill="url(#visor-gradient-chaos)" />
          {/* Ánh phản quang lướt trên kính */}
          <path d="M 40 20 Q 50 18 58 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          <defs>
            <linearGradient id="visor-gradient-chaos" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="45%" stopColor="#4f46e5" />
              <stop offset="85%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/**
 * 2. Đội phi hành gia Giai đoạn 2: Cỗ máy bóc tách AI Demucs kéo cáp năng lượng (AI Extraction)
 */
export function AstronautStemExtractor({ mouseNorm = { x: 0, y: 0 }, className = '' }) {
  const offsetX = mouseNorm.x * -10;
  const offsetY = mouseNorm.y * -10;

  return (
    <div
      className={`relative pointer-events-none select-none transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
    >
      <div className="relative animate-astronaut-float-slow">
        {/* Nhãn module AI */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-purple-950/90 border border-purple-500/50 text-[9px] font-mono text-purple-200 shadow-xl backdrop-blur-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          <span>[AI DEMUCS EXTRACTION MODULE // CABLE ANCHOR]</span>
        </div>

        {/* Cáp chùm năng lượng laser nối từ phi hành gia vào quả cầu trung tâm */}
        <svg
          className="absolute top-12 left-20 w-44 h-32 overflow-visible pointer-events-none opacity-70"
          viewBox="0 0 160 100"
        >
          <path
            d="M 10 30 Q 70 80, 150 20"
            fill="none"
            stroke="url(#cable-purple-cyan)"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            className="animate-cable-pulse"
          />
          <path
            d="M 10 30 Q 80 -10, 150 20"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.6"
          />
          <circle cx="150" cy="20" r="3.5" fill="#06b6d4" className="animate-ping" />
          <defs>
            <linearGradient id="cable-purple-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Vector SVG Phi hành gia kỹ sư đang thao tác kéo cáp */}
        <svg
          className="w-28 h-36 sm:w-32 sm:h-40 drop-shadow-[0_10px_20px_rgba(168,85,247,0.3)]"
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ba lô phản lực kép (Twin Thrusters) */}
          <rect x="22" y="32" width="14" height="44" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <rect x="64" y="32" width="14" height="44" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          {/* Lửa phản lực nhỏ */}
          <ellipse cx="29" cy="79" rx="3.5" ry="5.5" fill="#38bdf8" className="animate-pulse" />
          <ellipse cx="71" cy="79" rx="3.5" ry="5.5" fill="#38bdf8" className="animate-pulse" />

          {/* Chân co tự nhiên */}
          <path d="M 40 84 L 34 104 L 42 118" stroke="#f1f5f9" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 60 84 L 68 106 L 62 120" stroke="#e2e8f0" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="36" y="116" width="12" height="6" rx="2.5" fill="#475569" />
          <rect x="58" y="118" width="12" height="6" rx="2.5" fill="#475569" />

          {/* Thân áo */}
          <rect x="32" y="42" width="36" height="44" rx="9" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Huy hiệu Module AI */}
          <rect x="38" y="50" width="24" height="20" rx="4" fill="#2e1065" stroke="#7e22ce" strokeWidth="1" />
          <text x="43" y="62" fill="#e9d5ff" fontSize="6.5" fontFamily="monospace" fontWeight="bold">AI-4S</text>
          <circle cx="56" cy="65" r="1.5" fill="#22c55e" className="animate-pulse" />

          {/* Tay cầm thiết bị bắn cáp năng lượng */}
          <path d="M 32 50 L 20 62 L 30 72" stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 68 50 L 80 58 L 88 54" stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Thiết bị phát tia */}
          <rect x="84" y="48" width="12" height="12" rx="3" fill="#7e22ce" />
          <circle cx="94" cy="54" r="2.5" fill="#38bdf8" className="animate-ping" />

          {/* Mũ bảo hiểm */}
          <circle cx="50" cy="27" r="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Kính bảo hộ tím neon */}
          <ellipse cx="50" cy="27" rx="15" ry="12" fill="url(#visor-gradient-stem)" />
          <path d="M 42 19 Q 50 17 56 22" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

          <defs>
            <linearGradient id="visor-gradient-stem" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b0764" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/**
 * 3. Phi hành gia Giai đoạn 3: Chuyên gia hiệu chỉnh hòa âm & phách nhịp (Harmonic Calibrator)
 */
export function AstronautCalibrator({ mouseNorm = { x: 0, y: 0 }, className = '' }) {
  const offsetX = mouseNorm.x * 10;
  const offsetY = mouseNorm.y * -8;

  return (
    <div
      className={`relative pointer-events-none select-none transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
    >
      <div className="relative animate-astronaut-float">
        {/* Nhãn Chuyên gia Hòa âm */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-[9px] font-mono text-emerald-200 shadow-xl backdrop-blur-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>[CHIEF CALIBRATOR // BPM ⇄ KEY SYNC]</span>
        </div>

        {/* Bảng điều khiển Hologram nổi phía trước */}
        <div className="absolute -top-2 -right-16 w-28 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/50 shadow-2xl backdrop-blur-xl text-left font-mono text-[8px] space-y-1 z-20">
          <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-slate-800 pb-1">
            <span>BPM LOCK</span>
            <span className="text-emerald-400">128.00</span>
          </div>
          <div className="flex items-center justify-between text-purple-300">
            <span>CAMELOT</span>
            <span className="font-bold text-amber-300">8B ⇄ 6A</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-cyan-400 to-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Vector SVG Phi hành gia cầm Hologram Pad */}
        <svg
          className="w-28 h-36 sm:w-32 sm:h-40 drop-shadow-[0_10px_20px_rgba(16,185,129,0.25)]"
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ba lô */}
          <rect x="24" y="32" width="52" height="52" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <rect x="30" y="38" width="10" height="36" rx="3" fill="#047857" />
          <rect x="60" y="38" width="10" height="36" rx="3" fill="#047857" />

          {/* Chân */}
          <path d="M 38 84 L 30 110 L 22 116" stroke="#f1f5f9" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 62 84 L 66 112 L 74 118" stroke="#cbd5e1" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="16" y="112" width="12" height="6" rx="2.5" fill="#334155" />
          <rect x="68" y="114" width="12" height="6" rx="2.5" fill="#334155" />

          {/* Thân */}
          <rect x="30" y="44" width="40" height="42" rx="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Bộ điều khiển ngực */}
          <rect x="38" y="52" width="24" height="18" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          <circle cx="44" cy="58" r="1.8" fill="#34d399" className="animate-pulse" />
          <circle cx="50" cy="58" r="1.8" fill="#38bdf8" />
          <circle cx="56" cy="58" r="1.8" fill="#fbbf24" className="animate-pulse" />

          {/* Hai tay cầm máy tính Hologram */}
          <path d="M 30 52 L 20 66 L 36 76" stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 70 52 L 78 66 L 64 76" stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Máy tính Pad cầm tay */}
          <rect x="30" y="70" width="40" height="16" rx="3" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
          <line x1="36" y1="76" x2="52" y2="76" stroke="#10b981" strokeWidth="2" />
          <line x1="36" y1="80" x2="64" y2="80" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="62" cy="75" r="2" fill="#a855f7" />

          {/* Mũ bảo hiểm */}
          <circle cx="50" cy="27" r="20.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Kính bảo hộ xanh lục ngọc */}
          <ellipse cx="50" cy="27" rx="16" ry="12.5" fill="url(#visor-gradient-sync)" />
          <path d="M 42 19 Q 50 17 57 23" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          <defs>
            <linearGradient id="visor-gradient-sync" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#022c22" />
              <stop offset="45%" stopColor="#059669" />
              <stop offset="90%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/**
 * 4. Đội phi hành gia Giai đoạn 4: Bay lướt chỉ đường vào Cổng Studio Launchpad (Warp Pilots)
 */
export function AstronautWarpPilot({ mouseNorm = { x: 0, y: 0 }, isLeft = true, className = '' }) {
  const offsetX = mouseNorm.x * (isLeft ? -14 : 14);
  const offsetY = mouseNorm.y * 12;

  return (
    <div
      className={`relative pointer-events-none select-none transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` }}
    >
      <div className={isLeft ? 'animate-astronaut-float' : 'animate-astronaut-float-slow'}>
        {/* Nhãn phi công */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 border border-cyan-400/60 text-[9px] font-mono text-cyan-300 shadow-xl backdrop-blur-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>{isLeft ? '[WARP PILOT ALPHA // READY]' : '[WARP PILOT BETA // ENGAGE]'}</span>
        </div>

        {/* Vector SVG Phi hành gia bay lướt hướng về tâm */}
        <svg
          className={`w-28 h-36 sm:w-32 sm:h-40 drop-shadow-[0_10px_25px_rgba(6,182,212,0.35)] ${
            !isLeft ? '-scale-x-100' : ''
          }`}
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Lửa phản lực phía sau (Booster Flare) */}
          <path d="M 12 50 L 0 54 L 12 58 Z" fill="#38bdf8" className="animate-pulse" />
          <path d="M 10 70 L -4 76 L 10 82 Z" fill="#ec4899" className="animate-pulse" />

          {/* Ba lô phản lực tốc độ cao */}
          <rect x="14" y="34" width="22" height="48" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />

          {/* Tư thế chân bay lướt xuôi theo dòng chảy không gian */}
          <path d="M 38 78 L 22 96 L 14 114" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 52 82 L 40 102 L 32 120" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="8" y="110" width="12" height="6" rx="2.5" fill="#334155" />
          <rect x="26" y="116" width="12" height="6" rx="2.5" fill="#334155" />

          {/* Thân áo phi hành gia nghiêng về phía trước */}
          <rect x="34" y="38" width="42" height="42" rx="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Biểu tượng Warp Engine */}
          <rect x="44" y="46" width="22" height="18" rx="4" fill="#082f49" stroke="#0ea5e9" strokeWidth="1" />
          <circle cx="55" cy="55" r="4" fill="#38bdf8" className="animate-ping" />

          {/* Tay chỉ thẳng về phía nút Bắt đầu (Call-to-Action) */}
          <path d="M 40 46 L 68 54 L 92 48" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="92" cy="48" r="4.5" fill="#38bdf8" />
          <line x1="94" y1="48" x2="114" y2="48" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />

          {/* Tay phụ giữ thăng bằng */}
          <path d="M 46 62 L 38 74 L 28 80" stroke="#e2e8f0" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Mũ bảo hiểm */}
          <circle cx="56" cy="24" r="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          {/* Kính bảo hộ Cyan rực rỡ */}
          <ellipse cx="58" cy="24" rx="15" ry="12" fill="url(#visor-gradient-warp)" />
          <path d="M 50 16 Q 58 14 65 20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

          <defs>
            <linearGradient id="visor-gradient-warp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="40%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
