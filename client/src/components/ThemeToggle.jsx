import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Component nút bấm chuyển đổi Theme Sáng / Tối (ThemeToggle)
 * Hiệu ứng chuyển động xoay và đổi màu mượt mà
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl transition-all duration-300 cursor-pointer border ${
        isDark
          ? 'bg-slate-900/80 hover:bg-slate-800 text-amber-400 border-slate-800 hover:border-slate-700 shadow-inner'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 shadow-sm'
      } ${className}`}
      title={isDark ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 rotate-0 transition-transform duration-300" />
        ) : (
          <Moon className="w-4 h-4 -rotate-12 transition-transform duration-300" />
        )}
      </div>
    </button>
  );
}
