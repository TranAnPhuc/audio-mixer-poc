import React from 'react';
import {
  Sparkles,
  Activity,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  ArrowDown,
  Github,
  AudioWaveform,
  CheckCircle2,
  Zap,
  Gauge
} from 'lucide-react';

/**
 * Component LandingPage giới thiệu nền tảng Audio Mashup Studio
 * Phong cách Modern Audio Studio với hiệu ứng Glassmorphism & Neon Glow
 */
export default function LandingPage({ onOpenStudio }) {
  const scrollToStudio = () => {
    if (onOpenStudio) {
      onOpenStudio();
    } else {
      const element = document.getElementById('studio-workspace');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToFeatures = () => {
    const element = document.getElementById('features-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Thanh Điều Hướng Trên Cùng (Navbar) */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Tên Dự Án */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 text-slate-950 shadow-lg shadow-indigo-500/25">
              <AudioWaveform className="w-5 h-5 font-black" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-indigo-300 via-purple-200 to-emerald-300 bg-clip-text text-transparent">
                Audio Mashup Studio
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                CORE AUDIO ENGINE v2.0
              </span>
            </div>
          </div>

          {/* Huy hiệu Trạng thái DSP & Nút Hành Động */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono">FFmpeg Server DSP Ready</span>
            </div>

            <a
              href="https://github.com/TranAnPhuc/audio-mixer-poc"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white transition-colors"
              title="Xem mã nguồn trên GitHub"
            >
              <Github className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={scrollToStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Vào Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative w-full max-w-5xl pt-32 sm:pt-40 pb-20 px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="tracking-wider uppercase text-[11px]">THE NEXT-GEN WEB AUDIO MASHUP STUDIO</span>
        </div>

        {/* Headline Gradient */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl">
          Hòa Âm Thông Minh. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
            Đồng Bộ Phách Nhịp Tức Thì.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-slate-300 text-sm sm:text-lg max-w-2xl leading-relaxed">
          Tự động nhận diện nhịp độ (BPM), căn chỉnh phách bằng thao tác kéo thả trực tiếp trên sóng âm đa tầng và xuất bản phối chất lượng phòng thu ngay trên trình duyệt.
        </p>

        {/* CTA Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={scrollToStudio}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Bắt Đầu Phối Nhạc Ngay</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>

          <button
            type="button"
            onClick={scrollToFeatures}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <span>Tìm Hiểu Tính Năng</span>
          </button>
        </div>

        {/* Micro-Metrics Bar */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full max-w-3xl pt-8 border-t border-slate-800/60 font-mono text-left">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
            <span className="text-indigo-400 font-bold text-lg block">0 Latency</span>
            <span className="text-[11px] text-slate-400">Web Audio Dual Sync</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
            <span className="text-emerald-400 font-bold text-lg block">WSOLA DSP</span>
            <span className="text-[11px] text-slate-400">Pitch-Preserved Stretch</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
            <span className="text-purple-400 font-bold text-lg block">320 kbps</span>
            <span className="text-[11px] text-slate-400">CBR Studio Quality</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
            <span className="text-pink-400 font-bold text-lg block">60 FPS</span>
            <span className="text-[11px] text-slate-400">WebGL & Particle Waves</span>
          </div>
        </div>
      </section>

      {/* 3. Feature Showcase Section */}
      <section id="features-section" className="w-full max-w-6xl py-20 px-4 sm:px-6">
        <div className="text-center mb-14 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            ENGINEERING EXCELLENCE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Nền Tảng Phối Âm Kỹ Thuật Số Đột Phá
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Kết hợp sức mạnh xử lý tín hiệu âm thanh kỹ thuật số (DSP) phía máy chủ với trải nghiệm tương tác trực tiếp chuẩn DAW trên trình duyệt.
          </p>
        </div>

        {/* 3 Trụ Cột Kỹ Thuật (Feature Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: BPM Matching */}
          <div className="group relative p-7 rounded-3xl bg-slate-900/60 border border-slate-800/90 hover:border-indigo-500/50 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between text-left">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight">
                Tự Động Dò & Khớp BPM
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Phân tích xung năng lượng Onset PCM Stream, tự động tính toán tỷ lệ nhịp điệu và co dãn thời gian chuẩn xác bằng thuật toán <span className="text-indigo-300 font-mono">WSOLA atempo</span> mà không làm biến dạng cao độ giọng hát.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-indigo-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pitch-Invariant Stretching</span>
            </div>
          </div>

          {/* Card 2: Mini-DAW Timeline */}
          <div className="group relative p-7 rounded-3xl bg-slate-900/60 border border-slate-800/90 hover:border-purple-500/50 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between text-left">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight">
                Bàn Phối Mini-DAW Trực Quan
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trực quan hóa dải sóng âm đa tầng xếp chồng. Cho phép người dùng nhấp giữ chuột và kéo dải sóng Vocal (Direct Drag Offset) để căn phách từng mili-giây, kèm chế độ nghe thử song song không độ trễ.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-purple-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pointer Capture & Zero Latency</span>
            </div>
          </div>

          {/* Card 3: Studio Sound Quality */}
          <div className="group relative p-7 rounded-3xl bg-slate-900/60 border border-slate-800/90 hover:border-emerald-500/50 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between text-left">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight">
                Chất Lượng Âm Thanh Phòng Thu
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tự động cân bằng biên độ Gain Staging tỷ lệ 1.0 : 0.75, triệt tiêu méo tiếng số bằng bộ giới hạn Peak Limiter và mã hóa MP3 320kbps CBR kèm hỗ trợ phát trực tuyến HTTP 206 Partial Content.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>True Peak Limiter & Gain Staged</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
