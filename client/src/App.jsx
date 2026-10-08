import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import StudioPage from './pages/StudioPage';
import IntroLandingPage from './pages/IntroLandingPage';

/**
 * Ứng Dụng Chính AuraLofi & Audio Mashup Studio
 * Điều phối tuyến đường độc lập (Intro Landing Page vs App Player vs Studio Workspace)
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Tuyến đường Trực Tiếp: Trình Phát Đĩa Than & Focus Space Toàn Màn Hình */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<LandingPage />} />

          {/* Tuyến đường Phụ: Kể Chuyện & Thông Tin Thiết Kế */}
          <Route path="/story" element={<IntroLandingPage />} />

          {/* Tuyến đường Phòng Thu Âm Nhạc (Studio Workspace) */}
          <Route path="/studio" element={<StudioPage />} />

          {/* Mặc định chuyển hướng các đường dẫn không hợp lệ về Trang Chủ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
