import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animate, stagger } from 'animejs';
import {
  Disc3,
  Sparkles,
  ArrowRight,
  Headphones,
  Sliders,
  Palette,
  Clock,
  Film,
  Flame,
  CloudRain,
  Coffee,
  Wind,
  Bell,
  Compass,
  CheckCircle2,
  Heart,
  ChevronDown
} from 'lucide-react';
import {
  setAmbientVolume,
  getAmbientVolumes
} from '../utils/ambientSoundSynth';
import { playNeedleDropEffect } from '../utils/vinylAudioEngine';
import { playHapticClick, playZenBellChime } from '../utils/soundEffects';

/**
 * Sinh Texture bóng đổ tròn mờ tự nhiên cho đĩa than 3D Hero
 */
function createHeroContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(8, 6, 4, 0.85)');
  gradient.addColorStop(0.35, 'rgba(8, 6, 4, 0.45)');
  gradient.addColorStop(0.7, 'rgba(8, 6, 4, 0.15)');
  gradient.addColorStop(1, 'rgba(8, 6, 4, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sinh Texture vân gỗ óc chó chân thực bằng thuật toán Canvas Procedural
 * Tạo các thớ sợi gỗ tự nhiên (Grain lines), mắt gỗ (Knots) và lớp dầu bóng Satin
 */
function createProceduralWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền gỗ óc chó ấm áp tự nhiên (Deep Walnut Base)
  ctx.fillStyle = '#422413';
  ctx.fillRect(0, 0, 512, 512);

  // Dải thớ sợi gỗ tự nhiên uốn lượn
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 512;
    const width = 1.5 + Math.random() * 6.5;
    const alpha = 0.04 + Math.random() * 0.08;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(26, 12, 6, ${alpha})` : `rgba(88, 52, 28, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const cp1x = x + (Math.random() - 0.5) * 40;
    const cp2x = x + (Math.random() - 0.5) * 40;
    const endx = x + (Math.random() - 0.5) * 50;
    ctx.bezierCurveTo(cp1x, 170, cp2x, 340, endx, 512);
    ctx.stroke();
  }

  // 2 Mắt gỗ chìm tinh tế (Subtle Wood Knots)
  const knots = [
    { x: 170, y: 210, rx: 22, ry: 48 },
    { x: 375, y: 380, rx: 18, ry: 40 }
  ];
  knots.forEach((k) => {
    for (let r = 4; r < k.ry; r += 3.5) {
      ctx.beginPath();
      ctx.ellipse(k.x, k.y, (r * k.rx) / k.ry, r, 0.15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(24, 11, 5, 0.08)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sinh Texture rãnh vi mô đĩa than Vinyl bằng thuật toán Canvas
 */
function createHeroGrooveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f13';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Vẽ 65 rãnh đĩa đồng tâm vi mô
  for (let r = 70; r < 246; r += 2.5) {
    const alpha = 0.08 + Math.sin(r * 0.4) * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Nhãn tâm đĩa than cổ điển màu rượu vang đỏ
  ctx.beginPath();
  ctx.arc(cx, cy, 66, 0, Math.PI * 2);
  ctx.fillStyle = '#6b1724';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0c';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sinh Texture biển đồng khắc tên cỗ máy cổ điển (Vintage Engraved Brass Plaque)
 */
function createBrassNameplateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Nền đồng xước nhẹ
  const grad = ctx.createLinearGradient(0, 0, 512, 160);
  grad.addColorStop(0, '#c8a265');
  grad.addColorStop(0.5, '#e0c58e');
  grad.addColorStop(1, '#a88144');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 160);

  // Viền chỉ đen đôi
  ctx.strokeStyle = '#3e2c14';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 140);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 16, 480, 128);

  // 4 Ốc vít ở 4 góc
  const screwCoords = [
    [24, 24],
    [488, 24],
    [24, 136],
    [488, 136]
  ];
  screwCoords.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1a08';
    ctx.fill();
  });

  // Chữ khắc đen chìm
  ctx.fillStyle = '#221508';
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px serif';
  ctx.fillText('AURA LOFI • 1926', 256, 68);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AUDIOPHILE GRAMOPHONE', 256, 102);

  ctx.font = 'italic 14px serif';
  ctx.fillText('Handcrafted Precision Plinth', 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Mốc tọa độ Camera điện ảnh (Cinematic Camera Keyframes) theo từng chặng cuộn trang (Scrollytelling)
 */
const CAMERA_KEYFRAMES = [
  // 0. Hero: Toàn cảnh điện ảnh mở màn (Cinematic Hero 3/4)
  {
    progress: 0.0,
    camPos: new THREE.Vector3(0, 3.6, 11.2),
    lookAt: new THREE.Vector3(0, 1.2, 0),
    groupRotY: 0.35,
    groupRotX: 0.02
  },
  // 1. Chương 1 (Xúc giác Hoài niệm): Cận cảnh Macro cụm cần kim, tạ đối trọng & rãnh đĩa than
  {
    progress: 0.25,
    camPos: new THREE.Vector3(2.1, 2.7, 4.4),
    lookAt: new THREE.Vector3(0.85, 1.65, 0.3),
    groupRotY: 0.12,
    groupRotX: 0.06
  },
  // 2. Chương 2 (Liệu pháp Âm học): Trực diện loa kèn đồng thau hoa muống biển
  {
    progress: 0.52,
    camPos: new THREE.Vector3(-2.8, 4.3, 5.8),
    lookAt: new THREE.Vector3(-0.7, 2.4, 0.4),
    groupRotY: 0.82,
    groupRotX: -0.04
  },
  // 3. Chương 3 (Di sản & Giá trị): Góc nhìn cao nghệ thuật thư thái (Zen Elevation)
  {
    progress: 0.76,
    camPos: new THREE.Vector3(0.0, 6.8, 7.8),
    lookAt: new THREE.Vector3(0.0, 1.1, 0.0),
    groupRotY: 1.45,
    groupRotX: 0.08
  },
  // 4. Chương 4 (Lời mời gọi CTA): Toàn cảnh điện ảnh mở rộng, ánh sáng hội tụ
  {
    progress: 1.0,
    camPos: new THREE.Vector3(0.0, 3.2, 10.4),
    lookAt: new THREE.Vector3(0.0, 1.3, 0.0),
    groupRotY: 0.42,
    groupRotX: 0.02
  }
];

/**
 * Nội suy trơn mượt giữa các keyframe máy quay điện ảnh (Smoothstep Interpolation)
 */
function interpolateCinematicCamera(progress, outPos, outLook, outRot) {
  const p = Math.max(0, Math.min(1, progress));

  let prev = CAMERA_KEYFRAMES[0];
  let next = CAMERA_KEYFRAMES[1];

  for (let i = 0; i < CAMERA_KEYFRAMES.length - 1; i++) {
    if (p >= CAMERA_KEYFRAMES[i].progress && p <= CAMERA_KEYFRAMES[i + 1].progress) {
      prev = CAMERA_KEYFRAMES[i];
      next = CAMERA_KEYFRAMES[i + 1];
      break;
    }
  }

  const range = next.progress - prev.progress;
  const rawT = range === 0 ? 0 : (p - prev.progress) / range;
  const t = rawT * rawT * (3 - 2 * rawT);

  outPos.lerpVectors(prev.camPos, next.camPos, t);
  outLook.lerpVectors(prev.lookAt, next.lookAt, t);
  outRot.y = prev.groupRotY + (next.groupRotY - prev.groupRotY) * t;
  outRot.x = prev.groupRotX + (next.groupRotX - prev.groupRotX) * t;
}

export default function IntroLandingPage() {
  const navigate = useNavigate();
  const canvasMountRef = useRef(null);

  // Trạng thái nghe thử âm thanh môi trường tương tác
  const [activeAmbient, setActiveAmbient] = useState(null);
  const [isPlayingVinylPreview, setIsPlayingVinylPreview] = useState(false);
  const [isTransitioningToApp, setIsTransitioningToApp] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);

  // Kích hoạt animation lối vào (Entrance Animation) của Anime.js
  useEffect(() => {
    animate('.anime-entrance-badge', {
      opacity: [0, 1],
      translateY: [-24, 0],
      duration: 1000,
      ease: 'outQuad'
    });

    animate('.anime-entrance-title', {
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 1200,
      delay: 200,
      ease: 'outCubic'
    });

    animate('.anime-entrance-desc', {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 1200,
      delay: 400,
      ease: 'outCubic'
    });

    animate('.anime-entrance-cta', {
      opacity: [0, 1],
      scale: [0.92, 1],
      duration: 1000,
      delay: 600,
      ease: 'outBack'
    });

    animate('.anime-stat-pill', {
      opacity: [0, 1],
      translateY: [25, 0],
      delay: stagger(120, { start: 700 }),
      duration: 900,
      ease: 'outCubic'
    });
  }, []);

  // Khởi tạo Sân khấu 3D Three.js Điện ảnh Toàn màn hình & Mâm Đĩa Than Siêu Chi Tiết
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.035);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.6, 11.2);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Môi trường phản chiếu PBR cao cấp
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const roomEnvTexture = pmremGenerator.fromScene(roomEnv).texture;
    scene.environment = roomEnvTexture;

    // Ánh sáng điện ảnh ấm áp (Amber 2700K)
    const ambientLight = new THREE.AmbientLight(0xffedd5, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 3.4);
    keyLight.position.set(5.5, 11.0, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfef3c7, 1.9);
    rimLight.position.set(-6.5, 7.5, -5.5);
    scene.add(rimLight);

    const accentWarmGlow = new THREE.PointLight(0xf59e0b, 2.2, 12);
    accentWarmGlow.position.set(0, 3.2, 1.5);
    scene.add(accentWarmGlow);

    // Group chính chứa mâm đĩa than
    const gramophoneGroup = new THREE.Group();
    scene.add(gramophoneGroup);

    // ========================================================
    // TẠO TEXTURES & VẬT LIỆU PBR CHÂN THỰC
    // ========================================================
    const shadowTexture = createHeroContactShadowTexture();
    const woodTexture = createProceduralWoodTexture();
    const grooveTexture = createHeroGrooveTexture();
    const nameplateTexture = createBrassNameplateTexture();

    // 1. Gỗ óc chó PBR cao cấp có vân chìm tự nhiên
    const walnutMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      bumpMap: woodTexture,
      bumpScale: 0.015,
      color: 0x4a2c19, // Walnut wood tone
      roughness: 0.42,
      metalness: 0.06
    });

    // 2. Đồng thau phay xước sáng bóng (Brushed Brass)
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc8a265, // Brushed brass
      metalness: 0.92,
      roughness: 0.18
    });

    // 3. Vàng đồng đúc đậm (Cast Gold Accent)
    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.86,
      roughness: 0.25
    });

    // 4. Nhôm phay xước mặt máy (Brushed Metal Faceplate)
    const metalPlateMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.22
    });

    // 5. Cao su chống rung màu đen (Damped Black Rubber)
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x16161a,
      roughness: 0.85,
      metalness: 0.05
    });

    // 6. Đĩa than Vinyl có vi rãnh âm thanh
    const vinylMat = new THREE.MeshStandardMaterial({
      map: grooveTexture,
      bumpMap: grooveTexture,
      bumpScale: 0.025,
      color: 0x111116,
      roughness: 0.30,
      metalness: 0.28
    });

    // ========================================================
    // A. THÙNG MÁY GỖ ÓC CHÓ BÁT GIÁC GIẬT CẤP (PRECISION PLINTH)
    // ========================================================
    // 1. Chân đế đáy bát giác rộng
    const basePlinthGeom = new THREE.CylinderGeometry(2.40, 2.50, 0.22, 8);
    basePlinthGeom.rotateY(Math.PI / 8);
    const basePlinth = new THREE.Mesh(basePlinthGeom, walnutMat);
    basePlinth.position.y = 0.11;
    basePlinth.castShadow = true;
    basePlinth.receiveShadow = true;
    gramophoneGroup.add(basePlinth);

    // 8 Chân đế cách ly chống rung (Audiophile Isolation Feet)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const footGroup = new THREE.Group();
      footGroup.position.set(Math.cos(angle) * 2.26, 0.04, Math.sin(angle) * 2.26);

      const footRubberGeom = new THREE.CylinderGeometry(0.18, 0.20, 0.06, 16);
      const footRubber = new THREE.Mesh(footRubberGeom, rubberMat);
      footGroup.add(footRubber);

      const footBrassGeom = new THREE.CylinderGeometry(0.15, 0.17, 0.06, 16);
      const footBrass = new THREE.Mesh(footBrassGeom, darkGoldMat);
      footBrass.position.y = 0.06;
      footGroup.add(footBrass);

      gramophoneGroup.add(footGroup);
    }

    // 2. Thân thùng gỗ chính hình bát giác
    const bodyGeom = new THREE.CylinderGeometry(2.08, 2.08, 1.15, 8);
    bodyGeom.rotateY(Math.PI / 8);
    const body = new THREE.Mesh(bodyGeom, walnutMat);
    body.position.y = 0.79;
    body.castShadow = true;
    body.receiveShadow = true;
    gramophoneGroup.add(body);

    // 3. Nắp mặt trên giật cấp vát viền
    const topDeckGeom = new THREE.CylinderGeometry(2.40, 2.34, 0.18, 8);
    topDeckGeom.rotateY(Math.PI / 8);
    const topDeck = new THREE.Mesh(topDeckGeom, walnutMat);
    topDeck.position.y = 1.45;
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    gramophoneGroup.add(topDeck);

    // Tấm kim loại phay xước gắn chìm trên mặt máy (Brushed Metal Plinth Inset)
    const insetPlateGeom = new THREE.CylinderGeometry(2.25, 2.25, 0.02, 8);
    insetPlateGeom.rotateY(Math.PI / 8);
    const insetPlate = new THREE.Mesh(insetPlateGeom, metalPlateMat);
    insetPlate.position.y = 1.55;
    gramophoneGroup.add(insetPlate);

    // 8 Con ốc vít nhỏ bằng đồng ở 8 góc mặt máy
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const screwGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12);
      const screw = new THREE.Mesh(screwGeom, darkGoldMat);
      screw.position.set(Math.cos(angle) * 2.15, 1.56, Math.sin(angle) * 2.15);
      gramophoneGroup.add(screw);
    }

    // Biển đồng khắc tên máy cổ điển ở mặt trước thùng gỗ (Vintage Plaque)
    const plaqueGeom = new THREE.PlaneGeometry(0.85, 0.30);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: nameplateTexture,
      roughness: 0.35,
      metalness: 0.82
    });
    const plaque = new THREE.Mesh(plaqueGeom, plaqueMat);
    plaque.position.set(0, 0.85, 1.95);
    gramophoneGroup.add(plaque);

    // 8 Cột trụ đồng chạm trổ bảo vệ các góc
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const colGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.10, 16);
      const col = new THREE.Mesh(colGeom, darkGoldMat);
      col.position.set(Math.cos(angle) * 2.04, 0.79, Math.sin(angle) * 2.04);
      col.castShadow = true;
      gramophoneGroup.add(col);
    }

    // ========================================================
    // B. MÂM ĐĨA QUAY, THẢM LÓT & CỤC CHẶN KIM LOẠI NẶNG (CLAMP)
    // ========================================================
    // Mâm xoay đồng thau đúc nguyên khối (Heavy Platter)
    const platterGeom = new THREE.CylinderGeometry(2.05, 2.05, 0.09, 64);
    const platter = new THREE.Mesh(platterGeom, darkGoldMat);
    platter.position.y = 1.60;
    platter.castShadow = true;
    gramophoneGroup.add(platter);

    // Thảm lót cao su chống trượt (Rubber Slipmat)
    const slipmatGeom = new THREE.CylinderGeometry(2.02, 2.02, 0.02, 64);
    const slipmat = new THREE.Mesh(slipmatGeom, rubberMat);
    slipmat.position.y = 1.65;
    gramophoneGroup.add(slipmat);

    // Group Đĩa Than Xoay Độc Lập
    const vinylGroup = new THREE.Group();
    vinylGroup.position.set(0, 1.67, 0);
    gramophoneGroup.add(vinylGroup);

    const vinylDiscGeom = new THREE.CylinderGeometry(1.98, 1.98, 0.035, 64);
    const vinylDisc = new THREE.Mesh(vinylDiscGeom, vinylMat);
    vinylGroup.add(vinylDisc);

    // Trục chính mạ crom (Spindle Pin)
    const spindleGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.38, 20);
    const spindle = new THREE.Mesh(spindleGeom, brassMat);
    spindle.position.y = 0.16;
    vinylGroup.add(spindle);

    // CỤC CHẶN ĐĨA KIM LOẠI NẶNG (HEAVY AUDIOPHILE RECORD WEIGHT CLAMP)
    const clampGroup = new THREE.Group();
    clampGroup.position.set(0, 0.03, 0);
    vinylGroup.add(clampGroup);

    // Đế clamp
    const clampBaseGeom = new THREE.CylinderGeometry(0.42, 0.46, 0.12, 32);
    const clampBase = new THREE.Mesh(clampBaseGeom, brassMat);
    clampBase.position.y = 0.06;
    clampGroup.add(clampBase);

    // Thân eo có rãnh khía kim cương để cầm nắm (Knurled Grip)
    const clampGripGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.10, 32);
    const clampGrip = new THREE.Mesh(clampGripGeom, darkGoldMat);
    clampGrip.position.y = 0.17;
    clampGroup.add(clampGrip);

    // Núm đỉnh clamp
    const clampCapGeom = new THREE.CylinderGeometry(0.38, 0.34, 0.08, 32);
    const clampCap = new THREE.Mesh(clampCapGeom, brassMat);
    clampCap.position.y = 0.26;
    clampGroup.add(clampCap);

    // Mắt bọt thủy cân bằng giọt nước (Bubble Level)
    const bubbleGeom = new THREE.CircleGeometry(0.12, 24);
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.1,
      metalness: 0.8
    });
    const bubble = new THREE.Mesh(bubbleGeom, bubbleMat);
    bubble.rotation.x = -Math.PI / 2;
    bubble.position.y = 0.301;
    clampGroup.add(bubble);

    // ========================================================
    // C. CÁC NÚT CƠ KHÍ ĐIỀU KHIỂN & ĐÈN RỌI KIM TRÊN MẶT MÁY
    // ========================================================
    // 1. Nút Bật/Tắt (Start/Stop Button Bezel)
    const startBtnGroup = new THREE.Group();
    startBtnGroup.position.set(-1.45, 1.56, 1.35);

    const btnBezelGeom = new THREE.CylinderGeometry(0.20, 0.22, 0.04, 24);
    const btnBezel = new THREE.Mesh(btnBezelGeom, darkGoldMat);
    startBtnGroup.add(btnBezel);

    const btnCapGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24);
    const btnCap = new THREE.Mesh(btnCapGeom, brassMat);
    btnCap.position.y = 0.03;
    startBtnGroup.add(btnCap);
    gramophoneGroup.add(startBtnGroup);

    // 2. Cần gạt tốc độ (Speed Selector 33 / 45 / 78 RPM)
    const speedSwitchGroup = new THREE.Group();
    speedSwitchGroup.position.set(-1.45, 1.56, 0.75);

    const switchBaseGeom = new THREE.BoxGeometry(0.15, 0.03, 0.35);
    const switchBase = new THREE.Mesh(switchBaseGeom, darkGoldMat);
    speedSwitchGroup.add(switchBase);

    const switchLeverGeom = new THREE.CylinderGeometry(0.02, 0.025, 0.16, 12);
    const switchLever = new THREE.Mesh(switchLeverGeom, brassMat);
    switchLever.position.set(0, 0.08, -0.04);
    switchLever.rotation.x = 0.25;
    speedSwitchGroup.add(switchLever);
    gramophoneGroup.add(speedSwitchGroup);

    // 3. Đèn rọi kim Stylus (Stylus Target Light Tower)
    const targetLightGroup = new THREE.Group();
    targetLightGroup.position.set(-1.58, 1.56, -0.25);

    const lightPillarGeom = new THREE.CylinderGeometry(0.06, 0.075, 0.38, 16);
    const lightPillar = new THREE.Mesh(lightPillarGeom, darkGoldMat);
    lightPillar.position.y = 0.19;
    targetLightGroup.add(lightPillar);

    const lightHeadGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.12, 16);
    lightHeadGeom.rotateX(Math.PI / 4);
    const lightHead = new THREE.Mesh(lightHeadGeom, brassMat);
    lightHead.position.set(0.03, 0.39, 0.03);
    targetLightGroup.add(lightHead);

    // Đèn LED nhỏ chiếu rọi vào đầu kim
    const stylusSpot = new THREE.SpotLight(0xffedd5, 1.8, 4, Math.PI / 6, 0.5);
    stylusSpot.position.set(0.03, 0.42, 0.03);
    stylusSpot.target.position.set(0.58, 1.67, -0.05);
    targetLightGroup.add(stylusSpot);
    targetLightGroup.add(stylusSpot.target);
    gramophoneGroup.add(targetLightGroup);

    // ========================================================
    // D. CỤM CẦN KIM AUDIOPHILE CƠ HỌC SIÊU CHI TIẾT (TONEARM ASSEMBLY)
    // ========================================================
    const tonearmAssembly = new THREE.Group();
    tonearmAssembly.position.set(1.42, 1.56, 0.95);
    gramophoneGroup.add(tonearmAssembly);

    // 1. Chân đế Gimbal Base nhiều tầng giật cấp
    const armBaseTier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.06, 32),
      darkGoldMat
    );
    armBaseTier1.position.y = 0.03;
    tonearmAssembly.add(armBaseTier1);

    const armBaseTier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.14, 32),
      brassMat
    );
    armBaseTier2.position.y = 0.13;
    tonearmAssembly.add(armBaseTier2);

    // Trụ trục Gimbal thẳng đứng
    const gimbalPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.24, 20),
      darkGoldMat
    );
    gimbalPillar.position.y = 0.28;
    tonearmAssembly.add(gimbalPillar);

    // 2. Vòng khuyên Gimbal Bearing kép
    const gimbalRingGeom = new THREE.TorusGeometry(0.16, 0.032, 16, 32);
    const gimbalRing = new THREE.Mesh(gimbalRingGeom, brassMat);
    gimbalRing.position.y = 0.36;
    tonearmAssembly.add(gimbalRing);

    // 3. TẠ ĐỐI TRỌNG CÂN BẰNG PHÍA SAU (AUDIOPHILE COUNTERWEIGHT)
    const counterweightGroup = new THREE.Group();
    counterweightGroup.position.set(0.22, 0.36, 0.24);

    // Trục sau đỡ tạ
    const weightStemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.40, 16);
    weightStemGeom.rotateX(Math.PI / 4);
    const weightStem = new THREE.Mesh(weightStemGeom, darkGoldMat);
    counterweightGroup.add(weightStem);

    // Khối tạ đối trọng chính bằng đồng nặng
    const weightBodyGeom = new THREE.CylinderGeometry(0.19, 0.19, 0.22, 32);
    weightBodyGeom.rotateX(Math.PI / 4);
    const weightBody = new THREE.Mesh(weightBodyGeom, darkGoldMat);
    weightBody.position.set(0, 0.08, 0.08);
    counterweightGroup.add(weightBody);

    // Vòng chia vạch số lực tì kim (Gram Tracking Force Ring)
    const weightDialGeom = new THREE.CylinderGeometry(0.195, 0.195, 0.06, 32);
    weightDialGeom.rotateX(Math.PI / 4);
    const weightDial = new THREE.Mesh(weightDialGeom, rubberMat);
    weightDial.position.set(0, 0.03, 0.03);
    counterweightGroup.add(weightDial);

    tonearmAssembly.add(counterweightGroup);

    // 4. Cần gạt nâng hạ kim (Cueing / Arm-Lift Lever)
    const cueingLeverGroup = new THREE.Group();
    cueingLeverGroup.position.set(-0.16, 0.28, 0.08);

    const cueingStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.18, 12),
      brassMat
    );
    cueingStem.rotation.z = -0.35;
    cueingLeverGroup.add(cueingStem);

    const cueingKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 12),
      rubberMat
    );
    cueingKnob.position.set(-0.04, 0.09, 0);
    cueingLeverGroup.add(cueingKnob);
    tonearmAssembly.add(cueingLeverGroup);

    // 5. Gá đỡ cần kim chữ U (Tonearm Rest & Clip)
    const restGroup = new THREE.Group();
    restGroup.position.set(-0.35, 0.06, -0.32);

    const restPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.28, 12),
      darkGoldMat
    );
    restPost.position.y = 0.14;
    restGroup.add(restPost);

    const restFork = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.06),
      darkGoldMat
    );
    restFork.position.y = 0.28;
    restGroup.add(restFork);
    tonearmAssembly.add(restGroup);

    // 6. Cần kim uốn cong chữ S chuẩn Hi-Fi (Classic S-shaped Tonearm Tube)
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.36, 0),
      new THREE.Vector3(-0.25, 0.38, -0.35),
      new THREE.Vector3(-0.55, 0.32, -0.75),
      new THREE.Vector3(-0.84, 0.23, -1.00)
    ]);
    const tonearmGeom = new THREE.TubeGeometry(armCurve, 36, 0.036, 16, false);
    const tonearm = new THREE.Mesh(tonearmGeom, brassMat);
    tonearm.castShadow = true;
    tonearmAssembly.add(tonearm);

    // 7. Đầu máng kim Headshell & Hộp kim Cartridge
    const headshellGroup = new THREE.Group();
    headshellGroup.position.set(-0.84, 0.23, -1.00);
    headshellGroup.rotation.set(0.12, 0.38, -0.08);

    // Máng kim đục lỗ tản trọng lượng
    const headshellPlateGeom = new THREE.BoxGeometry(0.13, 0.03, 0.26);
    const headshellPlate = new THREE.Mesh(headshellPlateGeom, darkGoldMat);
    headshellPlate.position.z = -0.10;
    headshellGroup.add(headshellPlate);

    // Cần nâng ngón tay (Finger Lift Hook)
    const fingerLiftGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8);
    const fingerLift = new THREE.Mesh(fingerLiftGeom, brassMat);
    fingerLift.position.set(0.07, 0.02, -0.16);
    fingerLift.rotation.z = Math.PI / 3;
    headshellGroup.add(fingerLift);

    // Hộp kim Cartridge (Audiophile Moving Magnet Cartridge)
    const cartridgeGeom = new THREE.BoxGeometry(0.11, 0.09, 0.16);
    const cartridgeMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Đỏ thẫm sang trọng phong cách Ortofon
      roughness: 0.3,
      metalness: 0.2
    });
    const cartridge = new THREE.Mesh(cartridgeGeom, cartridgeMat);
    cartridge.position.set(0, -0.05, -0.10);
    headshellGroup.add(cartridge);

    // Mũi kim Stylus kim cương nhọn hoắt
    const stylusGeom = new THREE.ConeGeometry(0.014, 0.07, 10);
    const stylus = new THREE.Mesh(stylusGeom, darkGoldMat);
    stylus.position.set(0, -0.11, -0.13);
    stylus.rotation.x = Math.PI;
    headshellGroup.add(stylus);

    tonearmAssembly.add(headshellGroup);

    // ========================================================
    // E. LOA KÈN HOA MUỐNG BIỂN 12 MÚI ĐỒNG THAU UỐN LƯỢN
    // ========================================================
    const hornGroup = new THREE.Group();
    gramophoneGroup.add(hornGroup);

    const elbowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.15, 1.55, -0.75),
      new THREE.Vector3(-1.18, 1.95, -0.75),
      new THREE.Vector3(-1.10, 2.45, -0.60),
      new THREE.Vector3(-0.85, 2.95, -0.25)
    ]);
    const elbowGeom = new THREE.TubeGeometry(elbowCurve, 36, 0.11, 16, false);
    const elbow = new THREE.Mesh(elbowGeom, brassMat);
    elbow.castShadow = true;
    hornGroup.add(elbow);

    const petals = 12;
    const radialSegs = petals * 4;
    const heightSegs = 28;
    const hornBellGeom = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= heightSegs; y++) {
      const v = y / heightSegs;
      const heightVal = 1.95 * Math.pow(v, 1.15);
      const baseRadius = 0.12 + 1.85 * Math.pow(v, 2.5);
      const petalWave = 0.22 * Math.pow(v, 2.8);

      for (let x = 0; x <= radialSegs; x++) {
        const u = x / radialSegs;
        const angle = u * Math.PI * 2;
        const radius = baseRadius + Math.sin(angle * petals) * petalWave;

        const vx = Math.cos(angle) * radius;
        const vy = heightVal;
        const vz = Math.sin(angle) * radius;

        vertices.push(vx, vy, vz);
        uvs.push(u, v);
      }
    }

    for (let y = 0; y < heightSegs; y++) {
      for (let x = 0; x < radialSegs; x++) {
        const a = y * (radialSegs + 1) + x;
        const b = (y + 1) * (radialSegs + 1) + x;
        const c = (y + 1) * (radialSegs + 1) + (x + 1);
        const d = y * (radialSegs + 1) + (x + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    hornBellGeom.setIndex(indices);
    hornBellGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    hornBellGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    hornBellGeom.computeVertexNormals();

    const hornBellMesh = new THREE.Mesh(hornBellGeom, brassMat);
    hornBellMesh.position.set(-0.85, 2.95, -0.25);
    hornBellMesh.rotation.set(0.18, -0.48, 0.22);
    hornBellMesh.castShadow = true;
    hornGroup.add(hornBellMesh);

    // Bóng đổ tiếp xúc tỏa tròn dưới đáy thùng máy
    const shadowGeom = new THREE.PlaneGeometry(7.2, 7.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(shadowGeom, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.005, 0);
    gramophoneGroup.add(contactShadow);

    // Hạt bụi nắng hoàng hôn lơ lửng không gian 3D (Floating Dust Motes)
    const particleCount = 75;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      particlePositions[p] = (Math.random() - 0.5) * 12;
      particlePositions[p + 1] = Math.random() * 8;
      particlePositions[p + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfef3c7,
      size: 0.055,
      transparent: true,
      opacity: 0.65
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Vòng hạt sóng âm lan tỏa từ miệng loa kèn (Acoustic Wave Particles)
    const waveCount = 36;
    const waveGeom = new THREE.BufferGeometry();
    const wavePositions = new Float32Array(waveCount * 3);
    for (let w = 0; w < waveCount * 3; w += 3) {
      wavePositions[w] = -0.85 + (Math.random() - 0.5) * 0.5;
      wavePositions[w + 1] = 4.2 + (Math.random() - 0.5) * 0.5;
      wavePositions[w + 2] = 0.5 + Math.random() * 2.0;
    }
    waveGeom.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
    const waveMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.08,
      transparent: true,
      opacity: 0.4
    });
    const waveParticles = new THREE.Points(waveGeom, waveMat);
    scene.add(waveParticles);

    // ========================================================
    // CINEMATIC SCROLL & STEADICAM CONTROLLER
    // ========================================================
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const targetCamPos = new THREE.Vector3(0, 3.6, 11.2);
    const currentCamPos = new THREE.Vector3(0, 3.6, 11.2);
    const targetLookAt = new THREE.Vector3(0, 1.2, 0);
    const currentLookAt = new THREE.Vector3(0, 1.2, 0);
    const targetRot = { x: 0.02, y: 0.35 };

    let animId;
    let clock = new THREE.Clock();

    const animateLoop = () => {
      animId = requestAnimationFrame(animateLoop);
      const elapsedTime = clock.getElapsedTime();

      // Đĩa than tự quay 33⅓ RPM
      vinylGroup.rotation.y += 0.012;

      // Tính toán tiến trình cuộn trang
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? Math.max(0, Math.min(1, window.scrollY / docHeight)) : 0;

      if (scrollProgress < 0.2) setCurrentChapter(0);
      else if (scrollProgress < 0.45) setCurrentChapter(1);
      else if (scrollProgress < 0.7) setCurrentChapter(2);
      else if (scrollProgress < 0.9) setCurrentChapter(3);
      else setCurrentChapter(4);

      interpolateCinematicCamera(scrollProgress, targetCamPos, targetLookAt, targetRot);

      // Thở nhẹ của máy quay Steadicam điện ảnh
      const breathing = Math.sin(elapsedTime * 0.75) * 0.06;
      targetCamPos.y += breathing;

      // Chuột Parallax
      const mouseParallaxX = mouseX * 0.45;
      const mouseParallaxY = mouseY * 0.3;
      targetCamPos.x += mouseParallaxX;
      targetCamPos.y += mouseParallaxY;

      // Làm mịn chuyển động
      currentCamPos.lerp(targetCamPos, 0.045);
      currentLookAt.lerp(targetLookAt, 0.045);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookAt);

      gramophoneGroup.rotation.y += (targetRot.y + mouseX * 0.15 - gramophoneGroup.rotation.y) * 0.045;
      gramophoneGroup.rotation.x += (targetRot.x - mouseY * 0.1 - gramophoneGroup.rotation.x) * 0.045;

      // Nhịp thở âm học của loa kèn
      const hornPulse = 1.0 + Math.sin(elapsedTime * 2.2) * 0.015;
      hornBellMesh.scale.set(hornPulse, 1.0, hornPulse);

      // Hạt bụi nắng
      const pos = particleGeom.attributes.position.array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        pos[i] += 0.0035;
        if (pos[i] > 8) pos[i] = 0;
      }
      particleGeom.attributes.position.needsUpdate = true;

      // Sóng âm loa kèn
      const wavePos = waveGeom.attributes.position.array;
      for (let w = 2; w < waveCount * 3; w += 3) {
        wavePos[w] += 0.018;
        if (wavePos[w] > 5.5) {
          wavePos[w] = 0.5;
        }
      }
      waveGeom.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animateLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Xử lý nghe thử âm thanh môi trường tương tác
  const toggleAmbientSound = (key) => {
    playHapticClick();
    if (activeAmbient === key) {
      setAmbientVolume(key, 0);
      setActiveAmbient(null);
    } else {
      if (activeAmbient) {
        setAmbientVolume(activeAmbient, 0);
      }
      setAmbientVolume(key, 0.7);
      setActiveAmbient(key);

      animate(`#sound-pad-${key}`, {
        scale: [1, 1.05, 1],
        duration: 400,
        ease: 'outBack'
      });
    }
  };

  // Nghe thử âm thanh hạ kim đĩa than (ASMR)
  const triggerVinylPreview = () => {
    playHapticClick();
    setIsPlayingVinylPreview(true);
    playNeedleDropEffect({ duration: 3.5 });
    setTimeout(() => {
      setIsPlayingVinylPreview(false);
    }, 3500);
  };

  // Chuyển cảnh điện ảnh vào ứng dụng
  const handleCinematicEnterApp = () => {
    playHapticClick();
    playNeedleDropEffect({ duration: 2.0 });
    setIsTransitioningToApp(true);

    setTimeout(() => {
      navigate('/app');
    }, 750);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-amber-400 selection:text-black overflow-x-hidden font-sans relative">
      {/* 1. CINEMATIC FULLSCREEN THREE.JS BACKDROP */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 z-0 pointer-events-none w-screen h-screen overflow-hidden"
      />

      {/* 2. CINEMATIC VIGNETTE & FILM OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,9,14,0.85)_100%)]" />

      {/* 3. CINEMATIC TRANSITION OVERLAY (FADE TO BLACK KHI VÀO APP) */}
      <div
        className={`fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-700 ease-in-out ${
          isTransitioningToApp ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 4. TOP NAVIGATION BAR */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#07090e]/60 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500/40 via-amber-300/30 to-amber-200/50 border border-amber-300/40 flex items-center justify-center shadow-lg shadow-amber-500/15">
              <Disc3 className="w-5 h-5 text-amber-300 animate-[spin_8s_linear_infinite]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                AuraLofi
              </span>
              <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase -mt-0.5">
                3D VINYL & MINDFUL SANCTUARY
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a
              href="#chuong-1"
              className={`transition-colors ${currentChapter === 1 ? 'text-amber-300 font-bold' : 'hover:text-amber-300'}`}
            >
              I. Nghi Thức Analog
            </a>
            <a
              href="#chuong-2"
              className={`transition-colors ${currentChapter === 2 ? 'text-amber-300 font-bold' : 'hover:text-amber-300'}`}
            >
              II. Liệu Pháp Âm Học
            </a>
            <a
              href="#chuong-3"
              className={`transition-colors ${currentChapter === 3 ? 'text-amber-300 font-bold' : 'hover:text-amber-300'}`}
            >
              III. Di Sản & Nghệ Thuật
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCinematicEnterApp}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 hover:from-amber-500/40 hover:to-amber-400/50 border border-amber-300/50 hover:border-amber-200 text-xs font-bold text-amber-200 hover:text-white transition-all shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <span>Mở Trình Phát Đĩa Than</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          SCROLLYTELLING CHAPTERS (CÁC CHƯƠNG ĐIỆN ẢNH)
          ========================================== */}
      <main className="relative z-10 pt-20">
        {/* HERO CHAPTER: MÀN MỞ ĐẦU HOÀI NIỆM */}
        <section className="min-h-screen flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-8 py-16 relative">
          <div className="max-w-2xl text-left">
            <div className="anime-entrance-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-300/30 text-amber-300 text-xs font-semibold mb-6 shadow-sm backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
              <span>Ốc Đảo Tĩnh Lặng Kỹ Thuật Số Giữa Thời Đại Quá Tải</span>
            </div>

            <h1 className="anime-entrance-title text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-6 drop-shadow-md">
              Chạm vào <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">hoài niệm</span>.<br />
              Lắng đọng <span className="underline decoration-amber-400/50 decoration-wavy underline-offset-8">tâm hồn</span>.
            </h1>

            <p className="anime-entrance-desc text-slate-300 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-normal drop-shadow">
              Giữa thế giới số ngập tràn thông báo và áp lực vô hình, <strong>AuraLofi</strong> đưa bạn trở về với nghi thức nghe nhạc chậm rãi: tiếng nổ lách tách vi mô của mâm đĩa than cổ thập niên 1920, âm thanh thiên nhiên êm dịu và những tình khúc bất hủ giúp bạn học tập, làm việc sâu và tìm lại sự an yên.
            </p>

            <div className="anime-entrance-cta flex flex-wrap items-center gap-4 mb-10">
              <button
                type="button"
                onClick={handleCinematicEnterApp}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-2xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>BƯỚC VÀO KHÔNG GIAN NGHE NHẠC</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={triggerVinylPreview}
                className={`inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${
                  isPlayingVinylPreview
                    ? 'bg-amber-400/25 border-amber-300 text-amber-200 shadow-lg shadow-amber-500/20'
                    : 'bg-black/40 hover:bg-black/60 border-white/20 text-slate-200 hover:text-white'
                }`}
              >
                <Disc3 className={`w-4 h-4 text-amber-300 ${isPlayingVinylPreview ? 'animate-spin' : ''}`} />
                <span>{isPlayingVinylPreview ? 'Đang hạ cần kim...' : 'Nghe Thử Kim Đĩa Than (ASMR)'}</span>
              </button>
            </div>

            {/* Thông số cốt lõi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
              <div className="anime-stat-pill p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col">
                <span className="text-xl font-black text-amber-300 font-mono">33⅓ RPM</span>
                <span className="text-[11px] text-slate-400">Vòng quay kim đĩa</span>
              </div>
              <div className="anime-stat-pill p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col">
                <span className="text-xl font-black text-amber-300 font-mono">528 Hz</span>
                <span className="text-[11px] text-slate-400">Chuông Solfeggio</span>
              </div>
              <div className="anime-stat-pill p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col">
                <span className="text-xl font-black text-amber-300 font-mono">0 KB</span>
                <span className="text-[11px] text-slate-400">Web Audio Synth</span>
              </div>
              <div className="anime-stat-pill p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col">
                <span className="text-xl font-black text-amber-300 font-mono">Audiophile</span>
                <span className="text-[11px] text-slate-400">Chi tiết cơ khí cao cấp</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 inset-x-0 flex flex-col items-center justify-center text-center text-slate-400 text-xs font-mono pointer-events-none">
            <span className="tracking-widest uppercase mb-1 opacity-75">Cuộn chuột để bắt đầu hành trình điện ảnh</span>
            <ChevronDown className="w-4 h-4 text-amber-300 animate-bounce" />
          </div>
        </section>

        {/* CHƯƠNG 1: XÚC GIÁC HOÀI NIỆM & CẬN CẢNH CẦN KIM AUDIOPHILE */}
        <section id="chuong-1" className="min-h-screen flex items-center max-w-7xl mx-auto px-4 sm:px-8 py-24">
          <div className="w-full lg:w-1/2 p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>CHƯƠNG I • NGHI THỨC ANALOG</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
              Xúc Giác Của Âm Thanh Trong Thời Đại Vô Hình
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              Ngày nay, âm nhạc đã trở thành những tệp dữ liệu vô hình được tiêu thụ chớp nhoáng trên các thuật toán gợi ý vô tận. Chúng ta bấm nhảy bài trong 5 giây mà hiếm khi lắng nghe trọn vẹn.
            </p>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 font-normal">
              AuraLofi tái hiện lại <strong>nghi thức chậm rãi</strong>: chiếc mâm đĩa than gỗ óc chó đánh vec-ni thủ công, cụm cần kim đồng thau trang bị tạ đối trọng chia độ, trục xoay Gimbal Ring kép và cục chặn đĩa kim loại nặng ổn định rãnh đĩa. Bạn có thể tương tác vật lý (Vinyl Scratching) bằng chuột để tự mình trải nghiệm xúc giác cơ học chân thực.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Chà Đĩa Tương Tác</h4>
                  <p className="text-[11px] text-slate-400">Kéo đĩa đổi tốc độ playbackRate tự nhiên</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tua Kim Trực Quan</h4>
                  <p className="text-[11px] text-slate-400">Nhấc cần kim định vị vị trí bài hát</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CHƯƠNG 2: LIỆU PHÁP ÂM HỌC & LOA KÈN ĐỒNG THAU */}
        <section id="chuong-2" className="min-h-screen flex items-center justify-end max-w-7xl mx-auto px-4 sm:px-8 py-24">
          <div className="w-full lg:w-1/2 p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>CHƯƠNG II • LIỆU PHÁP ÂM HỌC</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
              Lắng Nghe Nhịp Thở Căn Phòng Của Bạn
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              Chiếc loa kèn hoa muống biển 12 múi đồng thau không chỉ là tác phẩm điêu khắc 3D, mà là biểu tượng của âm học khuếch đại tự nhiên. AuraLofi tích hợp bộ trộn âm thanh môi trường 4 kênh được tổng hợp bằng thuật toán toán học <strong>0KB file tải</strong> kết hợp chuông thiền Solfeggio 528Hz.
            </p>

            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-3">
                Nghe Thử Trực Tiếp Trên Trình Duyệt:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="sound-pad-rain"
                  onClick={() => toggleAmbientSound('rain')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    activeAmbient === 'rain'
                      ? 'bg-sky-500/25 border-sky-300 text-sky-200 shadow-lg shadow-sky-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200'
                  }`}
                >
                  <CloudRain className="w-5 h-5 text-sky-300 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Mưa Rơi Bên Cửa Sổ</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {activeAmbient === 'rain' ? 'Đang phát...' : 'Bấm để nghe'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="sound-pad-cafe"
                  onClick={() => toggleAmbientSound('cafe')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    activeAmbient === 'cafe'
                      ? 'bg-amber-500/25 border-amber-300 text-amber-200 shadow-lg shadow-amber-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200'
                  }`}
                >
                  <Coffee className="w-5 h-5 text-amber-300 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Quán Cà Phê Đêm</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {activeAmbient === 'cafe' ? 'Đang phát...' : 'Bấm để nghe'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="sound-pad-fireplace"
                  onClick={() => toggleAmbientSound('fireplace')}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    activeAmbient === 'fireplace'
                      ? 'bg-rose-500/25 border-rose-300 text-rose-200 shadow-lg shadow-rose-500/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200'
                  }`}
                >
                  <Flame className="w-5 h-5 text-rose-300 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Lò Sưởi Ấm Cúng</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {activeAmbient === 'fireplace' ? 'Đang phát...' : 'Bấm để nghe'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playHapticClick();
                    playZenBellChime();
                  }}
                  className="p-3.5 rounded-2xl border bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200 text-left flex items-center gap-3 transition-all cursor-pointer"
                >
                  <Bell className="w-5 h-5 text-amber-300 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Chuông Thiền 528Hz</div>
                    <div className="text-[10px] text-slate-400 font-mono">Gõ chuông Solfeggio</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-amber-300/90 pt-3 border-t border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Thuần Web Audio • 0KB Băng thông mạng • Không nén méo tiếng</span>
            </div>
          </div>
        </section>

        {/* CHƯƠNG 3: DI SẢN NHẠC TRỊNH & NGHỆ THUẬT CHẾ TÁC */}
        <section id="chuong-3" className="min-h-screen flex items-center max-w-7xl mx-auto px-4 sm:px-8 py-24">
          <div className="w-full lg:w-1/2 p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>CHƯƠNG III • DI SẢN & TỰ HÀO VĂN HÓA</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
              Tình Khúc Trịnh Công Sơn Trong Làn Sóng Lofi
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              Những kiệt tác như <em>Diễm Xưa</em>, <em>Hạ Trắng</em>, <em>Biển Nhớ</em>, <em>Còn Tuổi Nào Cho Em</em> không chỉ là âm nhạc, mà là di sản tâm hồn của nhiều thế hệ người Việt.
            </p>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 font-normal">
              AuraLofi khoác lên những giai điệu bất hủ ấy chiếc áo mới: phối khí Lofi Chillhop mộc mạc, guitar acoustic ấm áp, đĩa than cổ điển và tiếng mưa rơi bên thềm. Đây là cầu nối để thế hệ trẻ tìm lại chiều sâu và tự hào về di sản nghệ thuật nước nhà.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-rose-400" />
                <span className="text-xs font-medium text-slate-200">Tuyển tập nhạc Việt chọn lọc</span>
              </div>
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-medium text-slate-200">Studio xuất video 60 FPS</span>
              </div>
            </div>
          </div>
        </section>

        {/* CHƯƠNG 4: LỜI MỜI GỌI ĐIỆN ẢNH (CALL TO ACTION FINALE) */}
        <section className="min-h-screen flex flex-col justify-center items-center max-w-5xl mx-auto px-4 sm:px-8 py-24 text-center">
          <div className="w-full p-10 sm:p-16 rounded-3xl bg-black/60 backdrop-blur-2xl border border-amber-300/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase mb-3">
                KHÔNG GIAN CỦA RIÊNG BẠN
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-6">
                Chiếc Đĩa Than Đang Chờ Đón Bạn.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-10 font-normal leading-relaxed">
                Hãy cắm tai nghe, hít thở một hơi thật sâu và gác lại những xô bồ bên ngoài cánh cửa. Một không gian tĩnh lặng, ấm áp và đong đầy cảm xúc đã sẵn sàng.
              </p>

              <button
                type="button"
                onClick={handleCinematicEnterApp}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-sm tracking-wider shadow-2xl shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>BƯỚC VÀO TRÌNH PHÁT AURALOFI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <footer className="mt-16 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between w-full max-w-5xl px-4 gap-4">
            <span>AuraLofi © 2026 • Nghệ thuật chế tác 3D Three.js & Web Audio API</span>
            <span>Phím tắt hỗ trợ: Space • G • T • M • H</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
