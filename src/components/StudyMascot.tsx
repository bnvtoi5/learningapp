import React, { useState } from 'react';
import { Mascot } from 'page-mascot';
import { getMascotDirectionsUri, getMascotReactionsUri, MASCOT_LIST } from '../utils/mascotSprites';
import { soundManager } from '../utils/audio';
import { MascotType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StudyMascotProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  interactivePoke?: boolean;
  mascot?: MascotType;
}

export const StudyMascot: React.FC<StudyMascotProps> = ({
  size = 64,
  className = '',
  showTooltip = false,
  tooltipText,
  interactivePoke = true,
  mascot: propMascot
}) => {
  const { settings } = useTheme();
  const currentMascot = propMascot || settings.mascotType || 'owl';
  const mascotInfo = MASCOT_LIST.find(m => m.id === currentMascot) || MASCOT_LIST[0];

  const [pokeCount, setPokeCount] = useState<number>(0);
  const [activeMessage, setActiveMessage] = useState<string>(
    tooltipText || `Chào bạn! Tớ là ${mascotInfo.name} ${mascotInfo.emoji}`
  );
  const [showMessage, setShowMessage] = useState<boolean>(false);

  const getMascotMessages = (mId: MascotType) => {
    switch (mId) {
      case 'cat':
        return [
          'Meow! Chăm chỉ học bài nha! 🐾',
          'Tớ vừa ghi chú xong cho bạn nè! 🐱',
          'Boop mũi tớ cái lấy may mắn nào! ✨',
          'Cố lên bạn ơi, điểm 10 thẳng tiến! 🌟',
        ];
      case 'fox':
        return [
          'Phân tích kỹ đề bài nhé bạn tôi! 🦊',
          'Có lỗi sai là cơ hội để giỏi hơn! 💡',
          'Tinh anh, nhạy bén và tự tin nha! 👓',
          'Chuẩn không cần chỉnh! Làm tiếp thôi! 🎯',
        ];
      case 'bear':
        return [
          'Kiên trì từng bước một nhé bạn! 🐻',
          'Uống chút nước rồi học tiếp nha! 🍯',
          'Bạn đang tiến bộ từng ngày đó! 🌟',
          'Tớ luôn bên cạnh bạn mà! 💚',
        ];
      case 'bunny':
        return [
          'Nhanh như chớp, chính xác 100%! 🐰',
          'Phản xạ tuyệt vời quá bạn ơi! ⚡',
          'Chạy đà thần tốc về đích nào! 🥕',
          'Yay! Làm bài xong sớm nghỉ ngơi nha! 🎈',
        ];
      case 'robot':
        return [
          'Beep boop! Hệ thống đã nạp tri thức! 🤖',
          'Độ chính xác tăng trưởng 99.9%! 🚀',
          'Khởi động thuật toán giải nhanh! ⚡',
          'Tối ưu hóa khả năng ghi nhớ dài hạn! 🧠',
        ];
      case 'shiba':
        return [
          'Gâu gâu! Năng lượng tràn đầy nha! 🐕',
          'Đỉnh của chóp! Tiếp tục phát huy nào! 🌟',
          'Học là niềm vui, đừng lo lắng nhé! 🎾',
          'Tớ tự hào về bạn lắm đó! 💖',
        ];
      case 'penguin':
        return [
          'Kỷ luật tạo nên sự xuất chúng! 🐧',
          'Mỗi ngày một chút là thành tài! ❄️',
          'Tập trung cao độ nào bạn ơi! 📚',
          'Tuyệt đối xuất sắc! Cố lên nha! 🏆',
        ];
      case 'owl':
      default:
        return [
          'Học tập chăm chỉ nhé! ✨',
          'Boop! Cố lên bạn ơi! 🦉',
          'Nhớ ôn lại bài trong Sổ Tay nha! 📖',
          'Tuyệt vời quá! Chúc bạn điểm cao! 🌟',
          'Cú Học Giả đồng hành cùng bạn! 💚',
          'Nhấn tiếp tớ chóng mặt đó nha! 🌀',
        ];
    }
  };

  const handlePoke = () => {
    if (interactivePoke) {
      soundManager.playMascotPoke();
    }
    const msgs = getMascotMessages(currentMascot);
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    setActiveMessage(msgs[nextCount % msgs.length]);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 2800);
  };

  const directionsUri = getMascotDirectionsUri(currentMascot);
  const reactionsUri = getMascotReactionsUri(currentMascot);

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      onMouseDown={handlePoke}
    >
      {/* Interactive Mascot powered by page-mascot */}
      <div 
        className="transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        title={`${mascotInfo.name} - Rê chuột để nhìn theo, nhấn để chọc!`}
      >
        <Mascot
          directions={directionsUri}
          reactions={reactionsUri}
          size={size}
          label={`Linh vật ${mascotInfo.name}`}
        />
      </div>

      {/* Floating speech bubble when poked */}
      {(showTooltip || showMessage) && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-medium whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none animate-in fade-in zoom-in duration-200 z-50 flex items-center gap-1">
          <span>{activeMessage}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/90 border-r border-b border-slate-700 rotate-45"></div>
        </div>
      )}
    </div>
  );
};
