import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getFrequencyData, getAudioFrequencies } from '../utils/vinylAudioEngine';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';
import { CAMERA_PRESETS, clampWaveGain } from '../utils/terrainConfig';

const RIBBON_WIDTH = 11.0;
const RIBBON_DEPTH = 6.8;
const SEG_X = 64;
const SEG_Z = 32;

/**
 * AudioTerrain3D — Dải Lụa Ánh Sáng Cực Quang Hữu Cơ (Fluid Aurora Particle Ribbon)
 * Thay thế hoàn toàn lưới 32 đường line cứng nhắc bằng mặt cong dải lụa bồng bềnh hữu cơ
 * kết hợp trường hạt ánh sáng cực quang chuyển động theo dải tần âm thanh thời gian thực.
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

    gsap.to(camera.position, {
      x: targetConfig.position[0],
      y: targetConfig.position[1],
      z: targetConfig.position[2],
      duration: 1.0,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });

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
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.065);

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const initialPreset = CAMERA_PRESETS[currentPreset] || CAMERA_PRESETS.isometric;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(...initialPreset.position);
    currentLookAtRef.current.set(...initialPreset.lookAt);
    camera.lookAt(currentLookAtRef.current);
    cameraRef.current = camera;

    // 2. Khởi tạo WebGLRenderer với khử răng cưa & Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Group tổng chứa dải lụa cực quang để xử lý Mouse Parallax
    const visualizerGroup = new THREE.Group();
    scene.add(visualizerGroup);

    // 3. Hệ thống Chiếu Sáng Điêu Khắc Dải Lụa (Sculptural Aurora Lighting)
    const primaryColor = new THREE.Color(ambientColors?.hexPrimary || '#d97706');
    const glowColor = new THREE.Color(ambientColors?.hexSecondary || '#f59e0b');

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const auroraKeyLight = new THREE.DirectionalLight(primaryColor, 2.4);
    auroraKeyLight.position.set(4, 7, 5);
    scene.add(auroraKeyLight);

    const auroraRimLight = new THREE.DirectionalLight(glowColor, 1.8);
    auroraRimLight.position.set(-5, 4, -4);
    scene.add(auroraRimLight);

    // 4. Chuẩn bị đường bao Gauss theo trục X (Gaussian Width Envelope)
    const envelope = new Float32Array(SEG_X + 1);
    for (let i = 0; i <= SEG_X; i++) {
      const normalizedX = (i / SEG_X) * 2 - 1; // [-1, 1]
      envelope[i] = Math.pow(Math.cos((normalizedX * Math.PI) / 2), 2.0);
    }

    // 5. DỰNG DẢI LỤA CHÍNH (Primary Fluid Aurora Ribbon Mesh)
    const ribbonGeom = new THREE.PlaneGeometry(RIBBON_WIDTH, RIBBON_DEPTH, SEG_X, SEG_Z);
    ribbonGeom.rotateX(-Math.PI / 2); // Nằm ngang mặt phẳng X-Z

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: glowColor,
      emissiveIntensity: 0.32,
      metalness: 0.25,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
    ribbonMesh.position.set(0, 0, -1.2);
    visualizerGroup.add(ribbonMesh);

    // Dải lụa thứ cấp tạo độ sâu xếp lớp (Secondary Wave Ribbon Layer)
    const ribbonGeom2 = new THREE.PlaneGeometry(RIBBON_WIDTH * 1.05, RIBBON_DEPTH * 0.9, SEG_X, SEG_Z);
    ribbonGeom2.rotateX(-Math.PI / 2);

    const ribbonMat2 = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: primaryColor,
      emissiveIntensity: 0.22,
      metalness: 0.15,
      roughness: 0.45,
      transparent: true,
      opacity: 0.38,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const ribbonMesh2 = new THREE.Mesh(ribbonGeom2, ribbonMat2);
    ribbonMesh2.position.set(0, -0.15, -1.2);
    visualizerGroup.add(ribbonMesh2);

    // 6. TRƯỜNG HẠT BỤI ÁNH SÁNG CỰC QUANG (Aurora Sparkles Particle Field)
    const sparkleCount = 85;
    const sparkleGeom = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleSpeeds = [];

    for (let p = 0; p < sparkleCount; p++) {
      sparklePositions[p * 3 + 0] = (Math.random() - 0.5) * RIBBON_WIDTH * 1.2;
      sparklePositions[p * 3 + 1] = Math.random() * 2.8 + 0.1;
      sparklePositions[p * 3 + 2] = (Math.random() - 0.5) * RIBBON_DEPTH - 1.2;

      sparkleSpeeds.push({
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.12 + Math.random() * 0.25,
        vz: (Math.random() - 0.5) * 0.12,
        phase: Math.random() * Math.PI * 2
      });
    }

    sparkleGeom.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: glowColor,
      size: 0.05,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sparklePoints = new THREE.Points(sparkleGeom, sparkleMat);
    visualizerGroup.add(sparklePoints);

    // 7. Theo dõi chuột tạo chuyển động Parallax tự nhiên
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = nx * 0.18;
      mouseRef.current.targetY = ny * 0.12;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // 8. Xử lý co giãn kích thước (Responsive Resize)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. RENDER LOOP UỐN LƯỢN DẢI LỤA HỮU CƠ (Organic Harmonic Waveform)
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

      visualizerGroup.rotation.y = mouseRef.current.x;
      visualizerGroup.rotation.x = -mouseRef.current.y * 0.5;

      // Luôn cập nhật điểm nhìn camera theo vector currentLookAt (hỗ trợ chuyển đổi mượt bằng GSAP)
      camera.lookAt(currentLookAtRef.current);

      // Trích xuất dữ liệu tần số âm thanh thời gian thực
      const freqData = getFrequencyData(32);
      const { bassEnergy } = getAudioFrequencies();
      const currentGain = waveGainRef.current;
      const isActuallyPlaying = isPlaying;

      const pos1 = ribbonGeom.attributes.position.array;
      const pos2 = ribbonGeom2.attributes.position.array;
      const cols = SEG_X + 1;
      const rows = SEG_Z + 1;

      // Uốn lượn độ cao từng đỉnh lưới theo dải tần âm thanh và các sóng điều hòa tự nhiên
      for (let j = 0; j < rows; j++) {
        const normZ = j / SEG_Z; // 0 (gần) -> 1 (xa)
        const depthDamp = Math.max(0.4, 1.0 - normZ * 0.5);

        for (let i = 0; i < cols; i++) {
          const idx = (j * cols + i) * 3;
          const x = pos1[idx];
          const envX = envelope[i];

          // Lấy mẫu tần số âm thanh từ tâm tỏa ra hai bên
          const centerDist = Math.abs((i / SEG_X) - 0.5) * 2;
          const freqIndex = Math.min(31, Math.floor((1 - centerDist) * 31));
          const amp = freqData[freqIndex] || 0;

          // Các dải sóng điều hòa hữu cơ (Organic Waves & Flow)
          const harmonic1 = Math.sin(x * 0.75 + time * 0.0022 - normZ * 2.8) * 0.38;
          const harmonic2 = Math.cos(x * 1.4 - time * 0.0018 + normZ * 3.4) * 0.22;
          const bassRipple = Math.sin(time * 0.004 + x * 0.8) * (bassEnergy * 0.55);

          let y1 = 0;
          let y2 = 0;

          if (isActuallyPlaying) {
            const dynamicAmp = Math.pow(amp, 1.3) * (1.5 + bassEnergy * 2.0) * currentGain;
            y1 = (dynamicAmp + harmonic1 + harmonic2 + bassRipple) * envX * depthDamp;
            y2 = (dynamicAmp * 0.85 + harmonic2 - harmonic1 * 0.5) * envX * depthDamp - 0.12;
          } else {
            // Khi dừng: Nhịp thở tĩnh lặng thư giãn
            const gentleBreathe = Math.sin(time * 0.0014 + x * 0.5 - normZ * 1.5) * 0.12;
            y1 = gentleBreathe * envX;
            y2 = gentleBreathe * 0.7 * envX - 0.1;
          }

          pos1[idx + 1] = THREE.MathUtils.lerp(pos1[idx + 1], y1, 0.28);
          pos2[idx + 1] = THREE.MathUtils.lerp(pos2[idx + 1], y2, 0.24);
        }
      }

      ribbonGeom.attributes.position.needsUpdate = true;
      ribbonGeom.computeVertexNormals();

      ribbonGeom2.attributes.position.needsUpdate = true;
      ribbonGeom2.computeVertexNormals();

      // Cường độ phát sáng dải lụa bừng lên theo nhịp bass
      ribbonMat.emissiveIntensity = isActuallyPlaying ? 0.30 + bassEnergy * 0.75 : 0.18;
      ribbonMat2.emissiveIntensity = isActuallyPlaying ? 0.20 + bassEnergy * 0.45 : 0.12;

      // Cập nhật chuyển động các hạt bụi cực quang lơ lửng
      const sparkPos = sparkleGeom.attributes.position.array;
      for (let p = 0; p < sparkleCount; p++) {
        const pIdx = p * 3;
        const sp = sparkleSpeeds[p];

        sparkPos[pIdx + 0] += sp.vx;
        sparkPos[pIdx + 1] += sp.vy * (isActuallyPlaying ? 1 + bassEnergy * 1.5 : 1);
        sparkPos[pIdx + 2] += sp.vz;

        // Vượt quá chiều cao: Tái sinh lơ lửng lại mặt dưới dải lụa
        if (sparkPos[pIdx + 1] > 3.6) {
          sparkPos[pIdx + 0] = (Math.random() - 0.5) * RIBBON_WIDTH * 1.1;
          sparkPos[pIdx + 1] = 0.1;
          sparkPos[pIdx + 2] = (Math.random() - 0.5) * RIBBON_DEPTH - 1.2;
        }
      }
      sparkleGeom.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 10. Dọn dẹp tài nguyên triệt để khi unmount (Zero Memory Leaks)
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(currentLookAtRef.current);

      ribbonGeom.dispose();
      ribbonMat.dispose();
      ribbonGeom2.dispose();
      ribbonMat2.dispose();
      sparkleGeom.dispose();
      sparkleMat.dispose();

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
      {/* CỤM ĐIỀU KHIỂN GIAO DIỆN TỐI GIẢN SCANDINAVIAN (CAMERA PRESETS & GAIN) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#0f121a]/85 backdrop-blur-xl border border-white/10 shadow-xl">
          
          {/* Các nút chuyển góc nhìn tối giản */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/[0.06]">
            {Object.values(CAMERA_PRESETS).map((p) => {
              const isActive = currentPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  onMouseEnter={playHoverBlip}
                  className={`relative px-2.5 py-1.2 rounded-lg text-[10px] font-medium tracking-wide transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-white/15 border-amber-400/70 text-amber-300 font-semibold shadow-sm'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  title={`Góc nhìn: ${p.label}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cụm nút Gain độ nhạy */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-black/40 border border-white/[0.06] text-[10px] font-mono text-slate-300">
            <span className="text-[9px] text-slate-400 font-semibold">GAIN:</span>
            <button
              type="button"
              onClick={() => handleGainChange(-0.2)}
              onMouseEnter={playHoverBlip}
              disabled={waveGain <= 0.4}
              className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 flex items-center justify-center disabled:opacity-30 text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
              title="Giảm biên độ sóng (-0.2x)"
            >
              -
            </button>
            <span className="px-1 text-[10px] min-w-[28px] text-center font-bold text-amber-400 tabular-nums">
              {waveGain.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => handleGainChange(0.2)}
              onMouseEnter={playHoverBlip}
              disabled={waveGain >= 2.4}
              className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 flex items-center justify-center disabled:opacity-30 text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
              title="Tăng biên độ sóng (+0.2x)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Khung Canvas Three.js cho Dải Lụa Cực Quang 3D */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[320px] max-h-[480px] cursor-grab active:cursor-grabbing relative flex items-center justify-center"
      />
    </div>
  );
}
