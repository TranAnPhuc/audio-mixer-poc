import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getFrequencyData, getAudioFrequencies } from '../utils/vinylAudioEngine';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';
import { CAMERA_PRESETS, clampWaveGain } from '../utils/terrainConfig';

const NUM_LINES = 32;
const POINTS_PER_LINE = 64;
const TERRAIN_WIDTH = 9.6;
const LINE_SPACING_Z = 0.38;

/**
 * AudioTerrain3D — Sóng Âm Địa Hình Thác Nước 3D (Waterfall Waveform Terrain)
 * Tích hợp GSAP Camera Transitions mượt mà & điều chỉnh độ nhạy sóng waveGain
 */
export default function AudioTerrain3D({ ambientColors, isPlaying }) {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // State điều khiển giao diện
  const [currentPreset, setCurrentPreset] = useState('isometric');
  const [waveGain, setWaveGain] = useState(1.0);

  // Refs duy trì trạng thái cho Three.js render loop & GSAP
  const cameraRef = useRef(null);
  const currentLookAtRef = useRef(new THREE.Vector3(...CAMERA_PRESETS.isometric.lookAt));
  const waveGainRef = useRef(1.0);

  // Đồng bộ waveGainRef với state
  useEffect(() => {
    waveGainRef.current = waveGain;
  }, [waveGain]);

  // Chuyển đổi góc nhìn camera mượt mà bằng GSAP
  const handlePresetChange = (presetKey) => {
    if (presetKey === currentPreset) return;
    playHapticClick();
    setCurrentPreset(presetKey);

    const targetConfig = CAMERA_PRESETS[presetKey];
    if (!targetConfig || !cameraRef.current) return;

    const camera = cameraRef.current;
    const lookAt = currentLookAtRef.current;

    // 1. Tween vị trí camera (camera.position) trong 1.0 giây
    gsap.to(camera.position, {
      x: targetConfig.position[0],
      y: targetConfig.position[1],
      z: targetConfig.position[2],
      duration: 1.0,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });

    // 2. Tween mục tiêu nhìn của camera (currentLookAt) đồng thời
    gsap.to(lookAt, {
      x: targetConfig.lookAt[0],
      y: targetConfig.lookAt[1],
      z: targetConfig.lookAt[2],
      duration: 1.0,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });
  };

  // Điều chỉnh hệ số nhạy sóng (waveGain)
  const handleGainChange = (delta) => {
    playHapticClick();
    setWaveGain((prev) => clampWaveGain(prev + delta));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Khởi tạo Scene & Camera theo preset hiện tại
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.075);

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const initialPreset = CAMERA_PRESETS[currentPreset] || CAMERA_PRESETS.isometric;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(...initialPreset.position);
    currentLookAtRef.current.set(...initialPreset.lookAt);
    camera.lookAt(currentLookAtRef.current);
    cameraRef.current = camera;

    // 2. Khởi tạo WebGLRenderer với khử răng cưa
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Group chứa toàn bộ địa hình sóng âm để xoay góc parallax
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // 3. Chuẩn bị đường cong bao (Gaussian / Bell Envelope) để 2 bên sườn phẳng mượt
    const envelope = new Float32Array(POINTS_PER_LINE);
    for (let i = 0; i < POINTS_PER_LINE; i++) {
      const normalizedX = (i / (POINTS_PER_LINE - 1)) * 2 - 1; // [-1, 1]
      envelope[i] = Math.pow(Math.cos((normalizedX * Math.PI) / 2), 2.2);
    }

    // 4. Khởi tạo 32 đường sóng Line
    const lines = [];
    const geometries = [];
    const materials = [];

    // Bộ đệm lịch sử độ cao: 32 dòng x 64 điểm
    const historyBuffer = [];
    for (let j = 0; j < NUM_LINES; j++) {
      historyBuffer.push(new Float32Array(POINTS_PER_LINE));
    }

    const primaryColor = new THREE.Color(ambientColors?.hexPrimary || '#d97706');
    const glowColor = new THREE.Color(ambientColors?.hexSecondary || '#f59e0b');

    for (let j = 0; j < NUM_LINES; j++) {
      const positions = new Float32Array(POINTS_PER_LINE * 3);
      const zPos = -j * LINE_SPACING_Z;

      for (let i = 0; i < POINTS_PER_LINE; i++) {
        const xPos = ((i / (POINTS_PER_LINE - 1)) - 0.5) * TERRAIN_WIDTH;
        positions[i * 3] = xPos;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = zPos;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometries.push(geometry);

      // Độ mờ giảm dần về phía chân trời (Atmospheric Depth Fade)
      const depthRatio = j / (NUM_LINES - 1);
      const baseOpacity = Math.max(0.18, 0.95 - depthRatio * 0.72);

      const material = new THREE.LineBasicMaterial({
        color: primaryColor.clone().lerp(glowColor, 0.25 * (1 - depthRatio)),
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        linewidth: 1.5
      });
      materials.push(material);

      const line = new THREE.Line(geometry, material);
      lines.push(line);
      terrainGroup.add(line);
    }

    // 5. Thêm các hạt bụi lơ lửng phía trên đỉnh núi sóng âm (Subtle ambient sparks)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      particlePos[p * 3] = (Math.random() - 0.5) * TERRAIN_WIDTH * 1.1;
      particlePos[p * 3 + 1] = Math.random() * 2.2 + 0.2;
      particlePos[p * 3 + 2] = -Math.random() * (NUM_LINES * LINE_SPACING_Z);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: primaryColor,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    terrainGroup.add(particleSystem);

    // 6. Theo dõi chuột để tạo hiệu ứng nghiêng góc nhìn Parallax
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = nx * 0.22;
      mouseRef.current.targetY = ny * 0.14;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // 7. Xử lý co giãn kích thước màn hình (Resize)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Render Loop với cơ chế cuộn thác nước (Waterfall Flow)
    let animationFrameId = null;
    let lastTime = performance.now();
    const targetFpsInterval = 1000 / 60;

    const animate = (time) => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = time - lastTime;
      if (elapsed < targetFpsInterval) return;
      lastTime = time - (elapsed % targetFpsInterval);

      // Cập nhật parallax chuột mượt mà (Lerp damping factor = 0.05)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      terrainGroup.rotation.y = mouseRef.current.x;
      terrainGroup.rotation.x = -mouseRef.current.y * 0.6;

      // Luôn cập nhật điểm nhìn camera theo vector currentLookAt (hỗ trợ chuyển đổi mượt bằng GSAP)
      camera.lookAt(currentLookAtRef.current);

      // Đọc dữ liệu tần số âm thanh từ Web Audio Engine
      const freqData = getFrequencyData(32);
      const { bassEnergy } = getAudioFrequencies();
      const currentGain = waveGainRef.current;

      // Tạo hàng sóng mới cho dòng đầu tiên (Row 0)
      const newRow = new Float32Array(POINTS_PER_LINE);
      const isActuallyPlaying = isPlaying;

      for (let i = 0; i < POINTS_PER_LINE; i++) {
        if (!isActuallyPlaying) {
          // Trạng thái dừng: sóng phẳng nhẹ nhàng với nhịp thở baseline vi mô
          newRow[i] = Math.sin(time * 0.002 + i * 0.15) * 0.03 * envelope[i];
          continue;
        }

        // Lấy mẫu tần số: đối xứng từ tâm để tạo đỉnh núi hình tháp Unknown Pleasures
        const centerDist = Math.abs((i / (POINTS_PER_LINE - 1)) - 0.5) * 2;
        const freqIndex = Math.min(31, Math.floor((1 - centerDist) * 31));
        const rawAmp = freqData[freqIndex] || 0;

        // Khuếch đại phi tuyến kết hợp hệ số waveGain
        const boostedAmp = Math.pow(rawAmp, 1.35) * (1.6 + bassEnergy * 1.8) * currentGain;
        const noiseRipple = Math.sin(time * 0.005 + i * 0.4) * 0.04;

        newRow[i] = Math.max(0, (boostedAmp + noiseRipple) * envelope[i]);
      }

      // Cơ chế thác đổ: Dịch chuyển toàn bộ lịch sử lùi về phía sau (j: NUM_LINES - 1 -> 1)
      for (let j = NUM_LINES - 1; j > 0; j--) {
        historyBuffer[j].set(historyBuffer[j - 1]);
      }
      historyBuffer[0].set(newRow);

      // Cập nhật vị trí Y của từng đỉnh đường Line
      for (let j = 0; j < NUM_LINES; j++) {
        const positions = geometries[j].attributes.position.array;
        const rowHeights = historyBuffer[j];

        for (let i = 0; i < POINTS_PER_LINE; i++) {
          positions[i * 3 + 1] = rowHeights[i];
        }
        geometries[j].attributes.position.needsUpdate = true;

        // Đổi màu / độ sáng động: Hàng đầu tiên bừng sáng khi có tiếng trống Kick
        const depthRatio = j / (NUM_LINES - 1);
        if (j === 0 && isActuallyPlaying) {
          materials[0].opacity = Math.min(1.0, 0.85 + bassEnergy * 0.35);
        } else {
          materials[j].opacity = Math.max(0.15, (0.95 - depthRatio * 0.72) * (isActuallyPlaying ? 1 : 0.6));
        }
      }

      // Nhẹ nhàng xoay các hạt bụi lơ lửng
      if (particleSystem) {
        particleSystem.rotation.y = time * 0.00015;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 9. Dọn dẹp tài nguyên triệt để khi unmount (Zero Memory Leaks)
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      // Dọn dẹp các tween GSAP đang chạy nếu có
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(currentLookAtRef.current);

      // Giải phóng toàn bộ Geometries và Materials
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      particleGeo.dispose();
      particleMat.dispose();

      // Giải phóng Renderer và WebGL context
      renderer.forceContextLoss();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
    };
  }, [ambientColors, isPlaying]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden">
      {/* CỤM ĐIỀU KHIỂN GIAO DIỆN GLASSMORPHISM (TOP-RIGHT FLOATING CONTROLS) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* 1. Các nút Camera Presets */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg text-[10px] sm:text-[11px] font-sans">
          {Object.values(CAMERA_PRESETS).map((p) => {
            const isActive = currentPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                onMouseEnter={playHoverBlip}
                className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={`Góc nhìn: ${p.label}`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Cụm nút điều chỉnh độ cao sóng Wave Gain */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg text-[10px] sm:text-[11px] font-mono text-slate-300">
          <button
            type="button"
            onClick={() => handleGainChange(-0.2)}
            onMouseEnter={playHoverBlip}
            disabled={waveGain <= 0.4}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Giảm biên độ sóng"
          >
            -
          </button>
          <span className="px-1 text-[10px] min-w-[26px] text-center font-bold text-amber-400">
            {waveGain.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => handleGainChange(0.2)}
            onMouseEnter={playHoverBlip}
            disabled={waveGain >= 2.4}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Tăng biên độ sóng"
          >
            +
          </button>
        </div>
      </div>

      {/* Khung Canvas Three.js cho địa hình sóng âm 3D */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[320px] max-h-[480px] cursor-grab active:cursor-grabbing relative flex items-center justify-center"
      />
    </div>
  );
}
