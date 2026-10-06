import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getAudioFrequencies } from '../utils/vinylAudioEngine';

/**
 * Procedural Texture Generator cho Vi Rãnh Đĩa Than (Micro-Grooves)
 * Tạo hoa văn rãnh đồng tâm có độ nhám và phản xạ ánh sáng chân thực
 */
function createGrooveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Nền đen tuyền
  ctx.fillStyle = '#0c0d11';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  // Vẽ các vi rãnh rập nổi đồng tâm (từ r=160px đến r=500px)
  ctx.lineWidth = 1;
  for (let r = 165; r < 500; r += 1.5) {
    const alpha = 0.15 + Math.random() * 0.25;
    const brightness = Math.floor(180 + Math.random() * 75);
    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;

    // Phân chia các đoạn bài hát (Lead-in, Music tracks, Run-out groove)
    if (Math.abs(r - 280) < 3 || Math.abs(r - 390) < 3 || r > 492) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Procedural Texture Generator cho Tem Nhãn Giữa Đĩa Than (Vintage Center Label)
 */
function createDefaultLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradient tem nhãn đĩa than hoài niệm (Deep Burgundy & Amber Gold)
  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
  grad.addColorStop(0, '#92400e');
  grad.addColorStop(0.65, '#b45309');
  grad.addColorStop(0.95, '#451a03');
  grad.addColorStop(1, '#1e293b');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 256, 0, Math.PI * 2);
  ctx.fill();

  // Viền vàng kim tinh tế
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 225, 0, Math.PI * 2);
  ctx.stroke();

  // Chữ tem nhãn
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AuraVinyl', 256, 175);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('HIGH FIDELITY STEREO', 256, 210);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('33⅓ RPM', 256, 335);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('SIDE A • VINYL MASTER', 256, 365);

  // Vòng trục giữa
  ctx.fillStyle = '#090a0f';
  ctx.beginPath();
  ctx.arc(256, 256, 28, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Procedural Texture Generator cho Hạt Bụi Ánh Sáng (Ambient Dust Speck Texture)
 */
function createDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(253, 230, 138, 0.7)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Component Turntable3D
 * Mâm đĩa than 3D cảm xúc với động học cần kim (Tonearm) và đĩa quay vật lý
 */
export default function Turntable3D({
  isPlaying = false,
  coverUrl = null,
  ambientColors = null,
  currentTime = 0,
  duration = 0
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);

  // Tham chiếu các bộ phận 3D tương tác
  const recordGroupRef = useRef(null);
  const tonearmYawRef = useRef(null);
  const tonearmPitchRef = useRef(null);
  const labelMeshRef = useRef(null);
  const turntableGroupRef = useRef(null);
  const strobeTowerRef = useRef(null);
  const platterSpotRef = useRef(null);
  const currentCoverTextureRef = useRef(null);
  const defaultLabelTextureRef = useRef(null);

  // Tham chiếu hệ thống hạt bụi ánh sáng
  const dustGeomRef = useRef(null);
  const dustMatRef = useRef(null);
  const dustTextureRef = useRef(null);

  // Tham chiếu theo dõi tiến độ cần kim (Progress Tracking Tonearm)
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const targetGrooveYawRef = useRef(0.46);
  const isTransitioningRef = useRef(false);

  // Tốc độ quay và quán tính (Angular Velocity)
  const spinSpeedRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Cập nhật targetGrooveYaw khi currentTime hoặc duration thay đổi
  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    const progress = (duration > 0 && currentTime > 0)
      ? Math.min(1, Math.max(0, currentTime / duration))
      : 0;
    // Góc xoay ngang từ mép ngoài rãnh (0.46 rad) đến sát tem nhãn giữa (0.73 rad)
    targetGrooveYawRef.current = 0.46 + progress * 0.27;
  }, [currentTime, duration]);

  // Chuẩn hóa tọa độ chuột cho hiệu ứng Tilt Parallax
  const mouseNormRef = useRef({ x: 0, y: 0 });
  const mouseTargetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Khởi tạo Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Góc máy Isometric Hero Turntable cao cấp
    camera.position.set(0, 6.8, 7.2);
    camera.lookAt(0, -0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Hệ Thống Ánh Sáng (High-Fidelity Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // Key Light: Ánh sáng chính ấm áp phản xạ lên rãnh đĩa than
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.8);
    keyLight.position.set(4.8, 9.2, 4.8);
    scene.add(keyLight);

    // Rim Light: Ánh sáng viền ánh xanh thép tôn lên các cạnh kim loại
    const rimLight = new THREE.DirectionalLight(0x90b0e0, 1.6);
    rimLight.position.set(-6, 6, -5);
    scene.add(rimLight);

    // Grazing Highlight Light: Tôn lên các vân tròn vi rãnh phản quang sắc nét của đĩa than
    const grooveHighlight = new THREE.DirectionalLight(0xffedd5, 1.5);
    grooveHighlight.position.set(-1.2, 6.8, 3.2);
    scene.add(grooveHighlight);

    // Point Light: Đèn rọi trực tiếp tâm mâm đĩa tạo quầng phản quang
    const platterSpot = new THREE.PointLight(0xf59e0b, 1.8, 10);
    platterSpot.position.set(-0.6, 3.5, 0.2);
    scene.add(platterSpot);
    platterSpotRef.current = platterSpot;

    // Group tổng của cả mâm đĩa để hỗ trợ Mouse Parallax
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(0, 0, 0);
    scene.add(turntableGroup);
    turntableGroupRef.current = turntableGroup;

    // 3. DỰNG BỆ MÂM ĐĨA (Chassis & Structural Base)
    // Thân bệ chính (Obsidian Metal Body)
    const chassisGeom = new THREE.BoxGeometry(6.6, 0.45, 5.5);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x121318,
      metalness: 0.8,
      roughness: 0.32
    });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.set(0, -0.22, 0);
    turntableGroup.add(chassis);

    // 4 Chân đế chống rung mạ chrome bóng (Shock Absorbing Feet)
    const footGeom = new THREE.CylinderGeometry(0.32, 0.28, 0.25, 32);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x24262e,
      metalness: 0.9,
      roughness: 0.2
    });
    const footPositions = [
      [-3.0, -0.48, -2.4],
      [3.0, -0.48, -2.4],
      [-3.0, -0.48, 2.4],
      [3.0, -0.48, 2.4]
    ];
    footPositions.forEach(([x, y, z]) => {
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(x, y, z);
      turntableGroup.add(foot);
    });

    // Vành mâm trũng (Recessed Platter Well)
    const wellGeom = new THREE.CylinderGeometry(2.45, 2.45, 0.06, 64);
    const wellMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      metalness: 0.85,
      roughness: 0.4
    });
    const well = new THREE.Mesh(wellGeom, wellMat);
    well.position.set(-0.65, 0.04, 0.1);
    turntableGroup.add(well);

    // Đèn Strobe Tower và Công Tắc Bật Nguồn Cổ Điển
    const switchGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 32);
    const switchMat = new THREE.MeshStandardMaterial({
      color: 0xd8dbe2,
      metalness: 0.95,
      roughness: 0.15
    });
    const powerSwitch = new THREE.Mesh(switchGeom, switchMat);
    powerSwitch.position.set(-2.8, 0.09, 2.15);
    turntableGroup.add(powerSwitch);

    // Đèn nháy tốc độ Strobe Light Prism
    const strobeGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.35, 16);
    const strobeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.3
    });
    const strobeTower = new THREE.Mesh(strobeGeom, strobeMat);
    strobeTower.position.set(-2.8, 0.22, 1.6);
    turntableGroup.add(strobeTower);
    strobeTowerRef.current = strobeTower;

    // 4. MÂM XOAY NHÔM & ĐĨA THAN VINYL (Platter & Vinyl Record)
    // Mâm xoay nhôm phay xước bên dưới
    const platterGeom = new THREE.CylinderGeometry(2.35, 2.35, 0.12, 64);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0xd4d8e2,
      metalness: 0.92,
      roughness: 0.2
    });
    const platterMesh = new THREE.Mesh(platterGeom, platterMat);
    platterMesh.position.set(-0.65, 0.1, 0.1);
    turntableGroup.add(platterMesh);

    // Group Đĩa Than Xoay Độc Lập
    const recordGroup = new THREE.Group();
    recordGroup.position.set(-0.65, 0.17, 0.1);
    turntableGroup.add(recordGroup);
    recordGroupRef.current = recordGroup;

    // Đĩa Vinyl vân rãnh siêu thực với phản xạ kim loại cao cấp
    const grooveTexture = createGrooveTexture();
    const recordGeom = new THREE.CylinderGeometry(2.25, 2.25, 0.04, 64);
    const recordMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      metalness: 0.9,
      roughness: 0.16,
      bumpMap: grooveTexture,
      bumpScale: 0.034
    });
    const recordMesh = new THREE.Mesh(recordGeom, recordMat);
    recordGroup.add(recordMesh);

    // Tem nhãn giữa đĩa (Center Label)
    const defaultLabelTexture = createDefaultLabelTexture();
    defaultLabelTextureRef.current = defaultLabelTexture;
    const labelGeom = new THREE.CircleGeometry(0.72, 64);
    const labelMat = new THREE.MeshStandardMaterial({
      map: defaultLabelTexture,
      roughness: 0.45,
      metalness: 0.15
    });
    const labelMesh = new THREE.Mesh(labelGeom, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = 0.022;
    recordGroup.add(labelMesh);
    labelMeshRef.current = labelMesh;

    // Trục xoay kim loại trung tâm (Center Spindle)
    const spindleGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 32);
    const spindleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.05
    });
    const spindle = new THREE.Mesh(spindleGeom, spindleMat);
    spindle.position.set(0, 0.14, 0);
    recordGroup.add(spindle);

    // 5. CỤM CẦN GẠT KIM CƠ HỌC (Tonearm Assembly Kinematics)
    // Chân đế cụm cần kim
    const tonearmBaseGroup = new THREE.Group();
    tonearmBaseGroup.position.set(2.05, 0.06, -1.05);
    turntableGroup.add(tonearmBaseGroup);

    // Trụ Gimbal Housing kim loại
    const gimbalBaseGeom = new THREE.CylinderGeometry(0.48, 0.52, 0.25, 32);
    const gimbalMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      metalness: 0.9,
      roughness: 0.25
    });
    const gimbalBase = new THREE.Mesh(gimbalBaseGeom, gimbalMat);
    gimbalBase.position.y = 0.12;
    tonearmBaseGroup.add(gimbalBase);

    // Khớp xoay ngang (Yaw Group: Xoay quanh trục Y đưa kim vào đĩa)
    const tonearmYaw = new THREE.Group();
    tonearmYaw.position.set(0, 0.28, 0);
    tonearmBaseGroup.add(tonearmYaw);
    tonearmYawRef.current = tonearmYaw;

    // Khớp xoay dọc (Pitch Group: Nâng / Hạ mũi kim)
    const tonearmPitch = new THREE.Group();
    tonearmPitch.position.set(0, 0, 0);
    tonearmYaw.add(tonearmPitch);
    tonearmPitchRef.current = tonearmPitch;

    // Trục đỡ Gimbal Ring
    const ringGeom = new THREE.TorusGeometry(0.25, 0.04, 16, 32);
    const metalChromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.96,
      roughness: 0.1
    });
    const gimbalRing = new THREE.Mesh(ringGeom, metalChromeMat);
    gimbalRing.rotation.y = Math.PI / 2;
    tonearmPitch.add(gimbalRing);

    // Đối trọng phía sau (Counterweight)
    const weightGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.35, 32);
    const weightMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.88,
      roughness: 0.2
    });
    const counterweight = new THREE.Mesh(weightGeom, weightMat);
    counterweight.rotation.x = Math.PI / 2;
    counterweight.position.set(0, 0, -0.65);
    tonearmPitch.add(counterweight);

    // Vòng vạch chia độ của đối trọng
    const ringWeightGeom = new THREE.CylinderGeometry(0.245, 0.245, 0.08, 32);
    const ringWeightMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2
    });
    const weightRing = new THREE.Mesh(ringWeightGeom, ringWeightMat);
    weightRing.rotation.x = Math.PI / 2;
    weightRing.position.set(0, 0, -0.5);
    tonearmPitch.add(weightRing);

    // Thanh cần kim chữ S (S-shaped Tonearm Tube)
    const curvePoints = [
      new THREE.Vector3(0, 0, -0.2),
      new THREE.Vector3(0, 0.04, 0.4),
      new THREE.Vector3(-0.06, 0.04, 1.2),
      new THREE.Vector3(-0.25, 0.02, 2.1),
      new THREE.Vector3(-0.55, 0.0, 2.8)
    ];
    const armCurve = new THREE.CatmullRomCurve3(curvePoints);
    const armTubeGeom = new THREE.TubeGeometry(armCurve, 40, 0.045, 16, false);
    const armTube = new THREE.Mesh(armTubeGeom, metalChromeMat);
    tonearmPitch.add(armTube);

    // Đầu gắn kim (Headshell Cartridge)
    const headshellGeom = new THREE.BoxGeometry(0.18, 0.1, 0.38);
    const headshellMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.3
    });
    const headshell = new THREE.Mesh(headshellGeom, headshellMat);
    headshell.position.set(-0.62, -0.02, 2.95);
    headshell.rotation.y = 0.22;
    tonearmPitch.add(headshell);

    // Mũi kim (Stylus Needle) tiếp xúc với rãnh đĩa
    const stylusGeom = new THREE.ConeGeometry(0.025, 0.08, 16);
    const stylusMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.95,
      roughness: 0.1
    });
    const stylus = new THREE.Mesh(stylusGeom, stylusMat);
    stylus.position.set(-0.64, -0.09, 3.05);
    stylus.rotation.x = Math.PI;
    tonearmPitch.add(stylus);

    // Bệ đỡ cần kim khi nghỉ (Arm Rest Stand)
    const restStandGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.42, 16);
    const restStand = new THREE.Mesh(restStandGeom, metalChromeMat);
    restStand.position.set(1.9, 0.2, 0.6);
    turntableGroup.add(restStand);

    const restClipGeom = new THREE.BoxGeometry(0.16, 0.08, 0.14);
    const restClip = new THREE.Mesh(restClipGeom, gimbalMat);
    restClip.position.set(1.9, 0.42, 0.6);
    turntableGroup.add(restClip);

    // 6. XỬ LÝ SỰ KIỆN CHUỘT (Mouse Tilt Parallax)
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseTargetRef.current = {
        x: THREE.MathUtils.clamp(normX, -1, 1),
        y: THREE.MathUtils.clamp(normY, -1, 1)
      };
    };

    const handlePointerLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    // 7. RESPONSIVE RESIZE
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // 7.5. HỆ THỐNG HẠT BỤI ÁNH SÁNG KHÔNG GIAN (Ambient Dust Particles)
    const dustCount = 60;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpecksData = [];

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3 + 0] = (Math.random() - 0.5) * 6.2;
      dustPositions[i * 3 + 1] = 0.3 + Math.random() * 3.8;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 5.6;

      dustSpecksData.push({
        speedX: 0.8 + Math.random() * 1.6,
        speedY: 0.6 + Math.random() * 1.2,
        speedZ: 0.7 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeomRef.current = dustGeom;

    const dustTexture = createDustTexture();
    dustTextureRef.current = dustTexture;

    const dustMat = new THREE.PointsMaterial({
      size: 0.14,
      map: dustTexture,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: ambientColors?.hexPrimary || 0xfde68a
    });
    dustMatRef.current = dustMat;

    const dustPoints = new THREE.Points(dustGeom, dustMat);
    scene.add(dustPoints);

    // 8. RENDER LOOP (60 FPS Physical Simulation)
    let lastTime = performance.now();
    const render = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Trích xuất năng lượng âm thanh dải tần (Bass / Mids) thời gian thực
      const { bassEnergy } = getAudioFrequencies();

      // Mô phỏng quán tính tốc độ xoay của đĩa than (33⅓ RPM)
      if (isPlayingRef.current) {
        // Tăng tốc dần đến vận tốc 33⅓ RPM chuẩn
        spinSpeedRef.current = THREE.MathUtils.lerp(spinSpeedRef.current, 3.49, delta * 3.5);
      } else {
        // Giảm tốc dần do ma sát cơ học
        spinSpeedRef.current = THREE.MathUtils.lerp(spinSpeedRef.current, 0, delta * 1.8);
      }

      if (recordGroupRef.current && spinSpeedRef.current > 0.001) {
        recordGroupRef.current.rotation.y += spinSpeedRef.current * delta;
        // Mâm nhôm cũng xoay đồng bộ
        platterMesh.rotation.y += spinSpeedRef.current * delta;

        // Phản ứng thị giác màng đĩa: Nhún nhẹ theo nhịp bass trống kick
        recordGroupRef.current.position.y = 0.17 + bassEnergy * 0.015;
      }

      // Cần kim bám sát tiến độ bài hát thời gian thực (Progress Tracking Tonearm)
      if (isPlayingRef.current && !isTransitioningRef.current && tonearmYawRef.current) {
        // Lerp mượt mà tới vị trí rãnh theo tiến độ currentTime / duration (0.46 rad -> 0.73 rad)
        tonearmYawRef.current.rotation.y = THREE.MathUtils.lerp(
          tonearmYawRef.current.rotation.y,
          targetGrooveYawRef.current,
          delta * 2.5
        );

        // Rung động vi cơ học cực nhỏ theo rãnh nhựa quay và năng lượng âm bass
        if (tonearmPitchRef.current) {
          tonearmPitchRef.current.rotation.z = Math.sin(now * 0.02) * 0.0015 + bassEnergy * 0.002;
        }
      }

      // Cập nhật chuyển động Brownian motion cho 60 hạt bụi ánh sáng không gian
      if (dustGeomRef.current) {
        const pos = dustGeomRef.current.attributes.position.array;
        for (let i = 0; i < dustCount; i++) {
          const idx = i * 3;
          const data = dustSpecksData[i];

          // Dao động sóng sin Brownian êm dịu
          pos[idx + 0] += Math.sin(now * 0.001 * data.speedX + data.phase) * delta * 0.08;
          pos[idx + 1] += (Math.cos(now * 0.0012 * data.speedY + data.phase) * 0.45 + 0.55) * delta * 0.06;
          pos[idx + 2] += Math.cos(now * 0.0009 * data.speedZ + data.phase) * delta * 0.08;

          // Wrap hạt bụi khi bay lên quá cao
          if (pos[idx + 1] > 4.2) {
            pos[idx + 1] = 0.35;
            pos[idx + 0] = (Math.random() - 0.5) * 5.4;
            pos[idx + 2] = (Math.random() - 0.5) * 4.8;
          }
        }
        dustGeomRef.current.attributes.position.needsUpdate = true;
      }

      // Đèn Strobe Prism & Đèn Rọi Platter phát xung nhịp theo nhịp trống Kick
      if (strobeTowerRef.current) {
        strobeTowerRef.current.material.emissiveIntensity = isPlayingRef.current
          ? 0.35 + bassEnergy * 1.4
          : 0.2;
      }
      if (platterSpotRef.current) {
        platterSpotRef.current.intensity = isPlayingRef.current
          ? 1.6 + bassEnergy * 2.2
          : 1.2;
      }

      // Lerp Mouse Parallax mượt mà
      mouseNormRef.current.x = THREE.MathUtils.lerp(mouseNormRef.current.x, mouseTargetRef.current.x, 0.08);
      mouseNormRef.current.y = THREE.MathUtils.lerp(mouseNormRef.current.y, mouseTargetRef.current.y, 0.08);

      if (turntableGroupRef.current) {
        turntableGroupRef.current.rotation.y = mouseNormRef.current.x * 0.12;
        turntableGroupRef.current.rotation.x = mouseNormRef.current.y * 0.08;
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // 9. CLEANUP RESOURCE TOÀN DIỆN (Zero Memory Leaks)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);

      // Thu hồi textures, geometries, materials
      grooveTexture.dispose();
      defaultLabelTexture.dispose();
      if (currentCoverTextureRef.current) {
        currentCoverTextureRef.current.dispose();
        currentCoverTextureRef.current = null;
      }
      if (dustTextureRef.current) dustTextureRef.current.dispose();
      if (dustGeomRef.current) dustGeomRef.current.dispose();
      if (dustMatRef.current) dustMatRef.current.dispose();

      scene.traverse((obj) => {
        if (obj.isMesh || obj.isPoints) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (obj.material.map) obj.material.map.dispose();
              obj.material.dispose();
            }
          }
        }
      });

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      // Thu hồi WebGL Context triệt để, ngăn ngừa "Too many active WebGL contexts"
      if (typeof renderer.forceContextLoss === 'function') {
        renderer.forceContextLoss();
      }
      renderer.dispose();
    };
  }, []);

  // 10. GSAP KINEMATICS ANIMATION (Điều phối cần kim khi Play / Pause)
  useEffect(() => {
    const tonearmYaw = tonearmYawRef.current;
    const tonearmPitch = tonearmPitchRef.current;
    if (!tonearmYaw || !tonearmPitch) return;

    // Hủy các tween đang chạy dở
    gsap.killTweensOf(tonearmYaw.rotation);
    gsap.killTweensOf(tonearmPitch.rotation);

    if (isPlaying) {
      isTransitioningRef.current = true;
      const destYaw = targetGrooveYawRef.current; // Vị trí rãnh tương ứng với tiến độ bài hát

      // BƯỚC 1: Nhấc nhẹ cần kim lên khỏi bệ đỡ
      // BƯỚC 2: Lia cần kim từ bệ nghỉ thẳng tới vị trí tiến độ bài hát
      // BƯỚC 3: Hạ nhẹ kim tiếp xúc với bề mặt rãnh đĩa than
      const playTl = gsap.timeline({
        onComplete: () => {
          isTransitioningRef.current = false;
        }
      });

      playTl
        .to(tonearmPitch.rotation, {
          x: -0.07, // Nhấc kim lên
          duration: 0.25,
          ease: 'power2.out'
        })
        .to(
          tonearmYaw.rotation,
          {
            y: destYaw, // Lia cần kim tới điểm phát hiện tại
            duration: 0.85,
            ease: 'power2.inOut'
          },
          '+=0.05'
        )
        .to(tonearmPitch.rotation, {
          x: 0.0, // Hạ kim xuống chạm rãnh
          duration: 0.4,
          ease: 'power2.inOut'
        });
    } else {
      isTransitioningRef.current = true;

      // BƯỚC 1: Nâng kim lên khỏi mặt đĩa than
      // BƯỚC 2: Xoay cần kim trở lại bệ nghỉ
      // BƯỚC 3: Hạ nhẹ kim vào chạc giữ cần
      const pauseTl = gsap.timeline({
        onComplete: () => {
          isTransitioningRef.current = false;
        }
      });

      pauseTl
        .to(tonearmPitch.rotation, {
          x: -0.07, // Nhấc kim lên
          duration: 0.25,
          ease: 'power2.out'
        })
        .to(
          tonearmYaw.rotation,
          {
            y: 0.0, // Xoay về bệ đỡ nghỉ
            duration: 0.8,
            ease: 'power2.inOut'
          },
          '+=0.05'
        )
        .to(tonearmPitch.rotation, {
          x: 0.0, // Đặt vào chạc đỡ
          duration: 0.3,
          ease: 'power2.inOut'
        });
    }
  }, [isPlaying]);

  // 11. CẬP NHẬT TEM NHÃN KHI CÓ COVER ART (Kèm dọn dẹp Texture cũ tránh rò rỉ GPU)
  useEffect(() => {
    if (!labelMeshRef.current) return;

    if (!coverUrl) {
      // Khôi phục tem nhãn mặc định nếu coverUrl bị xóa hoặc không có
      if (currentCoverTextureRef.current) {
        currentCoverTextureRef.current.dispose();
        currentCoverTextureRef.current = null;
      }
      if (defaultLabelTextureRef.current) {
        labelMeshRef.current.material.map = defaultLabelTextureRef.current;
        labelMeshRef.current.material.needsUpdate = true;
      }
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      coverUrl,
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        // Giải phóng texture cũ để tránh rò rỉ bộ nhớ GPU VRAM
        if (currentCoverTextureRef.current) {
          currentCoverTextureRef.current.dispose();
        }
        currentCoverTextureRef.current = texture;

        if (labelMeshRef.current) {
          labelMeshRef.current.material.map = texture;
          labelMeshRef.current.material.needsUpdate = true;
        }
      },
      undefined,
      (err) => {
        console.warn('[Turntable3D] Không thể tải ảnh bìa album:', err);
      }
    );
  }, [coverUrl]);

  // 12. CẬP NHẬT ÁNH SÁNG MÂM ĐĨA & HẠT BỤI THEO BẢNG MÀU CHỦ ĐẠO
  useEffect(() => {
    if (!ambientColors?.hexPrimary) return;
    try {
      if (platterSpotRef.current) {
        platterSpotRef.current.color.set(ambientColors.hexPrimary);
      }
      if (dustMatRef.current) {
        dustMatRef.current.color.set(ambientColors.hexPrimary);
      }
    } catch (e) {}
  }, [ambientColors]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-[360px] sm:h-[420px] md:h-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      {/* Vầng sáng Ambient Bloom phản xạ dưới chân mâm đĩa đổi màu theo album */}
      <div
        className={`absolute inset-x-12 bottom-6 h-32 rounded-full blur-[90px] pointer-events-none transition-all duration-1000 ${
          isPlaying
            ? 'scale-110 opacity-100'
            : 'scale-90 opacity-40'
        }`}
        style={{
          backgroundColor: ambientColors?.glowColor || 'rgba(245, 158, 11, 0.22)'
        }}
      />
    </div>
  );
}
