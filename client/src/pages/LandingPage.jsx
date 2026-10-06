import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AudioWaveform,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  Github,
  Gauge,
  Layers,
  ShieldCheck,
  Disc3,
  Cpu,
  Activity,
  Maximize2,
  Headphones,
  Volume2,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import ThreeAudioVisualizer from '../components/ThreeAudioVisualizer';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

// Đăng ký Plugin GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

/**
 * Custom Audio Reticle Cursor (Tâm Ngắm Âm Thanh Điện Ảnh Riotters Drone)
 */
function AudioReticleCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Chỉ kích hoạt trên thiết bị có chuột (pointer: fine)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' });
    const dotXTo = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'power2' });
    const dotYTo = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'power2' });

    const handlePointerMove = (e) => {
      if (!isVisible) setIsVisible(true);
      xTo(e.clientX);
      yTo(e.clientY);
      dotXTo(e.clientX);
      dotYTo(e.clientY);
    };

    const handlePointerDown = () => setIsClicking(true);
    const handlePointerUp = () => setIsClicking(false);
    const handlePointerLeave = () => setIsVisible(false);

    // Bắt sự kiện hover trên các phần tử tương tác
    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.closest('a') ||
        target.closest('button') ||
        target.closest('[data-cursor-interactive]')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isVisible]);

  return (
    <>
      {/* Vòng ngắm ngoài (Outer Reticle Ring) */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 -ml-5 -mt-5 pointer-events-none z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div
          className={`relative w-10 h-10 rounded-full border transition-all duration-200 flex items-center justify-center ${
            isHovered
              ? 'scale-150 border-cyan-400 bg-cyan-500/10 rotate-45'
              : 'scale-100 border-indigo-500/60 dark:border-indigo-400/60 rotate-0'
          } ${isClicking ? 'scale-90 border-pink-500 bg-pink-500/20' : ''}`}
        >
          {/* Vạch chia độ góc tâm ngắm */}
          <span className="absolute -top-1 w-1 h-0.5 bg-indigo-400 dark:bg-indigo-300" />
          <span className="absolute -bottom-1 w-1 h-0.5 bg-indigo-400 dark:bg-indigo-300" />
          <span className="absolute -left-1 w-0.5 h-1 bg-indigo-400 dark:bg-indigo-300" />
          <span className="absolute -right-1 w-0.5 h-1 bg-indigo-400 dark:bg-indigo-300" />
        </div>
      </div>

      {/* Điểm laser trung tâm (Laser Dot) */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 -ml-1 -mt-1 pointer-events-none z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ willChange: 'transform' }}
      >
        <div
          className={`w-2 h-2 rounded-full transition-transform duration-150 ${
            isHovered ? 'scale-150 bg-emerald-400' : 'scale-100 bg-indigo-500 dark:bg-indigo-400'
          }`}
        />
      </div>
    </>
  );
}

/**
 * Trang Landing Page Điện Ảnh (Cinematic High-Tech Experience)
 * Lấy cảm hứng từ drone.riotters.com, kết hợp Three.js, GSAP ScrollTrigger và HUD Telemetry
 */
