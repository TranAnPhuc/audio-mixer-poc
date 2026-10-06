import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

/**
 * Component Quả Cầu Sóng Âm Biến Dạng 3D (Cinematic Interactive Audio Wave Orb)
 * Đồng bộ toàn diện góc xoay, vị trí và độ biến dạng theo tiến độ cuộn trang (GSAP ScrollTrigger)
 * Lấy cảm hứng từ không gian công nghệ điện ảnh của riotters.com
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

    // 3. Khởi tạo Camera phối cảnh
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.2);

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

    // 5. Hệ Thống Ánh Sáng Đa Điểm (Cinematic Multi-point Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.2 : 2.4);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    // Đèn chính Indigo
    const pointLightIndigo = new THREE.PointLight(0x6366f1, 16, 50);
    pointLightIndigo.position.set(8, 8, 9);
    scene.add(pointLightIndigo);

    // Đèn phụ Emerald
    const pointLightEmerald = new THREE.PointLight(0x10b981, 14, 50);
    pointLightEmerald.position.set(-8, -8, 9);
    scene.add(pointLightEmerald);

    // Đèn viền Neon Pink
    const pointLightPink = new THREE.PointLight(0xec4899, 10, 40);
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
      emissiveIntensity: 0.7
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

    const colorA = new THREE.Color(0x6366f1); // Indigo
    const colorB = new THREE.Color(0x10b981); // Emerald
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
    const RING_COUNT = 400;
    const ringPositions = new Float32Array(RING_COUNT * 3);
    const ringColors = new Float32Array(RING_COUNT * 3);
    const RING_RADIUS = 3.9;

    for (let i = 0; i < RING_COUNT; i++) {
      const theta = (i / RING_COUNT) * Math.PI * 2;
      ringPositions[i * 3] = Math.cos(theta) * RING_RADIUS;
      ringPositions[i * 3 + 1] = Math.sin(theta * 4) * 0.25; // Sóng uốn lượn
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
      size: 0.08,
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

    // 9. Quản lý trạng thái chuyển động điện ảnh (Cinematic Scroll State)
    let smoothProgress = 0;
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Đọc tiến độ scroll hiện tại
      let rawP = 0;
      if (scrollProgressRef && scrollProgressRef.current !== undefined) {
        rawP = scrollProgressRef.current;
      } else if (typeof scrollProgress === 'number') {
        rawP = scrollProgress;
      }

      // Giới hạn trong khoảng 0.0 đến 1.0
      rawP = Math.max(0, Math.min(1, rawP));

      // Nội suy mượt mà (Lerp)
      smoothProgress += (rawP - smoothProgress) * 0.075;
      const p = smoothProgress;

      const isDesktop = window.innerWidth >= 1024;
      const elapsedTime = clock.getElapsedTime();

      // --- TÍNH TOÁN CÁC ĐẶC TÍNH 3D DỰA TRÊN TIẾN ĐỘ CUỘN TRANG (p) ---
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;
      let targetCamZ = 9.2;
      let displacementAmp = 0.42;
      let targetRingScale = 1.0;
      let speedFactor = 1.0;

      if (p <= 0.25) {
        // [Giai đoạn 1: Hero Section] (0% - 25%)
        // Quả cầu nằm lệch phải ở Desktop hoặc hơi hạ thấp ở Mobile
        targetX = isDesktop ? 2.5 : 0;
        targetY = isDesktop ? 0 : -0.4;
        targetZ = 0;
        targetCamZ = isDesktop ? 9.2 : 10.2;
        displacementAmp = 0.42;
        targetRingScale = 1.0;
        speedFactor = 1.0;
      } else if (p <= 0.65) {
        // [Giai đoạn 2: Pinned Tech Breakdown] (25% - 65%)
        // Quả cầu trượt vào chính giữa, camera zoom sát, độ biến dạng sóng và vành đai bùng nổ
        const t = (p - 0.25) / 0.4; // 0 -> 1
        const initialX = isDesktop ? 2.5 : 0;
        targetX = initialX * (1 - t); // Trượt dần về 0
        targetY = 0;
        targetZ = t * 0.5; // Tiến nhẹ về trước
        targetCamZ = THREE.MathUtils.lerp(9.2, 6.9, t); // Zoom camera vào gần
        displacementAmp = THREE.MathUtils.lerp(0.42, 0.95, Math.sin(t * Math.PI)); // Sóng biến dạng cực đại ở giữa
        targetRingScale = THREE.MathUtils.lerp(1.0, 1.45, t); // Vành đai mở rộng
        speedFactor = 1.0 + t * 0.8;
      } else {
        // [Giai đoạn 3: Workflow & Final Launchpad] (65% - 100%)
        // Quả cầu lùi sâu vào nền phía sau tạo vầng hào quang năng lượng khổng lồ
        const t = (p - 0.65) / 0.35; // 0 -> 1
        targetX = 0;
        targetY = THREE.MathUtils.lerp(0, -1.0, t); // Lùi nhẹ xuống phía dưới
        targetZ = THREE.MathUtils.lerp(0.5, -3.2, t); // Lùi sâu vào hậu cảnh
        targetCamZ = THREE.MathUtils.lerp(6.9, 11.2, t); // Camera lùi xa
        displacementAmp = 0.55;
        targetRingScale = THREE.MathUtils.lerp(1.45, 1.95, t); // Vành đai mở rộng thành thiên hà hạt
        speedFactor = 1.8;
      }

      // Áp dụng vị trí mượt mà
      orbGroup.position.x += (targetX - orbGroup.position.x) * 0.08;
      orbGroup.position.y += (targetY - orbGroup.position.y) * 0.08;
      orbGroup.position.z += (targetZ - orbGroup.position.z) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;

      ringMesh.scale.set(targetRingScale, targetRingScale, targetRingScale);

      // Thuật toán biến dạng sóng âm (Wave Harmonic Deformation)
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

        const dynamicR = BASE_RADIUS + displacement;

        currentPos[i * 3] = nx * dynamicR;
        currentPos[i * 3 + 1] = ny * dynamicR;
        currentPos[i * 3 + 2] = nz * dynamicR;
      }

      waveGeo.attributes.position.needsUpdate = true;
      waveGeo.computeVertexNormals();

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

    // 10. Dọn dẹp Tài nguyên WebGL & Listeners
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      scene.remove(orbGroup);
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
      aria-label="3D Interactive Cinematic Audio Orb"
    />
  );
}
