import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  setAmbientVolume,
  getAmbientVolumes
} from '../utils/ambientSoundSynth';
import { playNeedleDropEffect } from '../utils/vinylAudioEngine';
import { playHapticClick, playZenBellChime } from '../utils/soundEffects';

/**
 * Sinh Texture bóng đổ tròn mờ tự nhiên dưới đáy thùng máy
 */
function createTurntableContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(30, 22, 16, 0.85)');
  gradient.addColorStop(0.35, 'rgba(40, 28, 18, 0.40)');
  gradient.addColorStop(0.7, 'rgba(40, 28, 18, 0.14)');
  gradient.addColorStop(1, 'rgba(40, 28, 18, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sinh Texture gỗ gụ / gỗ óc chó hoàng gia (Royal Mahogany Wood) với vân gỗ ánh hổ phách
 */
function createProceduralWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền gỗ gụ đỏ sẫm sang trọng
  ctx.fillStyle = '#3a180d';
  ctx.fillRect(0, 0, 512, 512);

  // Các thớ vân gỗ uốn lượn tự nhiên
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * 512;
    const width = 1.2 + Math.random() * 5.8;
    const alpha = 0.05 + Math.random() * 0.09;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(20, 8, 4, ${alpha})` : `rgba(92, 42, 22, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const cp1x = x + (Math.random() - 0.5) * 45;
    const cp2x = x + (Math.random() - 0.5) * 45;
    const endx = x + (Math.random() - 0.5) * 55;
    ctx.bezierCurveTo(cp1x, 170, cp2x, 340, endx, 512);
    ctx.stroke();
  }

  // Mắt gỗ quý tộc
  const knots = [
    { x: 160, y: 190, rx: 20, ry: 45 },
    { x: 380, y: 360, rx: 18, ry: 42 }
  ];
  knots.forEach((k) => {
    for (let r = 4; r < k.ry; r += 3.2) {
      ctx.beginPath();
      ctx.ellipse(k.x, k.y, (r * k.rx) / k.ry, r, 0.12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(18, 7, 3, 0.09)';
      ctx.lineWidth = 2.0;
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
 * Sinh Texture đĩa than đa rãnh hoàng gia (Royal Bordeaux Label & Gold Lettering)
 */
function createVinylGrooveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#08080a';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  // Rãnh dẫn vào (Lead-in Groove)
  for (let r = 480; r < 496; r += 3) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  // Track 1
  for (let r = 380; r < 478; r += 2.2) {
    const alpha = 0.09 + Math.sin(r * 0.3) * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Dải rãnh chết ngăn cách Track 1 & 2
  ctx.beginPath();
  ctx.arc(cx, cy, 376, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Track 2
  for (let r = 270; r < 372; r += 2.2) {
    const alpha = 0.09 + Math.sin(r * 0.35) * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Dải rãnh chết ngăn cách Track 2 & 3
  ctx.beginPath();
  ctx.arc(cx, cy, 266, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Track 3
  for (let r = 160; r < 262; r += 2.2) {
    const alpha = 0.09 + Math.sin(r * 0.4) * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Rãnh thoát kim (Run-out spiral)
  for (let r = 142; r < 158; r += 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Tem nhãn tâm đĩa than màu đỏ rượu Bordeaux hoàng gia viền vàng lá
  ctx.beginPath();
  ctx.arc(cx, cy, 138, 0, Math.PI * 2);
  ctx.fillStyle = '#58111e';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 134, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 96, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Biểu tượng đĩa than tối giản & Chữ nhãn đĩa
  ctx.fillStyle = '#d4af37';
  ctx.textAlign = 'center';
  ctx.font = '22px serif';
  ctx.fillText('◎', cx, cy - 44);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px serif';
  ctx.fillText('AURA LOFI', cx, cy - 20);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('33⅓ RPM • ANALOG STEREO', cx, cy - 4);

  ctx.fillStyle = '#d4af37';
  ctx.font = 'italic 11px serif';
  ctx.fillText('Tuyển Tập Đĩa Than Trịnh Công Sơn', cx, cy + 28);

  // Lỗ trục quay Spindle trung tâm
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#050507';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sinh Texture biển đồng khắc tên hoàng gia (Royal Brass Plaque)
 */
function createBrassNameplateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 160);
  grad.addColorStop(0, '#c5a059');
  grad.addColorStop(0.3, '#f3deb1');
  grad.addColorStop(0.7, '#c5a059');
  grad.addColorStop(1, '#977535');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 160);

  // Đường viền hoa văn kép chạm khắc
  ctx.strokeStyle = '#2d1c08';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(15, 15, 482, 130);

  // 4 Ốc vít đồng chạm khắc
  const screwCoords = [
    [24, 24],
    [488, 24],
    [24, 136],
    [488, 136]
  ];
  screwCoords.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#221404';
    ctx.fill();
    ctx.strokeStyle = '#dfc288';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Chữ khắc cơ khí tinh xảo
  ctx.fillStyle = '#1c1004';
  ctx.textAlign = 'center';
  ctx.font = '20px serif';
  ctx.fillText('◎', 256, 40);

  ctx.font = 'bold 21px serif';
  ctx.fillText('AURALOFI HI-FI SYSTEM', 256, 73);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ANALOG STEREO • MASTER RECORDING', 256, 102);

  ctx.font = 'italic 12px serif';
  ctx.fillText('Handcrafted Walnut Plinth & Acoustic Fluted Horn', 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Định nghĩa 6 chương hồi kiến trúc đĩa than (Editorial Chapters)
 */
const CHAPTERS = [
  { id: 'I', name: 'Hero', label: 'I • Khởi Đầu', target: '#hero', min: 0.0, max: 0.12 },
  { id: 'II', name: 'Prologue', label: 'II • Khoảng Lặng', target: '#intro-section', min: 0.12, max: 0.28 },
  { id: 'III', name: 'The Deck', label: 'III • Mâm Đĩa 3D', target: '#deck', min: 0.28, max: 0.48 },
  { id: 'IV', name: 'Acoustics', label: 'IV • Âm Thanh Mộc', target: '#acoustics', min: 0.48, max: 0.68 },
  { id: 'V', name: 'Capabilities', label: 'V • Tương Tác', target: '#capabilities', min: 0.68, max: 0.88 },
  { id: 'VI', name: 'Heritage', label: 'VI • Di Sản Nhạc Việt', target: '#heritage', min: 0.88, max: 1.0 }
];

export default function IntroLandingPage() {
  const navigate = useNavigate();
  const canvasMountRef = useRef(null);

  // Trạng thái Preloader & Scrollytelling
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Thước đo chương hồi hoàng gia (Royal Chronometer Rail)
  const [scrollProgressRatio, setScrollProgressRatio] = useState(0);
  const [hoveredChapter, setHoveredChapter] = useState(null);

  // Con trỏ chuột nam châm mạ vàng có quán tính vật lý (Magnetic Brass Cursor)
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);

  // Trạng thái tương tác âm thanh & tabs phong cách drone.riotters.com
  const [activeAmbientTab, setActiveAmbientTab] = useState('rain');
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [activeCapability, setActiveCapability] = useState('Tactile');
  const [activeHotspot, setActiveHotspot] = useState(null);

  // 3D Projected Screen HUD Pins
  const pin1Ref = useRef(null);
  const pin2Ref = useRef(null);
  const pin3Ref = useRef(null);
  const pin4Ref = useRef(null);
  const [active3DPin, setActive3DPin] = useState(null);

  // Lắng nghe cuộn trang cập nhật tiến trình thước đo Chronometer
  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? Math.max(0, Math.min(1, window.scrollY / docHeight)) : 0;
      setScrollProgressRatio(ratio);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Vòng lặp quán tính vật lý lò xo cho con trỏ chuột mạ vàng (Spring Lerp Cursor)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      setIsTouchDevice(true);
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
    };

    const renderCursor = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      rafId = requestAnimationFrame(renderCursor);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId = requestAnimationFrame(renderCursor);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Tham chiếu trạng thái âm thanh để ánh xạ vào đèn rọi kim Three.js
  const isPlayingRef = useRef(isAmbientPlaying);
  useEffect(() => {
    isPlayingRef.current = isAmbientPlaying;
  }, [isAmbientPlaying]);

  // Preloader đếm số từ 0 đến 100%
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 6;
      if (current >= 100) {
        current = 100;
        setLoaderProgress(100);
        clearInterval(interval);
        setTimeout(() => setIsLoaded(true), 350);
      } else {
        setLoaderProgress(current);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // Xử lý nghe thử âm thanh môi trường procedural
  const toggleAmbientSound = (key) => {
    playHapticClick();
    setActiveAmbientTab(key);
    if (isAmbientPlaying && activeAmbientTab === key) {
      setAmbientVolume(key, 0);
      setIsAmbientPlaying(false);
    } else {
      if (isAmbientPlaying) {
        setAmbientVolume(activeAmbientTab, 0);
      }
      setAmbientVolume(key, 0.7);
      setIsAmbientPlaying(true);
    }
  };

  // =========================================================================
  // KHỞI TẠO THREE.JS: MÂM ĐĨA THAN HOÀNG GIA CHÂN THỰC 99% - KHỚP NỐI LIỀN MẠCH
  // =========================================================================
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf8f5); // Màu nền trắng ngọc trai ngà quý tộc
    scene.fog = new THREE.FogExp2(0xfaf8f5, 0.022);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 3.0, 10.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Môi trường phản chiếu PBR cao cấp
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const roomEnvTexture = pmremGenerator.fromScene(roomEnv).texture;
    scene.environment = roomEnvTexture;

    // Chiếu sáng Cung Đình Hoàng Gia: Ánh sáng ấm 2800K + Ánh sáng phản quang dịu
    const ambientLight = new THREE.AmbientLight(0xfff5eb, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 3.6);
    keyLight.position.set(7, 14, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.6);
    fillLight.position.set(-9, 7, -7);
    scene.add(fillLight);

    // Đèn viền phản chiếu ánh kim hoàng gia (Royal Golden Rim Light)
    const rimLight = new THREE.DirectionalLight(0xffe8c2, 2.4);
    rimLight.position.set(-6, 8, -8);
    scene.add(rimLight);

    const royalGoldLight = new THREE.PointLight(0xd4af37, 2.8, 12);
    royalGoldLight.position.set(0, 4.5, 3.5);
    scene.add(royalGoldLight);

    const deskWarmSpot = new THREE.SpotLight(0xffd19a, 3.6, 15, Math.PI / 4, 0.4);
    deskWarmSpot.position.set(0, 6.5, 4.5);
    deskWarmSpot.target.position.set(0, 1.2, 0);
    scene.add(deskWarmSpot);
    scene.add(deskWarmSpot.target);

    // =========================================================================
    // DỰNG CỖ MÂM ĐĨA THAN HOÀNG GIA (ROYAL IMPERIAL PHONOGRAPH)
    // =========================================================================
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    // Textures & PBR Materials
    const shadowTexture = createTurntableContactShadowTexture();
    const woodTexture = createProceduralWoodTexture();
    const grooveTexture = createVinylGrooveTexture();
    const nameplateTexture = createBrassNameplateTexture();

    // Gỗ gụ hoàng gia phủ lớp vecni bóng gương sâu (Clearcoat Lacquer)
    const royalMahoganyMat = new THREE.MeshPhysicalMaterial({
      map: woodTexture,
      bumpMap: woodTexture,
      bumpScale: 0.02,
      color: 0x421b10,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      reflectivity: 0.65
    });

    // Vàng đồng hoàng gia đánh bóng thủ công với ánh kim satin
    const royalGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.94,
      roughness: 0.15,
      clearcoat: 0.70,
      clearcoatRoughness: 0.14
    });

    // Vàng đồng cổ chạm khắc chi tiết
    const antiqueGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xb58c38,
      metalness: 0.90,
      roughness: 0.22,
      clearcoat: 0.50,
      clearcoatRoughness: 0.20
    });

    const brushedSubChassisMat = new THREE.MeshStandardMaterial({
      color: 0xe5c98c,
      metalness: 0.88,
      roughness: 0.22
    });

    // Thảm nhung đỏ Bordeaux hoàng gia với hiệu ứng ánh lông óng ả (Velvet Sheen)
    const bordeauxVelvetMat = new THREE.MeshPhysicalMaterial({
      color: 0x5a111e,
      roughness: 0.88,
      metalness: 0.04,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xd4af37),
      sheenRoughness: 0.45
    });

    // Kim loại Chrome siêu bóng
    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });

    // Nhựa đĩa than Vinyl với rãnh vi mô và lớp bóng bề mặt PVC ép nhiệt
    const vinylMat = new THREE.MeshPhysicalMaterial({
      map: grooveTexture,
      bumpMap: grooveTexture,
      bumpScale: 0.035,
      color: 0x0c0c10,
      roughness: 0.22,
      metalness: 0.35,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18
    });

    // 1. Thùng máy gỗ gụ bát giác hoàng gia giật cấp với 8 góc vát
    const basePlinthGeom = new THREE.CylinderGeometry(2.48, 2.56, 0.24, 8);
    basePlinthGeom.rotateY(Math.PI / 8);
    const basePlinth = new THREE.Mesh(basePlinthGeom, royalMahoganyMat);
    basePlinth.position.y = 0.12;
    basePlinth.castShadow = true;
    basePlinth.receiveShadow = true;
    turntableGroup.add(basePlinth);

    // 8 Chân đế đúc đồng chạm trổ kiểu chân sư tử hoàng gia (Royal Fluted Feet)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const footGroup = new THREE.Group();
      footGroup.position.set(Math.cos(angle) * 2.32, 0.04, Math.sin(angle) * 2.32);

      const footBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.06, 24), antiqueGoldMat);
      footGroup.add(footBase);

      const footMiddle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 16, 24), royalGoldMat);
      footMiddle.position.y = 0.06;
      footMiddle.rotation.x = Math.PI / 2;
      footGroup.add(footMiddle);

      const footCup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.06, 24), royalGoldMat);
      footCup.position.y = 0.10;
      footGroup.add(footCup);

      turntableGroup.add(footGroup);
    }

    // Thân thùng gỗ gụ chính
    const bodyGeom = new THREE.CylinderGeometry(2.16, 2.16, 1.24, 8);
    bodyGeom.rotateY(Math.PI / 8);
    const body = new THREE.Mesh(bodyGeom, royalMahoganyMat);
    body.position.y = 0.84;
    body.castShadow = true;
    body.receiveShadow = true;
    turntableGroup.add(body);

    // 8 Cột trụ đồng chạm trổ bảo vệ các góc máy (Royal Corner Filigree Pillars)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const colGroup = new THREE.Group();
      colGroup.position.set(Math.cos(angle) * 2.12, 0.84, Math.sin(angle) * 2.12);

      const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.20, 16), royalGoldMat);
      colShaft.castShadow = true;
      colGroup.add(colShaft);

      const colCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 16), antiqueGoldMat);
      colCap.position.y = 0.60;
      colGroup.add(colCap);

      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 16), antiqueGoldMat);
      colBase.position.y = -0.60;
      colGroup.add(colBase);

      turntableGroup.add(colGroup);
    }

    // Biển đồng chạm khắc hoàng gia ở mặt trước
    const plaqueGeom = new THREE.PlaneGeometry(0.96, 0.33);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: nameplateTexture,
      roughness: 0.28,
      metalness: 0.88
    });
    const plaque = new THREE.Mesh(plaqueGeom, plaqueMat);
    plaque.position.set(0, 0.90, 2.03);
    turntableGroup.add(plaque);

    // Nắp mặt trên giật cấp & Tấm nhôm đồng phay xước âm mặt máy
    const topDeckGeom = new THREE.CylinderGeometry(2.48, 2.42, 0.18, 8);
    topDeckGeom.rotateY(Math.PI / 8);
    const topDeck = new THREE.Mesh(topDeckGeom, royalMahoganyMat);
    topDeck.position.y = 1.54;
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    turntableGroup.add(topDeck);

    const subChassisPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(2.32, 2.32, 0.025, 8),
      brushedSubChassisMat
    );
    subChassisPlate.rotateY(Math.PI / 8);
    subChassisPlate.position.y = 1.64;
    turntableGroup.add(subChassisPlate);

    // 8 Đinh ốc hoa văn hoàng gia chìm mặt máy
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), antiqueGoldMat);
      screw.position.set(Math.cos(angle) * 2.22, 1.655, Math.sin(angle) * 2.22);
      turntableGroup.add(screw);
    }

    // 2. Mâm xoay đồng thau & Thảm nhung đỏ Bordeaux hoàng gia
    const platterGroup = new THREE.Group();
    platterGroup.position.y = 1.68;
    turntableGroup.add(platterGroup);

    const platterRim = new THREE.Mesh(new THREE.CylinderGeometry(2.10, 2.10, 0.12, 64), royalGoldMat);
    platterRim.castShadow = true;
    platterGroup.add(platterRim);

    // 4 Hàng mắt phản quang Strobe Dots vi mô đo vận tốc
    const strobeGeometry = new THREE.CylinderGeometry(0.016, 0.016, 0.025, 8);
    strobeGeometry.rotateZ(Math.PI / 2);
    const strobeRows = [
      { y: 0.035, count: 48 },
      { y: 0.012, count: 42 },
      { y: -0.012, count: 36 },
      { y: -0.035, count: 30 }
    ];
    strobeRows.forEach((row) => {
      for (let s = 0; s < row.count; s++) {
        const theta = (s / row.count) * Math.PI * 2;
        const dot = new THREE.Mesh(strobeGeometry, chromeMat);
        dot.position.set(Math.cos(theta) * 2.105, row.y, Math.sin(theta) * 2.105);
        dot.rotation.y = -theta;
        platterGroup.add(dot);
      }
    });

    // Thảm nhung đỏ rượu Bordeaux hoàng gia (Royal Velvet Slipmat)
    const velvetMat = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.02, 64), bordeauxVelvetMat);
    velvetMat.position.y = 0.07;
    platterGroup.add(velvetMat);

    // Đĩa Vinyl xoay
    const vinylGroup = new THREE.Group();
    vinylGroup.position.set(0, 0.09, 0);
    platterGroup.add(vinylGroup);

    const vinylDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.98, 1.98, 0.032, 64), vinylMat);
    vinylDisc.castShadow = true;
    vinylGroup.add(vinylDisc);

    // Trục Spindle trung tâm
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 24), chromeMat);
    spindle.position.y = 0.16;
    vinylGroup.add(spindle);

    // Cục chặn đĩa hoàng gia có bọt thủy cân bằng (Royal Record Clamp Stabilizer)
    const clampGroup = new THREE.Group();
    clampGroup.position.set(0, 0.03, 0);
    vinylGroup.add(clampGroup);

    const clampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 32), royalGoldMat);
    clampBase.position.y = 0.06;
    clampGroup.add(clampBase);

    const clampGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.11, 32), antiqueGoldMat);
    clampGrip.position.y = 0.175;
    clampGroup.add(clampGrip);

    const clampCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.08, 32), royalGoldMat);
    clampCap.position.y = 0.27;
    clampGroup.add(clampCap);

    const bubbleLevel = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, metalness: 0.85 })
    );
    bubbleLevel.rotation.x = -Math.PI / 2;
    bubbleLevel.position.y = 0.311;
    clampGroup.add(bubbleLevel);

    const bubbleDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.028, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    bubbleDot.rotation.x = -Math.PI / 2;
    bubbleDot.position.set(0.02, 0.312, 0.015);
    clampGroup.add(bubbleDot);

    // 3. Nút bấm & Cần trượt hoàng gia (Start/Stop, Pitch Control, Đèn rọi kim)
    const startBtnGroup = new THREE.Group();
    startBtnGroup.position.set(-1.48, 1.65, 1.40);
    const btnBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 24), antiqueGoldMat);
    startBtnGroup.add(btnBezel);
    const btnCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 24), royalGoldMat);
    btnCap.position.y = 0.035;
    startBtnGroup.add(btnCap);
    turntableGroup.add(startBtnGroup);

    [-0.08, 0.08].forEach((offset) => {
      const speedBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), royalGoldMat);
      speedBtn.position.set(-1.48 + offset * 1.5, 1.655, 1.05);
      turntableGroup.add(speedBtn);
    });

    const pitchGroup = new THREE.Group();
    pitchGroup.position.set(1.68, 1.655, 0.45);
    const pitchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.70), antiqueGoldMat);
    pitchGroup.add(pitchPlate);
    const pitchSlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.022, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9 })
    );
    pitchGroup.add(pitchSlot);
    const pitchKnob = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.06), royalGoldMat);
    pitchKnob.position.set(0, 0.04, 0.06);
    pitchGroup.add(pitchKnob);
    turntableGroup.add(pitchGroup);

    // Trụ đèn rọi kim Stylus Target Light
    const targetLightGroup = new THREE.Group();
    targetLightGroup.position.set(-1.62, 1.65, -0.32);
    const lightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.42, 16), antiqueGoldMat);
    lightPillar.position.y = 0.21;
    targetLightGroup.add(lightPillar);
    const lightHead = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.065, 0.14, 16), royalGoldMat);
    lightHead.position.set(0.03, 0.44, 0.03);
    lightHead.rotateX(Math.PI / 4);
    targetLightGroup.add(lightHead);
    const stylusSpot = new THREE.SpotLight(0xffedd5, 2.4, 4.5, Math.PI / 5, 0.4);
    stylusSpot.position.set(0.03, 0.46, 0.03);
    stylusSpot.target.position.set(0.55, 1.70, -0.05);
    targetLightGroup.add(stylusSpot);
    targetLightGroup.add(stylusSpot.target);
    turntableGroup.add(targetLightGroup);

    // =========================================================================
    // 4. CỤM CẦN KIM HOÀNG GIA (KHỚP NỐI CƠ KHÍ LIỀN MẠCH 100%)
    // =========================================================================
    const tonearmAssembly = new THREE.Group();
    tonearmAssembly.position.set(1.42, 1.65, 1.05);
    turntableGroup.add(tonearmAssembly);

    // Bệ chân xoay cần kim vững chãi gắn chặt vào mặt máy
    const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 32), royalGoldMat);
    armBase.position.y = 0.04;
    tonearmAssembly.add(armBase);

    // Trụ cột dọc nối liền bệ chân với cụm Gimbal (loại bỏ hoàn toàn khe hở lơ lửng)
    const armPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 24), antiqueGoldMat);
    armPedestal.position.y = 0.18;
    tonearmAssembly.add(armPedestal);

    // Vòng ren điều chỉnh chiều cao Azimuth
    const azimuthCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24), royalGoldMat);
    azimuthCollar.position.y = 0.26;
    tonearmAssembly.add(azimuthCollar);

    // Cụm xoay trục Gimbal 4 chiều chuyển động linh hoạt (Mechanical Swivel Pivot)
    const tonearmSwivelGroup = new THREE.Group();
    tonearmSwivelGroup.position.set(0, 0.35, 0);
    tonearmAssembly.add(tonearmSwivelGroup);

    // Khối đế xoay Gimbal
    const gimbalBlock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), antiqueGoldMat);
    tonearmSwivelGroup.add(gimbalBlock);

    // Vòng khuyên Gimbal ngoài
    const gimbalRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 16, 32), royalGoldMat);
    tonearmSwivelGroup.add(gimbalRing);

    // Chốt ốc xoay bi chrome hai bên
    [-0.17, 0.17].forEach((sideX) => {
      const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 12), chromeMat);
      pivotPin.position.set(sideX, 0, 0);
      pivotPin.rotation.z = Math.PI / 2;
      tonearmSwivelGroup.add(pivotPin);
    });

    // Trục sau gắn tạ đối trọng vươn thẳng từ tâm Gimbal
    const weightStem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.40, 16), chromeMat);
    weightStem.position.set(0.18, 0, 0.18);
    weightStem.rotation.set(0, Math.PI / 4, 0);
    weightStem.rotation.x = Math.PI / 2;
    tonearmSwivelGroup.add(weightStem);

    // Cục tạ đối trọng bọc quanh trục sau
    const weightBody = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.20, 32), antiqueGoldMat);
    weightBody.position.set(0.18, 0, 0.18);
    weightBody.rotation.set(0, Math.PI / 4, 0);
    weightBody.rotation.x = Math.PI / 2;
    tonearmSwivelGroup.add(weightBody);

    // Khuyên chia độ lực kim (Tracking Force Ring)
    const forceRing = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 32), royalGoldMat);
    forceRing.position.set(0.11, 0, 0.11);
    forceRing.rotation.set(0, Math.PI / 4, 0);
    forceRing.rotation.x = Math.PI / 2;
    tonearmSwivelGroup.add(forceRing);

    // Cần gạt nâng hạ kim thủy lực (Cueing Lever) đỡ ngay dưới cần kim
    const cueLeverGroup = new THREE.Group();
    cueLeverGroup.position.set(-0.16, 0.18, -0.12);
    const cueBase = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), chromeMat);
    cueLeverGroup.add(cueBase);
    const cueHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 12), antiqueGoldMat);
    cueHandle.position.set(0, 0.10, -0.06);
    cueHandle.rotation.x = -0.35;
    cueLeverGroup.add(cueHandle);
    tonearmAssembly.add(cueLeverGroup);

    // Bệ đỡ cần có chốt khóa an toàn (gắn cố định trên mặt máy)
    const armrestGroup = new THREE.Group();
    armrestGroup.position.set(-0.25, 0.15, -0.38);
    const armrestPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 12), chromeMat);
    armrestGroup.add(armrestPillar);
    const armrestU = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 12, 16, Math.PI), bordeauxVelvetMat);
    armrestU.position.set(0, 0.11, 0);
    armrestU.rotation.x = Math.PI / 2;
    armrestGroup.add(armrestU);
    tonearmAssembly.add(armrestGroup);

    // Cần kim chữ S uốn lượn mượt mà xuất phát trực tiếp từ khối Gimbal
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.28, 0.01, -0.38),
      new THREE.Vector3(-0.58, -0.04, -0.80),
      new THREE.Vector3(-0.88, -0.13, -1.08)
    ]);
    const tonearm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 48, 0.038, 16, false), royalGoldMat);
    tonearm.castShadow = true;
    tonearmSwivelGroup.add(tonearm);

    // Máng kim Head-shell, Hộp kim Cartridge & Mũi kim Cantilever
    const headshellGroup = new THREE.Group();
    headshellGroup.position.set(-0.88, -0.13, -1.08);
    headshellGroup.rotation.set(0.12, 0.38, -0.08);

    const headshellBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.24), royalGoldMat);
    headshellGroup.add(headshellBody);
    const fingerLift = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 10), chromeMat);
    fingerLift.position.set(0.08, 0.04, -0.02);
    fingerLift.rotation.z = Math.PI / 3;
    headshellGroup.add(fingerLift);

    const cartridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.085, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x6b1d2f, roughness: 0.3, metalness: 0.3 })
    );
    cartridge.position.set(0, -0.05, -0.04);
    headshellGroup.add(cartridge);

    const cantilever = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), chromeMat);
    cantilever.position.set(0, -0.09, -0.08);
    cantilever.rotation.x = 0.5;
    headshellGroup.add(cantilever);
    const diamondTip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 8), chromeMat);
    diamondTip.position.set(0, -0.115, -0.10);
    diamondTip.rotation.x = Math.PI;
    headshellGroup.add(diamondTip);

    // Điểm sáng lấp lánh quang học tại rãnh kim (Diamond Stylus Specular Sparkle)
    const stylusSparkleGeom = new THREE.SphereGeometry(0.018, 10, 10);
    const stylusSparkleMat = new THREE.MeshBasicMaterial({
      color: 0xfff6dd,
      transparent: true,
      opacity: 0.95
    });
    const stylusSparkle = new THREE.Mesh(stylusSparkleGeom, stylusSparkleMat);
    stylusSparkle.position.set(0, -0.125, -0.10);
    headshellGroup.add(stylusSparkle);

    tonearmSwivelGroup.add(headshellGroup);

    // =========================================================================
    // 5. LOA KÈN HOÀNG GIA (KHỚP NỐI KHÔNG TỲ VẾT - 100% GAPLESS CONTINUOUS FIT)
    // =========================================================================
    const hornGroup = new THREE.Group();
    turntableGroup.add(hornGroup);

    // Bệ đúc đồng gắn chặt cần cổ loa kèn vào mặt thùng máy
    const hornBaseBracket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.12, 24),
      antiqueGoldMat
    );
    hornBaseBracket.position.set(-1.18, 1.66, -0.78);
    hornGroup.add(hornBaseBracket);

    const hornBaseMolding = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.04, 16, 24),
      royalGoldMat
    );
    hornBaseMolding.position.set(-1.18, 1.72, -0.78);
    hornBaseMolding.rotation.x = Math.PI / 2;
    hornGroup.add(hornBaseMolding);

    // Đường cong cổ thiên nga (Swan-Neck Tube) xuất phát từ bệ gắn
    const swanCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.18, 1.72, -0.78),
      new THREE.Vector3(-1.26, 2.15, -0.78),
      new THREE.Vector3(-1.16, 2.65, -0.62),
      new THREE.Vector3(-0.92, 3.08, -0.38),
      new THREE.Vector3(-0.64, 3.42, -0.12)
    ]);
    const swanTube = new THREE.Mesh(
      new THREE.TubeGeometry(swanCurve, 48, 0.13, 24, false),
      royalGoldMat
    );
    swanTube.castShadow = true;
    hornGroup.add(swanTube);

    // Tọa độ điểm cuối ống dẫn và vector tiếp tuyến chuẩn xác
    const hornThroatPos = new THREE.Vector3(-0.64, 3.42, -0.12);
    const hornTangent = swanCurve.getTangent(1.0).normalize();

    // Vòng khuyên khớp nối hoàng gia bọc ngoài điểm tiếp giáp
    const couplingCollar = new THREE.Group();
    couplingCollar.position.copy(hornThroatPos);
    couplingCollar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hornTangent);

    const collarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.14, 32), antiqueGoldMat);
    couplingCollar.add(collarBody);
    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 16, 32), royalGoldMat);
    couplingCollar.add(collarRing);
    hornGroup.add(couplingCollar);

    // Nhóm Loa Kèn Hoa Hoàng Gia 12 Múi (Khớp chuẩn 100% theo vector tiếp tuyến)
    const bellGroup = new THREE.Group();
    bellGroup.position.copy(hornThroatPos);
    bellGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hornTangent);
    hornGroup.add(bellGroup);

    const petals = 12;
    const radialSegs = petals * 4;
    const heightSegs = 28;
    const hornBellGeom = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= heightSegs; y++) {
      const v = y / heightSegs;
      // Chiều cao dọc theo hướng mở của loa kèn
      const heightVal = 2.10 * Math.pow(v, 1.15);
      // Bán kính khởi đầu tại y=0 đúng bằng bán kính ống dẫn 0.13 (Khớp tuyệt đối)
      const baseRadius = 0.13 + 1.95 * Math.pow(v, 2.45);
      const petalWave = 0.22 * Math.pow(v, 2.8);

      for (let x = 0; x <= radialSegs; x++) {
        const u = x / radialSegs;
        const angle = u * Math.PI * 2;
        const radius = baseRadius + Math.sin(angle * petals) * petalWave;
        vertices.push(Math.cos(angle) * radius, heightVal, Math.sin(angle) * radius);
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

    const hornGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.75,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide
    });

    const hornBellMesh = new THREE.Mesh(hornBellGeom, hornGoldMat);
    hornBellMesh.castShadow = true;
    hornBellMesh.receiveShadow = true;
    bellGroup.add(hornBellMesh);

    // Vành cuộn tròn gờ mép miệng loa (Rolled Brass Rim Bead chống cạnh sắc đa giác)
    const rimPoints = [];
    const rimSamples = 96;
    for (let s = 0; s <= rimSamples; s++) {
      const u = s / rimSamples;
      const angle = u * Math.PI * 2;
      const r = 0.13 + 1.95 + Math.sin(angle * petals) * 0.22;
      rimPoints.push(new THREE.Vector3(Math.cos(angle) * r, 2.10, Math.sin(angle) * r));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);
    const hornRimMesh = new THREE.Mesh(
      new THREE.TubeGeometry(rimCurve, rimSamples, 0.024, 12, true),
      antiqueGoldMat
    );
    hornRimMesh.castShadow = true;
    bellGroup.add(hornRimMesh);

    // 12 Đường gân đồng dập nổi gia cường dọc theo các múi hoa (12 Fluted Rib Seams)
    for (let p = 0; p < petals; p++) {
      const ribAngle = (p / petals) * Math.PI * 2;
      const ribPoints = [];
      const ribSteps = 16;
      for (let r = 0; r <= ribSteps; r++) {
        const v = 0.05 + (r / ribSteps) * 0.95;
        const hVal = 2.10 * Math.pow(v, 1.15);
        const bRad = 0.13 + 1.95 * Math.pow(v, 2.45);
        const pWave = 0.22 * Math.pow(v, 2.8);
        const rad = bRad + Math.sin(ribAngle * petals) * pWave + 0.012;
        ribPoints.push(new THREE.Vector3(Math.cos(ribAngle) * rad, hVal, Math.sin(ribAngle) * rad));
      }
      const ribCurve = new THREE.CatmullRomCurve3(ribPoints, false);
      const ribMesh = new THREE.Mesh(
        new THREE.TubeGeometry(ribCurve, 20, 0.013, 8, false),
        antiqueGoldMat
      );
      ribMesh.castShadow = true;
      bellGroup.add(ribMesh);
    }

    // Vòng sóng âm học hoàng gia lan tỏa khi phát nhạc (Acoustic Pressure Wave)
    const acousticWaveGeom = new THREE.RingGeometry(2.05, 2.18, 48);
    const acousticWaveMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const acousticWave = new THREE.Mesh(acousticWaveGeom, acousticWaveMat);
    acousticWave.position.set(0, 2.11, 0);
    acousticWave.rotation.x = Math.PI / 2;
    bellGroup.add(acousticWave);

    // Bóng đổ tiếp xúc tròn mờ dưới đáy
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 7.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.005, 0);
    turntableGroup.add(contactShadow);

    // 6. Trường hạt bụi nắng vàng hoàng gia ấm áp (Golden Dust Motes)
    const dustCount = 260;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 12;
      dustPositions[i + 1] = Math.random() * 8;
      dustPositions[i + 2] = (Math.random() - 0.5) * 12;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.045,
      transparent: true,
      opacity: 0.55
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    // =========================================================================
    // ĐƯỜNG CONG MÁY QUAY ĐIỆN ẢNH LIÊN TỤC (CATMULL-ROM CAMERA CHOREOGRAPHY)
    // Tối ưu góc máy để KHÔNG BỊ CHÈN CHỮ: Nhường trọn không gian cho nội dung
    // =========================================================================
    const cameraSpline = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 3.0, 10.4),      // 0.00: Hero (Toàn cảnh 3/4 mặt trước)
        new THREE.Vector3(0.5, 3.4, 7.6),     // 0.20: Chuyển tiếp vào Deck
        new THREE.Vector3(0.8, 3.5, 5.2),     // 0.38: Deck (Đẩy nhẹ sang phải để nhường lề trái)
        new THREE.Vector3(1.6, 3.8, 5.8),     // 0.58: Acoustics (Đưa mâm đĩa và loa sang PHẢI, để bảng specs ở BÊN TRÁI)
        new THREE.Vector3(-1.4, 3.0, 4.6),    // 0.78: Capabilities (Cận cảnh cần kim ở góc đối diện)
        new THREE.Vector3(0, 6.2, 7.4)        // 1.00: Heritage (Zen Elevation góc nhìn cao)
      ],
      false,
      'catmullrom',
      0.5
    );

    const lookAtSpline = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 1.1, 0),         // 0.00: Hero
        new THREE.Vector3(0, 1.4, 0),         // 0.20
        new THREE.Vector3(0.3, 1.7, 0),       // 0.38: Deck
        new THREE.Vector3(0.5, 2.6, 0),       // 0.58: Acoustics
        new THREE.Vector3(-0.2, 1.68, 0),     // 0.78: Capabilities
        new THREE.Vector3(0, 1.1, 0)          // 1.00: Heritage
      ],
      false,
      'catmullrom',
      0.5
    );

    // Mỏ neo 3D cho các điểm ghim kỹ thuật HUD thời gian thực
    const pinAnchors = [
      { id: '01', pos: new THREE.Vector3(1.42, 1.85, 1.05), ref: pin1Ref },
      { id: '02', pos: new THREE.Vector3(0, 1.78, 1.85), ref: pin2Ref },
      { id: '03', pos: new THREE.Vector3(0, 2.10, 0), ref: pin3Ref },
      { id: '04', pos: new THREE.Vector3(1.68, 1.72, 0.45), ref: pin4Ref }
    ];

    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let prevPointerX = 0;
    let userOrbitAngle = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevPointerX;
        userOrbitAngle += deltaX * 0.008;
        prevPointerX = e.clientX;
      }
    };

    const handlePointerDown = (e) => {
      if (window.scrollY < window.innerHeight * 0.8) {
        isDragging = true;
        prevPointerX = e.clientX;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const currentCamPos = new THREE.Vector3(0, 3.0, 10.4);
    const currentLookAt = new THREE.Vector3(0, 1.1, 0);

    let animId;
    let clock = new THREE.Clock();

    // Biến trạng thái điều khiển cơ khí cần kim & cần gạt thủy lực
    let currentTonearmYaw = 0.26;
    let currentTonearmLift = 0.05;
    let currentCueLeverAngle = -0.40;

    const animateLoop = () => {
      animId = requestAnimationFrame(animateLoop);
      const elapsedTime = clock.getElapsedTime();

      // Mâm đĩa than & Platter tự quay 33⅓ RPM với độ mượt tự nhiên
      if (!prefersReducedMotion) {
        vinylGroup.rotation.y += 0.020;
        platterGroup.rotation.y += 0.020;

        const posAttr = dustGeometry.attributes.position;
        for (let i = 1; i < dustCount * 3; i += 3) {
          posAttr.array[i] += Math.sin(elapsedTime * 0.5 + i) * 0.002;
        }
        posAttr.needsUpdate = true;

        // Loa kèn rung động âm học đồng bộ toàn cụm hoa đồng (Bell + Ribs + Bead)
        const hornPulse = 1.0 + Math.sin(elapsedTime * 2.2) * 0.012;
        bellGroup.scale.set(hornPulse, 1.0, hornPulse);
      }

      if (isPlayingRef.current) {
        stylusSpot.intensity = 2.4 + Math.sin(elapsedTime * 5) * 0.6;
      } else {
        stylusSpot.intensity = 2.4;
      }

      if (!isDragging) {
        userOrbitAngle *= 0.95;
      }

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? Math.max(0, Math.min(1, window.scrollY / docHeight)) : 0;

      // =====================================================================
      // ĐIỀU KHIỂN CƠ KHÍ CẦN KIM ĐIỆN ẢNH (HYDRAULIC CUEING & GROOVE TRACKING)
      // =====================================================================
      let targetTonearmYaw = 0.26;
      let targetTonearmLift = 0.05;
      let targetCueLever = -0.40;

      if (scrollProgress >= 0.10 && scrollProgress <= 0.94) {
        // Trạng thái phát nhạc: Cần gạt hạ xuống, cần kim nhấc khỏi giá, xoay vào đĩa và hạ kim
        targetCueLever = -0.12;
        const playProgress = Math.min(1, Math.max(0, (scrollProgress - 0.10) / 0.84));
        // Lướt từ rãnh ngoài (0.0 rad) dần vào rãnh trong (-0.12 rad)
        targetTonearmYaw = -playProgress * 0.12;
        targetTonearmLift = 0.0;
      } else {
        // Trạng thái đậu nghỉ an toàn trên bệ đỡ (Resting)
        targetCueLever = -0.40;
        targetTonearmYaw = 0.26;
        targetTonearmLift = 0.05;
      }

      // Giảm chấn thủy lực làm mượt chuyển động cơ học (Hydraulic Damping)
      currentTonearmYaw += (targetTonearmYaw - currentTonearmYaw) * 0.045;
      currentTonearmLift += (targetTonearmLift - currentTonearmLift) * 0.045;
      currentCueLeverAngle += (targetCueLever - currentCueLeverAngle) * 0.05;

      cueHandle.rotation.x = currentCueLeverAngle;

      // Dao động vi mô tiếp xúc rãnh đĩa khi mũi kim chạm đĩa (Micro-groove compliance)
      const isNeedleOnRecord = currentTonearmLift < 0.015;
      const needleWobble = isNeedleOnRecord
        ? Math.sin(elapsedTime * 7.2) * 0.0016 + (isPlayingRef.current ? Math.sin(elapsedTime * 24.0) * 0.0008 : 0)
        : 0;

      tonearmSwivelGroup.rotation.y = currentTonearmYaw;
      tonearmSwivelGroup.rotation.x = currentTonearmLift + needleWobble;

      // Điểm sáng quang học lấp lánh rãnh kim khi mũi kim tiếp xúc đĩa than
      if (isNeedleOnRecord) {
        stylusSparkle.visible = true;
        const sparkleScale = 0.8 + Math.sin(elapsedTime * 18.0) * 0.35 + (isPlayingRef.current ? Math.sin(elapsedTime * 38.0) * 0.45 : 0);
        stylusSparkle.scale.setScalar(Math.max(0.2, sparkleScale));
        stylusSparkleMat.opacity = 0.5 + Math.sin(elapsedTime * 22.0) * 0.35;
      } else {
        stylusSparkle.visible = false;
      }

      // Sóng âm học loa kèn lan tỏa nhịp nhàng khi có âm thanh phát
      if (isPlayingRef.current) {
        const wave = (elapsedTime * 1.8) % 1.0;
        acousticWave.scale.setScalar(1.0 + wave * 0.28);
        acousticWaveMat.opacity = (1.0 - wave) * 0.5;
      } else {
        acousticWaveMat.opacity = 0;
      }

      // Cần gạt Pitch trượt nhẹ nhàng theo hành trình điều chỉnh
      const pitchTargetZ = 0.06 + Math.sin(scrollProgress * Math.PI * 3) * 0.06;
      pitchKnob.position.z = THREE.MathUtils.lerp(pitchKnob.position.z, pitchTargetZ, 0.035);

      // =====================================================================
      // MÁY QUAY ĐIỆN ẢNH VỚI GÓC NGHIÊNG BANKING & NHỊP THỞ HANDHELD HỮU CƠ
      // =====================================================================
      const splineTargetCam = cameraSpline.getPointAt(scrollProgress);
      const splineTargetLook = lookAtSpline.getPointAt(scrollProgress);

      const organicBreathX = Math.sin(elapsedTime * 0.65) * 0.025;
      const organicBreathY = Math.cos(elapsedTime * 0.45) * 0.020;
      splineTargetCam.x += mouseX * 0.35 + organicBreathX;
      splineTargetCam.y += mouseY * 0.20 + organicBreathY;

      turntableGroup.rotation.y = 0.35 + scrollProgress * 0.95 + userOrbitAngle;
      turntableGroup.updateMatrixWorld(true);

      currentCamPos.lerp(splineTargetCam, 0.055);
      currentLookAt.lerp(splineTargetLook, 0.055);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookAt);

      // Góc nghiêng máy quay điện ảnh theo đường cong (Cinematic Banking Roll)
      const targetRoll = Math.sin(scrollProgress * Math.PI * 1.8) * 0.035 - mouseX * 0.015;
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetRoll, 0.05);

      // Chiếu tọa độ các điểm ghim 3D HUD
      const isPinVisibleSection = scrollProgress > 0.18 && scrollProgress < 0.92;
      pinAnchors.forEach((pin) => {
        if (pin.ref.current) {
          const worldPos = pin.pos.clone().applyMatrix4(turntableGroup.matrixWorld);
          const screenPos = worldPos.project(camera);
          if (screenPos.z > 1.0 || !isPinVisibleSection) {
            pin.ref.current.style.opacity = '0';
            pin.ref.current.style.pointerEvents = 'none';
          } else {
            const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            pin.ref.current.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
            pin.ref.current.style.opacity = '1';
            pin.ref.current.style.pointerEvents = 'auto';
          }
        }
      });

      renderer.render(scene, camera);
    };

    animateLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      shadowTexture.dispose();
      woodTexture.dispose();
      grooveTexture.dispose();
      nameplateTexture.dispose();
      roomEnvTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E293B] font-serif selection:bg-[#D4AF37] selection:text-white overflow-x-hidden relative">
      {/* ========================================================
          0. CON TRỎ CHUỘT QUÁN TÍNH NAM CHÂM HOÀNG GIA (MAGNETIC BRASS CURSOR)
          ======================================================== */}
      {!isTouchDevice && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {/* Tâm chấm vàng rực rỡ */}
          <div
            ref={cursorDotRef}
            className="fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)] will-change-transform"
          />
          {/* Vòng hào quang mạ vàng chuyển động quán tính lò xo */}
          <div
            ref={cursorRingRef}
            className="fixed top-0 left-0 -ml-4 -mt-4 w-8 h-8 rounded-full border border-[#D4AF37]/60 shadow-[0_0_12px_rgba(212,175,55,0.3)] will-change-transform"
          />
        </div>
      )}

      {/* ========================================================
          0.5. THƯỚC ĐO CHƯƠNG HỒI HOÀNG GIA (ROYAL CHRONOMETER RAIL)
          ======================================================== */}
      <aside className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center select-none pointer-events-auto">
        <div className="relative py-4 flex flex-col items-center">
          {/* Trục ray đồng thau mạ vàng */}
          <div className="w-[1.5px] h-72 bg-gradient-to-b from-[#D4AF37]/15 via-[#D4AF37]/50 to-[#D4AF37]/15 relative rounded-full">
            {/* Kim chỉ thị hành trình lướt dọc ray theo tiến độ cuộn trang */}
            <div
              className="absolute -left-[5px] w-3 h-3 rotate-45 bg-[#D4AF37] border border-[#FAF8F5] shadow-[0_0_10px_rgba(212,175,55,0.8)] transition-all duration-150 ease-out"
              style={{ top: `${Math.min(96, Math.max(2, scrollProgressRatio * 100))}%` }}
            />
          </div>

          {/* Các mốc số La Mã phân đoạn */}
          <div className="absolute inset-y-0 flex flex-col justify-between items-center py-1 pointer-events-auto">
            {CHAPTERS.map((ch) => {
              const isActive = scrollProgressRatio >= ch.min && scrollProgressRatio <= ch.max;
              return (
                <div
                  key={ch.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredChapter(ch.id)}
                  onMouseLeave={() => setHoveredChapter(null)}
                >
                  <a
                    href={ch.target}
                    onClick={() => playHapticClick()}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37] shadow-lg scale-125'
                        : 'text-[#1E293B]/45 hover:text-[#D4AF37] hover:scale-110 bg-[#FAF8F5]/85 border border-[#D4AF37]/20'
                    }`}
                  >
                    {ch.id}
                  </a>

                  {/* Tooltip tên chương hiển thị khi rê chuột */}
                  {hoveredChapter === ch.id && (
                    <div className="absolute right-9 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#1E293B]/95 text-white border border-[#D4AF37]/50 shadow-xl whitespace-nowrap font-serif text-xs z-50 animate-[fadeInScale_150ms_ease-out]">
                      {ch.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ========================================================
          1. PRELOADER & CURTAIN REVEAL (EDITORIAL LOADER)
          ======================================================== */}
      <div
        className={`fixed inset-0 z-50 bg-[#FAF8F5] flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isLoaded ? '-translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-3xl text-[#D4AF37] font-serif">◎</div>
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#C5A059]">
            AuraLofi • Analog Audio Sanctuary
          </div>
          <div className="font-serif text-5xl font-light tracking-tight text-[#1E293B]">
            {loaderProgress}%
          </div>
          <div className="w-56 h-0.5 bg-[#D4AF37]/20 overflow-hidden relative">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-150"
              style={{ width: `${loaderProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FIXED 3D CANVAS STAGE (FULLSCREEN WEBGL BACKDROP)
          ======================================================== */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 z-0 pointer-events-none w-screen h-screen overflow-hidden"
      />

      {/* ========================================================
          2.5. REAL-TIME 3D PROJECTED HUD PINS (PRECISION HARDWARE ANCHORS)
          ======================================================== */}
      <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
        {[
          {
            id: '01',
            ref: pin1Ref,
            label: 'Cần Kim Gimbal Hợp Kim Đồng',
            desc: 'Ổ bi 4 chiều chuẩn Thụy Sĩ, tạ đối trọng chia độ 0-3g, núm Anti-Skate và cần gạt hạ kim thủy lực êm ái.'
          },
          {
            id: '02',
            ref: pin2Ref,
            label: 'Mâm Đồng Thau & Vành Strobe 33⅓ RPM',
            desc: 'Mâm đồng thau đúc nguyên khối nặng 2.2kg, 4 hàng mắt phản quang vi mô kiểm định tốc độ góc chuẩn xác.'
          },
          {
            id: '03',
            ref: pin3Ref,
            label: 'Cục Chặn Đĩa Cân Bằng Thủy Chuẩn',
            desc: 'Cục chặn đĩa 400g gia công khía rãnh knurled, đỉnh đính mắt bọt thủy ngọc lục bảo cân bằng thăng bằng.'
          },
          {
            id: '04',
            ref: pin4Ref,
            label: 'Thước Trượt Pitch Control ±8%',
            desc: 'Cần trượt nhôm đồng phay xước điều tốc ±8% với cơ chế hãm trung tâm Quartz Lock chính xác.'
          }
        ].map((pin) => (
          <div
            key={pin.id}
            ref={pin.ref}
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-200 ease-out pointer-events-auto"
            style={{ opacity: 0 }}
          >
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  setActive3DPin(active3DPin === pin.id ? null : pin.id);
                }}
                className="w-8 h-8 rounded-full bg-[#1E293B] text-[#D4AF37] font-mono text-[11px] font-bold flex items-center justify-center shadow-xl hover:scale-125 active:scale-95 transition-transform duration-150 ease-out cursor-pointer border-2 border-[#D4AF37]"
              >
                {pin.id}
              </button>

              {/* Pin Detail Overlay Card */}
              {active3DPin === pin.id && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 p-5 rounded-2xl bg-[#1E293B]/95 backdrop-blur-md text-white border border-[#D4AF37]/40 shadow-2xl font-sans text-left z-50 transform-gpu animate-[fadeInScale_180ms_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-2 mb-2.5">
                    <span className="font-mono text-[11px] text-[#D4AF37] tracking-wider uppercase font-semibold">
                      CHI TIẾT KỸ THUẬT #{pin.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playHapticClick();
                        setActive3DPin(null);
                      }}
                      className="text-xs text-white/50 hover:text-white cursor-pointer px-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="font-serif text-sm font-medium mb-1.5 text-white">{pin.label}</div>
                  <p className="text-xs text-white/80 font-light leading-relaxed">{pin.desc}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================
          3. FIXED SITE NAVIGATION BAR (#site-nav)
          ======================================================== */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D4AF37]/25">
        <div className="max-w-[1720px] mx-auto px-6 h-[76px] grid grid-cols-12 items-center">
          {/* Logo & Tagline */}
          <div className="col-span-6 flex items-center gap-4">
            <a href="#hero" className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] font-serif text-sm transition-transform duration-150 group-hover:scale-105">
                ◎
              </div>
              <span className="font-serif text-xl tracking-tight text-[#1E293B] font-bold">auralofi</span>
            </a>
            <div className="hidden sm:block w-1 h-1 bg-[#D4AF37]" />
            <span className="hidden sm:inline text-[#C5A059] text-xs font-mono tracking-wider uppercase">
              Analog Vinyl & Ambient Sanctuary
            </span>
          </div>

          {/* Center Brand Note & Live Audio Reactive Indicator */}
          <div className="hidden lg:flex col-span-3 items-center gap-2">
            <span className="text-[#1E293B]/70 text-xs font-mono">
              Âm thanh mộc cho <strong className="text-[#1E293B] underline decoration-[#D4AF37]">tâm trí tĩnh lặng</strong>
            </span>
            {isAmbientPlaying && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[#B45309] bg-amber-100/60 px-2 py-0.5 rounded-full border border-[#D4AF37]/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                ĐANG PHÁT ÂM THANH MỘC
              </span>
            )}
          </div>

          {/* Right Navigation & App Link */}
          <div className="col-span-6 lg:col-span-3 flex items-center justify-end gap-5">
            <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase text-[#1E293B]/70">
              <a href="#deck" className="hover:text-[#D4AF37] transition-colors duration-150">Deck</a>
              <a href="#acoustics" className="hover:text-[#D4AF37] transition-colors duration-150">Acoustics</a>
              <a href="#capabilities" className="hover:text-[#D4AF37] transition-colors duration-150">Capabilities</a>
              <a href="#heritage" className="hover:text-[#D4AF37] transition-colors duration-150">Heritage</a>
            </nav>

            <Link
              to="/app"
              onClick={() => playHapticClick()}
              className="px-4 py-2 rounded-full bg-[#1E293B] text-[#D4AF37] hover:bg-[#0f172a] border border-[#D4AF37]/60 font-mono text-xs uppercase tracking-wider transition-colors duration-150 active:scale-95 shadow-sm"
            >
              Mở Trình Phát →
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================
          4. HERO SECTION (#hero)
          ======================================================== */}
      <section
        id="hero"
        className="relative z-10 min-h-screen flex flex-col justify-between pt-[76px] pb-10 px-6 max-w-[1720px] mx-auto pointer-events-none"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
          <span className="text-[26vw] font-serif font-black tracking-tighter uppercase leading-none text-[#1E293B]">
            SANCTUARY
          </span>
        </div>

        <div className="pt-20 max-w-2xl text-left pointer-events-auto">
          <div className="font-mono text-xs uppercase tracking-widest text-[#C5A059] mb-4 flex items-center gap-2">
            <span>AuraLofi Hi-Fi Experience • 33⅓ RPM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.08] text-[#1E293B] mb-6">
            Lắng nghe nhịp điệu của sự tĩnh lặng.{' '}
            <span className="text-[#1E293B]/50 italic">
              Những vòng quay analog mộc mạc xoa dịu tâm trí.
            </span>
          </h1>

          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[#B45309] bg-[#D4AF37]/10 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30">
            <span>Kéo chuột ngang để xoay ngắm mâm đĩa 3D • Cuộn trang để trải nghiệm</span>
          </div>
        </div>

        {/* Bottom Hero Bar with Scroll Indicator */}
        <div className="flex items-end justify-between border-t border-[#D4AF37]/25 pt-6 pointer-events-auto">
          <div className="font-mono text-xs uppercase text-[#C5A059]">
            Mâm đĩa gỗ thủ công • Loa kèn đồng thau 12 múi hoa
          </div>

          <a
            href="#intro-section"
            onClick={() => playHapticClick()}
            className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-[#1E293B] hover:text-[#D4AF37] transition-colors duration-150"
          >
            <span>Bắt đầu</span>
            <div className="w-6 h-6 rounded-full border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] animate-bounce">
              ↓
            </div>
          </a>
        </div>
      </section>

      {/* ========================================================
          5. INTRO STATEMENT SECTION (#intro-section)
          ======================================================== */}
      <section
        id="intro-section"
        className="relative z-10 bg-[#FAF8F5] border-y border-[#D4AF37]/25 py-28 px-6"
      >
        <div className="max-w-[1720px] mx-auto grid grid-cols-12 gap-10 items-center">
          <div className="col-span-12 lg:col-span-8">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.18] text-[#1E293B]">
              Tìm lại <span className="underline decoration-[#D4AF37] decoration-2 underline-offset-8">nghi thức sống chậm</span>,{' '}
              <span className="underline decoration-[#D4AF37] decoration-2 underline-offset-8">cơ khí tinh xảo</span> và{' '}
              <span className="underline decoration-[#D4AF37] decoration-2 underline-offset-8">chất âm mộc mạc nguyên bản</span>{' '}
              giữa kỷ nguyên kỹ thuật số vội vã.
            </h2>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col justify-end lg:pl-12 border-l border-[#D4AF37]/25">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] mb-3">
              Khoảng lặng tâm trí
            </span>
            <p className="text-base text-[#1E293B]/80 leading-relaxed font-sans font-light">
              Giữa nhịp sống số hối hả, AuraLofi mang lại nghi thức hạ cần kim mộc mạc, tiếng nổ đĩa than lách tách dịu êm và những thanh âm tự nhiên giúp bạn tái tạo sự tĩnh lặng nội tại.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. DECK & THE VINYL GROOVE ARC SECTION (#deck)
          ======================================================== */}
      <section id="deck" className="relative z-10 pt-28 pb-16 px-6 max-w-[1720px] mx-auto">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Cột trái 7 cột: Thẻ chứa toàn bộ kiến trúc & thông số đĩa than */}
          <div className="col-span-12 lg:col-span-7 bg-[#FAF8F5]/85 backdrop-blur-xl border border-[#D4AF37]/35 rounded-3xl p-8 sm:p-12 shadow-2xl relative z-20">
            <div className="flex items-start justify-between border-b border-[#D4AF37]/25 pb-6 mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] block mb-2">
                  Chương III • Cơ khí mộc
                </span>
                <h2 className="text-5xl sm:text-7xl font-light leading-none tracking-tight text-[#1E293B]">
                  The Deck
                </h2>
              </div>
              <div className="border border-[#D4AF37] px-5 h-9 rounded-full flex items-center justify-center font-mono text-sm text-[#D4AF37]">
                III
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059]">
                  Gỗ óc chó & mâm đồng đúc nguyên khối
                </span>
              </div>
              <p className="text-lg sm:text-xl font-light text-[#1E293B] leading-relaxed">
                Thiết kế xoay quanh âm học analog thuần khiết. Thân máy chế tác từ <strong>gỗ óc chó tự nhiên đánh vecni mờ</strong>, mâm đồng thau đúc 2.2kg cân bằng động học, và cục chặn đĩa cân bằng vi mô chống rung chấn.
              </p>
            </div>

            {/* VÒM RÃNH ĐĨA THAN TRONG THẺ */}
            <div className="relative w-full flex flex-col items-center justify-center my-6 py-4 border-y border-[#D4AF37]/20">
              <div className="relative w-full max-w-[560px] aspect-[954/477] pointer-events-none">
                <svg
                  viewBox="0 0 954 477"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M0.5 477 A 476.5 476.5 0 0 1 953.5 477"
                    stroke="#D4AF37"
                    strokeOpacity="0.45"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="477"
                    cy="477"
                    r="380"
                    stroke="#D4AF37"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />
                  <circle
                    cx="477"
                    cy="477"
                    r="260"
                    stroke="#C5A059"
                    strokeOpacity="0.20"
                    strokeWidth="1"
                  />
                  {[0, 30, 60, 90, 120, 150, 180].map((deg, idx) => {
                    const rad = (deg * Math.PI) / 180;
                    const x1 = 477 - Math.cos(rad) * 477;
                    const y1 = 477 - Math.sin(rad) * 477;
                    const x2 = 477 - Math.cos(rad) * 455;
                    const y2 = 477 - Math.sin(rad) * 455;
                    return (
                      <line
                        key={idx}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#D4AF37"
                        strokeOpacity="0.60"
                        strokeWidth="1.8"
                      />
                    );
                  })}
                </svg>

                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FAF8F5] border border-[#D4AF37] rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#1E293B] shadow-sm flex items-center gap-2">
                  <span>Tốc độ chuẩn 33⅓ RPM</span>
                </div>
              </div>
            </div>

            {/* 3 Thẻ Huy Hiệu Thông Số Viền Chỉ Vàng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/30 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-light tracking-tight text-[#1E293B] mb-1 font-serif">
                  33⅓ RPM
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5A059]">
                  Vận tốc xoay đĩa
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/30 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-light tracking-tight text-[#1E293B] mb-1 font-serif">
                  528 Hz
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5A059]">
                  Chuông thiền định
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/30 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-light tracking-tight text-[#1E293B] mb-1 font-serif">
                  0 KB
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5A059]">
                  Âm thanh mộc Web Audio
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải 5 cột để trống hoàn toàn để nhường trọn không gian cho mâm đĩa than 3D */}
          <div className="hidden lg:block col-span-5 pointer-events-none" />
        </div>
      </section>

      {/* ========================================================
          7. ACOUSTICS SECTION (#acoustics) - TỔ CHỨC BỐ CỤC LỆCH BÊN TRÁNH CHÈN MODEL 3D
          ======================================================== */}
      {/* ========================================================
          7. ACOUSTICS SECTION (#acoustics)
          ======================================================== */}
      <section id="acoustics" className="relative z-10 py-28 px-6 max-w-[1720px] mx-auto">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Cột trái: Thẻ chứa nội dung âm học & bộ chọn cảnh */}
          <div className="col-span-12 lg:col-span-7 bg-[#FAF8F5]/85 backdrop-blur-xl border border-[#D4AF37]/35 rounded-3xl p-8 sm:p-12 shadow-2xl relative z-20">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-4 mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] block mb-1">
                  Chương IV • Âm thanh mộc
                </span>
                <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-[#1E293B]">
                  Acoustics
                </h2>
              </div>
              <div className="border border-[#D4AF37] px-4 py-1 rounded-full font-mono text-xs text-[#D4AF37]">
                IV
              </div>
            </div>

            {/* Bộ chuyển đổi 4 cảnh âm thanh */}
            <div className="flex items-center gap-6 border-b border-[#D4AF37]/20 pb-3 mb-8 overflow-x-auto">
              {[
                { id: 'rain', label: 'Mưa Rơi Bên Ô Kính' },
                { id: 'cafe', label: 'Quán Cà Phê Đêm' },
                { id: 'fireplace', label: 'Lò Sưởi Ấm Cúng' },
                { id: 'wind', label: 'Gió Đêm Qua Kẽ Lá' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => toggleAmbientSound(tab.id)}
                  className={`text-lg sm:text-xl font-serif tracking-tight transition-colors duration-150 cursor-pointer relative py-1.5 whitespace-nowrap ${
                    activeAmbientTab === tab.id ? 'text-[#1E293B] font-bold' : 'text-[#1E293B]/40 hover:text-[#D4AF37]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeAmbientTab === tab.id && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D4AF37]" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-base sm:text-lg text-[#1E293B]/80 font-sans font-light leading-relaxed mb-8">
              Bộ trộn âm thanh 4 kênh được tổng hợp theo thời gian thực trực tiếp trên trình duyệt, không cần tải bất kỳ tệp âm thanh nào từ máy chủ. Giúp cô lập tạp âm bên ngoài và đưa tâm trí vào trạng thái an yên tĩnh lặng.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                type="button"
                onClick={() => toggleAmbientSound(activeAmbientTab)}
                className="px-6 py-3 rounded-full bg-[#1E293B] text-[#D4AF37] font-mono text-xs uppercase tracking-wider hover:bg-[#0f172a] active:scale-95 transition-all duration-150 border border-[#D4AF37] cursor-pointer shadow-md"
              >
                {isAmbientPlaying ? '■ TẮT ÂM THANH MÔI TRƯỜNG' : '▶ NGHE THỬ NGAY'}
              </button>

              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  playZenBellChime();
                }}
                className="px-6 py-3 rounded-full border border-[#D4AF37] text-[#1E293B] font-mono text-xs uppercase tracking-wider hover:bg-[#D4AF37]/10 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                🔔 CHUÔNG THIỀN 528HZ
              </button>
            </div>

            {/* 4 Không gian âm thanh mộc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left font-sans">
              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/25">
                <div className="font-serif text-sm font-semibold text-[#1E293B] mb-1">Mưa Rơi Bên Ô Kính</div>
                <p className="text-xs text-[#1E293B]/70 font-light leading-relaxed">Tiếng ồn hồng dịu êm mô phỏng hạt mưa gõ vào ô kính, giúp xoa dịu áp lực tâm lý.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/25">
                <div className="font-serif text-sm font-semibold text-[#1E293B] mb-1">Quán Cà Phê Đêm</div>
                <p className="text-xs text-[#1E293B]/70 font-light leading-relaxed">Âm hưởng mờ ảo của góc quán quen, tạo cảm giác có người đồng hành khi làm việc khuya.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/25">
                <div className="font-serif text-sm font-semibold text-[#1E293B] mb-1">Lò Sưởi Ấm Cúng</div>
                <p className="text-xs text-[#1E293B]/70 font-light leading-relaxed">Xung nổ lách tách ấm áp của gỗ thông bén lửa, sưởi ấm những buổi tối một mình.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5]/90 border border-[#D4AF37]/25">
                <div className="font-serif text-sm font-semibold text-[#1E293B] mb-1">Gió Đêm Qua Kẽ Lá</div>
                <p className="text-xs text-[#1E293B]/70 font-light leading-relaxed">Tiếng ồn nâu sâu lắng như làn gió luồn qua rèm cửa, hỗ trợ giấc ngủ và thiền định.</p>
              </div>
            </div>
          </div>

          {/* Cột phải để trống hoàn toàn để nhường trọn không gian cho mâm đĩa than và loa kèn 3D */}
          <div className="hidden lg:block col-span-5 pointer-events-none" />
        </div>
      </section>

      {/* ========================================================
          8. CAPABILITIES SECTION (#capabilities)
          ======================================================== */}
      <section id="capabilities" className="relative z-10 py-28 px-6 max-w-[1720px] mx-auto border-t border-[#D4AF37]/25">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Cột trái 7 cột: Thẻ điều khiển năng lực tương tác */}
          <div className="col-span-12 lg:col-span-7 bg-[#FAF8F5]/85 backdrop-blur-xl border border-[#D4AF37]/35 rounded-3xl p-8 sm:p-12 shadow-2xl relative z-20">
            <div className="flex items-start justify-between border-b border-[#D4AF37]/25 pb-6 mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] block mb-1">
                  Chương V • Tương tác
                </span>
                <h2 className="text-4xl sm:text-6xl font-light leading-none tracking-tight text-[#1E293B]">
                  Capabilities
                </h2>
              </div>
              <div className="border border-[#D4AF37] px-4 py-1 rounded-full font-mono text-xs text-[#D4AF37]">
                V
              </div>
            </div>

            <div className="font-mono text-xs uppercase tracking-widest text-[#C5A059] mb-4">
              Trải nghiệm cơ học thời gian thực
            </div>

            {/* 3 Thẻ Chọn Năng Lực */}
            <div className="flex flex-col gap-4 mb-8">
              {[
                {
                  id: 'Tactile',
                  label: 'Tactile Vinyl Scratching',
                  badge: 'Chà đĩa',
                  desc: 'Chạm chuột chà đĩa than thời gian thực. Tốc độ quay và cao độ biến đổi vật lý kèm âm thanh cọ xát rãnh đĩa ASMR sống động.'
                },
                {
                  id: 'Acoustic',
                  label: 'Hydraulic Tonearm Cueing',
                  badge: 'Hạ kim',
                  desc: 'Cần gạt nâng hạ kim thủy lực mượt mà, đưa đầu kim kim cương tiếp xúc rãnh đĩa êm ái mà không gây xước mặt đĩa.'
                },
                {
                  id: 'Sanctuary',
                  label: 'Zen Sanctuary Minimalist',
                  badge: 'Tối giản',
                  desc: 'Giao diện tự động ẩn các thanh công cụ sau 3 giây không di chuột, nhường toàn bộ thị giác cho đĩa than và âm thanh.'
                }
              ].map((cap) => (
                <div
                  key={cap.id}
                  onClick={() => {
                    playHapticClick();
                    setActiveCapability(cap.id);
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer ${
                    activeCapability === cap.id
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 shadow-md ring-1 ring-[#D4AF37]/40'
                      : 'border-[#D4AF37]/25 hover:border-[#D4AF37]/60 bg-[#FAF8F5]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xl sm:text-2xl font-serif tracking-tight ${
                        activeCapability === cap.id ? 'text-[#1E293B] font-bold' : 'text-[#1E293B]/50'
                      }`}
                    >
                      {cap.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 text-[#B45309] bg-amber-50">
                      {cap.badge}
                    </span>
                  </div>
                  <p className="text-sm font-sans font-light text-[#1E293B]/80 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Khối Trải Nghiệm Tương Tác ASMR Nhanh */}
            <div className="p-6 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <div className="font-serif text-base font-medium text-[#1E293B]">
                  {activeCapability === 'Tactile' && 'Trải nghiệm chạm chà đĩa than vật lý'}
                  {activeCapability === 'Acoustic' && 'Âm học tiếp xúc rãnh đĩa vi mô'}
                  {activeCapability === 'Sanctuary' && 'Không gian tập trung tâm trí 528Hz'}
                </div>
                <div className="font-mono text-xs text-[#C5A059]">
                  Lắng nghe xung âm học thực tế khi đầu kim chạm rãnh nhựa
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  playNeedleDropEffect({ duration: 2.5 });
                }}
                className="px-6 py-3 rounded-full bg-[#1E293B] text-[#D4AF37] font-mono text-xs uppercase tracking-wider hover:bg-[#0f172a] active:scale-95 transition-all duration-150 border border-[#D4AF37] cursor-pointer shadow-md whitespace-nowrap"
              >
                ▶ TIẾNG HẠ KIM (ASMR)
              </button>
            </div>
          </div>

          {/* Cột phải 5 cột để trống hoàn toàn để nhường trọn không gian cho cận cảnh cần kim 3D */}
          <div className="hidden lg:block col-span-5 pointer-events-none" />
        </div>
      </section>

      {/* ========================================================
          9. HERITAGE & CURATED VINYL TRACKS SECTION (#heritage)
          ======================================================== */}
      {/* ========================================================
          9. HERITAGE & CURATED VINYL TRACKS SECTION (#heritage)
          ======================================================== */}
      <section id="heritage" className="relative z-10 py-28 px-6 max-w-[1720px] mx-auto border-t border-[#D4AF37]/25">
        <div className="flex items-start justify-between border-b border-[#D4AF37]/25 pb-8 mb-16">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] block mb-1">
              Chương VI • Di sản âm nhạc Việt Nam
            </span>
            <h2 className="text-6xl sm:text-8xl lg:text-9xl font-light leading-none tracking-tight text-[#1E293B]">
              Heritage
            </h2>
          </div>
          <div className="border border-[#D4AF37] px-6 h-9 rounded-full flex items-center justify-center font-mono text-sm text-[#D4AF37]">
            VI
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 mb-12">
          <div className="col-span-12 lg:col-span-4 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059]">
              Tuyển tập đĩa than Trịnh Công Sơn
            </span>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <p className="text-xl sm:text-2xl font-light text-[#1E293B] leading-relaxed">
              Những giai điệu bất hủ của cố nhạc sĩ <strong>Trịnh Công Sơn</strong> (Diễm Xưa, Hạ Trắng, Biển Nhớ) được phối khí mộc mạc phong cách Lofi Chillhop, hòa cùng tiếng nổ đĩa than analog đưa bạn về miền ký ức sâu lắng.
            </p>
          </div>
        </div>

        {/* Bản Đồ Di Sản Âm Nhạc (Editorial Audio Map) */}
        <div className="relative w-full h-[540px] sm:h-[620px] rounded-3xl bg-gradient-to-br from-[#FCF9F3] via-[#F6EFE2] to-[#EFE4D2] border border-[#D4AF37]/40 overflow-hidden shadow-2xl flex items-center justify-center text-[#1E293B]">
          {/* Lớp vân nền giấy da & đường đồng mức nhẹ nhàng */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(212,175,55,0.08)_100%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,175,55,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.08)_1px,transparent_1px)] bg-[size:44px_44px] pointer-events-none" />

          {/* Thanh Tiêu Đề Bản Đồ */}
          <div className="absolute top-6 inset-x-8 flex items-center justify-between font-mono text-xs text-[#B45309] border-b border-[#D4AF37]/30 pb-3 pointer-events-none">
            <span className="flex items-center gap-2">
              <span>AuraLofi Archive • Các bản thu âm mộc</span>
            </span>
            <span className="hidden sm:inline">Chuẩn âm thanh: 33⅓ RPM Stereo</span>
          </div>

          {/* Các Điểm Ghim Bản Thu */}
          {[
            {
              id: '01',
              title: 'Diễm Xưa (Lofi Acoustic Mix)',
              artist: 'Trịnh Công Sơn • Lofi Session',
              x: '28%',
              y: '42%',
              mood: 'Mưa Hoài Niệm',
              desc: 'Giai điệu mưa bay Tháp Mười phối cùng tiếng guitar mộc và tiếng nổ đĩa than analog cổ kính.'
            },
            {
              id: '02',
              title: 'Hạ Trắng (Warm Rhodes & Vinyl Crackle)',
              artist: 'Trịnh Công Sơn • Chillhop Session',
              x: '58%',
              y: '58%',
              mood: 'Buổi Chiều Ấm Áp',
              desc: 'Tiếng đàn Rhodes ấm áp hòa quyện cùng nhịp thở lofi dịu êm cho phiên làm việc sâu.'
            },
            {
              id: '03',
              title: 'Biển Nhớ (Raindrop & Solfeggio 528Hz)',
              artist: 'Trịnh Công Sơn • Thiền Định Thư Thái',
              x: '76%',
              y: '36%',
              mood: 'Tâm Tĩnh Tại',
              desc: 'Tần số Solfeggio 528Hz phục hồi năng lượng tinh thần, đưa bạn vào trạng thái an nhiên.'
            }
          ].map((pin) => (
            <div
              key={pin.id}
              style={{ left: pin.x, top: pin.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  setActiveHotspot(activeHotspot === pin.id ? null : pin.id);
                }}
                className="w-10 h-10 rounded-full bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37] font-mono text-xs font-bold flex items-center justify-center hover:scale-125 active:scale-95 transition-transform duration-150 shadow-xl cursor-pointer ring-4 ring-[#D4AF37]/20"
              >
                {pin.id}
              </button>

              {activeHotspot === pin.id && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-84 p-6 rounded-2xl bg-[#FAF8F5]/95 backdrop-blur-xl border border-[#D4AF37]/60 shadow-2xl text-left font-sans text-[#1E293B] z-50 animate-[fadeInScale_180ms_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-2 mb-3">
                    <span className="font-mono text-xs text-[#B45309] font-bold">Bản ghi #{pin.id}</span>
                    <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#854D0E] border border-[#D4AF37]/40">
                      {pin.mood}
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-[#1E293B] mb-1 font-serif">{pin.title}</h4>
                  <div className="text-xs text-[#C5A059] mb-3 font-mono">{pin.artist}</div>
                  <p className="text-xs text-[#1E293B]/80 font-light leading-relaxed mb-4">{pin.desc}</p>
                  <button
                    type="button"
                    onClick={() => {
                      playHapticClick();
                      playNeedleDropEffect({ duration: 2.0 });
                    }}
                    className="w-full py-2 rounded-xl bg-[#1E293B] text-[#D4AF37] font-mono text-[11px] uppercase tracking-wider hover:bg-[#0f172a] active:scale-95 transition-all duration-150 border border-[#D4AF37]/60 cursor-pointer"
                  >
                    ▶ NGHE THỬ TIẾNG ĐĨA THAN
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="absolute bottom-6 inset-x-0 text-center font-mono text-xs text-[#B45309]/70 pointer-events-none">
            Chạm vào các điểm tròn 01 • 02 • 03 để lắng nghe trích đoạn âm nhạc
          </div>
        </div>
      </section>

      {/* ========================================================
          10. LANDING & FOOTER SECTION (#landing-section)
          ======================================================== */}
      <footer id="landing-section" className="relative z-10 border-t border-[#D4AF37]/25 pt-20 pb-12 px-6 max-w-[1720px] mx-auto">
        <div className="grid grid-cols-12 gap-12 pb-16 border-b border-[#D4AF37]/25">
          <div className="col-span-12 lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="text-2xl text-[#D4AF37] mb-3 font-serif">◎</div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#C5A059] mb-3 block">
                Không gian dành riêng cho bạn
              </span>
              <h3 className="text-4xl sm:text-5xl font-light text-[#1E293B] leading-tight mb-6">
                Chiếc đĩa than đã sẵn sàng quay.<br />
                Hãy bước vào không gian của bạn.
              </h3>
              <p className="text-base text-[#1E293B]/70 font-sans font-light max-w-md mb-8">
                Cắm tai nghe, hít thở một hơi thật sâu và gác lại những xô bồ bên ngoài cánh cửa. Một không gian tĩnh lặng, ấm áp đang chờ đón bạn.
              </p>
            </div>

            <Link
              to="/app"
              onClick={() => playHapticClick()}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#1E293B] text-[#D4AF37] font-mono text-xs uppercase tracking-widest hover:bg-[#0f172a] active:scale-95 transition-all duration-150 self-start cursor-pointer border border-[#D4AF37] shadow-lg"
            >
              Vào Trình Phát AuraLofi →
            </Link>
          </div>

          <div className="col-span-12 lg:col-span-6 grid grid-cols-2 gap-8 font-mono text-xs text-[#1E293B]/70">
            <div>
              <span className="uppercase text-[#1E293B] font-bold block mb-4 border-b border-[#D4AF37]/30 pb-2">
                AuraLofi Features
              </span>
              <ul className="space-y-2">
                <li>• 3D Tactile Vinyl Scratching</li>
                <li>• Procedural Ambient Synth (0KB)</li>
                <li>• Solfeggio 528Hz Meditation</li>
                <li>• Pomodoro Focus Notes</li>
                <li>• 60 FPS Video Visualizer Studio</li>
              </ul>
            </div>
            <div>
              <span className="uppercase text-[#1E293B] font-bold block mb-4 border-b border-[#D4AF37]/30 pb-2">
                Tech Architecture
              </span>
              <ul className="space-y-2">
                <li>• Three.js PBR Graphics</li>
                <li>• Web Audio API Synthesizer</li>
                <li>• Scrollytelling Choreography</li>
                <li>• Tailwind CSS & React</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 font-mono text-[11px] text-[#1E293B]/50 gap-4">
          <span>
            AuraLofi © 2026 • Trải nghiệm đĩa than analog & âm thanh môi trường tĩnh lặng.
          </span>
          <span>Phím tắt: Space (Play) • G (Cảnh) • T (Pomodoro) • H (Trợ giúp)</span>
        </div>
      </footer>
    </div>
  );
}
