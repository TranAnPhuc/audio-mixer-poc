import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

/**
 * Component Quả Cầu Sóng Âm Biến Dạng 3D V2 (Cinematic Multistage Audio Orb & Camera Flight Path)
 * Tích hợp điều phối Camera Flight Path, biến dạng lưới phổ và tản mát hạt ánh sáng theo 4 Stage:
 *  - Stage 1 (0% - 25%): The Chaos & Hero (Góc phải, Camera Z=9.0, biến dạng cơ bản)
 *  - Stage 2 (25% - 60%): AI Stem Extraction (Trượt vào tâm, Camera Orbit nghiêng, dập dềnh sóng cực đại)
 *  - Stage 3 (60% - 85%): Harmonic Calibration (Vòng cung lướt Z=6.5, vành đai bung 2.2x, nhấp nhô rực rỡ)
 *  - Stage 4 (85% - 100%): Space Studio Launch (Flight Path Z->1.0, FOV->110, tản mát vệt sáng warp tunnel)
 */
export default function ThreeAudioVisualizer({
  className = '',
  scrollProgress = 0,
  scrollProgressRef = null
}) {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  // Refs để cập nhật vật liệu & ánh sáng theo Theme mà không cần render lại WebGL Canvas
  const ambientLightRef = useRef(null);
  const coreMatRef = useRef(null);
  const wireMatRef = useRef(null);
  const pointsMatRef = useRef(null);
  const ringMatRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Khởi tạo Scene
    const scene = new THREE.Scene();

    // 2. Kích thước ban đầu
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 3. Khởi tạo Camera phối cảnh với FOV ban đầu 45 độ
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.0);

    // 4. Khởi tạo WebGL Renderer với alpha trong suốt
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Trong suốt hoàn toàn
    container.appendChild(renderer.domElement);

    // 5. Hệ Thống Ánh Sáng Đa Điểm Điện Ảnh (Cinematic Multi-point Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.2 : 2.4);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    // Đèn chính Indigo
    const pointLightIndigo = new THREE.PointLight(0x6366f1, 18, 50);
    pointLightIndigo.position.set(8, 8, 9);
    scene.add(pointLightIndigo);

    // Đèn phụ Emerald
    const pointLightEmerald = new THREE.PointLight(0x10b981, 16, 50);
    pointLightEmerald.position.set(-8, -8, 9);
    scene.add(pointLightEmerald);

    // Đèn viền Neon Pink
    const pointLightPink = new THREE.PointLight(0xec4899, 12, 40);
    pointLightPink.position.set(0, 9, -7);
    scene.add(pointLightPink);

    // 6. Nhóm chứa toàn bộ vật thể 3D để xoay và dịch chuyển theo Scroll
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // --- A. Quả cầu lõi bên trong (Inner Core Sphere) ---
    const coreGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x050814 : 0x1e293b,
      roughness: 0.15,
      metalness: 0.95,
      emissive: isDark ? 0x1e1b4b : 0x312e81,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 1.0
    });
    coreMatRef.current = coreMat;
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    orbGroup.add(coreMesh);

    // --- B. Quả cầu sóng âm biến dạng (Outer Deforming Wave Orb) ---
    const BASE_RADIUS = 2.55;
    const waveGeo = new THREE.IcosahedronGeometry(BASE_RADIUS, 4);

    const posAttr = waveGeo.attributes.position;
    const vertexCount = posAttr.count;
    const origPos = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);

    const colorA = new THREE.Color(0x6366f1); // Indigo Vocal
    const colorB = new THREE.Color(0x10b981); // Emerald Beat
    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;

      // Gradient màu sắc dựa trên trục Y
      const ratio = (y + BASE_RADIUS) / (BASE_RADIUS * 2);
      tempColor.copy(colorA).lerp(colorB, Math.max(0, Math.min(1, ratio)));

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    waveGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Lớp lưới Wireframe phát quang
    const wireMat = new THREE.MeshStandardMaterial({
      wireframe: true,
      vertexColors: true,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x4f46e5,
      emissiveIntensity: isDark ? 0.45 : 0.75,
      transparent: true,
      opacity: 0.88
    });
    wireMatRef.current = wireMat;
    const waveMesh = new THREE.Mesh(waveGeo, wireMat);
    orbGroup.add(waveMesh);

    // Lớp hạt phát sáng trên các đỉnh (Vertex Points)
    const pointsMat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    pointsMatRef.current = pointsMat;
    const pointsMesh = new THREE.Points(waveGeo, pointsMat);
    orbGroup.add(pointsMesh);

    // --- C. Vành đai hạt âm thanh quỹ đạo (Orbital Audio Rings) ---
    const RING_COUNT = 450;
    const ringPositions = new Float32Array(RING_COUNT * 3);
    const ringColors = new Float32Array(RING_COUNT * 3);
    const RING_RADIUS = 3.9;

    for (let i = 0; i < RING_COUNT; i++) {
      const theta = (i / RING_COUNT) * Math.PI * 2;
      ringPositions[i * 3] = Math.cos(theta) * RING_RADIUS;
      ringPositions[i * 3 + 1] = Math.sin(theta * 4) * 0.25; // Sóng uốn lượn ban đầu
      ringPositions[i * 3 + 2] = Math.sin(theta) * RING_RADIUS;

      const r = (Math.sin(theta) + 1) / 2;
      tempColor.copy(colorB).lerp(colorA, r);
      ringColors[i * 3] = tempColor.r;
      ringColors[i * 3 + 1] = tempColor.g;
      ringColors[i * 3 + 2] = tempColor.b;
    }

    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    ringGeo.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

    const ringMat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    ringMatRef.current = ringMat;

    const ringMesh = new THREE.Points(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 4.5;
    ringMesh.rotation.z = Math.PI / 8;
    orbGroup.add(ringMesh);

    // 7. Tương tác Chuột (Mouse Parallax)
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = x * 0.45;
      mouseY = y * 0.45;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 8. Tự động co dãn màn hình (Resize Handler)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 9. Quản lý trạng thái chuyển động điện ảnh (Cinematic Scroll State & Flight Path)
    let smoothProgress = 0;
    let currentRingScale = 1.0;
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Đọc tiến độ scroll hiện tại từ ref (ưu tiên không re-render) hoặc prop
      let rawP = 0;
      if (scrollProgressRef && scrollProgressRef.current !== undefined) {
        rawP = scrollProgressRef.current;
      } else if (typeof scrollProgress === 'number') {
        rawP = scrollProgress;
      }

      // Giới hạn trong khoảng 0.0 đến 1.0
      rawP = Math.max(0, Math.min(1, rawP));

      // Nội suy mượt mà (Lerp 60 FPS)
      smoothProgress += (rawP - smoothProgress) * 0.08;
      const p = smoothProgress;

      const isDesktop = window.innerWidth >= 1024;
      const elapsedTime = clock.getElapsedTime();

      // --- TÍNH TOÁN CÁC ĐẶC TÍNH 3D DỰA TRÊN TIẾN ĐỘ CUỘN TRANG (p: 0.0 -> 1.0) ---
      let targetOrbX = 0;
      let targetOrbY = 0;
      let targetOrbZ = 0;
      let targetCamX = 0;
      let targetCamY = 0;
      let targetCamZ = 9.0;
      let targetFov = 45;
      let displacementAmp = 0.38;
      let targetRingScale = 1.0;
      let speedFactor = 1.0;
      let dispersionFactor = 0.0;
      let coreOpacity = 1.0;
      let wireOpacity = isDark ? 0.88 : 0.75;
      let pointSize = 0.085;

      if (p <= 0.25) {
        // ==============================================================
        // GIAI ĐOẠN 1 (0% -> 25%): The Chaos & Hero Section
        // Quả cầu nằm góc phải, camera zoom sát nhẹ, biến dạng cơ bản
        // ==============================================================
        targetOrbX = isDesktop ? 2.5 : 0;
        targetOrbY = isDesktop ? 0 : -0.4;
        targetOrbZ = 0;

        targetCamX = 0;
        targetCamY = 0;
        targetCamZ = isDesktop ? 9.0 : 10.0;
        targetFov = 45;

        displacementAmp = 0.38;
        targetRingScale = 1.0;
        speedFactor = 1.0;
        dispersionFactor = 0.0;
        coreOpacity = 1.0;
        wireOpacity = 0.88;
        pointSize = 0.085;
      } else if (p <= 0.60) {
        // ==============================================================
        // GIAI ĐOẠN 2 (25% -> 60%): Cỗ Máy AI Demucs (Pinned Breakdown)
        // Quả cầu trượt về giữa, camera dịch sâu và orbit nghiêng, sóng dập dình cực đại
        // ==============================================================
        const t = (p - 0.25) / 0.35; // 0 -> 1
        const startX = isDesktop ? 2.5 : 0;
        targetOrbX = THREE.MathUtils.lerp(startX, 0, t);
        targetOrbY = 0;
        targetOrbZ = THREE.MathUtils.lerp(0, 0.3, t);

        // Camera dịch sâu hơn và xoay góc nghiêng Orbit
        targetCamX = Math.sin(t * Math.PI) * 0.45;
        targetCamY = Math.cos(t * Math.PI) * 0.2 - 0.2;
        targetCamZ = THREE.MathUtils.lerp(9.0, 7.6, t);
        targetFov = THREE.MathUtils.lerp(45, 50, t);

        // Biến dạng uốn lượn dập dềnh tăng cao để biểu đạt "AI bóc tách sóng"
        displacementAmp = THREE.MathUtils.lerp(0.38, 0.95, Math.sin(t * Math.PI * 0.9 + 0.1));
        targetRingScale = THREE.MathUtils.lerp(1.0, 1.45, t);
        speedFactor = THREE.MathUtils.lerp(1.0, 1.5, t);
        dispersionFactor = 0.0;
        coreOpacity = 1.0;
        wireOpacity = 0.88;
        pointSize = 0.085;
      } else if (p <= 0.85) {
        // ==============================================================
        // GIAI ĐOẠN 3 (60% -> 85%): Phép Màu Đồng Bộ (Intuitive Workflow)
        // Camera lướt vòng cung (Z từ 7.6 xuống 6.5), vành đai bung rộng 2.2x, nhấp nhô rực rỡ
        // ==============================================================
        const t = (p - 0.60) / 0.25; // 0 -> 1
        targetOrbX = 0;
        targetOrbY = 0;
        targetOrbZ = THREE.MathUtils.lerp(0.3, 0.0, t);

        // Camera lướt vòng cung
        targetCamX = THREE.MathUtils.lerp(0.45, -0.3, t);
        targetCamY = THREE.MathUtils.lerp(-0.2, 0.1, t);
        targetCamZ = THREE.MathUtils.lerp(7.6, 6.5, t);
        targetFov = THREE.MathUtils.lerp(50, 58, t);

        // Vành đai hạt bung rộng, nhấp nhô rực rỡ, tăng tốc độ quay
        displacementAmp = 0.65;
        targetRingScale = THREE.MathUtils.lerp(1.45, 2.2, t);
        speedFactor = THREE.MathUtils.lerp(1.5, 2.2, t);
        dispersionFactor = 0.0;
        coreOpacity = 1.0;
        wireOpacity = 0.88;
        pointSize = 0.095;
      } else {
        // ==============================================================
        // GIAI ĐOẠN 4 (85% -> 100%): Camera Flight Path Xuyên Tâm & Warp Space
        // Máy ảnh bay xuyên qua quả cầu (Z -> 1.0), FOV tăng vọt -> 110, tản mát vệt sáng
        // ==============================================================
        const t = (p - 0.85) / 0.15; // 0 -> 1
        targetOrbX = 0;
        targetOrbY = 0;
        targetOrbZ = THREE.MathUtils.lerp(0.0, -0.5, t);

        // Máy ảnh bay qua tâm quả cầu (Flight Path Z -> 1.0)
        targetCamX = THREE.MathUtils.lerp(-0.3, 0.0, t);
        targetCamY = THREE.MathUtils.lerp(0.1, 0.0, t);
        targetCamZ = THREE.MathUtils.lerp(6.5, 1.0, t);

        // Góc FOV tăng vọt (FOV -> 110) tạo cảm giác bay vào không gian vũ trụ
        targetFov = THREE.MathUtils.lerp(58, 110, t);

        // Quả cầu tản mát thành các vệt sáng
        displacementAmp = THREE.MathUtils.lerp(0.65, 0.2, t);
        dispersionFactor = t;
        targetRingScale = THREE.MathUtils.lerp(2.2, 4.5, t);
        speedFactor = THREE.MathUtils.lerp(2.2, 3.2, t);

        coreOpacity = THREE.MathUtils.lerp(1.0, 0.05, t);
        wireOpacity = THREE.MathUtils.lerp(0.88, 0.15, t);
        pointSize = THREE.MathUtils.lerp(0.095, 0.22, t);
      }

      // Áp dụng biến đổi camera (Camera flight path & FOV)
      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;

      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * 0.08;
        camera.updateProjectionMatrix();
      }

      // Giữ camera luôn hướng nhẹ vào trung tâm quả cầu
      camera.lookAt(orbGroup.position.x * 0.35, orbGroup.position.y * 0.35, 0);

      // Áp dụng vị trí quả cầu
      orbGroup.position.x += (targetOrbX - orbGroup.position.x) * 0.08;
      orbGroup.position.y += (targetOrbY - orbGroup.position.y) * 0.08;
      orbGroup.position.z += (targetOrbZ - orbGroup.position.z) * 0.08;

      // Áp dụng scale vành đai mượt mà
      currentRingScale += (targetRingScale - currentRingScale) * 0.08;
      ringMesh.scale.set(currentRingScale, currentRingScale, currentRingScale);

      // Cập nhật độ trong suốt và kích thước hạt
      coreMat.opacity += (coreOpacity - coreMat.opacity) * 0.08;
      wireMat.opacity += (wireOpacity - wireMat.opacity) * 0.08;
      pointsMat.size += (pointSize - pointsMat.size) * 0.08;

      // Thuật toán biến dạng sóng âm & tản mát vệt sáng (Harmonic Deformation & Starburst Dispersion)
      const time = elapsedTime * 1.8 * speedFactor;
      const currentPos = waveGeo.attributes.position.array;

      for (let i = 0; i < vertexCount; i++) {
        const ox = origPos[i * 3];
        const oy = origPos[i * 3 + 1];
        const oz = origPos[i * 3 + 2];

        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / len;
        const ny = oy / len;
        const nz = oz / len;

        const wave1 = Math.sin(nx * 4.0 + time * 1.6) * Math.cos(ny * 4.0 + time * 1.4);
        const wave2 = Math.sin(nz * 5.0 - time * 2.0) * 0.5;
        const wave3 = Math.cos((nx + ny) * 3.0 + time * 2.2) * 0.4;
        const displacement = (wave1 + wave2 + wave3) * displacementAmp;

        // Khi ở Giai đoạn 4: hạt tản mát bung ra theo phương pháp tuyến tạo vệt ánh sáng xuyên thấu
        const disperse = dispersionFactor * (1.5 + Math.sin(i * 13.37) * 2.8);
        const dynamicR = BASE_RADIUS + displacement + disperse;

        currentPos[i * 3] = nx * dynamicR;
        currentPos[i * 3 + 1] = ny * dynamicR;
        currentPos[i * 3 + 2] = nz * dynamicR;
      }

      waveGeo.attributes.position.needsUpdate = true;
      waveGeo.computeVertexNormals();

      // Nhấp nhô sóng âm sinh động trên vành đai hạt (Dynamic Ripple Ring)
      const ringPos = ringGeo.attributes.position.array;
      for (let i = 0; i < RING_COUNT; i++) {
        const theta = (i / RING_COUNT) * Math.PI * 2;
        const ripple = Math.sin(theta * 6 + time * 2.5) * (0.2 + (p > 0.5 ? 0.35 : 0.1));
        ringPos[i * 3 + 1] = ripple;
      }
      ringGeo.attributes.position.needsUpdate = true;

      // Tự xoay quả cầu & vành đai
      orbGroup.rotation.y += 0.007 * speedFactor;
      orbGroup.rotation.x += 0.003 * speedFactor;
      ringMesh.rotation.y -= 0.01 * speedFactor;

      // Parallax chuột
      targetRotX = mouseY;
      targetRotY = mouseX;
      orbGroup.rotation.x += (targetRotX - orbGroup.rotation.x) * 0.04;
      orbGroup.rotation.y += (targetRotY - orbGroup.rotation.y) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Dọn dẹp Tài nguyên WebGL & Listeners an toàn triệt để
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      scene.remove(orbGroup);
      scene.remove(ambientLight);
      scene.remove(pointLightIndigo);
      scene.remove(pointLightEmerald);
      scene.remove(pointLightPink);

      coreGeo.dispose();
      coreMat.dispose();
      waveGeo.dispose();
      wireMat.dispose();
      pointsMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Cập nhật thuộc tính ánh sáng & vật liệu khi Theme thay đổi
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = isDark ? 1.2 : 2.4;
    }
    if (coreMatRef.current) {
      coreMatRef.current.color.setHex(isDark ? 0x050814 : 0x1e293b);
      coreMatRef.current.emissive.setHex(isDark ? 0x1e1b4b : 0x312e81);
    }
    if (wireMatRef.current) {
      wireMatRef.current.emissiveIntensity = isDark ? 0.45 : 0.75;
    }
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative pointer-events-none select-none ${className}`}
      aria-label="3D Interactive Cinematic Multistage Audio Orb"
    />
  );
}
