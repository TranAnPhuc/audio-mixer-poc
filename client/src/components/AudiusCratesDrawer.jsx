import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Disc3,
  Play,
  Flame,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { fetchTrendingTracks, searchAudiusTracks } from '../services/audiusService';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

const GENRE_TABS = [
  { id: 'Trending', label: 'Thịnh Hành', icon: Flame },
  { id: 'Electronic', label: 'Electronic' },
  { id: 'Lo-Fi', label: 'Lo-Fi' },
  { id: 'Hip-Hop/Rap', label: 'Hip-Hop' },
  { id: 'Rock', label: 'Rock' },
  { id: 'Ambient', label: 'Ambient' },
  { id: 'Jazz', label: 'Jazz' }
];

/**
 * Khay Đĩa Than Trực Tuyến Audius (Audius Crates Drawer)
 * Cho phép tìm kiếm và duyệt các bản thu thịnh hành trên mạng lưới Audius
 */
export default function AudiusCratesDrawer({
  isOpen,
  onClose,
  onSelectTrack,
  currentTrackId
}) {
  const [activeGenre, setActiveGenre] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Nạp danh sách bài hát theo thể loại hoặc tìm kiếm
  const loadTracks = async (genre, query = '') => {
    setIsLoading(true);
    setError(null);

    try {
      let data = [];
      if (query.trim()) {
        data = await searchAudiusTracks(query, { limit: 20 });
      } else {
        data = await fetchTrendingTracks({
          genre: genre === 'Trending' ? '' : genre,
          limit: 20
        });
      }
      setTracks(data);
    } catch (err) {
      console.warn('[AudiusCratesDrawer] Lỗi nạp tracks:', err);
      setError(err.message || 'Không thể kết nối đến máy chủ Audius');
    } finally {
      setIsLoading(false);
    }
  };

  // Khởi tạo nạp bài khi mở drawer hoặc đổi tab thể loại
  useEffect(() => {
    if (isOpen) {
      if (!searchQuery.trim()) {
        loadTracks(activeGenre);
      }
    }
  }, [isOpen, activeGenre]);

  // Xử lý tìm kiếm với debounce 450ms
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      loadTracks(activeGenre);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadTracks(activeGenre, val);
    }, 450);
  };

  // Đóng drawer khi nhấn ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
      {/* 1. Backdrop nền mờ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* 2. Khay trượt bên phải (Slide-Over Drawer) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md sm:max-w-lg bg-[#0e1017]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col justify-between">
          
          {/* Header Khay Đĩa */}
          <div className="p-6 border-b border-white/[0.08] space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Disc3 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Khay Đĩa Audius</span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      OPEN STREAM
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Mạng lưới âm nhạc trực tuyến phi tập trung
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playHapticClick();
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng khay đĩa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh Tìm Kiếm Trực Tuyến */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Tìm bài hát, ca sĩ trên Audius..."
                className="w-full h-10 pl-10 pr-4 bg-white/[0.04] border border-white/10 focus:border-amber-400/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-400/30 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadTracks(activeGenre);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Các Tabs Thể Loại Âm Nhạc (Genre Pills) */}
            {!searchQuery && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {GENRE_TABS.map((tab) => {
                  const isActive = activeGenre === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        setActiveGenre(tab.id);
                      }}
                      onMouseEnter={playHoverBlip}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap text-xs ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nội Dung: Lưới Danh Sách Đĩa Nhạc */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {isLoading ? (
              // Trạng thái Skeleton Loading
              <div className="grid grid-cols-2 gap-3.5 animate-pulse">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                    <div className="w-full aspect-square rounded-xl bg-white/[0.05]" />
                    <div className="h-3.5 bg-white/[0.05] rounded-md w-3/4" />
                    <div className="h-2.5 bg-white/[0.03] rounded-md w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              // Trạng thái Lỗi kết nối
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Radio className="w-8 h-8 text-rose-400" />
                <p className="text-xs text-slate-400 max-w-xs">{error}</p>
                <button
                  type="button"
                  onClick={() => loadTracks(activeGenre, searchQuery)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white border border-white/10 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            ) : tracks.length === 0 ? (
              // Trạng thái Trống
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Disc3 className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-400">Không tìm thấy bản thu phù hợp.</p>
              </div>
            ) : (
              // Lưới Danh Sách Bài Hát
              <div className="grid grid-cols-2 gap-3.5">
                {tracks.map((track) => {
                  const isCurrent = currentTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playHapticClick();
                        onSelectTrack(track);
                      }}
                      onMouseEnter={playHoverBlip}
                      className={`group relative p-3 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden border ${
                        isCurrent
                          ? 'bg-amber-500/[0.08] border-amber-400/80 shadow-xl shadow-amber-500/10'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-amber-400/40 hover:-translate-y-1'
                      }`}
                    >
                      {/* Bìa Đĩa Vuông (Aspect 1:1) với đĩa than nhô ra phía sau khi hover */}
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 shadow-md">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                            <Disc3 className="w-8 h-8 text-slate-600" />
                          </div>
                        )}

                        {/* Nút Play Overlay khi hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/30 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Badge Thời Lượng */}
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-slate-300 border border-white/10">
                          {formatDuration(track.duration)}
                        </span>

                        {/* Badge Đang Phát */}
                        {isCurrent && (
                          <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                            PLAYING
                          </span>
                        )}
                      </div>

                      {/* Tiêu Đề & Ca Sĩ */}
                      <div className="mt-2.5 space-y-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {track.artist}
                        </p>
                      </div>

                      {/* Footer Badge Thể Loại */}
                      <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="truncate uppercase">{track.genre || 'Single'}</span>
                        <Disc3 className="w-3 h-3 text-amber-400/60 shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Khay Đĩa */}
          <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0 bg-black/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>POWERED BY AUDIUS PROTOCOL</span>
            </div>
            <a
              href="https://audius.co"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <span>AUDIUS.CO</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </aside>
      </div>
    </div>
  );
}
