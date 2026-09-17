import React, { useState, useMemo } from 'react';
import { X, Check, Sparkles, Search, User, Compass, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { MascotType, MascotCategory } from '../types';
import { MASCOT_LIST, MASCOT_CATEGORIES, MascotInfo } from '../utils/mascotSprites';
import { StudyMascot } from './StudyMascot';
import { soundManager } from '../utils/audio';

interface MascotSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MascotSelectorModal: React.FC<MascotSelectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { settings, updateSettings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const currentMascotId = settings.mascotType || 'osananajimi';

  const [selectedCategory, setSelectedCategory] = useState<MascotCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredMascots = useMemo(() => {
    return MASCOT_LIST.filter((m: MascotInfo) => {
      // Category filter
      if (selectedCategory === 'HUMAN' && m.formType !== 'human') return false;
      if (selectedCategory === 'ANIMAL' && m.formType !== 'animal') return false;
      if (selectedCategory !== 'ALL' && selectedCategory !== 'HUMAN' && selectedCategory !== 'ANIMAL') {
        if (m.category !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesTitle = m.title.toLowerCase().includes(query);
        const matchesTagline = m.tagline.toLowerCase().includes(query);
        const matchesArchetype = m.archetype.toLowerCase().includes(query);
        return matchesName || matchesTitle || matchesTagline || matchesArchetype;
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (mascot: MascotType) => {
    soundManager.playMascotPoke();
    updateSettings({ mascotType: mascot });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-3xl ${theme.card} rounded-3xl shadow-2xl border ${theme.border} max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-inherit flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                Chọn Nhân Vật & Linh Vật
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                  {MASCOT_LIST.length} Mẫu Đa Dạng
                </span>
              </h3>
              <p className={`text-xs ${theme.textMuted} mt-0.5 hidden sm:block`}>
                Nhân vật Anime dạng người & Linh vật độc bản theo phong cách page-mascot
              </p>
            </div>
          </div>

          <button
            id="btn-close-mascot-modal"
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl ${theme.highlight} hover:opacity-80 transition-opacity cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 sm:p-4 border-b border-inherit space-y-3 bg-black/5 dark:bg-white/5 shrink-0">
          {/* Search Box */}
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, archetype (Tsundere, Chủ tịch, Yandere, Pháp sư, Cú...)"
              className={`w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border ${theme.border} bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {MASCOT_CATEGORIES.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`btn-cat-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCatActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : `${theme.highlight} hover:bg-neutral-500/15 ${theme.textMuted}`
                  }`}
                  title={cat.desc}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mascot Grid */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredMascots.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-3xl">🔍</p>
              <p className="font-semibold text-sm">Không tìm thấy nhân vật phù hợp</p>
              <p className={`text-xs ${theme.textMuted}`}>Thử gõ từ khóa khác hoặc chọn mục "Tất cả"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMascots.map((m: MascotInfo) => {
                const isSelected = m.id === currentMascotId;
                return (
                  <div
                    key={m.id}
                    id={`mascot-card-${m.id}`}
                    onClick={() => handleSelect(m.id)}
                    className={`p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 relative group select-none ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/50'
                        : `${theme.highlight} hover:border-neutral-500/40 hover:scale-[1.01]`
                    }`}
                  >
                    {/* Mascot Live Animated Avatar */}
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-white/10 dark:bg-black/30 p-1 border border-black/5 dark:border-white/5 shadow-inner">
                      <StudyMascot 
                        size={50} 
                        mascot={m.id} 
                        interactivePoke={false}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-sm truncate">{m.name}</span>
                        <span className="text-base shrink-0">{m.emoji}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-medium ${m.bgBadge}`}>
                          {m.archetype}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {m.title}
                      </p>
                      <p className={`text-[10.5px] ${theme.textMuted} line-clamp-2 mt-0.5 leading-snug`}>
                        {m.tagline}
                      </p>
                    </div>

                    {/* Selection Checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-inherit flex items-center justify-between bg-black/5 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className={theme.textMuted}>
              Đang chọn: <strong className="text-emerald-600 dark:text-emerald-400">{MASCOT_LIST.find(m => m.id === currentMascotId)?.name || 'Linh vật'}</strong>
            </span>
          </div>
          <button
            id="btn-confirm-mascot"
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>Hoàn tất</span>
          </button>
        </div>

      </div>
    </div>
  );
};