export default function LandingPage() {
  const { isDark } = useTheme();

  // Ref theo dõi tiến trình Scroll toàn trang (0.0 đến 1.0) cho Three.js
  const scrollProgressRef = useRef(0);

  // Refs cho các phần tử DOM GSAP
  const heroRef = useRef(null);
  const headlineLine1Ref = useRef(null);
  const headlineLine2Ref = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroDescRef = useRef(null);
  const heroCtaRef = useRef(null);
  const heroMetricsRef = useRef(null);

  // Section Pinned Ref & Cards
  const pinnedSectionRef = useRef(null);
  const pinnedCard1Ref = useRef(null);
  const pinnedCard2Ref = useRef(null);
  const pinnedCard3Ref = useRef(null);
  const pinnedPhaseIndicatorRef = useRef(null);
  const pinnedProgressBarRef = useRef(null);

  // Section Workflow Spine Line Ref
  const workflowSectionRef = useRef(null);
  const workflowSpineRef = useRef(null);

  // State hiển thị tọa độ HUD giả lập thời gian thực
  const [hudCoord, setHudCoord] = useState({ x: '130.00', y: '44.10' });
  const [activePhase, setActivePhase] = useState(1);

  useEffect(() => {
    // Cập nhật tọa độ chuột giả lập trên HUD
    const handleMouseMove = (e) => {
      const normX = ((e.clientX / window.innerWidth) * 100).toFixed(2);
      const normY = ((e.clientY / window.innerHeight) * 100).toFixed(2);
      setHudCoord({ x: normX, y: normY });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 1. Đồng bộ GSAP ScrollTrigger Toàn Trang với Three.js
    const pageScrollTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;
      }
    });

    // 2. Cinematic Entrance cho Hero Section
    const entranceTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    entranceTl
      .fromTo(
        heroBadgeRef.current,
        { opacity: 0, y: -20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, delay: 0.1 }
      )
      .fromTo(
        [headlineLine1Ref.current, headlineLine2Ref.current],
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.2 },
        '-=0.4'
      )
      .fromTo(
        heroDescRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.6'
      )
      .fromTo(
        heroCtaRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7 },
        '-=0.5'
      )
      .fromTo(
        heroMetricsRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.4'
      );

    // 3. Section Pinned: "Phẫu Thuật Lõi Hòa Âm" (Pinned Tech Breakdown)
    if (pinnedSectionRef.current) {
      const pinTrigger = ScrollTrigger.create({
        trigger: pinnedSectionRef.current,
        start: 'top top',
        end: '+=2400',
        pin: true,
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          if (p < 0.33) {
            setActivePhase(1);
          } else if (p < 0.66) {
            setActivePhase(2);
          } else {
            setActivePhase(3);
          }

          if (pinnedProgressBarRef.current) {
            pinnedProgressBarRef.current.style.width = `${p * 100}%`;
          }
        }
      });

      // Timeline chuyển đổi 3 thẻ kính HUD
      const pinnedTl = gsap.timeline({
        scrollTrigger: {
          trigger: pinnedSectionRef.current,
          start: 'top top',
          end: '+=2400',
          scrub: 0.8
        }
      });

      // Card 1 xuất hiện rồi rút lui
      pinnedTl
        .fromTo(
          pinnedCard1Ref.current,
          { opacity: 0, x: -100, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 1 }
        )
        .to(pinnedCard1Ref.current, { opacity: 0, x: -60, scale: 0.95, duration: 0.8 }, '+=0.8')

        // Card 2 xuất hiện từ bên phải rồi rút lui
        .fromTo(
          pinnedCard2Ref.current,
          { opacity: 0, x: 100, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 1 },
          '-=0.2'
        )
        .to(pinnedCard2Ref.current, { opacity: 0, x: 60, scale: 0.95, duration: 0.8 }, '+=0.8')

        // Card 3 xuất hiện từ dưới lên với độ phát sáng cao
        .fromTo(
          pinnedCard3Ref.current,
          { opacity: 0, y: 80, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 1 },
          '-=0.2'
        )
        .to(pinnedCard3Ref.current, { opacity: 0.3, y: -20, duration: 0.6 }, '+=0.8');
    }

    // 4. Section Workflow: Vạch xương sống tiến trình (Spine Scroll Line)
    if (workflowSectionRef.current && workflowSpineRef.current) {
      gsap.fromTo(
        workflowSpineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: workflowSectionRef.current,
            start: 'top 70%',
            end: 'bottom 85%',
            scrub: true
          }
        }
      );
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      pageScrollTrigger.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const scrollToPinnedSection = () => {
    pinnedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden selection:bg-indigo-500 selection:text-white font-sans">
      {/* 0. Custom Reticle Cursor */}
      <AudioReticleCursor />

      {/* 1. SÂN KHẤU 3D THREE.JS TOÀN MÀN HÌNH (Persistent Cinematic WebGL Stage) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ThreeAudioVisualizer scrollProgressRef={scrollProgressRef} />
      </div>

      {/* Nền Gradient mờ dịu */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-200/30 via-transparent to-transparent dark:from-indigo-950/40 dark:via-transparent dark:to-transparent z-0 pointer-events-none" />

      {/* 2. KHUNG VIỀN HUD TELEMETRY LỚP PHỦ TOÀN CẢNH (Riotters Drone HUD Overlay) */}
      <div className="fixed inset-0 z-20 pointer-events-none border border-slate-300/30 dark:border-slate-800/40 m-2 sm:m-4 rounded-3xl flex flex-col justify-between p-4 sm:p-6 text-[10px] font-mono text-slate-400 dark:text-slate-500 select-none">
        {/* Góc trên: Vạch gióng và Tọa độ hệ thống */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="text-indigo-500 font-bold tracking-widest">[SYS.AUDIO_DSP // 44.1KHZ]</span>
            <span className="hidden md:inline text-slate-400 dark:text-slate-600">|</span>
            <span className="hidden md:inline tracking-wider">LATENCY: 0.00MS // ZERO-DRIFT</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Visualizer Bars giả lập */}
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-2 bg-indigo-500 animate-pulse" />
              <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
              <span className="w-0.5 h-1.5 bg-purple-500 animate-pulse" />
              <span className="w-0.5 h-2.5 bg-indigo-400 animate-pulse" />
            </div>
            <span className="font-bold text-emerald-500 dark:text-emerald-400 tracking-widest">
              POS: [X: {hudCoord.x} | Y: {hudCoord.y}]
            </span>
          </div>
        </div>

        {/* Các dấu chữ thập căn góc (Corner Crosshairs) */}
        <div className="absolute top-8 left-8 text-slate-300 dark:text-slate-700">+</div>
        <div className="absolute top-8 right-8 text-slate-300 dark:text-slate-700">+</div>
        <div className="absolute bottom-8 left-8 text-slate-300 dark:text-slate-700">+</div>
        <div className="absolute bottom-8 right-8 text-slate-300 dark:text-slate-700">+</div>

        {/* Góc dưới: Thông số Buffer & Chuẩn Mastering */}
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-3">
            <span>BUFFER: 512_SAMPLES</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">ALGORITHM: WSOLA_ATEMPO</span>
          </div>

          <div className="flex items-center gap-3">
            <span>LIMITER: TRUE_PEAK -0.45dB</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-indigo-500 font-bold">320 KBPS CBR</span>
          </div>
        </div>
      </div>

      {/* 3. THANH ĐIỀU HƯỚNG TRÊN CÙNG (Cinematic Top Bar) */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3 group" data-cursor-interactive="true">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <AudioWaveform className="w-5 h-5 font-black" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 dark:from-indigo-300 dark:via-purple-200 dark:to-emerald-300 bg-clip-text text-transparent">
                Audio Mashup Studio
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                CORE AUDIO ENGINE v2.0
              </span>
            </div>
          </Link>

          {/* Controls & Nút Vào Studio */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FFmpeg DSP Ready</span>
            </div>

            {/* Nút Chuyển Đổi Theme Sáng / Tối */}
            <ThemeToggle />

            {/* GitHub Link */}
            <a
              href="https://github.com/TranAnPhuc/audio-mixer-poc"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Xem mã nguồn trên GitHub"
              data-cursor-interactive="true"
            >
              <Github className="w-4 h-4" />
            </a>

            {/* CTA Button vào Studio */}
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
              data-cursor-interactive="true"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Vào Studio</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 4. HERO SECTION (Cinematic High-Tech Entrance) */}
      <section
        ref={heroRef}
        className="relative z-10 w-full min-h-screen flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto"
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* CỘT TRÁI: Cinematic Typography & Call-to-action */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            {/* Tagline Badge */}
            <div
              ref={heroBadgeRef}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-semibold shadow-inner font-mono"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="tracking-wider uppercase text-[11px]">
                NEXT-GEN WEB AUDIO MASHUP STUDIO // TELEMETRY LINKED
              </span>
            </div>

            {/* Headline Lớn với GSAP Stagger */}
            <div className="space-y-1">
              <h1
                ref={headlineLine1Ref}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-slate-100"
              >
                Hòa Âm Kỹ Thuật Số.
              </h1>
              <h1
                ref={headlineLine2Ref}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 dark:from-indigo-400 dark:via-purple-300 dark:to-emerald-400 bg-clip-text text-transparent"
              >
                Đồng Bộ Phách Nhịp Tức Thì.
              </h1>
            </div>

            {/* Mô tả giải pháp */}
            <p
              ref={heroDescRef}
              className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              Tự động phân tích nhịp độ Onset PCM, căn chỉnh phách bằng thao tác kéo thả trực tiếp trên
              sóng âm đa tầng Mini-DAW và render bản phối chuẩn phòng thu 44.1kHz / 320kbps CBR ngay trên
              trình duyệt với độ trễ bằng 0.
            </p>

            {/* Cụm Nút CTA */}
            <div
              ref={heroCtaRef}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2"
            >
              <Link
                to="/studio"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
                data-cursor-interactive="true"
              >
                <span>Khám Phá Studio Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={scrollToPinnedSection}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-sm"
                data-cursor-interactive="true"
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span>Phẫu Thuật Lõi Hòa Âm</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Micro-Metrics Bar */}
            <div
              ref={heroMetricsRef}
              className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-3 gap-4 w-full max-w-lg font-mono text-left"
            >
              <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-base block">0 Latency</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Web Audio Sync</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base block">WSOLA DSP</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Pitch Preserved</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-base block">320 kbps</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">CBR Master Out</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Không gian trống cho Quả Cầu 3D Three.js và Thẻ HUD nổi */}
          <div className="lg:col-span-5 relative w-full h-[400px] lg:h-[520px] pointer-events-none flex items-center justify-center">
            {/* Thẻ Telemetry HUD nổi bên góc */}
            <div className="absolute top-4 left-2 sm:left-4 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-indigo-500/30 backdrop-blur-xl shadow-xl flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-300 animate-pulse">
              <Headphones className="w-4 h-4 text-indigo-500" />
              <span>BPM Sync: 130 ⇄ 130</span>
            </div>

            <div className="absolute bottom-6 right-2 sm:right-4 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-emerald-500/30 backdrop-blur-xl shadow-xl flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-300">
              <Volume2 className="w-4 h-4 text-emerald-500" />
              <span>Gain Staged: 1.0 : 0.75</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION PINNED: "PHẪU THUẬT LÕI HÒA ÂM" (Pinned Deep Tech Storytelling) */}
      <section
        ref={pinnedSectionRef}
        className="relative z-10 w-full h-screen flex flex-col items-center justify-between py-12 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden"
      >
        {/* Header Thông Tin Telemetry của Phân Đoạn Pinned */}
        <div className="w-full flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
              [DEEP AUDIO TELEMETRY] // 02. PHẪU THUẬT LÕI HÒA ÂM
            </span>
          </div>

          {/* Scrubber Phase Progress Bar */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold text-slate-500">
              PHASE: 0{activePhase} / 03
            </span>
            <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                ref={pinnedProgressBarRef}
                className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 w-0 transition-all duration-75"
              />
            </div>
          </div>
        </div>

        {/* Khung Chứa Các Thẻ Kính HUD Bay Vào Tương Ứng Với Quả Cầu 3D Biến Dạng Ở Giữa */}
        <div className="w-full flex-1 relative flex items-center justify-center my-6">
          {/* Card 1: Onset Analysis (Bên Trái) */}
          <div
            ref={pinnedCard1Ref}
            className="absolute left-0 lg:left-8 max-w-md p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-indigo-500/40 backdrop-blur-2xl shadow-2xl space-y-4 text-left pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-500 font-mono text-xs font-bold">
                <Activity className="w-4 h-4" />
                <span>PHASE 01: ONSET SPECTRAL FLUX</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                44.1 KHZ
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              Phân Tích Onset & Dò Phách Nhịp
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Phân tích đạo hàm phổ năng lượng (Spectral Flux) trên từng khung tín hiệu PCM tức thời. Nhận
              diện chuẩn xác các điểm xung kích trống Kick/Snare và nhịp điệu gốc (BPM) mà không tạo độ trễ pha.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>CONFIDENCE: 99.8%</span>
              <span className="text-emerald-500 font-bold">ZERO PHASE DRIFT</span>
            </div>
          </div>

          {/* Card 2: WSOLA Time-Stretching (Bên Phải) */}
          <div
            ref={pinnedCard2Ref}
            className="absolute right-0 lg:right-8 max-w-md p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-purple-500/40 backdrop-blur-2xl shadow-2xl space-y-4 text-left pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-500 font-mono text-xs font-bold">
                <Cpu className="w-4 h-4" />
                <span>PHASE 02: WSOLA ATEMPO DSP</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                PITCH LOCK
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              Co Dãn Thời Gian WSOLA (Atempo)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Thuật toán Waveform Similarity Overlap-Add tái tổng hợp dải tần âm thanh theo tỷ lệ thời
              gian thực. Tự động đồng bộ tốc độ Vocal với Beat mà giữ nguyên vẹn 100% cao độ (Pitch) và Formant tự nhiên của giọng ca.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>PITCH SHIFT: 0.00 SEMITONES</span>
              <span className="text-purple-500 font-bold">HARMONIC PRESERVED</span>
            </div>
          </div>

          {/* Card 3: True Peak Limiter (Chính Giữa - Phía Dưới) */}
          <div
            ref={pinnedCard3Ref}
            className="absolute bottom-6 max-w-xl p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-emerald-500/40 backdrop-blur-2xl shadow-2xl space-y-4 text-left pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>PHASE 03: TRUE PEAK LIMITING & MASTERING</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                -0.45 dBFS
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              Cân Bằng Gain Staging & Chống Méo Tiếng
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Kiểm soát tự động tỷ lệ biên độ 1.0 (Beat) : 0.75 (Vocal) kết hợp bộ giới hạn đỉnh True Peak
              -0.45 dBFS, triệt tiêu hiện tượng xé tiếng (Inter-sample clipping). Xuất bản MP3 320kbps CBR chuẩn phòng thu thương mại.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>DYNAMIC HEADROOM: SAFE</span>
              <span className="text-emerald-500 font-bold">320 KBPS CBR OUTPUT</span>
            </div>
          </div>
        </div>

        {/* Footer của Section Pinned */}
        <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80 pt-3">
          <span>INTERACTION: SCROLL TO SCRUB THROUGH DSP PHASES</span>
          <span className="text-indigo-400">ENGINE: WEBAUDIO & FFMPEG</span>
        </div>
      </section>

      {/* 6. SECTION WORKFLOW: "QUY TRÌNH CHUẨN STUDIO" (Interactive Pipeline) */}
      <section
        ref={workflowSectionRef}
        className="relative z-10 w-full max-w-5xl py-28 px-4 sm:px-6 mx-auto"
      >
        <div className="text-center mb-20 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
            03 // INTUITIVE PIPELINE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Quy Trình Phối Âm 3 Bước Chuẩn Studio
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Giao diện trực quan kết hợp sức mạnh xử lý âm thanh số chuyên sâu.
          </p>
        </div>

        {/* Cột mốc Timeline với Vạch Tiến Trình GSAP Scrub */}
        <div className="relative flex flex-col items-center">
          {/* Vạch xương sống phát sáng (Vertical Spine Line) */}
          <div className="absolute top-8 bottom-8 w-1 bg-slate-200 dark:bg-slate-800 rounded-full">
            <div
              ref={workflowSpineRef}
              className="w-full h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-400 rounded-full origin-top"
            />
          </div>

          {/* 3 Khối Bước */}
          <div className="w-full space-y-16">
            {/* Bước 1 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 group">
              <div className="md:w-5/12 text-center md:text-right space-y-2">
                <span className="font-mono text-xs text-indigo-500 font-bold">BƯỚC 01 // NHẬP DỮ LIỆU</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Nạp 2 Bản Thu Âm (Acappella & Beat)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Kéo thả file âm thanh vào 2 vùng Dual Dropzone. Hệ thống hỗ trợ MP3, WAV lên đến 25MB và tự động giải mã buffer.
                </p>
              </div>

              {/* Nút mốc tròn giữa */}
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>

              <div className="md:w-5/12 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl text-left font-mono text-xs text-slate-500 space-y-1 shadow-sm">
                <div>FORMAT: MP3 / WAV STEREO</div>
                <div>SAMPLING: 44,100 HZ</div>
                <div className="text-emerald-500">STATUS: READY_FOR_ANALYSIS</div>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="relative flex flex-col md:flex-row-reverse items-center justify-between gap-8 group">
              <div className="md:w-5/12 text-center md:text-left space-y-2">
                <span className="font-mono text-xs text-purple-500 font-bold">BƯỚC 02 // CĂN PHÁCH TRỰC QUAN</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Kéo Trượt Vocal Trên Mini-DAW
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Nhấp giữ chuột và kéo dải sóng Vocal (Direct Drag Offset) để khớp từng phách nhạc. Bật nghe thử song song không độ trễ trước khi render.
                </p>
              </div>

              {/* Nút mốc tròn giữa */}
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-500 flex items-center justify-center text-purple-500 shadow-xl shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <SlidersHorizontal className="w-6 h-6" />
              </div>

              <div className="md:w-5/12 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl text-left font-mono text-xs text-slate-500 space-y-1 shadow-sm">
                <div>OFFSET RANGE: -3000MS ⇄ +3000MS</div>
                <div>PRECISION: 50MS SNAP</div>
                <div className="text-purple-400">PLAYHEAD SYNC: 60 FPS WEBAUDIO</div>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 group">
              <div className="md:w-5/12 text-center md:text-right space-y-2">
                <span className="font-mono text-xs text-emerald-500 font-bold">BƯỚC 03 // XUẤT BẢN MASTER</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Render Chuẩn Phòng Thu 320kbps
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hàng đợi BullMQ phân phối tác vụ xuống FFmpeg Engine, cân bằng âm lượng tự động và xuất file master chuẩn hóa cho phát sóng thương mại.
                </p>
              </div>

              {/* Nút mốc tròn giữa */}
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>

              <div className="md:w-5/12 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl text-left font-mono text-xs text-slate-500 space-y-1 shadow-sm">
                <div>CODEC: LIBMP3LAME 320 KBPS</div>
                <div>RESPONSE: HTTP 206 PARTIAL CONTENT</div>
                <div className="text-emerald-500 font-bold">STATUS: MASTER_DELIVERED</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION FINAL CTA: "STUDIO LAUNCHPAD" (Futuristic Control Deck) */}
      <section className="relative z-10 w-full max-w-5xl py-24 px-4 sm:px-6 mx-auto">
        <div className="relative p-10 sm:p-16 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-indigo-500/40 backdrop-blur-2xl text-center space-y-8 shadow-2xl overflow-hidden group">
          {/* Quầng sáng năng lượng hậu cảnh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/15 via-purple-500/10 to-transparent pointer-events-none" />

          {/* Vạch chia góc High-Tech (L-brackets) */}
          <span className="absolute top-4 left-4 text-xs font-mono text-indigo-400">[ LAUNCHPAD // 01 ]</span>
          <span className="absolute bottom-4 right-4 text-xs font-mono text-emerald-400">[ READY_STATE: 100% ]</span>

          {/* Icon Đĩa Quay */}
          <div className="inline-flex p-4 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 shadow-inner group-hover:rotate-180 transition-transform duration-700">
            <Disc3 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Sẵn Sàng Khởi Tạo Bản Phối Đỉnh Cao?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Trải nghiệm bàn làm việc Mini-DAW trực tiếp trên trình duyệt web của bạn mà không cần cài đặt bất kỳ phần mềm âm thanh phức tạp nào.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/studio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-base font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-[1.04] active:scale-[0.98] transition-all cursor-pointer font-mono"
              data-cursor-interactive="true"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>KHỞI CHẠY STUDIO PHỐI NHẠC</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="pt-4 text-[11px] font-mono text-slate-400">
            AUDIO_MASHUP_SYSTEM // FREE TO USE // LATENCY-FREE PREVIEW
          </div>
        </div>
      </section>

      {/* 8. FOOTER TELEMETRY STRIP */}
      <footer className="relative z-10 w-full py-8 border-t border-slate-200/80 dark:border-slate-900 bg-white/70 dark:bg-slate-950/80 backdrop-blur-xl text-center text-xs text-slate-500 font-mono">
        <p>
          © 2026 Audio Mashup Studio • Engineered with Node.js, Express, FFmpeg, React 18, Three.js & GSAP ScrollTrigger
        </p>
      </footer>
    </div>
  );
}
