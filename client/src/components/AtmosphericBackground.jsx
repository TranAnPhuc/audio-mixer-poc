import React, { useEffect, useRef, useMemo } from 'react';
import { LOFI_SCENES, DEFAULT_SCENE, getSceneById } from '../data/lofiScenes';

/**
 * AtmosphericBackground — Nền không gian Lofi nghệ thuật toàn màn hình
 * Hỗ trợ chuyển cảnh cross-fade êm dịu (~1000ms duration) giữa 4 cảnh:
 * - Rainy Window: Mưa đêm rơi tí tách trên canvas
 * - Cozy Cafe: Bokeh tròn ấm áp trôi lững lờ
 * - Sunset Loft: Hạt bụi nắng hoàng hôn bay theo gió
 * - Zen Vinyl Deck: Ánh hào quang 2700K tĩnh lặng tập trung mâm đĩa
 */
export default function AtmosphericBackground({ currentScene, className = '' }) {
  const canvasRef = useRef(null);

  // Chuẩn hóa activeScene từ object hoặc string id
  const activeScene = useMemo(() => {
    if (!currentScene) return DEFAULT_SCENE;
    if (typeof currentScene === 'string') return getSceneById(currentScene);
    return currentScene.id ? currentScene : DEFAULT_SCENE;
  }, [currentScene]);

  // Hiệu ứng hạt Procedural trên Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const effectType = activeScene.canvasEffect || 'rain';

    // Tạo các hạt đặc trưng theo từng hiệu ứng cảnh
    let particles = [];
    const initParticles = () => {
      particles = [];
      const count = effectType === 'rain' ? 90 : effectType === 'dust' ? 55 : effectType === 'bokeh' ? 30 : 25;

      for (let i = 0; i < count; i++) {
        if (effectType === 'rain') {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            length: Math.random() * 22 + 14,
            speed: Math.random() * 10 + 12,
            wind: -1.5,
            opacity: Math.random() * 0.35 + 0.15,
            thickness: Math.random() * 1.2 + 0.8
          });
        } else if (effectType === 'bokeh') {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 24 + 10,
            speedY: -(Math.random() * 0.35 + 0.15),
            speedX: (Math.random() - 0.5) * 0.25,
            alpha: Math.random() * 0.18 + 0.05,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.02 + 0.01
          });
        } else if (effectType === 'dust') {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.2 + 1.0,
            speedY: -(Math.random() * 0.35 + 0.1),
            speedX: Math.random() * 0.45 + 0.15,
            alpha: Math.random() * 0.4 + 0.2,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.03 + 0.01
          });
        } else {
          // Zen deck: Micro motes tĩnh tại
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5 + 0.8,
            speedY: -(Math.random() * 0.2 + 0.05),
            speedX: (Math.random() - 0.5) * 0.15,
            alpha: Math.random() * 0.25 + 0.08,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    };

    initParticles();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Hiệu ứng Zen Deck: Hào quang ấm 2700K thở nhịp nhàng ở tâm mâm đĩa
      if (effectType === 'zen') {
        const breathing = 0.18 + Math.sin(tick * 0.02) * 0.05;
        const radialGlow = ctx.createRadialGradient(
          width * 0.5,
          height * 0.58,
          50,
          width * 0.5,
          height * 0.58,
          Math.min(width, height) * 0.65
        );
        radialGlow.addColorStop(0, `rgba(251, 191, 36, ${breathing})`);
        radialGlow.addColorStop(0.4, `rgba(217, 119, 6, ${breathing * 0.45})`);
        radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radialGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Vẽ từng loại hạt
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (effectType === 'rain') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.wind * (p.length / p.speed), p.y + p.length);
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.opacity})`;
          ctx.lineWidth = p.thickness;
          ctx.lineCap = 'round';
          ctx.stroke();

          p.y += p.speed;
          p.x += p.wind;

          if (p.y > height) {
            p.y = -p.length;
            p.x = Math.random() * (width + 100);
          }
        } else if (effectType === 'bokeh') {
          p.phase += p.pulseSpeed;
          const currentAlpha = p.alpha + Math.sin(p.phase) * (p.alpha * 0.35);

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(251, 191, 36, ${currentAlpha})`);
          grad.addColorStop(0.6, `rgba(245, 158, 11, ${currentAlpha * 0.4})`);
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.phase * 0.5) * 0.15;

          if (p.y < -p.radius * 2) {
            p.y = height + p.radius;
            p.x = Math.random() * width;
          }
        } else if (effectType === 'dust') {
          p.phase += p.pulseSpeed;
          const currentAlpha = p.alpha + Math.sin(p.phase) * (p.alpha * 0.3);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(254, 215, 170, ${currentAlpha})`;
          ctx.shadowColor = 'rgba(249, 115, 22, 0.4)';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;

          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.phase) * 0.25;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x > width + 10) {
            p.x = -10;
          }
        } else {
          // Zen motes
          p.phase += 0.015;
          const currentAlpha = p.alpha + Math.sin(p.phase) * (p.alpha * 0.25);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(253, 230, 138, ${currentAlpha})`;
          ctx.fill();

          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeScene.id, activeScene.canvasEffect]);

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Các lớp Gradient chuyển đổi mềm mại bằng CSS cross-fade (1000ms duration) */}
      {LOFI_SCENES.map((scene) => {
        const isCurrent = scene.id === activeScene.id;
        return (
          <div
            key={scene.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isCurrent ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: scene.theme.bgGradient }}
          />
        );
      })}

      {/* KHUNG CẢNH NỀN CĂN PHÒNG LOFI: CỬA SỔ VÒM ĐÓN NẮNG & CHIỀU SÂU KHÔNG GIAN */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        {/* 1. Khung cửa sổ vòm đón nắng mai (Aesthetic Arch Studio Window) */}
        <div className="relative w-[92vw] max-w-[820px] h-[65vh] max-h-[580px] rounded-t-[220px] border-[3px] border-white/10 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent shadow-[0_0_100px_rgba(254,243,199,0.08)] flex flex-col items-center justify-between overflow-hidden">
          {/* Cảnh trời & vệt mây xa xăm qua ô kính */}
          <div className="absolute inset-0 opacity-40 bg-gradient-to-t from-transparent via-amber-200/10 to-sky-200/10" />

          {/* Nan chia ô kính chữ thập thanh lịch kiểu Bắc Âu */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/10" />
          <div className="absolute inset-x-0 top-1/3 h-[2px] bg-white/10" />
          <div className="absolute inset-x-0 top-2/3 h-[2px] bg-white/10" />

          {/* Vệt ánh sáng trời chiếu rọi từ trên vòm */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[220px] rounded-full bg-amber-100/15 blur-3xl pointer-events-none" />
        </div>

        {/* 2. Dải luồng nắng xiên tự nhiên (Volumetric Sunbeam Light Rays) */}
        <div
          className="absolute -top-10 -left-20 w-[140vw] h-[120vh] pointer-events-none transform -rotate-12 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse at 15% 10%, rgba(254, 240, 138, 0.16) 0%, rgba(253, 230, 138, 0.06) 45%, transparent 75%)'
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-[60vw] h-[70vh] pointer-events-none transform -rotate-25 opacity-60"
          style={{
            background:
              'linear-gradient(135deg, rgba(254, 243, 199, 0.14) 0%, rgba(251, 191, 36, 0.04) 50%, transparent 80%)'
          }}
        />

        {/* 3. Dây đèn Fairy Lights ấm cúng treo trên viền phòng */}
        <div className="absolute top-4 inset-x-0 flex items-center justify-around px-8 sm:px-16 pointer-events-none opacity-85">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{
                transform: `translateY(${Math.sin((i / 9) * Math.PI) * 16}px)`
              }}
            >
              <div className="w-[1px] h-3 bg-white/20" />
              <div
                className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-300/60 shadow-[0_0_10px_#fde68a]"
                style={{
                  animation: `pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.35}s`
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lớp Canvas vẽ hiệu ứng hạt procedural (Mưa rơi, Hạt bụi nắng, Bokeh cà phê, Ánh hào quang Zen) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ease-in-out"
      />

      {/* Lớp Vignette viền mềm mại giúp tập trung thị giác êm ái mà không bị tối đen */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(15, 23, 42, 0.22) 85%, rgba(15, 23, 42, 0.45) 100%)'
        }}
      />

      {/* Hiệu ứng tia quét ngang hoài niệm Analog Scanline */}
      <div className="absolute inset-0 scanline-overlay opacity-25 pointer-events-none" />
    </div>
  );
}
