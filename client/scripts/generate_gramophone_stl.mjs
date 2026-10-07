import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- KHỞI TẠO BỘ DỰNG MÔ HÌNH 3D MÁY PHÁT ĐĨA THAN CỔ ĐIỂN VINTAGE GRAMOPHONE ---');

// Tạo Scene gốc để chứa toàn bộ các cụm chi tiết
const gramophoneGroup = new THREE.Group();
gramophoneGroup.name = 'VintageGramophone_HMV';

// ============================================================================
// 1. BỆ GỖ BÁT GIÁC (OCTAGONAL WOODEN CABINET & STEPPED MOULDINGS)
// ============================================================================
console.log('1. Đang dựng bệ máy bát giác và các tầng giật cấp...');

// Đáy bát giác dưới cùng (Bottom Plinth)
const bottomPlinthGeom = new THREE.CylinderGeometry(2.55, 2.65, 0.22, 8);
bottomPlinthGeom.rotateY(Math.PI / 8); // Căn chỉnh để có mặt phẳng đối diện trực diện
const bottomPlinth = new THREE.Mesh(bottomPlinthGeom);
bottomPlinth.position.y = 0.11;
gramophoneGroup.add(bottomPlinth);

// Nẹp chân bát giác (Base Moulding)
const baseMouldingGeom = new THREE.CylinderGeometry(2.35, 2.50, 0.16, 8);
baseMouldingGeom.rotateY(Math.PI / 8);
const baseMoulding = new THREE.Mesh(baseMouldingGeom);
baseMoulding.position.y = 0.30;
gramophoneGroup.add(baseMoulding);

// Thân thùng máy bát giác chính (Main Cabinet Body)
const cabinetBodyGeom = new THREE.CylinderGeometry(2.18, 2.18, 1.30, 8);
cabinetBodyGeom.rotateY(Math.PI / 8);
const cabinetBody = new THREE.Mesh(cabinetBodyGeom);
cabinetBody.position.y = 1.03;
gramophoneGroup.add(cabinetBody);

// Nẹp nắp bát giác (Top Moulding)
const topMouldingGeom = new THREE.CylinderGeometry(2.48, 2.25, 0.16, 8);
topMouldingGeom.rotateY(Math.PI / 8);
const topMoulding = new THREE.Mesh(topMouldingGeom);
topMoulding.position.y = 1.76;
gramophoneGroup.add(topMoulding);

// Nắp mặt trên bát giác (Top Deck Plinth)
const topDeckGeom = new THREE.CylinderGeometry(2.58, 2.52, 0.20, 8);
topDeckGeom.rotateY(Math.PI / 8);
const topDeck = new THREE.Mesh(topDeckGeom);
topDeck.position.y = 1.94;
gramophoneGroup.add(topDeck);

// 8 Chân đế chống trượt bên dưới góc bát giác
for (let i = 0; i < 8; i++) {
  const angle = (i * Math.PI) / 4 + Math.PI / 8;
  const footGeom = new THREE.CylinderGeometry(0.18, 0.24, 0.12, 16);
  const foot = new THREE.Mesh(footGeom);
  foot.position.set(Math.cos(angle) * 2.35, 0.05, Math.sin(angle) * 2.35);
  gramophoneGroup.add(foot);
}

// ============================================================================
// 2. 8 CỘT TRỤ XOẮN ỐC TRANG TRÍ Ở 8 GÓC (8 ORNATE CORNER PILLARS)
// ============================================================================
console.log('2. Đang dựng 8 cột trụ góc chạm trổ bằng đồng...');

