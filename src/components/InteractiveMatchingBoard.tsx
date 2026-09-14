import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { MatchingPair } from '../types';
import { useTheme } from '../context/ThemeContext';
import { soundManager, triggerHaptic } from '../utils/audio';

interface InteractiveMatchingBoardProps {
  pairs: MatchingPair[];
  disabled?: boolean;
  onPairsMatched: (matchedMap: { [left: string]: string }, mistakesCount: number) => void;
  explanation?: string;
}

export const InteractiveMatchingBoard: React.FC<InteractiveMatchingBoardProps> = ({
  pairs,
  disabled = false,
  onPairsMatched,
  explanation,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{ [left: string]: string }>({});
  const [shuffledRight, setShuffledRight] = useState<{ id: string; text: string }[]>([]);
  const [wrongAttempt, setWrongAttempt] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState<{ left: string; wrongRight: string; correctRight: string }[]>([]);

  // Initialize and shuffle right column
  useEffect(() => {
    setMatchedPairs({});
    setSelectedLeft(null);
    setWrongAttempt(null);
    setMistakes([]);

    if (pairs && pairs.length > 0) {
      const rights = pairs.map((p, idx) => ({ id: p.id || `p_${idx}`, text: p.right }));
      // Shuffle with Durstenfeld algorithm so it's not identical to left order
      const shuffled = [...rights];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setShuffledRight(shuffled);
    } else {
      setShuffledRight([]);
    }
  }, [pairs]);

  // Handle right item click
  const handleSelectRight = (rightText: string) => {
    if (disabled || !selectedLeft) return;

    // Check if this left-right pair matches
    const targetPair = pairs.find(p => p.left === selectedLeft);
    const isCorrectMatch = targetPair && targetPair.right.trim().toLowerCase() === rightText.trim().toLowerCase();

    if (isCorrectMatch) {
      // Correct!
      soundManager.playCorrect();
      triggerHaptic('light');

      const nextMatched = { ...matchedPairs, [selectedLeft]: rightText };
      setMatchedPairs(nextMatched);
      setSelectedLeft(null);
      setWrongAttempt(null);

      onPairsMatched(nextMatched, mistakes.length);
    } else {
      // Incorrect!
      soundManager.playIncorrect();
      triggerHaptic('heavy');

      const currentLeft = selectedLeft;
      const targetCorrect = targetPair ? targetPair.right : '';

      setWrongAttempt({ left: currentLeft, right: rightText });
      const newMistakes = [...mistakes, { left: currentLeft, wrongRight: rightText, correctRight: targetCorrect }];
      setMistakes(newMistakes);

      // Flash red for 800ms then reset selection so user can try again
      setTimeout(() => {
        setWrongAttempt(null);
        setSelectedLeft(null);
      }, 800);

      onPairsMatched(matchedPairs, newMistakes.length);
    }
  };

  // Reset current matching
  const handleReset = () => {
    setMatchedPairs({});
    setSelectedLeft(null);
    setWrongAttempt(null);
    setMistakes([]);
    onPairsMatched({}, 0);
  };

  const totalPairs = pairs.length;
  const matchedCount = Object.keys(matchedPairs).length;
  const isAllDone = totalPairs > 0 && matchedCount === totalPairs;

  return (
    <div className="space-y-4">
      {/* Status & Progress */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-500">
            Tiến độ ghép nối: <strong>{matchedCount}/{totalPairs} cặp</strong>
          </span>
          {mistakes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-medium text-[11px]">
              {mistakes.length} lần ghép sai
            </span>
          )}
        </div>

        {!disabled && matchedCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className={`text-[11px] flex items-center gap-1 ${theme.textMuted} hover:text-emerald-400 cursor-pointer`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Nối lại từ đầu</span>
          </button>
        )}
      </div>

      {/* Matching Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left Column (Từ vựng / Cụm từ A) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-inherit">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
              Cột A (Từ / Cụm từ)
            </span>
            <span className={`text-[10px] ${theme.textMuted}`}>Chọn 1 mục</span>
          </div>

          <div className="space-y-2">
            {pairs.map((pair, idx) => {
              const isMatched = !!matchedPairs[pair.left];
              const isSelected = selectedLeft === pair.left;
              const isWrong = wrongAttempt?.left === pair.left;

              let styleClasses = `${theme.card} ${theme.border} hover:border-emerald-500/80 text-neutral-850 dark:text-neutral-100 shadow-xs`;
              if (isMatched) {
                styleClasses = 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs';
              } else if (isWrong) {
                styleClasses = 'border-rose-500/60 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 animate-shake';
              } else if (isSelected) {
                styleClasses = 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-2 ring-sky-500/30 shadow-sm';
              }

              return (
                <button
                  key={pair.id || idx}
                  type="button"
                  disabled={disabled || isMatched || !!wrongAttempt}
                  onClick={() => setSelectedLeft(pair.left)}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${styleClasses}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-[11px] font-mono font-medium">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[13.5px] text-neutral-850 dark:text-neutral-100 leading-snug">{pair.left}</span>
                  </div>
                  {isMatched && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (Nghĩa / Ghép nối B) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-inherit">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
              Cột B (Nghĩa / Đáp án)
            </span>
            <span className={`text-[10px] ${theme.textMuted}`}>
              {selectedLeft ? '👉 Bấm để ghép' : 'Chưa chọn Cột A'}
            </span>
          </div>

          <div className="space-y-2">
            {shuffledRight.map((item, idx) => {
              const matchedKey = Object.keys(matchedPairs).find(k => matchedPairs[k] === item.text);
              const isMatched = !!matchedKey;
              const isWrong = wrongAttempt?.right === item.text;

              let styleClasses = `${theme.card} ${theme.border} text-neutral-850 dark:text-neutral-100 shadow-xs`;
              if (isMatched) {
                styleClasses = 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs';
              } else if (isWrong) {
                styleClasses = 'border-rose-500/60 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 animate-shake';
              } else if (selectedLeft) {
                styleClasses = `${theme.card} ${theme.border} text-neutral-850 dark:text-neutral-100 hover:border-sky-500 hover:bg-sky-50/70 dark:hover:bg-sky-950/30 cursor-pointer`;
              } else {
                styleClasses = `${theme.card} ${theme.border} text-neutral-700 dark:text-neutral-300 opacity-90 cursor-not-allowed`;
              }

              return (
                <button
                  key={item.id || idx}
                  type="button"
                  disabled={disabled || isMatched || !selectedLeft || !!wrongAttempt}
                  onClick={() => handleSelectRight(item.text)}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${styleClasses}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-[11px] font-mono font-medium">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-medium text-[13.5px] text-neutral-850 dark:text-neutral-100 leading-snug">{item.text}</span>
                  </div>
                  {isMatched && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Wrong Match Alert Banner */}
      {wrongAttempt && (
        <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150 font-bold">
          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>
            Chưa chính xác: "<strong>{wrongAttempt.left}</strong>" không ghép với "<strong>{wrongAttempt.right}</strong>". Hãy thử lại!
          </span>
        </div>
      )}

      {/* Completed Summary / Explanations */}
      {isAllDone && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-100 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã ghép chính xác toàn bộ các cặp từ!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
            {pairs.map((p, i) => (
              <div key={i} className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 flex items-center justify-between font-semibold">
                <span>{p.left}</span>
                <span className="text-emerald-600 dark:text-emerald-400">➔</span>
                <span>{p.right}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Explanation if available */}
      {explanation && (
        <div className={`p-3 rounded-xl ${theme.badgeBg} border ${theme.border} text-xs space-y-1`}>
          <span className={`text-[10px] font-bold uppercase ${theme.textMuted} block`}>
            💡 Giải thích chi tiết:
          </span>
          <p className="text-[12px] leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
};
