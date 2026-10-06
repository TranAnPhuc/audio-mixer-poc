# Technical Architecture & System Design

## AuraVinyl System Architecture

---

### 1. Kiến Trúc Tổng Thể

```text
+-----------------------------------------------------------------------------------+
|                           CLIENT APPLICATION (React + Vite)                       |
|                                                                                   |
|  [Layer 1: Input & Metadata Ingestion]                                            |
|   - File Dropzone -> jsmediatags -> Extract Title, Artist, Cover Blob             |
|                                                                                   |
|  [Layer 2: 3D Turntable Experience (Three.js WebGL)]                              |
|   - Turntable Mesh (Platter, Vinyl Disc with Grooves, Tonearm kinematics)          |
|   - Dynamic Ambient Aurora Shader (Driven by Album Dominant Colors)               |
|                                                                                   |
|  [Layer 3: Audio DSP Engine (Web Audio API)]                                      |
|   - AudioContext -> Needle Drop Crackle Synthesizer -> AnalyserNode (Bass FFT)     |
|                                                                                   |
|  [Layer 4: Synced Kinetic Typography (GSAP + Lrclib API)]                         |
|   - Fetch Synced LRC Lyrics -> Match with AudioContext.currentTime                |
|   - Smooth Scroll & Active Line Highlight                                         |
+-----------------------------------------------------------------------------------+
```

---

### 2. Cấu Trúc Mã Nguồn Mục Tiêu (Frontend Centric)

```text
client/
├── src/
│   ├── components/
│   │   ├── Turntable3D.jsx       # Canvas Three.js chứa mâm đĩa, đĩa than và cần kim
│   │   ├── VinylDropzone.jsx     # Ô kéo thả bài hát tinh giản
│   │   ├── KineticLyrics.jsx     # Cột hiển thị lời bài hát đồng bộ thời gian
│   │   └── PlayerControls.jsx    # Nút Play/Pause, thanh trượt thời gian, âm lượng
│   ├── services/
│   │   ├── metadataService.js    # Trích xuất ID3 tag & màu sắc bìa đĩa
│   │   └── lyricsService.js      # Fetch lời bài hát từ Lrclib API
│   ├── utils/
│   │   └── vinylCrackle.js       # Tổng hợp âm thanh kim đĩa than bằng Web Audio API
│   ├── pages/
│   │   └── VinylApp.jsx          # Trang phát nhạc chính (Dark Minimalist)
│   ├── App.jsx
│   └── index.css
```