const cornerRadius = 2.16; // Tọa độ góc bát giác
for (let i = 0; i < 8; i++) {
  const angle = (i * Math.PI) / 4 + Math.PI / 8;
  const cx = Math.cos(angle) * cornerRadius;
  const cz = Math.sin(angle) * cornerRadius;

  const pillarGroup = new THREE.Group();
  pillarGroup.position.set(cx, 1.03, cz);

  // Chân đế cột (Pillar Base)
  const pBaseGeom = new THREE.CylinderGeometry(0.16, 0.18, 0.14, 16);
  const pBase = new THREE.Mesh(pBaseGeom);
  pBase.position.y = -0.58;
  pillarGroup.add(pBase);

  // Thân cột rãnh xoắn (Twisted Fluted Shaft)
  const shaftSegments = 12;
  const shaftHeight = 1.02;
  const segHeight = shaftHeight / shaftSegments;
  for (let s = 0; s < shaftSegments; s++) {
    const rRing = 0.11 + Math.sin(s * 0.8) * 0.02;
    const ringGeom = new THREE.CylinderGeometry(rRing, rRing, segHeight * 0.95, 12);
    const ringMesh = new THREE.Mesh(ringGeom);
    ringMesh.position.y = -0.51 + s * segHeight;
    pillarGroup.add(ringMesh);
  }

  // Đầu cột hoa văn (Pillar Capital)
  const pCapGeom = new THREE.CylinderGeometry(0.18, 0.15, 0.14, 16);
  const pCap = new THREE.Mesh(pCapGeom);
  pCap.position.y = 0.58;
  pillarGroup.add(pCap);

  gramophoneGroup.add(pillarGroup);
}

// Phù điêu kim loại Oval mặt trước (Front Oval Brass Medallion)
const medallionGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.05, 32);
medallionGeom.scale(0.85, 1, 1.25); // Kéo dài thành hình Oval
medallionGeom.rotateX(Math.PI / 2);
const medallion = new THREE.Mesh(medallionGeom);
medallion.position.set(0, 1.03, 2.05); // Mặt trước
gramophoneGroup.add(medallion);

// Khung tem nhãn thương hiệu hình chữ nhật bên cạnh
const plaqueGeom = new THREE.BoxGeometry(0.55, 0.72, 0.06);
const plaque = new THREE.Mesh(plaqueGeom);
plaque.position.set(-1.45, 1.03, 1.45);
plaque.rotation.y = -Math.PI / 4;
gramophoneGroup.add(plaque);

// ============================================================================
// 3. TAY QUAY CƠ KHÍ LÊN DÂY CÓT (WINDING CRANK HANDLE)
// ============================================================================
console.log('3. Đang dựng tay quay cơ học bên hông...');

const crankGroup = new THREE.Group();
crankGroup.position.set(2.05, 0.95, 0); // Nhô ra sườn phải
crankGroup.rotation.y = Math.PI / 2;

// Ốc tán chân tay quay gắn vào thùng gỗ
const crankBossGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.12, 16);
crankBossGeom.rotateX(Math.PI / 2);
const crankBoss = new THREE.Mesh(crankBossGeom);
crankBoss.position.z = 0.06;
crankGroup.add(crankBoss);

// Trục thép nhô ngang
const shaftGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.85, 16);
shaftGeom.rotateX(Math.PI / 2);
const crankShaft = new THREE.Mesh(shaftGeom);
crankShaft.position.z = 0.48;
crankGroup.add(crankShaft);

// Tay đòn gập góc chữ L
const armCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0.90),
  new THREE.Vector3(0, 0, 0.98),
  new THREE.Vector3(0, -0.15, 0.98),
  new THREE.Vector3(0, -0.65, 0.98),
  new THREE.Vector3(0, -0.72, 1.02),
  new THREE.Vector3(0, -0.72, 1.15)
]);
const armTubeGeom = new THREE.TubeGeometry(armCurve, 24, 0.042, 12, false);
const armTube = new THREE.Mesh(armTubeGeom);
crankGroup.add(armTube);

// Chuôi cầm gỗ/nhựa tròn xoay
const handleKnobGeom = new THREE.CylinderGeometry(0.11, 0.09, 0.45, 20);
handleKnobGeom.rotateX(Math.PI / 2);
const handleKnob = new THREE.Mesh(handleKnobGeom);
handleKnob.position.set(0, -0.72, 1.38);
crankGroup.add(handleKnob);

gramophoneGroup.add(crankGroup);

// ============================================================================
// 4. MÂM XOAY & ĐĨA THAN CỔ ĐIỂN 78 RPM (TURNTABLE PLATTER & RECORD)
// ============================================================================
console.log('4. Đang dựng mâm xoay tròn và đĩa than cổ...');

// Mâm xoay tròn bọc nhung viền đồng (Platter)
const platterGeom = new THREE.CylinderGeometry(1.72, 1.72, 0.12, 64);
const platter = new THREE.Mesh(platterGeom);
platter.position.set(0, 2.10, 0);
gramophoneGroup.add(platter);

