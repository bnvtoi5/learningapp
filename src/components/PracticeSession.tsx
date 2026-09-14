import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  Headphones, 
  Check, 
  BookOpen,
  RefreshCw,
  Eye,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react';
import { Exercise, DifficultyLevel, ErrorLog, User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { soundManager, triggerHaptic, speakText } from '../utils/audio';
import { ListeningAudioPlayer } from './ListeningAudioPlayer';
import { InteractiveMatchingBoard } from './InteractiveMatchingBoard';

interface PracticeSessionProps {
  exercises: Exercise[];
  errors?: ErrorLog[];
  onComplete: (results: { exerciseId: string; isCorrect: boolean }[]) => void;
  onExit: () => void;
  onErrorOccurred: (exercise: Exercise, userAnswer: string, correctAnswer: string) => void;
  onSuccessExercise: (exercise: Exercise) => void;
  title?: string;
  canViewExplanations?: boolean;
  currentUser?: User | null;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  exercises,
  errors = [],
  onComplete,
  onExit,
  onErrorOccurred,
  onSuccessExercise,
  title = 'Phiên luyện tập',
  canViewExplanations = true,
  currentUser,
}) => {
  const { settings, getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  // Helper to find matching error for the current user
  const findMatchingActiveError = (exerciseId: string) => {
    return errors.find(e => {
      if (e.exerciseId !== exerciseId) return false;
      if (currentUser?.role === 'student') {
        return e.userId === currentUser.id || (e.studentName && (e.studentName === currentUser.fullName || e.studentName === currentUser.username));
      }
      return true;
    });
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<{ exerciseId: string; isCorrect: boolean }[]>([]);

  // User input states:
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedErrorType, setSelectedErrorType] = useState('');
  
  // Sentence builder
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  
  // Matching
  const [matchedPairs, setMatchedPairs] = useState<{ [left: string]: string }>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchingMistakesCount, setMatchingMistakesCount] = useState(0);

  // Active Recall: Anagram letters
  const [assembledLetters, setAssembledLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<{ id: string; letter: string }[]>([]);

  // Active Recall: Flashcard
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Listening stages: 'before' | 'while' | 'after'
  const [listeningStage, setListeningStage] = useState<'before' | 'while' | 'after'>('before');
  const [predictionNote, setPredictionNote] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  // Voice speech
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');

  // Hint toggle
  const [showHint, setShowHint] = useState(false);

  const currentEx = exercises[currentIndex];

  // Helper to generate missing letter pattern for vocab_cloze
  const generateClozePattern = (word: string, customPattern?: string) => {
    if (customPattern && customPattern.trim()) return customPattern;
    if (!word) return '';
    // Show first and last letter, replace middle with underscores
    const chars = word.split('');
    if (chars.length <= 3) return chars[0] + ' ' + '_ '.repeat(chars.length - 1);
    return chars.map((c, i) => {
      if (i === 0 || i === chars.length - 1 || i === Math.floor(chars.length / 2)) {
        return c;
      }
      return '_';
    }).join(' ');
  };

  // Reset inputs on question change
  useEffect(() => {
    if (!currentEx) return;
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedOptions([]);
    setTextAnswer('');
    setSelectedErrorType('');
    setMatchedPairs({});
    setSelectedLeft(null);
    setMatchingMistakesCount(0);
    setShowHint(false);
    setShowTranscript(false);
    setIsCardFlipped(false);
    setListeningStage(currentEx.type === 'listening' ? 'before' : 'while');
    setPredictionNote('');
    setSpokenTranscript('');
    setIsListeningSpeech(false);

    // Sentence builder words
    if (currentEx.type === 'sentence_builder') {
      const words = currentEx.scrambledWords || currentEx.correctText?.split(' ') || [];
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setAvailableWords(shuffled);
      setAssembledWords([]);
    }

    // Anagram letters
    if (currentEx.type === 'anagram') {
      const target = currentEx.vocabWord || currentEx.correctText || '';
      const letters = target.split('').map((l, i) => ({ id: `${l}_${i}_${Math.random()}`, letter: l }));
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      setAvailableLetters(shuffled);
      setAssembledLetters([]);
    }

    // Auto-speak if enabled
    if (settings.autoSpeak) {
      if (currentEx.type === 'listen_spell' || currentEx.type === 'vocab_cloze') {
        const wordToSpeak = currentEx.vocabWord || currentEx.correctText;
        if (wordToSpeak) speakText(wordToSpeak);
      } else if (currentEx.question) {
        speakText(currentEx.question);
      }
    }
  }, [currentIndex, currentEx, settings.autoSpeak]);

  if (!currentEx) {
    return (
      <div className={`${theme.card} p-8 rounded-2xl text-center max-w-md mx-auto my-12 border ${theme.border}`}>
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <h3 className="text-xl font-bold mb-2">Hoàn thành phiên học!</h3>
        <p className={`text-xs ${theme.textMuted} mb-5`}>
          Bạn đã hoàn thành tất cả {exercises.length} câu hỏi trong phiên này.
        </p>
        <button
          id="btn-finish-practice-exit"
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
        >
          Trở về trang chính
        </button>
      </div>
    );
  }

  // Check the answer
  const handleCheck = (overrideCorrect?: boolean, overrideUserAns?: string) => {
    if (isChecked) return;

    let correct = false;
    let userAnsStr = '';
    let correctAnsStr = '';

    if (overrideCorrect !== undefined) {
      correct = overrideCorrect;
      userAnsStr = overrideUserAns || (correct ? 'Đã nhớ' : 'Chưa nhớ');
      correctAnsStr = currentEx.vocabWord || currentEx.correctText || 'Đã thuộc';
    } else {
      switch (currentEx.type) {
        case 'vocab_cloze':
        case 'listen_spell': {
          const target = (currentEx.vocabWord || currentEx.correctText || '').trim().toLowerCase();
          const user = textAnswer.trim().toLowerCase();
          correct = user === target;
          userAnsStr = textAnswer.trim() || 'Chưa nhập';
          correctAnsStr = currentEx.vocabWord || currentEx.correctText || '';
          break;
        }

        case 'anagram': {
          const target = (currentEx.vocabWord || currentEx.correctText || '').trim().toLowerCase();
          const user = assembledLetters.join('').trim().toLowerCase();
          correct = user === target;
          userAnsStr = assembledLetters.join('');
          correctAnsStr = currentEx.vocabWord || currentEx.correctText || '';
          break;
        }

        case 'multiple_choice':
        case 'collocation':
        case 'true_false':
        case 'image_identify':
        case 'reading':
        case 'listening': {
          const targetOptions = currentEx.correctOptions || [0];
          const sortedSelected = [...selectedOptions].sort();
          const sortedTarget = [...targetOptions].sort();
          correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedTarget);
          userAnsStr = selectedOptions.map(idx => currentEx.options?.[idx] || idx).join(', ') || 'Chưa chọn';
          correctAnsStr = targetOptions.map(idx => currentEx.options?.[idx] || idx).join(', ');
          break;
        }

        case 'fill_blank':
        case 'translation': {
          const cleanedUser = textAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
          const cleanedTarget = (currentEx.correctText || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');
          correct = cleanedUser === cleanedTarget;
          userAnsStr = textAnswer.trim() || 'Chưa nhập';
          correctAnsStr = currentEx.correctText || '';
          break;
        }

        case 'mixed_practice': {
          if (currentEx.options && currentEx.options.length > 0) {
            const targetOptions = currentEx.correctOptions || [0];
            const sortedSelected = [...selectedOptions].sort();
            const sortedTarget = [...targetOptions].sort();
            correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedTarget);
            userAnsStr = selectedOptions.map(idx => currentEx.options?.[idx] || idx).join(', ') || 'Chưa chọn';
            correctAnsStr = targetOptions.map(idx => currentEx.options?.[idx] || idx).join(', ');
          } else if (currentEx.matchingPairs && currentEx.matchingPairs.length > 0) {
            const pairs = currentEx.matchingPairs || [];
            const isAllMatched = pairs.length > 0 && pairs.every(p => matchedPairs[p.left] === p.right);
            correct = isAllMatched;
            userAnsStr = Object.entries(matchedPairs).map(([l, r]) => `${l} → ${r}`).join('; ');
            correctAnsStr = pairs.map(p => `${p.left} → ${p.right}`).join('; ');
          } else {
            const cleanedUser = textAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
            const cleanedTarget = (currentEx.correctText || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');
            correct = cleanedUser === cleanedTarget;
            userAnsStr = textAnswer.trim() || 'Chưa nhập';
            correctAnsStr = currentEx.correctText || '';
          }
          break;
        }

        case 'sentence_builder': {
          const userBuilt = assembledWords.join(' ').trim().toLowerCase().replace(/[.,!?;:]/g, '');
          const targetStr = (currentEx.correctText || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');
          correct = userBuilt === targetStr;
          userAnsStr = assembledWords.join(' ');
          correctAnsStr = currentEx.correctText || '';
          break;
        }

        case 'error_correction': {
          const cleanedUser = textAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
          const cleanedTarget = (currentEx.correctText || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');
          correct = cleanedUser === cleanedTarget;
          userAnsStr = textAnswer.trim() + (selectedErrorType ? ` [Lỗi: ${selectedErrorType}]` : '');
          correctAnsStr = (currentEx.correctText || '') + (currentEx.errorType ? ` [Lỗi: ${currentEx.errorType}]` : '');
          break;
        }

        case 'matching': {
          const pairs = currentEx.matchingPairs || [];
          const isAllMatched = pairs.length > 0 && pairs.every(p => matchedPairs[p.left] === p.right);
          correct = isAllMatched && matchingMistakesCount === 0;
          userAnsStr = Object.entries(matchedPairs).map(([l, r]) => `${l} → ${r}`).join('; ') + (matchingMistakesCount > 0 ? ` (${matchingMistakesCount} lần ghép sai)` : '');
          correctAnsStr = pairs.map(p => `${p.left} → ${p.right}`).join('; ');
          break;
        }

        case 'speaking': {
          const targetClean = (currentEx.correctText || currentEx.question).trim().toLowerCase().replace(/[.,!?;:]/g, '');
          const userClean = (spokenTranscript || textAnswer).trim().toLowerCase().replace(/[.,!?;:]/g, '');
          correct = userClean === targetClean || (userClean.length > 0 && targetClean.includes(userClean));
          userAnsStr = spokenTranscript || textAnswer || 'Đã đọc thành tiếng';
          correctAnsStr = currentEx.correctText || currentEx.question;
          break;
        }

        case 'writing': {
          correct = textAnswer.trim().length >= 10;
          userAnsStr = textAnswer.trim() || 'Đoạn văn trống';
          correctAnsStr = currentEx.modelSample || 'Đoạn văn hoàn chỉnh';
          break;
        }

        default:
          correct = true;
      }
    }

    setIsChecked(true);
    setIsCorrect(correct);

    // Audio & Haptic feedback
    if (correct) {
      if (settings.soundEnabled) soundManager.playCorrect();
      if (settings.hapticEnabled) triggerHaptic('light');
      onSuccessExercise(currentEx);
    } else {
      if (settings.soundEnabled) soundManager.playIncorrect();
      if (settings.hapticEnabled) triggerHaptic('heavy');
      onErrorOccurred(currentEx, userAnsStr, correctAnsStr);
    }

    setResults(prev => [...prev, { exerciseId: currentEx.id, isCorrect: correct }]);
  };

  // Next question
  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(results);
    }
  };

  // Try again
  const handleRetryCurrent = () => {
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedOptions([]);
    setTextAnswer('');
    setIsCardFlipped(false);
    if (currentEx.type === 'sentence_builder') {
      const words = currentEx.scrambledWords || currentEx.correctText?.split(' ') || [];
      setAvailableWords([...words].sort(() => Math.random() - 0.5));
      setAssembledWords([]);
    }
    if (currentEx.type === 'anagram') {
      const target = currentEx.vocabWord || currentEx.correctText || '';
      const letters = target.split('').map((l, i) => ({ id: `${l}_${i}_${Math.random()}`, letter: l }));
      setAvailableLetters([...letters].sort(() => Math.random() - 0.5));
      setAssembledLetters([]);
    }
  };

  // Difficulty badge
  const getDifficultyBadge = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'scaffolded': return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500">🟢 Scaffolded</span>;
      case 'guided': return <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500">🟡 Guided</span>;
      case 'controlled': return <span className="px-2 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-500">🟠 Controlled</span>;
      case 'independent': return <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500">🔴 Independent</span>;
      case 'challenge': return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-500">⚫ Challenge</span>;
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-4 pb-20 ${typo.fontSize} ${typo.lineHeight} animate-in fade-in duration-150`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          id="btn-exit-practice"
          onClick={onExit}
          className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:opacity-80 transition-opacity`}
          title="Thoát phiên học"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1 font-medium">
            <span className={theme.textMuted}>
              {title} • Câu {currentIndex + 1} / {exercises.length}
            </span>
            <span className="text-emerald-500 font-semibold">
              {Math.round(((currentIndex + 1) / exercises.length) * 100)}%
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme.highlight}`}>
            <div 
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Audio TTS Button */}
        <button
          id="btn-speak-question"
          onClick={() => speakText(currentEx.vocabWord || currentEx.correctText || currentEx.question)}
          className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:opacity-80 text-emerald-500`}
          title="Nghe phát âm chuẩn"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Question Card */}
      <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} space-y-4`}>
        {/* Active Error / Penalty Notice Banner */}
        {(() => {
          const activeError = findMatchingActiveError(currentEx.id);
          if (!activeError || activeError.resolved) return null;
          return (
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30 text-xs text-rose-950 dark:text-rose-100 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-rose-900 dark:text-rose-300">Câu này đang trong Sổ lỗi!</span>
                  <p className="text-[11px] text-rose-950 dark:text-neutral-200 font-medium mt-0.5">
                    Mức phạt: Cần làm đúng <strong className="text-rose-900 dark:text-rose-300 font-bold">{activeError.requiredSuccessCount || 2}</strong> lần liên tiếp. Hiện tại: <strong className="text-rose-900 dark:text-rose-300 font-bold">{activeError.currentSuccessCount || 0}/{activeError.requiredSuccessCount || 2}</strong> (Đã thử lại {activeError.retryAttempts || 0} lượt).
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-rose-200 dark:bg-rose-500/30 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 font-bold whitespace-nowrap">
                Đang phạt ôn lại
              </span>
            </div>
          );
        })()}

        {/* Badges bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-inherit pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
              {currentEx.skill}
            </span>
            {getDifficultyBadge(currentEx.difficulty)}
          </div>

          {(currentEx.grammarHint || currentEx.keywords?.length) && (
            <button
              id="btn-toggle-hint"
              onClick={() => setShowHint(!showHint)}
              className="text-xs flex items-center gap-1 font-medium text-amber-500 hover:opacity-80"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHint ? 'Ẩn gợi ý' : 'Gợi ý'}</span>
            </button>
          )}
        </div>

        {/* Instruction */}
        {currentEx.instruction && (
          <p className={`text-xs ${theme.textMuted} italic`}>
            👉 {currentEx.instruction}
          </p>
        )}

        {/* Reading Passage ONLY for Reading or Dialogue */}
        {(currentEx.type === 'reading' || currentEx.type === 'speaking') && currentEx.context && (
          <div className={`p-4 rounded-xl ${theme.highlight} border ${theme.border} text-xs leading-relaxed space-y-2`}>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
              <FileText className="w-3.5 h-3.5" />
              <span>{currentEx.type === 'reading' ? 'Bài đọc (Reading Passage):' : 'Tình huống hội thoại:'}</span>
            </div>
            <p className="whitespace-pre-line font-serif text-[14px]">
              {currentEx.context}
            </p>
            {isChecked && currentEx.evidenceRegion && (
              <div className="pt-2 border-t border-inherit text-xs text-amber-500">
                <span className="font-semibold">🔍 Dẫn chứng: </span>
                <span>"{currentEx.evidenceRegion}"</span>
              </div>
            )}
          </div>
        )}

        {/* Listening Audio Track Player with Seek Bar & Speed Selector */}
        {currentEx.type === 'listening' && (
          <div className="space-y-3 pt-1">
            <ListeningAudioPlayer
              audioUrl={currentEx.audioUrl}
              audioText={currentEx.audioText}
              title={currentEx.vocabWord ? `Bài nghe: ${currentEx.vocabWord}` : 'Băng ghi âm bài nghe (TOEIC Audio Track)'}
            />

            {currentEx.audioPredictionHint && (
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span><strong>Gợi ý nghe (Prediction):</strong> {currentEx.audioPredictionHint}</span>
              </div>
            )}
          </div>
        )}

        {/* Question Title */}
        <div className="text-base sm:text-lg font-bold leading-snug">
          {currentEx.question}
        </div>

        {/* Hint Box */}
        {showHint && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 space-y-1 animate-in fade-in">
            {currentEx.grammarHint && <p><strong>Gợi ý ngữ pháp:</strong> {currentEx.grammarHint}</p>}
            {currentEx.keywords && <p><strong>Từ khóa:</strong> {currentEx.keywords.join(', ')}</p>}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* INTERACTIVE WORK AREA ACCORDING TO EXERCISE TYPE */}
        {/* ------------------------------------------------------------- */}

        {/* 1. VOCAB CLOZE (Active Recall Spelling) */}
        {currentEx.type === 'vocab_cloze' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-2">
              <span className={`text-[11px] uppercase tracking-wider ${theme.textMuted} font-semibold block`}>
                Mẫu chữ cái gợi ý:
              </span>
              <div className="text-2xl font-mono tracking-widest font-bold text-emerald-500">
                {generateClozePattern(currentEx.vocabWord || currentEx.correctText || '', currentEx.clozeLetters)}
              </div>
              {currentEx.vocabMeaning && (
                <p className={`text-xs ${theme.textMuted}`}>
                  Nghĩa: <strong>{currentEx.vocabMeaning}</strong>
                </p>
              )}
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1.5`}>
                Gõ từ vựng hoàn chỉnh:
              </label>
              <input
                id="input-vocab-cloze"
                type="text"
                autoFocus
                disabled={isChecked}
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
                placeholder="Nhập từ chính xác..."
                className={`w-full p-3.5 rounded-xl ${theme.inputBg} text-base font-semibold text-center border ${theme.border} focus:border-emerald-500`}
              />
            </div>
          </div>
        )}

        {/* 2. FLASHCARD RECALL (Spaced Repetition & Self Rating) */}
        {currentEx.type === 'flashcard_recall' && (
          <div className="space-y-4 pt-2">
            <div 
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className={`p-6 rounded-2xl border ${theme.border} ${theme.highlight} cursor-pointer hover:border-emerald-500/50 transition-all text-center min-h-[160px] flex flex-col items-center justify-center space-y-3 select-none`}
            >
              {!isCardFlipped ? (
                <>
                  <Eye className="w-6 h-6 text-emerald-500 opacity-80" />
                  <div className="text-lg font-bold">
                    {currentEx.vocabMeaning || currentEx.question}
                  </div>
                  <span className="text-[11px] text-emerald-500 font-medium">
                    (Chạm vào thẻ để lật xem đáp án & phiên âm)
                  </span>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-emerald-500">
                    {currentEx.vocabWord || currentEx.correctText}
                  </div>
                  {currentEx.phonetic && (
                    <div className={`text-xs font-mono ${theme.textMuted}`}>
                      {currentEx.phonetic}
                    </div>
                  )}
                  {currentEx.vocabMeaning && (
                    <div className="text-sm font-medium">
                      {currentEx.vocabMeaning}
                    </div>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      speakText(currentEx.vocabWord || currentEx.correctText || '');
                    }}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 inline-flex items-center gap-1 text-xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe phát âm</span>
                  </button>
                </>
              )}
            </div>

            {/* Self Rating Buttons */}
            {!isChecked && (
              <div className="flex gap-3">
                <button
                  id="btn-flashcard-forget"
                  onClick={() => handleCheck(false, 'Chưa nhớ (Cần ôn lại)')}
                  className="flex-1 py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/20"
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>Chưa thuộc (Ôn lại)</span>
                </button>
                <button
                  id="btn-flashcard-remember"
                  onClick={() => handleCheck(true, 'Đã thuộc')}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Đã nhớ chính xác</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. LISTEN & SPELL (Dictation Recall) */}
        {currentEx.type === 'listen_spell' && (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <button
                id="btn-listen-dictation"
                onClick={() => speakText(currentEx.vocabWord || currentEx.correctText || '')}
                className="w-16 h-16 mx-auto rounded-full bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <Volume2 className="w-8 h-8" />
              </button>
              <p className="text-xs font-semibold text-sky-500">
                Bấm nút loa để nghe từ, sau đó gõ lại từ vừa nghe
              </p>
            </div>

            <div>
              <input
                id="input-listen-spell"
                type="text"
                autoFocus
                disabled={isChecked}
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
                placeholder="Gõ từ bạn nghe được..."
                className={`w-full p-3.5 rounded-xl ${theme.inputBg} text-base font-semibold text-center border ${theme.border}`}
              />
            </div>
          </div>
        )}

        {/* 4. ANAGRAM (Letter Unscramble) */}
        {currentEx.type === 'anagram' && (
          <div className="space-y-4 pt-2">
            {/* Assembled Letters Box */}
            <div className={`p-4 rounded-xl border ${theme.border} ${theme.highlight} min-h-[64px] flex items-center justify-center gap-1.5 flex-wrap`}>
              {assembledLetters.length === 0 ? (
                <span className={`text-xs ${theme.textMuted}`}>
                  Chạm các chữ cái bên dưới để ghép từ...
                </span>
              ) : (
                assembledLetters.map((letter, idx) => (
                  <button
                    key={idx}
                    disabled={isChecked}
                    onClick={() => {
                      if (isChecked) return;
                      // Remove letter from assembled and return to available
                      const returned = assembledLetters[idx];
                      setAssembledLetters(prev => prev.filter((_, i) => i !== idx));
                      setAvailableLetters(prev => [...prev, { id: `${returned}_${Date.now()}_${Math.random()}`, letter: returned }]);
                    }}
                    className="w-9 h-10 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm flex items-center justify-center uppercase active:scale-95 transition-transform"
                  >
                    {letter}
                  </button>
                ))
              )}
            </div>

            {/* Available Letters Pool */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {availableLetters.map(item => (
                <button
                  key={item.id}
                  disabled={isChecked}
                  onClick={() => {
                    if (isChecked) return;
                    setAssembledLetters(prev => [...prev, item.letter]);
                    setAvailableLetters(prev => prev.filter(l => l.id !== item.id));
                  }}
                  className={`w-9 h-10 rounded-lg border ${theme.border} ${theme.card} font-bold text-sm shadow-sm flex items-center justify-center uppercase hover:border-emerald-500 active:scale-95 transition-all`}
                >
                  {item.letter}
                </button>
              ))}
            </div>

            {assembledLetters.length > 0 && !isChecked && (
              <div className="text-center">
                <button
                  onClick={handleRetryCurrent}
                  className={`text-[11px] ${theme.textMuted} hover:text-rose-500 inline-flex items-center gap-1`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Xếp lại từ đầu</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 5. MULTIPLE CHOICE / COLLOCATION / TRUE_FALSE / READING / MIXED PRACTICE OPTIONS */}
        {(currentEx.type === 'multiple_choice' || currentEx.type === 'collocation' || currentEx.type === 'true_false' || currentEx.type === 'image_identify' || currentEx.type === 'reading' || currentEx.type === 'listening' || (currentEx.type === 'mixed_practice' && currentEx.options && currentEx.options.length > 0)) && (
          <div className="space-y-2 pt-1">
            {(currentEx.type === 'true_false' ? ['Đúng (True)', 'Sai (False)'] : currentEx.options || []).map((option, idx) => {
              const isSelected = selectedOptions.includes(idx);
              const isTargetCorrect = currentEx.correctOptions?.includes(idx);

              let buttonStyle = `${theme.card} ${theme.border} hover:border-emerald-500/50`;
              if (isChecked) {
                if (isTargetCorrect) {
                  buttonStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold';
                } else if (isSelected && !isTargetCorrect) {
                  buttonStyle = 'border-rose-500 bg-rose-500/15 text-rose-500';
                } else {
                  buttonStyle = `${theme.card} opacity-50`;
                }
              } else if (isSelected) {
                buttonStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold shadow-sm';
              }

              return (
                <button
                  key={idx}
                  id={`btn-option-${idx}`}
                  disabled={isChecked}
                  onClick={() => {
                    // Single choice
                    setSelectedOptions([idx]);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-[11px]">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isChecked && isTargetCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 6. FILL BLANK / TRANSLATION / MIXED PRACTICE TEXT */}
        {(currentEx.type === 'fill_blank' || currentEx.type === 'translation' || (currentEx.type === 'mixed_practice' && !currentEx.options?.length && !currentEx.matchingPairs?.length)) && (
          <div className="space-y-2 pt-1">
            <input
              id="input-text-answer"
              type="text"
              autoFocus
              disabled={isChecked}
              value={textAnswer}
              onChange={e => setTextAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
              placeholder="Nhập câu trả lời của bạn..."
              className={`w-full p-3.5 rounded-xl ${theme.inputBg} text-sm font-medium border ${theme.border} focus:border-emerald-500`}
            />
          </div>
        )}

        {/* 7. SENTENCE BUILDER */}
        {currentEx.type === 'sentence_builder' && (
          <div className="space-y-4 pt-1">
            {/* Assembled line */}
            <div className={`p-4 rounded-xl border ${theme.border} ${theme.highlight} min-h-[56px] flex items-center flex-wrap gap-1.5`}>
              {assembledWords.length === 0 ? (
                <span className={`text-xs ${theme.textMuted}`}>
                  Chạm các thẻ từ bên dưới để ghép thành câu hoàn chỉnh...
                </span>
              ) : (
                assembledWords.map((word, idx) => (
                  <button
                    key={idx}
                    disabled={isChecked}
                    onClick={() => {
                      if (isChecked) return;
                      const returned = assembledWords[idx];
                      setAssembledWords(prev => prev.filter((_, i) => i !== idx));
                      setAvailableWords(prev => [...prev, returned]);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-sm active:scale-95"
                  >
                    {word}
                  </button>
                ))
              )}
            </div>

            {/* Available words */}
            <div className="flex flex-wrap gap-2">
              {availableWords.map((word, idx) => (
                <button
                  key={idx}
                  disabled={isChecked}
                  onClick={() => {
                    if (isChecked) return;
                    setAssembledWords(prev => [...prev, word]);
                    setAvailableWords(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className={`py-1.5 px-3 rounded-lg border ${theme.border} ${theme.card} text-xs font-medium hover:border-emerald-500 active:scale-95 shadow-sm`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 8. ERROR CORRECTION */}
        {currentEx.type === 'error_correction' && (
          <div className="space-y-3 pt-1">
            {currentEx.wrongSentence && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                <span className="font-bold text-rose-500 block text-[11px] uppercase tracking-wider">Câu chứa lỗi sai:</span>
                <p className="text-sm font-medium text-rose-200/90 leading-relaxed select-text">{currentEx.wrongSentence}</p>
              </div>
            )}
            <input
              id="input-error-correction"
              type="text"
              autoFocus
              disabled={isChecked}
              value={textAnswer}
              onChange={e => setTextAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
              placeholder="Gõ lại câu hoàn chỉnh sau khi sửa..."
              className={`w-full p-3.5 rounded-xl ${theme.inputBg} text-sm font-medium border ${theme.border} focus:border-emerald-500`}
            />
          </div>
        )}

        {/* 9. MATCHING & MIXED PRACTICE MATCHING */}
        {(currentEx.type === 'matching' || (currentEx.type === 'mixed_practice' && currentEx.matchingPairs && currentEx.matchingPairs.length > 0)) && (
          <div className="pt-1">
            <InteractiveMatchingBoard
              pairs={currentEx.matchingPairs || []}
              disabled={isChecked}
              onPairsMatched={(matchedMap, mistakesCount) => {
                setMatchedPairs(matchedMap);
                setMatchingMistakesCount(mistakesCount);
              }}
              explanation={isChecked ? currentEx.explanation : undefined}
            />
          </div>
        )}

        {/* 10. WRITING */}
        {currentEx.type === 'writing' && (
          <div className="space-y-3 pt-1">
            <textarea
              rows={4}
              disabled={isChecked}
              value={textAnswer}
              onChange={e => setTextAnswer(e.target.value)}
              placeholder="Soạn thảo câu hoặc đoạn văn của bạn tại đây..."
              className={`w-full p-3 rounded-xl ${theme.inputBg} text-xs font-serif`}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={theme.textMuted}>
                Số từ: {textAnswer.trim() ? textAnswer.trim().split(/\s+/).length : 0} từ
              </span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CHECK & FEEDBACK SECTION */}
        {/* ------------------------------------------------------------- */}

        {!isChecked ? (
          currentEx.type !== 'flashcard_recall' && (
            <div className="pt-3">
              <button
                id="btn-check-practice-answer"
                onClick={() => handleCheck()}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-98"
              >
                Kiểm tra câu trả lời
              </button>
            </div>
          )
        ) : (
          <div className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-200 ${
            isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 text-neutral-900 dark:text-neutral-100' : 'border-rose-500/50 bg-rose-500/10 text-neutral-900 dark:text-neutral-100'
          }`}>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">Chính xác! Làm rất tốt.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-300">Chưa chính xác (Đã lưu vào Sổ lỗi)</span>
                </>
              )}
            </div>

            {/* Error penalty notification */}
            {(() => {
              const activeError = findMatchingActiveError(currentEx.id);
              if (!activeError) return null;
              const req = activeError.requiredSuccessCount || 2;
              if (isCorrect) {
                const nextSuccess = (activeError.currentSuccessCount || 0) + 1;
                if (nextSuccess >= req) {
                  return (
                    <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>🎉 Xuất sắc! Bạn đã hoàn thành câu lỗi sai này ({req}/{req} lần đúng bắt buộc). Lỗi sẽ được gỡ khỏi sổ lỗi!</span>
                    </div>
                  );
                }
                return (
                  <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Làm đúng lần {nextSuccess}/{req}! Cần đúng thêm {req - nextSuccess} lần nữa để hoàn thành bài phạt này.</span>
                  </div>
                );
              }
              return (
                <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-950 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Chưa đạt! Lượt thử thứ {(activeError.retryAttempts || 0) + 1}. Tiến độ đúng liên tiếp sẽ tính lại từ đầu.</span>
                </div>
              );
            })()}

            {/* Target text / Correct answer preview */}
            {!isCorrect && (currentEx.correctText || currentEx.vocabWord) && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Đáp án chuẩn: </span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{currentEx.vocabWord || currentEx.correctText}</span>
              </div>
            )}

            {/* Transcript for listening */}
            {currentEx.type === 'listening' && currentEx.transcript && (
              <div className="pt-1 text-xs border-t border-inherit/40 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="text-sky-700 dark:text-sky-400 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showTranscript ? 'Ẩn lời thoại (Transcript)' : 'Xem lời thoại (Transcript) bài nghe'}</span>
                </button>
                {showTranscript && (
                  <div className="p-3 rounded-xl bg-sky-100/80 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-500/30 text-sky-950 dark:text-sky-200 text-xs italic font-serif leading-relaxed">
                    "{currentEx.transcript}"
                  </div>
                )}
              </div>
            )}

            {/* Explanation (respects teacher permission) */}
            {canViewExplanations && currentEx.explanation && (
              <div className="text-xs leading-relaxed pt-1 border-t border-inherit/40 text-neutral-900 dark:text-neutral-100">
                <span className="font-bold">Giải thích: </span>
                <span>{currentEx.explanation}</span>
              </div>
            )}

            {/* Action buttons: Next / Retry */}
            <div className="pt-2 flex items-center gap-2">
              {!isCorrect && (
                <button
                  id="btn-retry-question"
                  onClick={handleRetryCurrent}
                  className={`py-2.5 px-3.5 rounded-xl border ${theme.border} ${theme.card} hover:${theme.highlight} text-neutral-900 dark:text-neutral-100 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thử lại câu này</span>
                </button>
              )}
              <button
                id="btn-next-question"
                onClick={handleNext}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <span>{currentIndex < exercises.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
