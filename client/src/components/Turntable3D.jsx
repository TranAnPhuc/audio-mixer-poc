import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { getAudioFrequencies } from '../utils/vinylAudioEngine';
import { playNeedleScratch } from '../utils/soundEffects';

/**
 * Procedural Texture Generator cho Vi Rãnh Đĩa Than (Micro-Grooves)
 */
function createGrooveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0a0d';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  ctx.lineWidth = 1;
  for (let r = 165; r < 500; r += 1.5) {
    const alpha = 0.15 + Math.random() * 0.25;
    const brightness = Math.floor(180 + Math.random() * 75);
    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;

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
 * Procedural Texture Generator cho Tem Nhãn Giữa Đĩa Than Cổ Điển (HMV Red Center Label)
 */
function createDefaultLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradient tem nhãn đỏ thẫm viền vàng hoàng gia cổ điển
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(0.70, '#7f1d1d');
  grad.addColorStop(0.95, '#450a0a');
  grad.addColorStop(1, '#1e293b');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 256, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.fillText("HIS MASTER'S VOICE", 256, 175);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('GRAMOPHONE CONCERT RECORD', 256, 210);

  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('78 R.P.M.', 256, 335);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('SIDE A • SHELLAC MASTER', 256, 365);

  ctx.fillStyle = '#090a0f';
  ctx.beginPath();
  ctx.arc(256, 256, 26, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Texture Generator cho Hạt Bụi Ánh Sáng Hoài Niệm
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

  return new THREE.CanvasTexture(canvas);
}

/**
 * Turntable3D — Máy Hát Đĩa Than Cổ Điển Thùng Bát Giác & Loa Kèn Đồng (Vintage Gramophone)
 * Tái hiện chính xác hình ảnh may_phat_dia_than.webp:
 * - Thùng gỗ óc chó bát giác giật cấp 2 tầng cổ điển
 * - 8 cột trụ đồng thau xoắn ốc chạm trổ ở 8 góc
 * - Phù điêu oval mạ vàng mặt trước và tay quay lên dây cót cơ khí
 * - Mâm đĩa than quay 33⅓/78 RPM thật sự với vi rãnh phản quang
 * - Cần kim cổ ngỗng gắn củ phát âm hoa văn 6 cánh hoa (soundbox reproducer)
 * - Loa kèn hoa muống biển 8 múi lượn sóng bằng đồng (Morning Glory Horn) nhún nhảy theo bass
 * - Tương tác vật lý: Chà cào đĩa than (Vinyl Scratching), nhấc cần kim tua nhạc (Tonearm Scrubbing)
 */
export default function Turntable3D({
  isPlaying = false,
  coverUrl = null,
  ambientColors = null,
  currentTime = 0,
  duration = 0,
  isZenMode = false,
  onScratch = null,
  onSeek = null
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);

  // Tham chiếu tương tác vật lý
  const isScratchingRef = useRef(false);
  const lastScratchAngleRef = useRef(0);
  const lastScratchTimeRef = useRef(0);
  const isDraggingTonearmRef = useRef(false);
  const onScratchRef = useRef(onScratch);
  onScratchRef.current = onScratch;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  // Tham chiếu các cụm 3D
  const recordGroupRef = useRef(null);
  const tonearmYawRef = useRef(null);
  const tonearmPitchRef = useRef(null);
  const labelMeshRef = useRef(null);
  const turntableGroupRef = useRef(null);
  const hornGroupRef = useRef(null);
  const hornBellMeshRef = useRef(null);
  const platterSpotRef = useRef(null);
  const currentCoverTextureRef = useRef(null);
  const defaultLabelTextureRef = useRef(null);
  const isDroppingInRef = useRef(false);

  // Tham chiếu trường hạt bụi và sóng âm
  const dustGeomRef = useRef(null);
  const dustMatRef = useRef(null);
  const dustTextureRef = useRef(null);
  const shockwavesRef = useRef([]);
  const shockwaveGeomRef = useRef(null);
  const underglowMatRef = useRef(null);

  // Tiến độ cần kim
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const targetGrooveYawRef = useRef(-0.24);
  const isTransitioningRef = useRef(false);

  // Tốc độ quay đĩa
  const spinSpeedRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Cập nhật góc quay cần kim theo tiến độ bài hát
  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    const progress = (duration > 0 && currentTime > 0)
      ? Math.min(1, Math.max(0, currentTime / duration))
      : 0;
    // Góc xoay ngang từ mép ngoài (-0.24 rad) vào tâm (-0.60 rad)
    targetGrooveYawRef.current = -0.24 - progress * 0.36;
  }, [currentTime, duration]);

  // Cập nhật ảnh bìa album vào tem nhãn tròn đĩa than
  useEffect(() => {
    if (!labelMeshRef.current) return;

    if (coverUrl) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        coverUrl,
        (loadedTex) => {
          if (currentCoverTextureRef.current) {
            currentCoverTextureRef.current.dispose();
          }
          currentCoverTextureRef.current = loadedTex;
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.center.set(0.5, 0.5);

          if (labelMeshRef.current) {
            labelMeshRef.current.material.map = loadedTex;
            labelMeshRef.current.material.needsUpdate = true;
          }
        },
        undefined,
        (err) => {
          console.warn('Lỗi nạp texture ảnh bìa đĩa than, sử dụng tem nhãn cổ điển:', err);
          if (defaultLabelTextureRef.current && labelMeshRef.current) {
            labelMeshRef.current.material.map = defaultLabelTextureRef.current;
            labelMeshRef.current.material.needsUpdate = true;
          }
        }
      );
    } else {
      if (defaultLabelTextureRef.current && labelMeshRef.current) {
        labelMeshRef.current.material.map = defaultLabelTextureRef.current;
        labelMeshRef.current.material.needsUpdate = true;
      }
    }
  }, [coverUrl]);

  // Động học Nâng / Hạ cần kim và hiệu ứng rơi đĩa (Needle Drop & Disc Landing)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    const tonearmYaw = tonearmYawRef.current;
    const tonearmPitch = tonearmPitchRef.current;
    const recordGroup = recordGroupRef.current;

    if (!tonearmYaw || !tonearmPitch) return;

    gsap.killTweensOf(tonearmYaw.rotation);
    gsap.killTweensOf(tonearmPitch.rotation);

    if (isPlaying) {
      isTransitioningRef.current = true;

      // Hiệu ứng rơi đĩa nhẹ nhàng khi bắt đầu phát
      if (recordGroup) {
        isDroppingInRef.current = true;
        recordGroup.position.y = 2.45;
        recordGroup.rotation.z = 0.08;
        gsap.to(recordGroup.position, {
          y: 1.98,
          duration: 0.75,
          ease: 'power2.out',
          onComplete: () => {
            isDroppingInRef.current = false;
          }
        });
        gsap.to(recordGroup.rotation, {
          z: 0,
          duration: 0.65,
          ease: 'power2.out'
        });
      }

      // Pha 1: Nhấc cần kim lên cao khỏi giá đỡ (Pitch Up 0.15 rad trong 300ms)
      gsap.to(tonearmPitch.rotation, {
        x: 0.15,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          // Pha 2: Xoay ngang cần kim đưa mũi stylus vào rãnh đĩa (Yaw sang targetGrooveYaw trong 600ms)
          gsap.to(tonearmYaw.rotation, {
            y: targetGrooveYawRef.current,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              // Pha 3: Hạ mũi kim nhẹ nhàng tiếp xúc rãnh đĩa than (Pitch Down về 0.0 rad trong 400ms)
              gsap.to(tonearmPitch.rotation, {
                x: 0.0,
                duration: 0.4,
                ease: 'bounce.out',
                onComplete: () => {
                  isTransitioningRef.current = false;
                }
              });
            }
          });
        }
      });
    } else {
      isTransitioningRef.current = true;
      // Tạm dừng: Nhấc cần kim lên -> Xoay về chạc đỡ nghỉ
      gsap.to(tonearmPitch.rotation, {
        x: 0.16,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(tonearmYaw.rotation, {
            y: 0.32, // Góc nghỉ trên giá đỡ
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.to(tonearmPitch.rotation, {
                x: 0.04,
                duration: 0.3,
                ease: 'power1.inOut',
                onComplete: () => {
                  isTransitioningRef.current = false;
                }
              });
            }
          });
        }
      });
    }
  }, [isPlaying]);

  // Cập nhật màu sắc ánh sáng phản quang theo bài hát
  useEffect(() => {
    if (!turntableGroupRef.current) return;
    const hexPri = ambientColors?.hexPrimary || '#f59e0b';

    if (underglowMatRef.current) {
      underglowMatRef.current.color.set(hexPri);
    }
    if (shockwaveGeomRef.current) {
      shockwavesRef.current.forEach((sw) => {
        if (sw && sw.mat) {
          sw.mat.color.set(hexPri);
        }
      });
    }
    if (dustMatRef.current) {
      dustMatRef.current.color.set(hexPri);
    }
  }, [ambientColors]);

  // KHỞI TẠO SCENE THREE.JS
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera phối cảnh góc nghiêng đẹp mắt bao quát toàn bộ máy hát và loa kèn
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 4.8, 11.8);
    camera.lookAt(0, 2.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // HỆ THỐNG ÁNH SÁNG ĐÈN BÀN HỌC 2700K VÀNG ẤM (Warm Lamp Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffedd5, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 2.6);
    keyLight.position.set(5.5, 10.5, 6.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.6);
    rimLight.position.set(-6.5, 7.5, -5.5);
    scene.add(rimLight);

    const hornHighlight = new THREE.DirectionalLight(0xffd19a, 2.2);
    hornHighlight.position.set(-2.5, 8.5, 7.5);
    scene.add(hornHighlight);

    const platterSpot = new THREE.PointLight(0xffb86c, 1.8, 14);
    platterSpot.position.set(0, 4.5, 0.5);
    scene.add(platterSpot);
    platterSpotRef.current = platterSpot;

    // Group tổng chứa toàn bộ máy hát để hỗ trợ Parallax chuột
    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(0, 0, 0);
    scene.add(turntableGroup);
    turntableGroupRef.current = turntableGroup;

    // VẬT LIỆU CHÍNH (GỖ ÓC CHÓ ẤM & ĐỒNG THAU HOÀNG GIA)
    const walnutWoodMat = new THREE.MeshStandardMaterial({
      color: 0x422617,
      roughness: 0.62,
      metalness: 0.10
    });

    const polishedBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.24
    });

    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.82,
      roughness: 0.32
    });

    // ========================================================================
    // 1. BỆ GỖ BÁT GIÁC GIẬT CẤP (OCTAGONAL CABINET)
    // ========================================================================
    // Đáy bát giác dưới cùng
    const bottomPlinthGeom = new THREE.CylinderGeometry(2.45, 2.55, 0.22, 8);
    bottomPlinthGeom.rotateY(Math.PI / 8);
    const bottomPlinth = new THREE.Mesh(bottomPlinthGeom, walnutWoodMat);
    bottomPlinth.position.y = 0.11;
    turntableGroup.add(bottomPlinth);

    // Nẹp chân bát giác
    const baseMouldingGeom = new THREE.CylinderGeometry(2.28, 2.42, 0.15, 8);
    baseMouldingGeom.rotateY(Math.PI / 8);
    const baseMoulding = new THREE.Mesh(baseMouldingGeom, walnutWoodMat);
    baseMoulding.position.y = 0.28;
    turntableGroup.add(baseMoulding);

    // Thân thùng chính hình bát giác
    const cabinetBodyGeom = new THREE.CylinderGeometry(2.12, 2.12, 1.25, 8);
    cabinetBodyGeom.rotateY(Math.PI / 8);
    const cabinetBody = new THREE.Mesh(cabinetBodyGeom, walnutWoodMat);
    cabinetBody.position.y = 0.98;
    turntableGroup.add(cabinetBody);

    // Nẹp nắp bát giác
    const topMouldingGeom = new THREE.CylinderGeometry(2.38, 2.18, 0.15, 8);
    topMouldingGeom.rotateY(Math.PI / 8);
    const topMoulding = new THREE.Mesh(topMouldingGeom, walnutWoodMat);
    topMoulding.position.y = 1.68;
    turntableGroup.add(topMoulding);

    // Nắp mặt trên bát giác
    const topDeckGeom = new THREE.CylinderGeometry(2.48, 2.42, 0.18, 8);
    topDeckGeom.rotateY(Math.PI / 8);
    const topDeck = new THREE.Mesh(topDeckGeom, walnutWoodMat);
    topDeck.position.y = 1.84;
    turntableGroup.add(topDeck);

    // 8 Chân đế bát giác
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const footGeom = new THREE.CylinderGeometry(0.16, 0.22, 0.12, 16);
      const foot = new THREE.Mesh(footGeom, darkGoldMat);
      foot.position.set(Math.cos(angle) * 2.25, 0.05, Math.sin(angle) * 2.25);
      turntableGroup.add(foot);
    }

    // 8 Cột trụ góc đồng thau xoắn ốc chạm trổ
    const cornerRadius = 2.10;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const cx = Math.cos(angle) * cornerRadius;
      const cz = Math.sin(angle) * cornerRadius;

      const pGroup = new THREE.Group();
      pGroup.position.set(cx, 0.98, cz);

      // Chân cột
      const pBaseGeom = new THREE.CylinderGeometry(0.14, 0.16, 0.12, 16);
      const pBase = new THREE.Mesh(pBaseGeom, darkGoldMat);
      pBase.position.y = -0.56;
      pGroup.add(pBase);

      // Thân cột xoắn ốc
      const pShaftGeom = new THREE.CylinderGeometry(0.10, 0.10, 0.98, 16);
      const pShaft = new THREE.Mesh(pShaftGeom, polishedBrassMat);
      pGroup.add(pShaft);

      // Đầu cột
      const pCapGeom = new THREE.CylinderGeometry(0.16, 0.13, 0.12, 16);
      const pCap = new THREE.Mesh(pCapGeom, darkGoldMat);
      pCap.position.y = 0.56;
      pGroup.add(pCap);

      turntableGroup.add(pGroup);
    }

    // Phù điêu kim loại Oval mặt trước
    const medallionGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32);
    medallionGeom.scale(0.85, 1, 1.25);
    medallionGeom.rotateX(Math.PI / 2);
    const medallion = new THREE.Mesh(medallionGeom, polishedBrassMat);
    medallion.position.set(0, 0.98, 1.98);
    turntableGroup.add(medallion);

    // Tem nhãn HMV cạnh bên
    const plaqueGeom = new THREE.BoxGeometry(0.52, 0.68, 0.05);
    const plaque = new THREE.Mesh(plaqueGeom, darkGoldMat);
    plaque.position.set(-1.38, 0.98, 1.38);
    plaque.rotation.y = -Math.PI / 4;
    turntableGroup.add(plaque);

    // ========================================================================
    // 2. TAY QUAY CƠ KHÍ LÊN DÂY CÓT (CRANK HANDLE)
    // ========================================================================
    const crankGroup = new THREE.Group();
    crankGroup.position.set(1.98, 0.92, 0);
    crankGroup.rotation.y = Math.PI / 2;

    const crankBossGeom = new THREE.CylinderGeometry(0.14, 0.16, 0.12, 16);
    crankBossGeom.rotateX(Math.PI / 2);
    const crankBoss = new THREE.Mesh(crankBossGeom, darkGoldMat);
    crankBoss.position.z = 0.06;
    crankGroup.add(crankBoss);

    const crankShaftGeom = new THREE.CylinderGeometry(0.042, 0.042, 0.82, 16);
    crankShaftGeom.rotateX(Math.PI / 2);
    const crankShaft = new THREE.Mesh(crankShaftGeom, polishedBrassMat);
    crankShaft.position.z = 0.46;
    crankGroup.add(crankShaft);

    const crankCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.86),
      new THREE.Vector3(0, 0, 0.95),
      new THREE.Vector3(0, -0.15, 0.95),
      new THREE.Vector3(0, -0.62, 0.95),
      new THREE.Vector3(0, -0.68, 0.98),
      new THREE.Vector3(0, -0.68, 1.12)
    ]);
    const crankArmGeom = new THREE.TubeGeometry(crankCurve, 20, 0.038, 12, false);
    const crankArm = new THREE.Mesh(crankArmGeom, polishedBrassMat);
    crankGroup.add(crankArm);

    const knobGeom = new THREE.CylinderGeometry(0.10, 0.08, 0.42, 16);
    knobGeom.rotateX(Math.PI / 2);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.4 });
    const knob = new THREE.Mesh(knobGeom, knobMat);
    knob.position.set(0, -0.68, 1.33);
    crankGroup.add(knob);

    turntableGroup.add(crankGroup);

    // ========================================================================
    // 3. MÂM XOAY & ĐĨA THAN CỔ ĐIỂN 78 RPM (PLATTER & RECORD)
    // ========================================================================
    // Mâm xoay đồng thau
    const platterGeom = new THREE.CylinderGeometry(1.68, 1.68, 0.12, 64);
    const platterMesh = new THREE.Mesh(platterGeom, polishedBrassMat);
    platterMesh.position.set(0, 1.98, 0);
    turntableGroup.add(platterMesh);

    // Group Đĩa Than Xoay Độc Lập
    const recordGroup = new THREE.Group();
    recordGroup.position.set(0, 2.05, 0);
    turntableGroup.add(recordGroup);
    recordGroupRef.current = recordGroup;

    // Đĩa Shellac 78 RPM màu đen bóng
    const grooveTexture = createGrooveTexture();
    const recordGeom = new THREE.CylinderGeometry(1.60, 1.60, 0.035, 64);
    const recordMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      metalness: 0.92,
      roughness: 0.14,
      bumpMap: grooveTexture,
      bumpScale: 0.032
    });
    const recordMesh = new THREE.Mesh(recordGeom, recordMat);
    recordGroup.add(recordMesh);

    // Tem nhãn đĩa than tròn ở giữa
    const defaultLabelTexture = createDefaultLabelTexture();
    defaultLabelTextureRef.current = defaultLabelTexture;
    const labelGeom = new THREE.CircleGeometry(0.55, 64);
    const labelMat = new THREE.MeshStandardMaterial({
      map: defaultLabelTexture,
      roughness: 0.42,
      metalness: 0.12
    });
    const labelMesh = new THREE.Mesh(labelGeom, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = 0.02;
    recordGroup.add(labelMesh);
    labelMeshRef.current = labelMesh;

    // Trục giữa kim loại (Spindle)
    const spindleGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.36, 24);
    const spindle = new THREE.Mesh(spindleGeom, polishedBrassMat);
    spindle.position.set(0, 0.12, 0);
    recordGroup.add(spindle);

    // Bể chứa 3 vòng sóng xung kích âm thanh 3D
    const shockwaveCount = 3;
    const shockwaveGeom = new THREE.RingGeometry(1.68, 1.78, 64);
    shockwaveGeomRef.current = shockwaveGeom;
    const shockwaves = [];
    for (let i = 0; i < shockwaveCount; i++) {
      const swMat = new THREE.MeshBasicMaterial({
        color: ambientColors?.hexPrimary || 0xf59e0b,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const swMesh = new THREE.Mesh(shockwaveGeom, swMat);
      swMesh.rotation.x = -Math.PI / 2;
      swMesh.position.set(0, 2.06, 0);
      swMesh.visible = false;
      turntableGroup.add(swMesh);
      shockwaves.push({ mesh: swMesh, mat: swMat, active: false, scale: 1, opacity: 0 });
    }
    shockwavesRef.current = shockwaves;

    // Hào quang gầm bệ máy
    const underglowGeom = new THREE.TorusGeometry(2.55, 0.045, 16, 64);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: ambientColors?.hexPrimary || 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    underglowMatRef.current = underglowMat;
    const underglowMesh = new THREE.Mesh(underglowGeom, underglowMat);
    underglowMesh.rotation.x = Math.PI / 2;
    underglowMesh.position.y = 0.02;
    turntableGroup.add(underglowMesh);

    // ========================================================================
    // 4. CỤM CẦN KIM & HỘP ÂM HOA VĂN 6 CÁNH (TONEARM & SOUNDBOX)
    // ========================================================================
    const bracketGroup = new THREE.Group();
    bracketGroup.position.set(1.42, 1.94, -0.92); // Góc sau bên phải
    turntableGroup.add(bracketGroup);

    // Chân đế giá đỡ
    const bBaseGeom = new THREE.CylinderGeometry(0.30, 0.36, 0.16, 24);
    const bBase = new THREE.Mesh(bBaseGeom, darkGoldMat);
    bBase.position.y = 0.08;
    bracketGroup.add(bBase);

    // Khung trụ đỡ
    const bPillarGeom = new THREE.CylinderGeometry(0.16, 0.22, 1.10, 24);
    const bPillar = new THREE.Mesh(bPillarGeom, polishedBrassMat);
    bPillar.position.y = 0.65;
    bracketGroup.add(bPillar);

    // Khớp xoay ngang (Yaw Group)
    const tonearmYaw = new THREE.Group();
    tonearmYaw.position.set(0, 1.20, 0);
    bracketGroup.add(tonearmYaw);
    tonearmYawRef.current = tonearmYaw;

    // Khớp xoay dọc nâng hạ mũi kim (Pitch Group)
    const tonearmPitch = new THREE.Group();
    tonearmPitch.position.set(0, 0, 0);
    tonearmYaw.add(tonearmPitch);
    tonearmPitchRef.current = tonearmPitch;

    // Ống cần kim uốn cong cổ ngỗng
    const armCurvePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.35, -0.10, 0.25),
      new THREE.Vector3(-0.85, -0.38, 0.65),
      new THREE.Vector3(-1.18, -0.68, 0.85),
      new THREE.Vector3(-1.38, -0.88, 0.95)
    ];
    const armCurve = new THREE.CatmullRomCurve3(armCurvePoints);
    const armTubeGeom = new THREE.TubeGeometry(armCurve, 32, 0.058, 16, false);
    const armTube = new THREE.Mesh(armTubeGeom, polishedBrassMat);
    tonearmPitch.add(armTube);

    // CỦ PHÁT ÂM HOA VĂN 6 CÁNH HOA (SOUNDBOX REPRODUCER)
    const soundboxGroup = new THREE.Group();
    soundboxGroup.position.set(-1.38, -0.88, 0.95);
    soundboxGroup.rotation.set(0.35, -0.42, 0.2);

    const sbChamberGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 32);
    sbChamberGeom.rotateX(Math.PI / 2);
    const sbChamber = new THREE.Mesh(sbChamberGeom, polishedBrassMat);
    soundboxGroup.add(sbChamber);

    const sbRimGeom = new THREE.TorusGeometry(0.34, 0.032, 16, 32);
    const sbRim = new THREE.Mesh(sbRimGeom, darkGoldMat);
    soundboxGroup.add(sbRim);

    // Hoa văn 6 cánh hoa đục lỗ thoát âm
    for (let p = 0; p < 6; p++) {
      const pAngle = (p * Math.PI) / 3;
      const petalGeom = new THREE.BoxGeometry(0.055, 0.20, 0.14);
      petalGeom.rotateZ(pAngle);
      const petal = new THREE.Mesh(petalGeom, darkGoldMat);
      petal.position.set(Math.cos(pAngle) * 0.13, Math.sin(pAngle) * 0.13, 0.02);
      soundboxGroup.add(petal);
    }

    // Mũi kim stylus tiếp xúc rãnh đĩa
    const stylusGeom = new THREE.ConeGeometry(0.028, 0.16, 12);
    stylusGeom.rotateZ(Math.PI);
    const stylus = new THREE.Mesh(stylusGeom, darkGoldMat);
    stylus.position.set(0, -0.36, 0);
    soundboxGroup.add(stylus);

    tonearmPitch.add(soundboxGroup);

    // ========================================================================
    // 5. LOA KÈN HOA MUỐNG BIỂN 8 MÚI BẰNG ĐỒNG (MORNING GLORY HORN)
    // ========================================================================
    const hornGroup = new THREE.Group();
    hornGroup.position.set(1.42, 3.14, -0.92);
    turntableGroup.add(hornGroup);
    hornGroupRef.current = hornGroup;

    // Cổ kèn uốn cong cổ ngỗng
    const elbowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(-0.25, 0.85, 0.15),
      new THREE.Vector3(-0.75, 1.45, 0.45),
      new THREE.Vector3(-1.35, 1.95, 0.85)
    ]);
    const elbowGeom = new THREE.TubeGeometry(elbowCurve, 32, 0.18, 24, false);
    const elbowMesh = new THREE.Mesh(elbowGeom, polishedBrassMat);
    hornGroup.add(elbowMesh);

    // Thân kèn 8 múi lượn sóng xòe rộng
    const radialSegs = 96;
    const heightSegs = 48;
    const hornBellGeom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uvs = [];

    const hornLength = 3.6;
    const startRadius = 0.38;
    const endRadius = 2.45;

    for (let yIdx = 0; yIdx <= heightSegs; yIdx++) {
      const v = yIdx / heightSegs;
      const baseR = startRadius + (endRadius - startRadius) * Math.pow(v, 2.1);
      const currentZ = v * hornLength;
      const currentY = Math.pow(v, 1.4) * 1.25;

      for (let xIdx = 0; xIdx <= radialSegs; xIdx++) {
        const u = xIdx / radialSegs;
        const theta = u * Math.PI * 2;
        const fluteAmp = Math.pow(v, 1.8) * 0.22;
        const flutedR = baseR * (1.0 + fluteAmp * Math.cos(8 * theta));

        const x = flutedR * Math.cos(theta);
        const y = currentY + flutedR * Math.sin(theta);
        const z = currentZ;

        vertices.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let yIdx = 0; yIdx < heightSegs; yIdx++) {
      for (let xIdx = 0; xIdx < radialSegs; xIdx++) {
        const a = yIdx * (radialSegs + 1) + xIdx;
        const b = (yIdx + 1) * (radialSegs + 1) + xIdx;
        const c = (yIdx + 1) * (radialSegs + 1) + (xIdx + 1);
        const d = yIdx * (radialSegs + 1) + (xIdx + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    hornBellGeom.setIndex(indices);
    hornBellGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    hornBellGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    hornBellGeom.computeVertexNormals();

    const hornBellMesh = new THREE.Mesh(hornBellGeom, polishedBrassMat);
    hornBellMesh.position.set(-1.35, 1.95, 0.85);
    hornBellMesh.rotation.set(0.35, -0.65, 0.45);
    hornGroup.add(hornBellMesh);
    hornBellMeshRef.current = hornBellMesh;

    // Vành cuộn tròn mép kèn
    const rimPoints = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      const flutedR = endRadius * (1.0 + 0.22 * Math.cos(8 * theta));
      rimPoints.push(new THREE.Vector3(
        flutedR * Math.cos(theta),
        1.25 + flutedR * Math.sin(theta),
        hornLength
      ));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);
    const rimGeom = new THREE.TubeGeometry(rimCurve, 64, 0.055, 12, true);
    const rimMesh = new THREE.Mesh(rimGeom, darkGoldMat);
    rimMesh.position.copy(hornBellMesh.position);
    rimMesh.rotation.copy(hornBellMesh.rotation);
    hornGroup.add(rimMesh);

    // ========================================================================
    // 6. TƯƠNG TÁC VẬT LÝ (VINYL SCRATCHING & TONEARM SCRUBBING)
    // ========================================================================
    const raycaster = new THREE.Raycaster();
    const scratchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.05);
    const planeIntersect = new THREE.Vector3();
    const diskCenter = new THREE.Vector2(0, 0);

    const mouseTargetRef = { current: { x: 0, y: 0 } };

    const getRayIntersection = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(normX, normY), camera);
      const hit = raycaster.ray.intersectPlane(scratchPlane, planeIntersect);
      return hit ? planeIntersect : null;
    };

    const handlePointerDown = (e) => {
      const hit = getRayIntersection(e);
      if (!hit) return;

      const dist = Math.hypot(hit.x - diskCenter.x, hit.z - diskCenter.y);
      const angle = Math.atan2(hit.z - diskCenter.y, hit.x - diskCenter.x);

      // Chạm vào mặt đĩa than để chà đĩa (Vinyl Scratching)
      if (dist <= 1.70) {
        isScratchingRef.current = true;
        lastScratchAngleRef.current = angle;
        lastScratchTimeRef.current = performance.now();
        container.style.cursor = 'grabbing';
      }
    };

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTargetRef.current = {
        x: THREE.MathUtils.clamp(normX, -1, 1),
        y: THREE.MathUtils.clamp(normY, -1, 1)
      };

      const hit = getRayIntersection(e);
      if (!hit) {
        if (!isScratchingRef.current) container.style.cursor = 'default';
        return;
      }

      const dist = Math.hypot(hit.x - diskCenter.x, hit.z - diskCenter.y);
      const angle = Math.atan2(hit.z - diskCenter.y, hit.x - diskCenter.x);
      const now = performance.now();

      if (isScratchingRef.current) {
        let deltaAngle = angle - lastScratchAngleRef.current;
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

        if (recordGroupRef.current) {
          recordGroupRef.current.rotation.y += deltaAngle;
          platterMesh.rotation.y += deltaAngle;
        }

        const dt = Math.max(0.001, (now - lastScratchTimeRef.current) / 1000);
        const angularVel = deltaAngle / dt;
        const standardOmega = 3.49;
        const relativeRate = angularVel / standardOmega;

        onScratchRef.current?.({
          isScratching: true,
          playbackRate: relativeRate,
          deltaAngle
        });

        if (Math.abs(angularVel) > 0.8) {
          playNeedleScratch({
            intensity: Math.min(1.0, Math.abs(angularVel) / 5.5)
          });
        }

        lastScratchAngleRef.current = angle;
        lastScratchTimeRef.current = now;
        return;
      }

      if (dist <= 1.70) {
        container.style.cursor = 'grab';
      } else {
        container.style.cursor = 'default';
      }
    };

    const handlePointerUp = () => {
      if (isScratchingRef.current) {
        isScratchingRef.current = false;
        container.style.cursor = 'grab';
        onScratchRef.current?.({
          isScratching: false,
          playbackRate: 1.0,
          deltaAngle: 0
        });
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointerleave', handlePointerUp);

    // ========================================================================
    // 7. TRƯỜNG HẠT BỤI NẮNG ẤM HOÀI NIỆM (150 PARTICLES)
    // ========================================================================
    const dustCount = 150;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpecksData = [];

    for (let i = 0; i < dustCount; i++) {
      const baseX = -3.2 + Math.random() * 6.4;
      const y = 0.5 + Math.random() * 5.8;
      const baseZ = -3.0 + Math.random() * 6.0;

      dustPositions[i * 3 + 0] = baseX;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = baseZ;

      dustSpecksData.push({
        baseX,
        y,
        baseZ,
        verticalSpeed: 0.035 + Math.random() * 0.065,
        phaseX: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2
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
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: ambientColors?.hexPrimary || 0xffeedb
    });
    dustMatRef.current = dustMat;

    const dustPoints = new THREE.Points(dustGeom, dustMat);
    scene.add(dustPoints);

    // RESIZE
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // ========================================================================
    // 8. RENDER LOOP (60 FPS Physical Simulation)
    // ========================================================================
    let lastTime = performance.now();
    let lastShockwaveTime = 0;
    const currentMouse = { x: 0, y: 0 };

    const render = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const { bassEnergy } = getAudioFrequencies();

      // Mouse Parallax êm ái
      currentMouse.x += (mouseTargetRef.current.x - currentMouse.x) * 0.04;
      currentMouse.y += (mouseTargetRef.current.y - currentMouse.y) * 0.04;
      turntableGroup.rotation.y = currentMouse.x * 0.18;
      turntableGroup.rotation.x = -currentMouse.y * 0.08;

      // Xoay đĩa than 33⅓ RPM
      if (isPlayingRef.current) {
        spinSpeedRef.current = THREE.MathUtils.lerp(spinSpeedRef.current, 3.49, delta * 3.5);
      } else {
        spinSpeedRef.current = THREE.MathUtils.lerp(spinSpeedRef.current, 0, delta * 1.8);
      }

      if (recordGroupRef.current) {
        if (!isScratchingRef.current && spinSpeedRef.current > 0.001) {
          recordGroupRef.current.rotation.y += spinSpeedRef.current * delta;
          platterMesh.rotation.y += spinSpeedRef.current * delta;

          if (!isDroppingInRef.current) {
            const microBounce = Math.sin(now * 0.035) * (bassEnergy > 0.15 ? 0.002 : 0.0005);
            recordGroupRef.current.position.y = 2.05 + bassEnergy * 0.02 + microBounce;
          }
        }
      }

      // Loa kèn rung nở nhẹ theo nhịp bass âm nhạc (Horn Bass Breathing)
      if (hornBellMeshRef.current && isPlayingRef.current) {
        const hornScale = 1.0 + bassEnergy * 0.025;
        hornBellMeshRef.current.scale.set(hornScale, hornScale, 1.0);
      }

      // Cần kim bám theo tiến độ
      if (isPlayingRef.current && !isTransitioningRef.current && tonearmYawRef.current) {
        tonearmYawRef.current.rotation.y = THREE.MathUtils.lerp(
          tonearmYawRef.current.rotation.y,
          targetGrooveYawRef.current,
          delta * 2.5
        );
        if (tonearmPitchRef.current) {
          tonearmPitchRef.current.rotation.z = Math.sin(now * 0.02) * 0.0015 + bassEnergy * 0.004;
        }
      }

      // Kích hoạt sóng âm 3D khi có đỉnh bass
      const shockwaves = shockwavesRef.current || [];
      if (isPlayingRef.current && bassEnergy > 0.68 && (now - lastShockwaveTime > 240)) {
        const idleSw = shockwaves.find((sw) => !sw.active);
        if (idleSw) {
          idleSw.active = true;
          idleSw.scale = 1.0;
          idleSw.opacity = 0.72;
          idleSw.mesh.visible = true;
          idleSw.mesh.scale.set(1, 1, 1);
          idleSw.mat.opacity = 0.72;
          lastShockwaveTime = now;
        }
      }

      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        if (sw.active) {
          sw.scale += delta * 3.8;
          sw.opacity -= delta * 1.5;
          sw.mesh.scale.set(sw.scale, sw.scale, 1);
          sw.mat.opacity = Math.max(0, sw.opacity);
          if (sw.opacity <= 0.01 || sw.scale >= 2.4) {
            sw.active = false;
            sw.mesh.visible = false;
          }
        }
      }

      // Cập nhật hạt bụi nắng
      if (dustGeomRef.current) {
        const pos = dustGeomRef.current.attributes.position.array;
        for (let i = 0; i < dustCount; i++) {
          const idx = i * 3;
          const data = dustSpecksData[i];

          data.y += (data.verticalSpeed + (isPlayingRef.current ? bassEnergy * 0.03 : 0)) * delta;
          const driftX = Math.sin(now * 0.0006 + data.phaseX) * 0.22;
          const driftZ = Math.cos(now * 0.0004 + data.phaseZ) * 0.22;

          pos[idx + 0] = data.baseX + driftX;
          pos[idx + 1] = data.y;
          pos[idx + 2] = data.baseZ + driftZ;

          if (data.y > 6.0) {
            data.y = 0.5 + Math.random() * 0.3;
            data.baseX = -3.2 + Math.random() * 6.4;
            data.baseZ = -3.0 + Math.random() * 6.0;
          }
        }
        dustGeomRef.current.attributes.position.needsUpdate = true;
      }

      // Ánh sáng đèn bàn học
      if (platterSpotRef.current) {
        platterSpotRef.current.intensity = isPlayingRef.current ? 1.8 + bassEnergy * 1.1 : 1.4;
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointerleave', handlePointerUp);

      gsap.killTweensOf(tonearmYaw.rotation);
      gsap.killTweensOf(tonearmPitch.rotation);

      bottomPlinthGeom.dispose();
      baseMouldingGeom.dispose();
      cabinetBodyGeom.dispose();
      topMouldingGeom.dispose();
      topDeckGeom.dispose();
      platterGeom.dispose();
      recordGeom.dispose();
      labelGeom.dispose();
      spindleGeom.dispose();
      shockwaveGeom.dispose();
      underglowGeom.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      dustTexture.dispose();
      hornBellGeom.dispose();
      grooveTexture.dispose();
      defaultLabelTexture.dispose();

      if (currentCoverTextureRef.current) {
        currentCoverTextureRef.current.dispose();
      }

      renderer.forceContextLoss();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden">
      <div
        ref={mountRef}
        className="w-full h-full min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] cursor-grab active:cursor-grabbing flex items-center justify-center relative"
      />
    </div>
  );
}