// Vành kim loại bao quanh mâm
const platterRimGeom = new THREE.TorusGeometry(1.72, 0.04, 16, 64);
platterRimGeom.rotateX(Math.PI / 2);
const platterRim = new THREE.Mesh(platterRimGeom);
platterRim.position.set(0, 2.10, 0);
gramophoneGroup.add(platterRim);

// Đĩa than Shellac đen bóng 78 RPM (Vinyl / Shellac Record)
const recordGeom = new THREE.CylinderGeometry(1.64, 1.64, 0.035, 64);
const record = new THREE.Mesh(recordGeom);
record.position.set(0, 2.18, 0);
gramophoneGroup.add(record);

// Tem nhãn giữa màu đỏ viền vàng kinh điển (HMV Red Center Label)
const labelGeom = new THREE.CylinderGeometry(0.56, 0.56, 0.042, 48);
const labelMesh = new THREE.Mesh(labelGeom);
labelMesh.position.set(0, 2.19, 0);
gramophoneGroup.add(labelMesh);

// Trục kim loại trung tâm nhô cao (Center Spindle)
const spindleGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 24);
const spindle = new THREE.Mesh(spindleGeom);
spindle.position.set(0, 2.30, 0);
gramophoneGroup.add(spindle);

// ============================================================================
// 5. GIÁ ĐỠ HỢP KIM & CẦN KIM CỔ NGỖNG (SUPPORT BRACKET & TONEARM)
// ============================================================================
console.log('5. Đang dựng cụm cần kim, giá đỡ cơ khí và củ phát âm hoa văn...');

const bracketGroup = new THREE.Group();
bracketGroup.position.set(1.48, 2.04, -0.95); // Góc sau bên phải bệ máy

// Chân đế giá đỡ gắn vào mặt gỗ
const bracketBaseGeom = new THREE.CylinderGeometry(0.32, 0.38, 0.18, 24);
const bracketBase = new THREE.Mesh(bracketBaseGeom);
bracketBase.position.y = 0.09;
bracketGroup.add(bracketBase);

// Khung trụ đỡ kim loại chạm nổi vươn lên
const supportPillarGeom = new THREE.CylinderGeometry(0.18, 0.24, 1.15, 24);
const supportPillar = new THREE.Mesh(supportPillarGeom);
supportPillar.position.y = 0.68;
bracketGroup.add(supportPillar);

// Thanh giằng hoa văn trợ lực phía sau giá đỡ (Ornate Support Strut)
const strutCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.05, 0.15, -0.25),
  new THREE.Vector3(0.15, 0.65, -0.32),
  new THREE.Vector3(0.08, 1.15, -0.15),
  new THREE.Vector3(0, 1.25, 0)
]);
const strutGeom = new THREE.TubeGeometry(strutCurve, 20, 0.04, 12, false);
const strutMesh = new THREE.Mesh(strutGeom);
bracketGroup.add(strutMesh);

// Ống cần kim cổ ngỗng (Gooseneck Tonearm) vươn ra mặt đĩa
const tonearmCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.25, 0),
  new THREE.Vector3(-0.35, 1.15, 0.25),
  new THREE.Vector3(-0.85, 0.85, 0.65),
  new THREE.Vector3(-1.15, 0.55, 0.85),
  new THREE.Vector3(-1.35, 0.35, 0.95)
]);
const tonearmTubeGeom = new THREE.TubeGeometry(tonearmCurve, 32, 0.065, 16, false);
const tonearmTube = new THREE.Mesh(tonearmTubeGeom);
bracketGroup.add(tonearmTube);

// CỦ PHÁT ÂM TRÒN HOA VĂN 6 CÁNH HOA (SOUNDBOX / REPRODUCER)
const soundboxGroup = new THREE.Group();
soundboxGroup.position.set(-1.35, 0.35, 0.95);
soundboxGroup.rotation.set(0.35, -0.45, 0.2);

// Thân củ loa tròn (Round Soundbox Chamber)
const sbChamberGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32);
sbChamberGeom.rotateX(Math.PI / 2);
const sbChamber = new THREE.Mesh(sbChamberGeom);
soundboxGroup.add(sbChamber);

