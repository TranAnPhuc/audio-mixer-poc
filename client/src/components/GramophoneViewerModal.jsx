import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { X, RotateCcw, Download, Eye, Sparkles, Box, Maximize2, Minimize2 } from 'lucide-react';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

/**
 * GramophoneViewerModal — Trình Chiếu 3D Máy Hát Đĩa Than Cổ Điển (STL Interactive Showcase)
 * Được xây dựng theo các tiêu chuẩn thực hành tốt nhất của skill 3d-web-experience:
 * - OrbitControls với damping mượt mà
 * - Auto-rotate chế độ triển lãm cổ vật (Museum Showcase)
 * - Đa chế độ hiển thị: Hoàng Gia (Gold/Mahogany), Đồng Đỏ (Copper), Lưới Kỹ Thuật (Wireframe CAD)
 * - Tải trực tiếp tệp Binary STL về máy
 */
export default function GramophoneViewerModal({ isOpen, onClose }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [materialMode, setMaterialMode] = useState('gold'); // 'gold' | 'copper' | 'wireframe'
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [triangleCount, setTriangleCount] = useState(25404);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Tạo vật liệu theo chế độ đã chọn
  const getMaterial = (mode) => {
    switch (mode) {
      case 'copper':
        return new THREE.MeshStandardMaterial({
          color: 0xb87333,
          metalness: 0.88,
          roughness: 0.28,
          side: THREE.DoubleSide
        });
      case 'wireframe':
        return new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          wireframe: true,
          side: THREE.DoubleSide
        });
      case 'gold':
      default:
        return new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          metalness: 0.85,
          roughness: 0.22,
          side: THREE.DoubleSide
        });
    }
  };

  // Cập nhật vật liệu khi state thay đổi
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = getMaterial(materialMode);
    }
  }, [materialMode]);

  // Bật/tắt xoay tự động
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Khởi tạo Scene Three.js và nạp tệp STL
  useEffect(() => {
    if (!isOpen) return;

    const container = mountRef.current;
    if (!container) return;

    setLoading(true);

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(10, 8, 12);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 1.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Giới hạn góc nhìn không bị lật ngược gầm
    controls.minDistance = 4;
    controls.maxDistance = 28;
    controlsRef.current = controls;

    // 4. Ánh sáng triển lãm bảo tàng (Studio Showcase Lighting)
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 2.4);
    keyLight.position.set(8, 14, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.8);
    rimLight.position.set(-10, 8, -8);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 1.2, 30);
    fillLight.position.set(0, 10, 0);
    scene.add(fillLight);

    // Bệ sàn phản quang mờ (Soft Display Pedestal)
    const pedestalGeom = new THREE.CylinderGeometry(5.2, 5.5, 0.3, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x181a24,
      metalness: 0.6,
      roughness: 0.4
    });
    const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestal.position.y = -0.15;
    scene.add(pedestal);

    // Vòng phát sáng đế trưng bày
    const glowRingGeom = new THREE.RingGeometry(5.22, 5.35, 48);
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const glowRing = new THREE.Mesh(glowRingGeom, glowRingMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.01;
    scene.add(glowRing);

    // 5. Nạp tệp STL
    const loader = new STLLoader();
    loader.load(
      '/models/vintage_gramophone.stl',
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        // Căn tâm hình học vào gốc tọa độ
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.center();

        const count = geometry.attributes.position.count / 3;
        setTriangleCount(count);

        const mesh = new THREE.Mesh(geometry, getMaterial(materialMode));
        mesh.position.set(0, (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshRef.current = mesh;

        controls.target.set(0, mesh.position.y * 0.7, 0);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Lỗi nạp tệp STL:', err);
        setLoading(false);
      }
    );

    // 6. Xử lý Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Render Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, [isOpen]);

  // Đặt lại góc nhìn camera
  const handleResetCamera = () => {
    playHapticClick();
    if (cameraRef.current && controlsRef.current && meshRef.current) {
      cameraRef.current.position.set(10, 8, 12);
      controlsRef.current.target.set(0, meshRef.current.position.y * 0.7, 0);
      controlsRef.current.update();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in select-none">
      <div
        className={`relative w-full max-w-5xl rounded-3xl bg-[#11131c]/95 border border-amber-400/30 shadow-2xl shadow-black/90 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'fixed inset-3 max-w-none rounded-2xl' : 'h-[85vh] max-h-[780px]'
        }`}
      >
        {/* HEADER TOP BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Máy Phát Đĩa Than Cổ Điển STL</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  3D MODEL
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Thùng Bát Giác • Loa Kèn 8 Múi Đồng Thau • {triangleCount.toLocaleString()} Triangles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Phóng to / Thu nhỏ */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsFullscreen((prev) => !prev);
              }}
              onMouseEnter={playHoverBlip}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Nút Đóng Modal */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                onClose();
              }}
              onMouseEnter={playHoverBlip}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/50 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KHUNG HIỂN THỊ 3D CANVAS */}
        <div className="relative flex-1 w-full bg-gradient-to-b from-[#0a0c13] via-[#0e111a] to-[#07080d] overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 z-20">
              <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-amber-300 tracking-wider">ĐANG NẠP MÔ HÌNH 3D STL...</p>
            </div>
          )}

          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* THANH ĐIỀU KHIỂN NỔI GÓC DƯỚI (FLOATING TOOLBAR) */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-[#0f121a]/90 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80">
            {/* Chuyển đổi vật liệu */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  setMaterialMode('gold');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  materialMode === 'gold'
                    ? 'bg-amber-400/30 border border-amber-400 text-amber-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoàng Gia
              </button>
              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  setMaterialMode('copper');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  materialMode === 'copper'
                    ? 'bg-amber-700/40 border border-amber-600 text-amber-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Đồng Cổ
              </button>
              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  setMaterialMode('wireframe');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  materialMode === 'wireframe'
                    ? 'bg-amber-400/30 border border-amber-400 text-amber-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Lưới CAD</span>
              </button>
            </div>

            {/* Nút Xoay Tự Động */}
            <button
              type="button"
              onClick={() => {
                playHapticClick();
                setIsAutoRotate((prev) => !prev);
              }}
              onMouseEnter={playHoverBlip}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isAutoRotate
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                  : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Bật/Tắt chế độ tự động xoay ngắm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isAutoRotate ? 'Đang Xoay' : 'Dừng Xoay'}</span>
            </button>

            {/* Nút Đặt lại góc nhìn (Reset) */}
            <button
              type="button"
              onClick={handleResetCamera}
              onMouseEnter={playHoverBlip}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Đặt lại góc nhìn camera ban đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Nút Tải Tệp STL */}
            <a
              href="/models/vintage_gramophone.stl"
              download="vintage_gramophone.stl"
              onClick={playHapticClick}
              onMouseEnter={playHoverBlip}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/30 via-amber-400/40 to-amber-600/30 hover:from-amber-500/40 hover:to-amber-400/50 border border-amber-400/60 text-xs font-bold text-amber-200 hover:text-white transition-all cursor-pointer shadow-md shadow-amber-500/20"
              title="Tải tệp mô hình 3D STL chuẩn về máy tính"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Tải Tệp STL (1.27MB)</span>
            </a>
          </div>
        </div>

        {/* FOOTER INFO BAR */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-white/10 bg-black/60 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <span>CHUẨN CÔNG NGHIỆP BINARY STL (.stl)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>KÉO CHUỘT: XOAY 360°</span>
            <span>•</span>
            <span>CUỘN CHUỘT: ZOOM</span>
            <span>•</span>
            <span>PHẢI CHUỘT: PAN</span>
          </div>
        </div>
      </div>
    </div>
  );
}
