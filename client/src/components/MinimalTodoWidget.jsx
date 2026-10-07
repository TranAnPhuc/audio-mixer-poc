import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  X,
  Minimize2,
  Maximize2,
  ListTodo
} from 'lucide-react';
import { playHapticClick, playHoverBlip } from '../utils/soundEffects';

const STORAGE_KEY = 'auralofi_todos';

/**
 * Sổ Tay Việc Cần Làm Tối Giản (Minimalist Focus To-Do List)
 * Giúp người dùng ghi lại 3-5 mục tiêu quan trọng trong phiên học tập và làm việc.
 */
export default function MinimalTodoWidget({ isOpen = false, onClose }) {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', text: 'Hoàn thành bài tập / công việc chính', done: false },
      { id: '2', text: 'Uống 1 cốc nước ấm và vươn vai', done: true }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  // Tự động lưu vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {}
  }, [todos]);

  if (!isOpen) return null;

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    playHapticClick();
    const newTodo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      done: false
    };
    setTodos([newTodo, ...todos]);
    setInputText('');
  };

  const handleToggleTodo = (id) => {
    playHapticClick();
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleDeleteTodo = (id) => {
    playHapticClick();
    setTodos(todos.filter((t) => t.id !== id));
  };

  const completedCount = todos.filter((t) => t.done).length;

  if (isMinimized) {
    return (
      <div className="fixed top-20 left-6 z-40 bg-[#11131c]/90 border border-white/20 backdrop-blur-xl px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-white select-none animate-fade-in">
        <span className="text-sm">📝</span>
        <span className="text-xs font-semibold text-slate-300">
          Mục tiêu: {completedCount}/{todos.length}
        </span>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Mở rộng"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 left-6 z-40 w-72 sm:w-80 bg-[#11131c]/95 border border-white/15 backdrop-blur-2xl p-5 rounded-3xl shadow-2xl text-slate-100 select-none animate-fade-in flex flex-col max-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wider uppercase">
              Mục Tiêu Phiên Học
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Hoàn thành {completedCount}/{todos.length} mục
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Thu nhỏ"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form nhập Task mới */}
      <form onSubmit={handleAddTodo} className="mt-3.5 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Thêm việc cần làm..."
          className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 transition-all cursor-pointer shrink-0"
          title="Thêm mục tiêu"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Danh sách Task */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[120px]">
        {todos.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            Chưa có mục tiêu nào. Nhập và bấm Enter để thêm!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`group flex items-center justify-between p-2 rounded-xl transition-all border ${
                todo.done
                  ? 'bg-white/[0.02] border-transparent opacity-60'
                  : 'bg-white/[0.04] border-white/[0.06] hover:border-white/15'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleTodo(todo.id)}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
              >
                {todo.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 group-hover:text-amber-300 shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    todo.done ? 'line-through text-slate-400' : 'text-slate-200'
                  }`}
                >
                  {todo.text}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTodo(todo.id)}
                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 ml-1 opacity-0 group-hover:opacity-100"
                title="Xóa mục này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