// Vành mép củ phát âm (Brass Retaining Ring)
const sbRimGeom = new THREE.TorusGeometry(0.35, 0.035, 16, 32);
const sbRim = new THREE.Mesh(sbRimGeom);
soundboxGroup.add(sbRim);

// Hoa văn 6 cánh hoa đục lỗ thoát âm trên mặt soundbox (như trong ảnh may_phat_dia_than.webp)
for (let p = 0; p < 6; p++) {
  const pAngle = (p * Math.PI) / 3;
  const petalHoleGeom = new THREE.BoxGeometry(0.06, 0.22, 0.14);
  petalHoleGeom.rotateZ(pAngle);
  const petalMesh = new THREE.Mesh(petalHoleGeom);
  petalMesh.position.set(Math.cos(pAngle) * 0.14, Math.sin(pAngle) * 0.14, 0.02);
  soundboxGroup.add(petalMesh);
}

// Mũi kim stylus chỉ xuống mặt rãnh đĩa
const stylusGeom = new THREE.ConeGeometry(0.03, 0.18, 12);
stylusGeom.rotateZ(Math.PI);
const stylus = new THREE.Mesh(stylusGeom);
stylus.position.set(0, -0.38, 0);
soundboxGroup.add(stylus);

bracketGroup.add(soundboxGroup);
gramophoneGroup.add(bracketGroup);

// ============================================================================
// 6. LOA KÈN HOA MUỐNG BIỂN 8 CÁNH UỐN LƯỢN (BRASS MORNING GLORY HORN)
// ============================================================================
console.log('6. Đang dựng loa kèn hoa muống biển 8 múi lượn sóng đối xứng...');

const hornGroup = new THREE.Group();
// Điểm đặt gốc kèn tại đỉnh của giá đỡ
hornGroup.position.set(1.48, 3.29, -0.95);

// Cổ kèn uốn cong hình cổ ngỗng (Gooseneck Elbow Pipe)
const elbowCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(-0.25, 0.85, 0.15),
  new THREE.Vector3(-0.75, 1.45, 0.45),
  new THREE.Vector3(-1.35, 1.95, 0.85)
]);

// Đoạn ống cổ kèn loe dần
const elbowTubeGeom = new THREE.TubeGeometry(elbowCurve, 32, 0.18, 24, false);
const elbowMesh = new THREE.Mesh(elbowTubeGeom);
hornGroup.add(elbowMesh);

// Khớp cổ kèn mạ bạc/đồng chạm hoa văn (Elbow Collar Ring)
const collarGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.15, 24);
collarGeom.rotateZ(Math.PI / 4);
const collar = new THREE.Mesh(collarGeom);
collar.position.set(-0.35, 1.0, 0.2);
hornGroup.add(collar);

// THÂN LOA KÈN HOA MUỐNG BIỂN THAM SỐ 8 MÚI (PARAMETRIC 8-FLUTED MORNING GLORY BELL)
// Tạo lưới hình học bề mặt tùy biến có 8 múi cánh hoa nở rộng
const radialSegments = 96; // 96 điểm xung quanh để tạo 8 múi hoa mềm mại
const heightSegments = 48; // 48 lớp dọc theo chiều dài kèn

const hornBellGeom = new THREE.BufferGeometry();
const vertices = [];
const indices = [];
const uvs = [];

const hornLength = 3.6; // Chiều dài thân loa kèn
const startRadius = 0.38; // Bán kính cổ kèn
const endRadius = 2.45; // Bán kính miệng kèn xòe rộng

