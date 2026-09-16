import React, { useState, useEffect } from 'react';
import { Mascot } from 'page-mascot';
import { getMascotDirectionsUri, getMascotReactionsUri, MASCOT_LIST } from '../utils/mascotSprites';
import { soundManager } from '../utils/audio';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FloatingMascotProps {
  currentTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const FloatingMascot: React.FC<FloatingMascotProps> = ({
  currentTab,
  onNavigateTab
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // If mascot is disabled in settings, don't render
  if (settings.mascotFloatingEnabled === false) {
    return null;
  }

  const currentMascotId = settings.mascotType || 'owl';
  const mascotInfo = MASCOT_LIST.find(m => m.id === currentMascotId) || MASCOT_LIST[0];

  // Default minimized on mobile (<640px) to prevent covering any content/tabs
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('study_mascot_minimized');
      if (saved !== null) {
        return saved === 'true';
      }
      return typeof window !== 'undefined' && window.innerWidth < 640;
    } catch {
      return false;
    }
  });

  const [pokeCount, setPokeCount] = useState<number>(0);
  const [speech, setSpeech] = useState<string>(`Chào bạn! Tớ là ${mascotInfo.name} ${mascotInfo.emoji}`);
  const [showSpeech, setShowSpeech] = useState<boolean>(false);

  // Update speech greeting when mascot changes
  useEffect(() => {
    setSpeech(`Chào bạn! Tớ là ${mascotInfo.name} ${mascotInfo.emoji}. Hôm nay học thật tốt nhé!`);
  }, [currentMascotId]);

  const tipsByMascot: Record<string, string[]> = {
    cat: [
      'Meow! Ôn bài mỗi ngày để tích lũy kiến thức nha! 🐾',
      'Tớ ngồi đây canh giờ học tập cho bạn nhé! 🐱',
      'Rê chuột quanh đây mắt tớ sẽ nhìn theo bạn đó! 👀',
      'Làm đúng nhiều câu liên tiếp để tăng streak nào! 🔥',
      'Bạn vất vả rồi, nghỉ ngơi 2 phút uống nước nha! 🥛',
    ],
    fox: [
      'Phân tích kỹ đề bài trước khi chọn đáp án nhé! 🦊',
      'Nhớ mở "Sổ lỗi sai" để xem lại các câu làm nhầm! 💡',
      'Càng luyện tập nhiều, phản xạ càng nhanh nhạy! 🎯',
      'Có tính năng in PDF bài giảng theo nền giao diện đó nha! 📄',
      'Tư duy logic là chìa khóa của mọi bài toán! 🧠',
    ],
    bear: [
      'Điềm tĩnh, kiên trì, từng câu một bạn nhé! 🐻',
      'Không sao cả, sai thì mình làm lại để nhớ lâu hơn! 🍯',
      'Tớ luôn ở đây đồng hành cùng bạn học tập! 💚',
      'Mỗi ngày tiến bộ 1% là sau 1 năm bạn đã rất giỏi! 🌟',
    ],
    bunny: [
      'Nhanh nhẹn và chính xác, bạn làm tuyệt lắm! 🐰',
      'Giải quyết nhanh gọn bài tập hôm nay nào! 🥕',
      'Cố lên, chỉ còn vài câu nữa là hoàn thành rồi! 🎈',
      'Tốc độ và sự tập trung cao độ nhé! ⚡',
    ],
    robot: [
      'Thuật toán ghi nhớ ngắt quãng (Spaced Repetition) kích hoạt! 🤖',
      'Hệ thống ghi nhận bạn đang học rất chăm chỉ! 🚀',
      'Tối ưu hóa não bộ, tiếp thu 100% kiến thức! ⚡',
      'Đừng quên luyện nghe và phát âm từ vựng nha! 🎧',
    ],
    shiba: [
      'Gâu gâu! Năng lượng tích cực ngập tràn nào! 🐕',
      'Học tập vui vẻ, không căng thẳng nhé bạn ơi! 🎾',
      'Cố lên bạn của tớ, bạn làm được mà! 💖',
      'Tuyệt vời ông mặt trời luôn! ☀️',
    ],
    penguin: [
      'Kỷ luật hàng ngày tạo nên thành công vượt bậc! 🐧',
      'Học xong nhớ tự kiểm tra lại một lượt nhé! ❄️',
      'Tập trung cao độ, tương lai rạng ngời! 📚',
      'Xuất sắc! Tiếp tục giữ vững phong độ nào! 🏆',
    ],
    owl: [
      'Rê chuột quanh tớ mắt tớ sẽ nhìn theo bạn đó! 👀',
      'Mỗi ngày ôn tập 15 phút giúp nhớ lâu hơn nhiều! 📖',
      'Bài nào khó, nhớ mở "Sổ tay lỗi sai" để rèn luyện! 💡',
      'Có chức năng in PDF bài giảng ăn theo nền giao diện rồi đó! 📄',
      'Làm bài tốt nhé! Tớ luôn đồng hành cùng bạn! 💚',
      'Úi chao, bạn bấm nhiều quá tớ chóng mặt rùi nè! 🌀',
    ]
  };

  const currentTips = tipsByMascot[currentMascotId] || tipsByMascot.owl;

  const handleMascotBoop = () => {
    soundManager.playMascotPoke();
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    const msg = currentTips[nextCount % currentTips.length];
    setSpeech(msg);
    setShowSpeech(true);
    setTimeout(() => {
      setShowSpeech(false);
    }, 3800);
  };

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMinimized;
    setIsMinimized(next);
    try {
      localStorage.setItem('study_mascot_minimized', String(next));
    } catch {}
  };

  const directionsUri = getMascotDirectionsUri(currentMascotId);
  const reactionsUri = getMascotReactionsUri(currentMascotId);

  return (
    <>
      {/* 
        Container positioning:
        - Mobile: bottom-[74px] right-2.5 (safely ABOVE the mobile bottom navigation bar h-15 so it NEVER covers the 'Tiến độ' tab!)
        - Desktop: sm:bottom-5 sm:right-5
      */}
      <div 
        className="fixed bottom-[74px] right-2.5 sm:bottom-5 sm:right-5 z-30 flex flex-col items-end pointer-events-none select-none transition-all duration-300"
        style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))' }}
      >
        {/* Speech Balloon */}
        {showSpeech && !isMinimized && (
          <div className="mb-2 max-w-[200px] sm:max-w-[230px] p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs shadow-xl border border-emerald-500/30 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px] font-medium">{speech}</p>
            </div>
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-emerald-500/30 rotate-45"></div>
          </div>
        )}

        {/* Mascot Card / Bubble */}
        <div className="pointer-events-auto flex items-center gap-1">
          {isMinimized ? (
            /* Compact Floating Button (Mobile & Desktop) - Clean, small, never covers tabs */
            <button
              type="button"
              onClick={handleToggleMinimize}
              className={`p-1.5 sm:p-2 rounded-full ${theme.card} border ${theme.border} text-emerald-500 hover:scale-105 active:scale-95 shadow-xl flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all group`}
              title={`Mở bạn ${mascotInfo.name} đồng hành`}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-sm sm:text-base group-hover:rotate-12 transition-transform">
                <span>{mascotInfo.emoji}</span>
              </div>
              <span className="hidden sm:inline text-[11px] font-bold pr-1">{mascotInfo.name}</span>
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-500" />
            </button>
          ) : (
            /* Expanded Mascot Widget - Compact & Snug */
            <div className={`relative p-2 pt-2.5 pb-2 rounded-2xl ${theme.card} border ${theme.border} shadow-2xl flex flex-col items-center select-none backdrop-blur-md transition-all group`}>
              
              {/* Quick Minimize Button at top-right corner */}
              <button
                type="button"
                onClick={handleToggleMinimize}
                className="absolute top-1.5 right-1.5 p-1 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-500/20 active:scale-95 cursor-pointer transition-colors z-10"
                title="Thu nhỏ để gọn màn hình"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* page-mascot core component - only triggers poke voice/reaction */}
              <div 
                onMouseDown={handleMascotBoop}
                className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title={`${mascotInfo.name}: Rê chuột để nhìn theo, bấm để chọc!`}
              >
                <Mascot
                  directions={directionsUri}
                  reactions={reactionsUri}
                  size={64}
                  label={mascotInfo.name}
                />
              </div>

              {/* Mascot Name Pill Badge */}
              <div className="mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold tracking-tight whitespace-nowrap">
                {mascotInfo.name}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
