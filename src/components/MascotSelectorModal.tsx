import React from 'react';
import { X, Check, Sparkles, Wand2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { MascotType } from '../types';
import { MASCOT_LIST, MascotInfo } from '../utils/mascotSprites';
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
  const currentMascotId = settings.mascotType || 'owl';

  if (!isOpen) return null;

  const handleSelect = (mascot: MascotType) => {
    soundManager.playMascotPoke();
    updateSettings({ mascotType: mascot });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-xl ${theme.card} rounded-3xl shadow-2xl border ${theme.border} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-1.5">
                Chọn Linh Vật Đồng Hành
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/20">
                  8 Bạn Nhỏ
                </span>
              </h3>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Linh vật sẽ dõi theo chuột và động viên bạn trong suốt quá trình học
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

        {/* Mascot Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MASCOT_LIST.map((m: MascotInfo) => {
              const isSelected = m.id === currentMascotId;
              return (
                <div
                  key={m.id}
                  id={`mascot-card-${m.id}`}
                  onClick={() => handleSelect(m.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 relative group select-none ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/50'
                      : `${theme.highlight} hover:border-neutral-500/40 hover:scale-[1.01]`
                  }`}
                >
                  {/* Mascot Live Animated Avatar */}
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-white/5 dark:bg-black/20 p-1 border border-black/5 dark:border-white/5">
                    <StudyMascot 
                      size={52} 
                      mascot={m.id} 
                      interactivePoke={false}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-sm truncate">{m.name}</span>
                      <span className="text-base shrink-0">{m.emoji}</span>
                    </div>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {m.title}
                    </p>
                    <p className={`text-[10.5px] ${theme.textMuted} truncate mt-0.5`}>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-inherit flex items-center justify-between bg-black/5 dark:bg-white/5">
          <p className={`text-xs ${theme.textMuted}`}>
            Bấm vào bạn nhỏ bất kỳ để chọn ngay
          </p>
          <button
            id="btn-confirm-mascot"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>Xong</span>
          </button>
        </div>

      </div>
    </div>
  );
};