for (let yIdx = 0; yIdx <= heightSegments; yIdx++) {
  const v = yIdx / heightSegments; // 0 (cổ kèn) -> 1 (miệng kèn)
  
  // Hàm loe theo hàm số mũ đặc trưng của loa kèn âm học (Exponential acoustic expansion)
  const baseR = startRadius + (endRadius - startRadius) * Math.pow(v, 2.1);
  
  // Chiều cao và độ cong vươn chếch lên trên và mở ra phía trước
  const currentZ = v * hornLength;
  const currentY = Math.pow(v, 1.4) * 1.25;

  for (let xIdx = 0; xIdx <= radialSegments; xIdx++) {
    const u = xIdx / radialSegments;
    const theta = u * Math.PI * 2;

    // Biên độ uốn lượn 8 múi cánh hoa: càng gần miệng loa càng xòe lượn sóng rõ rệt
    const fluteAmp = Math.pow(v, 1.8) * 0.22; // Biên độ cánh hoa
    const flutedR = baseR * (1.0 + fluteAmp * Math.cos(8 * theta));

    // Tọa độ đỉnh trong không gian cục bộ của thân kèn
    const x = flutedR * Math.cos(theta);
    const y = currentY + flutedR * Math.sin(theta);
    const z = currentZ;

    vertices.push(x, y, z);
    uvs.push(u, v);
  }
}

// Ghép các tam giác (Faces)
for (let yIdx = 0; yIdx < heightSegments; yIdx++) {
  for (let xIdx = 0; xIdx < radialSegments; xIdx++) {
    const a = yIdx * (radialSegments + 1) + xIdx;
    const b = (yIdx + 1) * (radialSegments + 1) + xIdx;
    const c = (yIdx + 1) * (radialSegments + 1) + (xIdx + 1);
    const d = yIdx * (radialSegments + 1) + (xIdx + 1);

    // 2 tam giác cho mỗi ô tứ giác
    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}

hornBellGeom.setIndex(indices);
hornBellGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
hornBellGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
hornBellGeom.computeVertexNormals();

const hornBellMesh = new THREE.Mesh(hornBellGeom);
// Đặt góc xoay để miệng loa kèn hướng chếch ra phía trước theo đúng ảnh mẫu
hornBellMesh.position.set(-1.35, 1.95, 0.85);
hornBellMesh.rotation.set(0.35, -0.65, 0.45);
hornGroup.add(hornBellMesh);

// Vành mép ngoài uốn cuộn tròn của miệng kèn (Rolled Petal Outer Rim)
// Tạo đường viền cuộn tròn 8 múi theo đúng đường viền miệng kèn
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
const rimTubeGeom = new THREE.TubeGeometry(rimCurve, 64, 0.055, 12, true);
const rimTubeMesh = new THREE.Mesh(rimTubeGeom);
rimTubeMesh.position.copy(hornBellMesh.position);
rimTubeMesh.rotation.copy(hornBellMesh.rotation);
hornGroup.add(rimTubeMesh);

gramophoneGroup.add(hornGroup);

// Căn chỉnh tâm tổng thể để trọng tâm mô hình nằm ngay chính giữa gốc tọa độ
gramophoneGroup.position.set(0, 0, 0);
gramophoneGroup.updateMatrixWorld(true);

console.log('✓ Dựng toàn bộ hình học 3D hoàn tất! Đang tiến hành xuất sang tệp Binary STL...');

// ============================================================================
// 7. XUẤT RA TỆP BINARY STL (EXPORT TO BINARY STL FORMAT)
// ============================================================================
const exporter = new STLExporter();
const stlBinaryData = exporter.parse(gramophoneGroup, { binary: true });

// Đường dẫn lưu file:
// 1. Gốc dự án: D:\Desktop\AuraVinyl\vintage_gramophone.stl
const rootDestPath = path.resolve(__dirname, '../../vintage_gramophone.stl');
// 2. Thư mục public web app: D:\Desktop\AuraVinyl\client\public\models\vintage_gramophone.stl
const publicModelsDir = path.resolve(__dirname, '../public/models');
if (!fs.existsSync(publicModelsDir)) {
  fs.mkdirSync(publicModelsDir, { recursive: true });
}
const webDestPath = path.resolve(publicModelsDir, 'vintage_gramophone.stl');

// Chuyển DataView sang Node.js Buffer
const buffer = Buffer.from(stlBinaryData.buffer, stlBinaryData.byteOffset, stlBinaryData.byteLength);

fs.writeFileSync(rootDestPath, buffer);
console.log(`✓ Đã xuất tệp STL gốc: ${rootDestPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

fs.writeFileSync(webDestPath, buffer);
console.log(`✓ Đã sao chép tệp STL vào thư mục web: ${webDestPath}`);

console.log('=== HOÀN TẤT XUẤT MÔ HÌNH 3D STL THÀNH CÔNG ===');
