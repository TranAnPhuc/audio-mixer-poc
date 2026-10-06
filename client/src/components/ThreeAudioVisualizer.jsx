import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Tạo texture hạt phát sáng hình tròn bằng Canvas 2D
 */
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Component Hiển Thị Nền Sóng Hạt 3D Tương Tác (Three.js Particle Wave)
 * Trực quan hóa sóng âm đa chiều với hiệu ứng phát sáng Additive Blending và Parallax chuột
 */
export default function ThreeAudioVisualizer() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Khởi tạo Scene
    const scene = new THREE.Scene();

    // 2. Khởi tạo Camera (Góc nhìn phối cảnh FOV 60)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, -22, 18);
    camera.lookAt(0, 6, 0);

    // 3. Khởi tạo Renderer WebGL với chuẩn Retina & Alpha trong suốt
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Nền trong suốt
    container.appendChild(renderer.domElement);

    // 4. Dựng Lưới Hạt Sóng Âm (3D Particle Grid: 60 x 60 = 3600 hạt)
    const GRID_X = 60;
    const GRID_Y = 60;
    const COUNT = GRID_X * GRID_Y;
    const SEPARATION = 0.85;

    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const originalXY = new Float32Array(COUNT * 2);

    const colorIndigo = new THREE.Color('#6366f1');
    const colorEmerald = new THREE.Color('#10b981');
    const tempColor = new THREE.Color();

    let pIdx = 0;
    for (let iy = 0; iy < GRID_Y; iy++) {
      for (let ix = 0; ix < GRID_X; ix++) {
        const x = (ix - GRID_X / 2) * SEPARATION;
        const y = (iy - GRID_Y / 2) * SEPARATION;
        const z = 0;

        positions[pIdx * 3] = x;
        positions[pIdx * 3 + 1] = y;
        positions[pIdx * 3 + 2] = z;

        originalXY[pIdx * 2] = x;
        originalXY[pIdx * 2 + 1] = y;

        // Gradient chuyển màu chéo từ Indigo (#6366f1) sang Emerald (#10b981)
        const ratio = (ix + iy) / (GRID_X + GRID_Y);
        tempColor.copy(colorIndigo).lerp(colorEmerald, ratio);

        colors[pIdx * 3] = tempColor.r;
        colors[pIdx * 3 + 1] = tempColor.g;
        colors[pIdx * 3 + 2] = tempColor.b;

        pIdx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleTexture = createParticleTexture();

    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 5. Quản lý Tọa Độ Chuột phục vụ hiệu ứng Parallax Quán Tính
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = -22;

    const handlePointerMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = normX * 4;
      mouseY = normY * 3;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 6. Xử lý Thay Đổi Kích Thước Màn Hình (Window Resize)
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // 7. Vòng lặp Chuyển Động (Animation Loop 60 FPS)
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime() * 1.4;

      // Cập nhật tọa độ Z của từng hạt dựa trên hàm sóng sin/cos kết hợp
      const posArray = positionAttribute.array;
      for (let i = 0; i < COUNT; i++) {
        const x = originalXY[i * 2];
        const y = originalXY[i * 2 + 1];

        const wave1 = Math.sin(x * 0.28 + elapsedTime) * Math.cos(y * 0.28 + elapsedTime) * 1.5;
        const wave2 = Math.sin((x + y) * 0.15 + elapsedTime * 0.7) * 0.8;
        const wave3 = Math.cos(x * 0.1 - elapsedTime * 0.5) * 0.4;

        posArray[i * 3 + 2] = wave1 + wave2 + wave3;
      }
      positionAttribute.needsUpdate = true;

      // Parallax chuyển động camera mượt mà theo chuột (Lerp)
      targetCameraX = mouseX;
      targetCameraY = -22 + mouseY;
      camera.position.x += (targetCameraX - camera.position.x) * 0.05;
      camera.position.y += (targetCameraY - camera.position.y) * 0.05;
      camera.lookAt(0, 6, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Dọn dẹp Tài nguyên WebGL & Canvas Nghiêm Ngặt khi unmount
    return () => {
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      scene.remove(particles);
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden w-full h-full select-none"
      aria-hidden="true"
    />
  );
}
