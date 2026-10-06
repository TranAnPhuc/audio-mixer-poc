import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import StudioPage from './pages/StudioPage';

/**
 * Ứng Dụng Chính Audio Mashup Studio
 * Điều phối tuyến đường độc lập (Landing Page vs Studio Page) và hệ thống ThemeProvider
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Tuyến đường Trang Chủ Giới Thiệu (Landing Page) */}
          <Route path="/" element={<LandingPage />} />

          {/* Tuyến đường Phòng Thu Âm Nhạc (Studio Workspace) */}
          <Route path="/studio" element={<StudioPage />} />

          {/* Mặc định chuyển hướng các đường dẫn không hợp lệ về Trang Chủ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
