import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft,
  RotateCcw, 
  Sparkles, 
  FileText, 
  Headphones, 
  Check, 
  BookOpen,
  RefreshCw,
  Eye,
  ThumbsDown,
  ThumbsUp,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Settings2,
  Info
} from 'lucide-react';
import { Exercise, DifficultyLevel, ErrorLog, User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { soundManager, triggerHaptic, speakText } from '../utils/audio';
import { ListeningAudioPlayer } from './ListeningAudioPlayer';
import { InteractiveMatchingBoard } from './InteractiveMatchingBoard';
import { CHUNK_SIZE, QUIZ_TYPES_PER_WORD, orderStandardExercisesInBatches } from '../utils/memriseGenerator';
import { createClozeLettersPattern } from '../utils/singleVocabGenerator';
import { InteractivePronunciationPractice } from './InteractivePronunciationPractice';
import { evaluatePronunciation } from '../utils/pronunciationUtils';

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

  // Cloze Passage & Sub-questions states
  const [clozeAnswers, setClozeAnswers] = useState<{ [blankIdx: number]: string }>({});
  const [subAnswers, setSubAnswers] = useState<{ [subId: string]: string | number | boolean }>({});

  // Active Recall: Vocab Cloze slot-by-slot typing state
  const [clozeSlotInputs, setClozeSlotInputs] = useState<{ [slotIdx: number]: string }>({});

  // Cài đặt trắc nghiệm (Multiple Choice settings): Bố cục xếp chồng / 4 ô vuông và Bật/tắt nhãn ABCD
  const [mcLayout, setMcLayout] = useState<'stacked' | 'grid_2x2'>(() => {
    const saved = localStorage.getItem('app_quiz_mc_layout');
    return (saved === 'grid_2x2' || saved === 'stacked') ? saved : 'stacked';
  });
  const [showABCD, setShowABCD] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_quiz_show_abcd');
    return saved !== null ? saved === 'true' : true;
  });
  const [showMcSettingsModal, setShowMcSettingsModal] = useState<boolean>(false);
  const [showRoundCompleteModal, setShowRoundCompleteModal] = useState<boolean>(false);

  // Filter and order exercises according to round-based learning flow:
  const availableExercises = useMemo(() => {
    let filtered = exercises;
    if (currentUser?.role === 'student') {
      filtered = exercises.filter(ex => !ex.isHidden);
    }
    // Check if exercises contains vocabulary / memrise drills to order in rounds
    const hasVocabOrMemrise = filtered.some(ex => 
      ex.type === 'flashcard_recall' || 
      ex.type === 'typing' || 
      ex.type === 'spelling' || 
      ex.memriseStage || 
      ex.vocabWord ||
      ex.word
    );
    if (hasVocabOrMemrise) {
      return orderStandardExercisesInBatches(filtered, CHUNK_SIZE);
    }
    return filtered;
  }, [exercises, currentUser?.role]);

  // Calculate round segments
  const roundData = useMemo(() => {
    // Collect all unique words
    const uniqueWords: string[] = [];
    availableExercises.forEach(ex => {
      const w = (ex.vocabWord || ex.word || (ex.type === 'flashcard_recall' ? ex.question : '') || '').trim();
      if (w && !uniqueWords.includes(w)) {
        uniqueWords.push(w);
      }
    });

    if (uniqueWords.length === 0) {
      return { 
        totalRounds: 1, 
        currentRound: 1, 
        roundStartIdx: 0, 
        roundEndIdx: Math.max(0, availableExercises.length - 1), 
        roundItemIndex: currentIndex,
        roundTotalItems: availableExercises.length,
        roundWords: [],
        allRounds: []
      };
    }

    // Chunks of unique words
    const rounds: { roundNumber: number; words: string[]; startIdx: number; endIdx: number; count: number }[] = [];
    let currentIdxInList = 0;

    for (let i = 0; i < uniqueWords.length; i += CHUNK_SIZE) {
      const chunkWords = uniqueWords.slice(i, i + CHUNK_SIZE);
      const roundExs = availableExercises.filter(ex => {
        const w = (ex.vocabWord || ex.word || (ex.type === 'flashcard_recall' ? ex.question : '') || '').trim();
        return chunkWords.includes(w);
      });
      const start = currentIdxInList;
      const end = currentIdxInList + Math.max(0, roundExs.length - 1);
      rounds.push({
        roundNumber: Math.floor(i / CHUNK_SIZE) + 1,
        words: chunkWords,
        startIdx: start,
        endIdx: end,
        count: roundExs.length,
      });
      currentIdxInList += roundExs.length;
    }

    // Find current round
    const activeRound = rounds.find(r => currentIndex >= r.startIdx && currentIndex <= r.endIdx) || rounds[0] || {
      roundNumber: 1,
      words: [],
      startIdx: 0,
      endIdx: Math.max(0, availableExercises.length - 1),
      count: availableExercises.length,
    };

    return {
      totalRounds: rounds.length,
      currentRound: activeRound.roundNumber,
      roundStartIdx: activeRound.startIdx,
      roundEndIdx: activeRound.endIdx,
      roundItemIndex: currentIndex - activeRound.startIdx,
      roundTotalItems: activeRound.count,
      roundWords: activeRound.words,
      allRounds: rounds,
    };
  }, [availableExercises, currentIndex]);

  const currentEx = availableExercises[currentIndex];

  // Helper to parse cloze text into segments
  const parseClozePassage = (text: string) => {
    const regex = /\[(.*?)\]/g;
    const parts: { type: 'text' | 'blank'; content: string; blankIdx?: number; answer?: string }[] = [];
    let lastIndex = 0;
    let blankCounter = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({
        type: 'blank',
        content: match[0],
        blankIdx: blankCounter,
        answer: match[1].trim(),
      });
      blankCounter++;
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    return parts;
  };

  // Helper to generate missing letter pattern for vocab_cloze
  const generateClozePattern = (word: string, customPattern?: string) => {
    if (customPattern && customPattern.trim()) return customPattern;
    if (!word) return '';
    const { clozeLetters } = createClozeLettersPattern(word);
    return clozeLetters;
  };

  // Structured Cloze Slots parser for interactive slot-by-slot typing
  const parseVocabClozeSlots = (word: string, customPattern?: string) => {
    if (!word) return [];
    const chars = word.split('');
    let pattern = customPattern && customPattern.trim() ? customPattern.trim() : '';

    if (pattern) {
      const tokens = pattern.split(/\s+/);
      if (tokens.length === chars.length) {
        return chars.map((ch, idx) => {
          const tok = tokens[idx];
          const isSpace = ch === ' ';
          const isBlank = !isSpace && (tok === '_' || tok.includes('_'));
          return {
            index: idx,
            expectedChar: ch,
            isBlank,
            givenChar: isBlank || isSpace ? undefined : ch,
            isSpace,
          };
        });
      }
    }

    // Default fallback via createClozeLettersPattern with high randomness
    const { clozeLetters } = createClozeLettersPattern(word);
    const tokens = clozeLetters.split(/\s+/);
    return chars.map((ch, idx) => {
      const tok = tokens[idx] || '_';
      const isSpace = ch === ' ';
      const isBlank = !isSpace && (tok === '_' || tok.includes('_'));
      return {
        index: idx,
        expectedChar: ch,
        isBlank,
        givenChar: isBlank || isSpace ? undefined : ch,
        isSpace,
      };
    });
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
    setClozeAnswers({});
    setSubAnswers({});
    setClozeSlotInputs({});

    // Auto-focus first blank slot for vocab_cloze
    if (currentEx.type === 'vocab_cloze') {
      setTimeout(() => {
        const target = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim();
        const slots = parseVocabClozeSlots(target, currentEx.clozeLetters || currentEx.clozeTemplate);
        const firstBlank = slots.find(s => s.isBlank);
        if (firstBlank) {
          document.getElementById(`cloze-slot-${firstBlank.index}`)?.focus();
        }
      }, 80);
    }

    // Sentence builder words
    if (currentEx.type === 'sentence_builder') {
      const words = currentEx.scrambledWords || currentEx.correctText?.split(' ') || [];
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setAvailableWords(shuffled);
      setAssembledWords([]);
    }

    // Anagram / Spelling (Memrise) letters
    if (currentEx.type === 'anagram' || currentEx.type === 'spelling') {
      const target = currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '';
      let letters: { id: string; letter: string }[] = [];
      const shuffled = currentEx.shuffled_letters || currentEx.shuffledLetters;
      if (shuffled && shuffled.length > 0) {
        letters = shuffled.map((l, i) => ({ id: `${l}_${i}_${Math.random().toString(36).substring(2, 6)}`, letter: l }));
      } else {
        const raw = target.split('').filter(c => c !== ' ').map((l, i) => ({ id: `${l}_${i}_${Math.random().toString(36).substring(2, 6)}`, letter: l }));
        letters = [...raw].sort(() => Math.random() - 0.5);
      }
      setAvailableLetters(letters);
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

  if (availableExercises.length === 0) {
    return (
      <div className={`${theme.card} p-8 rounded-2xl text-center max-w-md mx-auto my-12 border ${theme.border}`}>
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h3 className="text-xl font-bold mb-2">Chưa có bài tập khả dụng</h3>
        <p className={`text-xs ${theme.textMuted} mb-5`}>
          Hiện bài học này chưa có câu hỏi nào hoặc các câu hỏi đang được giáo viên tạm ẩn.
        </p>
        <button
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer"
        >
          Trở về danh sách bài học
        </button>
      </div>
    );
  }

  if (!currentEx) {
    return (
      <div className={`${theme.card} p-8 rounded-2xl text-center max-w-md mx-auto my-12 border ${theme.border}`}>
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <h3 className="text-xl font-bold mb-2">Hoàn thành phiên học!</h3>
        <p className={`text-xs ${theme.textMuted} mb-5`}>
          Bạn đã hoàn thành tất cả {availableExercises.length} câu hỏi trong phiên này.
        </p>
        <button
          id="btn-finish-practice-exit"
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer"
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
        case 'vocab_cloze': {
          const targetWord = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim();
          const target = targetWord.toLowerCase();
          const slots = parseVocabClozeSlots(targetWord, currentEx.clozeLetters || currentEx.clozeTemplate);
          
          const assembled = slots.map(s => {
            if (s.isSpace) return ' ';
            if (!s.isBlank) return s.expectedChar;
            return clozeSlotInputs[s.index] || '';
          }).join('').trim().toLowerCase();

          const user = assembled.length === target.length ? assembled : (textAnswer.trim().toLowerCase() || assembled);
          correct = user === target;
          userAnsStr = assembled || textAnswer.trim() || 'Chưa điền đủ ký tự';
          correctAnsStr = targetWord;
          break;
        }

        case 'listen_spell':
        case 'typing': {
          const target = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim().toLowerCase();
          const user = textAnswer.trim().toLowerCase();
          correct = user === target;
          userAnsStr = textAnswer.trim() || 'Chưa nhập';
          correctAnsStr = currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '';
          break;
        }

        case 'anagram':
        case 'spelling': {
          const target = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim().toLowerCase();
          const user = assembledLetters.join('').trim().toLowerCase();
          correct = user === target;
          userAnsStr = assembledLetters.join('');
          correctAnsStr = currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '';
          break;
        }

        case 'multiple_choice':
        case 'collocation':
        case 'true_false':
        case 'image_identify':
        case 'reading':
        case 'listening': {
          if (currentEx.passageClozeText) {
            const tokens = parseClozePassage(currentEx.passageClozeText);
            const blanks = tokens.filter(t => t.type === 'blank');
            let allCorrect = true;
            const userResults: string[] = [];
            const correctResults: string[] = [];

            blanks.forEach(b => {
              const rawUser = (clozeAnswers[b.blankIdx!] || '').trim();
              const userVal = rawUser.toLowerCase().replace(/[.,!?;:]/g, '');
              const acceptable = (b.answer || '').split(/[/|]/).map(a => a.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
              const isBlankCorrect = acceptable.includes(userVal);
              if (!isBlankCorrect) allCorrect = false;
              userResults.push(`[${b.blankIdx! + 1}] ${rawUser || '(trống)'}`);
              correctResults.push(`[${b.blankIdx! + 1}] ${b.answer}`);
            });

            correct = allCorrect && blanks.length > 0;
            userAnsStr = userResults.join(', ');
            correctAnsStr = correctResults.join(', ');
          } else if (currentEx.subQuestions && currentEx.subQuestions.length > 0) {
            let allSubCorrect = true;
            const userResults: string[] = [];
            const correctResults: string[] = [];

            currentEx.subQuestions.forEach((sq, idx) => {
              let sqCorrect = false;
              let sqUserStr = '';
              let sqCorrectStr = '';

              if (sq.type === 'multiple_choice') {
                const userOpt = subAnswers[sq.id];
                sqCorrect = typeof userOpt === 'number' && userOpt === sq.correctOptionIdx;
                sqUserStr = typeof userOpt === 'number' && sq.options?.[userOpt] ? sq.options[userOpt] : 'Chưa chọn';
                sqCorrectStr = typeof sq.correctOptionIdx === 'number' && sq.options?.[sq.correctOptionIdx] ? sq.options[sq.correctOptionIdx] : '';
              } else if (sq.type === 'true_false') {
                const userTf = subAnswers[sq.id];
                const targetTf = sq.correctTrueFalse ?? true;
                sqCorrect = userTf === targetTf;
                sqUserStr = userTf === true ? 'Đúng (True)' : userTf === false ? 'Sai (False)' : 'Chưa chọn';
                sqCorrectStr = targetTf ? 'Đúng (True)' : 'Sai (False)';
              } else {
                // fill_blank or info_gap
                const rawUser = String(subAnswers[sq.id] || '').trim();
                const userTxt = rawUser.toLowerCase().replace(/[.,!?;:]/g, '');
                const validAnswers = (sq.correctText || '').split(/[/|]/).map(a => a.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
                sqCorrect = validAnswers.includes(userTxt);
                sqUserStr = rawUser || 'Chưa nhập';
                sqCorrectStr = sq.correctText || '';
              }

              if (!sqCorrect) allSubCorrect = false;
              userResults.push(`Câu ${idx + 1}: ${sqUserStr}`);
              correctResults.push(`Câu ${idx + 1}: ${sqCorrectStr}`);
            });

            correct = allSubCorrect && currentEx.subQuestions.length > 0;
            userAnsStr = userResults.join('; ');
            correctAnsStr = correctResults.join('; ');
          } else {
            let targetOptions = currentEx.correctOptions;
            if (!targetOptions || targetOptions.length === 0) {
              const targetVal = (currentEx.correct_answer || currentEx.correctText || '').trim().toLowerCase();
              if (targetVal && currentEx.options) {
                const foundIdx = currentEx.options.findIndex(o => o.trim().toLowerCase() === targetVal);
                targetOptions = foundIdx >= 0 ? [foundIdx] : [0];
              } else {
                targetOptions = [0];
              }
            }
            const sortedSelected = [...selectedOptions].sort();
            const sortedTarget = [...targetOptions].sort();
            correct = JSON.stringify(sortedSelected) === JSON.stringify(sortedTarget);
            userAnsStr = selectedOptions.map(idx => currentEx.options?.[idx] || idx).join(', ') || 'Chưa chọn';
            correctAnsStr = targetOptions.map(idx => currentEx.options?.[idx] || idx).join(', ');
          }
          break;
        }

        case 'fill_blank':
        case 'fill_in_blank':
        case 'translation': {
          const cleanedUser = textAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
          const targetAnswer = currentEx.correct_answer || currentEx.correctText || currentEx.word || currentEx.vocabWord || '';
          const cleanedTarget = targetAnswer.trim().toLowerCase().replace(/[.,!?;:]/g, '');
          correct = cleanedUser === cleanedTarget;
          userAnsStr = textAnswer.trim() || 'Chưa nhập';
          correctAnsStr = targetAnswer;
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

        case 'pronunciation':
        case 'speaking': {
          const target = (currentEx.correctText || currentEx.vocabWord || currentEx.question || '').trim();
          const words = target.split(/\s+/).filter(Boolean);
          const isSingle = currentEx.isSingleWord !== undefined ? currentEx.isSingleWord : (words.length <= 1);
          const threshold = isSingle ? 100 : (currentEx.pronunciationAccuracy || 70);

          const evalResult = evaluatePronunciation(target, spokenTranscript || textAnswer, {
            isSingleWord: isSingle,
            requiredThreshold: threshold,
          });

          correct = evalResult.isPassed;
          userAnsStr = `${evalResult.spokenText || 'Chưa đọc'} (${evalResult.accuracyPercent}%)`;
          correctAnsStr = `${target} (Yêu cầu: ${isSingle ? 'Đọc đúng từ (100%)' : `≥ ${threshold}%`})`;
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

  // Previous question (allow students to easily review the previous question)
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Next question
  const handleNext = () => {
    // If we reached the end of the current round and there are further rounds remaining
    if (currentIndex === roundData.roundEndIdx && currentIndex < availableExercises.length - 1) {
      setShowRoundCompleteModal(true);
      return;
    }

    if (currentIndex < availableExercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(results);
    }
  };

  // Start next round from completion modal
  const handleStartNextRound = () => {
    setShowRoundCompleteModal(false);
    if (currentIndex < availableExercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Try again
  const handleRetryCurrent = () => {
    setIsChecked(false);
    setIsCorrect(false);
    setSelectedOptions([]);
    setTextAnswer('');
    setIsCardFlipped(false);
    setClozeSlotInputs({});
    if (currentEx.type === 'vocab_cloze') {
      setTimeout(() => {
        const target = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim();
        const slots = parseVocabClozeSlots(target, currentEx.clozeLetters || currentEx.clozeTemplate);
        const firstBlank = slots.find(s => s.isBlank);
        if (firstBlank) {
          document.getElementById(`cloze-slot-${firstBlank.index}`)?.focus();
        }
      }, 50);
    }
    if (currentEx.type === 'sentence_builder') {
      const words = currentEx.scrambledWords || currentEx.correctText?.split(' ') || [];
      setAvailableWords([...words].sort(() => Math.random() - 0.5));
      setAssembledWords([]);
    }
    if (currentEx.type === 'anagram' || currentEx.type === 'spelling') {
      const target = (currentEx as any).correct_answer || currentEx.vocabWord || currentEx.correctText || (currentEx as any).word || '';
      const shuffled = (currentEx as any).shuffled_letters || currentEx.shuffledLetters;
      let letters: { id: string; letter: string }[] = [];
      if (shuffled && shuffled.length > 0) {
        letters = shuffled.map((l: string, i: number) => ({ id: `${l}_${i}_${Math.random().toString(36).substring(2, 6)}`, letter: l }));
      } else {
        const raw = target.split('').filter((c: string) => c !== ' ').map((l: string, i: number) => ({ id: `${l}_${i}_${Math.random().toString(36).substring(2, 6)}`, letter: l }));
        letters = [...raw].sort(() => Math.random() - 0.5);
      }
      setAvailableLetters(letters);
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
        <div className="flex items-center gap-1.5">
          <button
            id="btn-exit-practice"
            onClick={onExit}
            className={`p-2 rounded-xl border ${theme.border} ${theme.badgeBg} hover:opacity-80 transition-opacity cursor-pointer`}
            title="Thoát phiên học"
          >
            <X className="w-4 h-4" />
          </button>

          {currentIndex > 0 && (
            <button
              id="btn-prev-question-header"
              onClick={handlePrevious}
              className={`py-2 px-2.5 sm:px-3 rounded-xl border ${theme.border} ${theme.badgeBg} hover:opacity-80 transition-all text-xs font-semibold flex items-center gap-1 text-neutral-700 dark:text-neutral-300 cursor-pointer`}
              title="Xem lại câu hỏi trước"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Câu trước</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1 font-medium">
            <div className="flex items-center gap-1.5 flex-wrap">
              {roundData.totalRounds > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                  Đợt {roundData.currentRound}/{roundData.totalRounds}
                </span>
              )}
              <span className={theme.textMuted}>
                {title} • {roundData.totalRounds > 1 ? `Câu ${roundData.roundItemIndex + 1}/${roundData.roundTotalItems}` : `Câu ${currentIndex + 1}/${availableExercises.length}`}
              </span>
            </div>
            <span className="text-emerald-500 font-semibold">
              {Math.round(((currentIndex + 1) / availableExercises.length) * 100)}%
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme.highlight}`}>
            <div 
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / availableExercises.length) * 100}%` }}
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
              title={currentEx.audioTitle || (currentEx.vocabWord ? `Bài nghe: ${currentEx.vocabWord}` : 'Băng ghi âm bài nghe')}
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
        {currentEx.type !== 'flashcard_recall' && (
          <div className="text-base sm:text-lg font-bold leading-snug">
            {currentEx.question}
          </div>
        )}

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

        {/* 1. VOCAB CLOZE (Active Recall In-Place Slot Typing) */}
        {currentEx.type === 'vocab_cloze' && (() => {
          const targetWord = (currentEx.correct_answer || currentEx.vocabWord || currentEx.correctText || currentEx.word || '').trim();
          const slots = parseVocabClozeSlots(targetWord, currentEx.clozeLetters || currentEx.clozeTemplate);
          const blankSlots = slots.filter(s => s.isBlank);

          const handleSlotChange = (slotIdx: number, val: string) => {
            if (isChecked) return;
            const char = val.slice(-1);
            const newInputs = { ...clozeSlotInputs, [slotIdx]: char };
            setClozeSlotInputs(newInputs);

            if (char) {
              const nextBlank = slots.find(s => s.isBlank && s.index > slotIdx);
              if (nextBlank) {
                const el = document.getElementById(`cloze-slot-${nextBlank.index}`);
                if (el) el.focus();
              }
            }
          };

          const handleSlotKeyDown = (slotIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!isChecked) handleCheck();
              return;
            }

            if (e.key === 'Backspace') {
              const currentVal = clozeSlotInputs[slotIdx] || '';
              if (!currentVal) {
                e.preventDefault();
                const prevBlanks = slots.filter(s => s.isBlank && s.index < slotIdx);
                const prevBlank = prevBlanks[prevBlanks.length - 1];
                if (prevBlank) {
                  setClozeSlotInputs(prev => ({ ...prev, [prevBlank.index]: '' }));
                  const el = document.getElementById(`cloze-slot-${prevBlank.index}`);
                  if (el) el.focus();
                }
              }
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const prevBlanks = slots.filter(s => s.isBlank && s.index < slotIdx);
              const prevBlank = prevBlanks[prevBlanks.length - 1];
              if (prevBlank) {
                document.getElementById(`cloze-slot-${prevBlank.index}`)?.focus();
              }
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const nextBlank = slots.find(s => s.isBlank && s.index > slotIdx);
              if (nextBlank) {
                document.getElementById(`cloze-slot-${nextBlank.index}`)?.focus();
              }
            }
          };

          const handleSlotPaste = (startSlotIdx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text').trim();
            if (!text) return;
            const chars = text.split('');
            const futureBlanks = slots.filter(s => s.isBlank && s.index >= startSlotIdx);
            const newInputs = { ...clozeSlotInputs };
            chars.forEach((c, idx) => {
              if (futureBlanks[idx]) {
                newInputs[futureBlanks[idx].index] = c;
              }
            });
            setClozeSlotInputs(newInputs);
          };

          return (
            <div className="space-y-4 pt-2">
              {/* Meaning & Phonetic Prompt Card */}
              <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">
                    💡 Gõ trực tiếp vào các vị trí gạch chân
                  </span>
                </div>

                {currentEx.vocabMeaning && (
                  <div className="text-base sm:text-lg font-bold text-sky-950 dark:text-sky-100">
                    "{currentEx.vocabMeaning}"
                  </div>
                )}

                {currentEx.phonetic && (
                  <div className={`text-xs font-mono ${theme.textMuted} tracking-wider`}>
                    Phiên âm: <span className="font-semibold text-sky-500">{currentEx.phonetic}</span>
                  </div>
                )}
              </div>

              {/* Interactive In-Place Slot Boxes */}
              <div className="py-2.5">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                  {slots.map(slot => {
                    if (slot.isSpace) {
                      return <div key={slot.index} className="w-2.5 sm:w-3" />;
                    }

                    if (!slot.isBlank) {
                      // Given fixed letter
                      return (
                        <div
                          key={slot.index}
                          className={`w-8 h-11 sm:w-10 sm:h-12 rounded-lg border-2 ${theme.border} ${theme.highlight} flex flex-col items-center justify-center font-serif font-bold text-base sm:text-lg ${theme.text} select-none shadow-xs relative`}
                          title="Ký tự gợi ý sẵn"
                        >
                          <span className="uppercase">{slot.givenChar}</span>
                          <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                        </div>
                      );
                    }

                    // Blank slot for user input with distinct highlight color and underline
                    const userChar = clozeSlotInputs[slot.index] || '';
                    const hasChar = !!userChar;
                    const isSlotCorrect = isChecked && isCorrect;
                    const isSlotIncorrect = isChecked && !isCorrect;

                    return (
                      <div key={slot.index} className="relative group">
                        <input
                          id={`cloze-slot-${slot.index}`}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          disabled={isChecked}
                          value={userChar}
                          onChange={e => handleSlotChange(slot.index, e.target.value)}
                          onKeyDown={e => handleSlotKeyDown(slot.index, e)}
                          onPaste={e => handleSlotPaste(slot.index, e)}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className={`w-8 h-11 sm:w-10 sm:h-12 text-center font-serif font-bold text-base sm:text-lg rounded-lg border-2 transition-all outline-none uppercase select-none ${
                            isChecked
                              ? isSlotCorrect
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                                : 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30'
                              : hasChar
                                ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold shadow-xs ring-2 ring-sky-500/30'
                                : `border-dashed border-sky-400/80 dark:border-sky-500/60 bg-sky-500/5 ${theme.text} focus:border-solid focus:border-sky-500 focus:bg-sky-500/10 focus:ring-3 focus:ring-sky-500/25`
                          }`}
                        />
                        {/* Distinct Underline Accent for user typed slots */}
                        <div 
                          className={`absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full transition-all pointer-events-none ${
                            isChecked
                              ? isSlotCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                              : hasChar 
                                ? 'bg-sky-500 scale-100' 
                                : 'bg-sky-400/50 dark:bg-sky-500/40 group-focus-within:bg-sky-500 group-focus-within:scale-100'
                          }`} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions for cloze */}
              {blankSlots.length > 0 && !isChecked && Object.keys(clozeSlotInputs).length > 0 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setClozeSlotInputs({});
                      const firstBlank = slots.find(s => s.isBlank);
                      if (firstBlank) {
                        document.getElementById(`cloze-slot-${firstBlank.index}`)?.focus();
                      }
                    }}
                    className={`text-[11px] ${theme.textMuted} hover:text-rose-500 inline-flex items-center gap-1 cursor-pointer`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Xóa các ô để gõ lại</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. FLASHCARD RECALL (Học từ vựng trước khi vào Quiz / Spaced Repetition) */}
        {currentEx.type === 'flashcard_recall' && (
          <div className="space-y-4 pt-2">
            {/* Flip Card Container */}
            <div 
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className={`p-6 sm:p-8 rounded-2xl border ${theme.border} ${theme.highlight} cursor-pointer hover:border-emerald-500/50 transition-all text-center min-h-[220px] flex flex-col items-center justify-center space-y-4 select-none relative shadow-sm`}
            >
              {/* Top Side Badge */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {!isCardFlipped ? 'Mặt trước: Tiếng Anh' : 'Mặt sau: Tiếng Việt & Ví dụ'}
                </span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  Chạm để lật thẻ
                </span>
              </div>

              {!isCardFlipped ? (
                /* ================= MẶT TRƯỚC: CHỈ CÓ TIẾNG ANH & PHÁT ÂM ================= */
                <div className="w-full flex flex-col items-center justify-center space-y-3 pt-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-wide">
                    {currentEx.vocabWord || currentEx.correctText || currentEx.question}
                  </div>
                  
                  {currentEx.phonetic && (
                    <div className={`text-sm sm:text-base font-mono ${theme.textMuted} tracking-wider font-semibold px-3 py-0.5 rounded-lg bg-black/5 dark:bg-white/5`}>
                      {currentEx.phonetic}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        speakText(currentEx.vocabWord || currentEx.correctText || currentEx.question);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-2 text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Phát âm tiếng Anh</span>
                    </button>
                  </div>

                  <div className="pt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 opacity-90">
                    <span>Nhấn vào thẻ để xem nghĩa & ví dụ thực tế</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                /* ================= MẶT SAU: CHỈ CÓ TIẾNG VIỆT & VÍ DỤ THỰC TẾ ================= */
                <div className="w-full flex flex-col items-center justify-center space-y-3.5 pt-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Nghĩa tiếng Việt */}
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 dark:text-amber-400 px-5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 max-w-lg shadow-xs">
                    {currentEx.vocabMeaning || (currentEx.options && currentEx.options[0]) || currentEx.question}
                  </div>

                  {/* Ví dụ thực tế nếu có */}
                  {currentEx.context && (
                    <div className={`text-xs sm:text-sm p-3.5 rounded-xl border ${theme.border} ${theme.card} text-left max-w-lg w-full shadow-xs space-y-1.5`}>
                      <span className="font-bold text-amber-600 dark:text-amber-400 block text-[11px] uppercase tracking-wider">
                        VÍ DỤ THỰC TẾ:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed font-medium text-neutral-800 dark:text-neutral-200">
                        {currentEx.context}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        speakText(currentEx.vocabWord || currentEx.correctText || currentEx.question);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-500/10 hover:bg-neutral-500/20 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Nghe lại phát âm tiếng Anh"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Phát âm lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setIsCardFlipped(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Lật lại mặt tiếng Anh</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Self Rating Buttons */}
            {!isChecked && (
              <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
                {currentIndex > 0 && (
                  <button
                    id="btn-flashcard-prev"
                    onClick={handlePrevious}
                    className={`py-3 px-3.5 rounded-xl border ${theme.border} ${theme.card} hover:${theme.highlight} text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95`}
                    title="Quay lại câu trước"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Câu trước</span>
                  </button>
                )}
                <button
                  id="btn-flashcard-forget"
                  onClick={() => handleCheck(false, 'Chưa nhớ (Cần ôn lại)')}
                  className="flex-1 py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>Chưa thuộc (Cần xem lại)</span>
                </button>
                <button
                  id="btn-flashcard-remember"
                  onClick={() => handleCheck(true, 'Đã thuộc')}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Đã nắm vững (Bắt đầu Quiz) 🚀</span>
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

        {/* 4. ANAGRAM / SPELLING (Memrise Letter Unscramble) */}
        {(currentEx.type === 'anagram' || currentEx.type === 'spelling') && (
          <div className="space-y-4 pt-2">
            {currentEx.hint && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span><strong>Gợi ý:</strong> {currentEx.hint}</span>
              </div>
            )}

            {/* Assembled Letters Box */}
            <div className={`p-4 rounded-xl border ${theme.border} ${theme.highlight} min-h-[68px] flex items-center justify-center gap-2 flex-wrap`}>
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
                    className="w-9 h-11 sm:w-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-serif font-bold text-base sm:text-lg shadow-sm flex items-center justify-center uppercase active:scale-95 transition-all select-none cursor-pointer"
                  >
                    {letter}
                  </button>
                ))
              )}
            </div>

            {/* Available Letters Pool */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              {availableLetters.map(item => (
                <button
                  key={item.id}
                  disabled={isChecked}
                  onClick={() => {
                    if (isChecked) return;
                    setAssembledLetters(prev => [...prev, item.letter]);
                    setAvailableLetters(prev => prev.filter(l => l.id !== item.id));
                  }}
                  className={`w-9 h-11 sm:w-11 sm:h-12 rounded-xl border-2 ${theme.border} ${theme.card} font-serif font-bold text-base sm:text-lg shadow-xs flex items-center justify-center uppercase hover:border-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all select-none cursor-pointer`}
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

        {/* 4b. MEMRISE TYPING DRILL */}
        {currentEx.type === 'typing' && (
          <div className="space-y-4 pt-2">
            {currentEx.hint && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span><strong>Gợi ý:</strong> {currentEx.hint}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                Gõ chính xác từ vựng bằng tiếng Anh:
              </label>
              <input
                id="input-memrise-typing"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck="false"
                disabled={isChecked}
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
                placeholder="Gõ từ vựng tiếng Anh..."
                className={`w-full p-4 rounded-xl ${theme.inputBg} text-lg font-bold text-center border ${theme.border} focus:border-emerald-500 transition-all`}
              />
            </div>
          </div>
        )}

        {/* 4b. PASSAGE CLOZE / INFORMATION COMPLETION FOR READING & LISTENING */}
        {(currentEx.type === 'reading' || currentEx.type === 'listening') && currentEx.passageClozeText && (
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>Đoạn văn điền khuyết: Tìm thông tin và điền từ chính xác vào các chỗ trống bên dưới:</span>
            </div>
            <div className="text-sm sm:text-base leading-loose font-serif select-text">
              {parseClozePassage(currentEx.passageClozeText).map((part, pIdx) => {
                if (part.type === 'text') {
                  return <span key={pIdx} className="whitespace-pre-wrap">{part.content}</span>;
                }
                const bIdx = part.blankIdx!;
                const userVal = clozeAnswers[bIdx] || '';
                const acceptable = (part.answer || '').split(/[/|]/).map(a => a.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
                const isBlankCorrect = acceptable.includes(userVal.trim().toLowerCase().replace(/[.,!?;:]/g, ''));

                return (
                  <span key={pIdx} className="inline-flex items-center mx-1.5 my-1 align-middle">
                    <span className="text-[10px] font-bold text-neutral-400 mr-1">({bIdx + 1})</span>
                    <input
                      type="text"
                      disabled={isChecked}
                      value={userVal}
                      onChange={e => setClozeAnswers(prev => ({ ...prev, [bIdx]: e.target.value }))}
                      placeholder="..."
                      className={`px-2.5 py-1 rounded-lg border text-sm font-sans font-semibold transition-all outline-none ${
                        isChecked
                          ? isBlankCorrect
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          : `${theme.inputBg} ${theme.border} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500`
                      }`}
                      style={{ width: `${Math.max(80, (part.answer?.length || 5) * 12 + 25)}px` }}
                    />
                    {isChecked && !isBlankCorrect && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold">
                        {part.answer}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 4c. SUB-QUESTIONS (MULTIPLE CHOICE, TRUE/FALSE, FILL BLANK, INFORMATION GAP) */}
        {(currentEx.type === 'reading' || currentEx.type === 'listening') && !currentEx.passageClozeText && currentEx.subQuestions && currentEx.subQuestions.length > 0 && (
          <div className="space-y-4 pt-1">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Danh sách các câu hỏi ({currentEx.subQuestions.length} câu):</span>
              <span className={`text-[11px] ${theme.textMuted} font-normal`}>Đọc/nghe kỹ bài để trả lời</span>
            </div>

            <div className="space-y-3.5">
              {currentEx.subQuestions.map((subQ, idx) => {
                let isSubCorrect = false;
                if (isChecked) {
                  if (subQ.type === 'multiple_choice') {
                    isSubCorrect = subAnswers[subQ.id] === subQ.correctOptionIdx;
                  } else if (subQ.type === 'true_false') {
                    isSubCorrect = subAnswers[subQ.id] === (subQ.correctTrueFalse ?? true);
                  } else {
                    const cleanUser = String(subAnswers[subQ.id] || '').trim().toLowerCase().replace(/[.,!?;:]/g, '');
                    const validAnswers = (subQ.correctText || '').split(/[/|]/).map(a => a.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
                    isSubCorrect = validAnswers.includes(cleanUser);
                  }
                }

                return (
                  <div
                    key={subQ.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isChecked
                        ? isSubCorrect
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-rose-500/50 bg-rose-500/5'
                        : `${theme.card} ${theme.border}`
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isChecked
                          ? isSubCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs sm:text-sm font-semibold leading-relaxed select-text">
                          {subQ.prompt}
                        </div>
                        {subQ.type === 'info_gap' && (
                          <span className="text-[10px] text-sky-500 font-medium block mt-0.5">
                            * Information Gap: Đọc và trích xuất thông tin từ bài để điền
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Multiple Choice SubQuestion */}
                    {subQ.type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-0 sm:pl-8">
                        {(subQ.options || []).map((opt, optIdx) => {
                          const isSelected = subAnswers[subQ.id] === optIdx;
                          const isTarget = subQ.correctOptionIdx === optIdx;
                          let optStyle = `${theme.card} ${theme.border} hover:border-emerald-500/50`;
                          if (isChecked) {
                            if (isTarget) {
                              optStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold';
                            } else if (isSelected && !isTarget) {
                              optStyle = 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400';
                            } else {
                              optStyle = 'opacity-40';
                            }
                          } else if (isSelected) {
                            optStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={isChecked}
                              onClick={() => setSubAnswers(prev => ({ ...prev, [subQ.id]: optIdx }))}
                              className={`p-3 rounded-xl border text-left text-xs flex items-start gap-2.5 transition-all cursor-pointer ${optStyle}`}
                            >
                              {showABCD && (
                                <span className="w-5 h-5 rounded bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                              )}
                              <span className="flex-1 break-words whitespace-normal leading-relaxed text-left">{opt}</span>
                              {isChecked && isTarget && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False SubQuestion */}
                    {subQ.type === 'true_false' && (
                      <div className="flex items-center gap-3 pt-1 pl-8">
                        {[
                          { label: 'Đúng (True)', val: true },
                          { label: 'Sai (False)', val: false },
                        ].map(choice => {
                          const isSelected = subAnswers[subQ.id] === choice.val;
                          const isTarget = (subQ.correctTrueFalse ?? true) === choice.val;
                          let btnStyle = `${theme.card} ${theme.border} hover:border-emerald-500/50`;
                          if (isChecked) {
                            if (isTarget) {
                              btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold';
                            } else if (isSelected && !isTarget) {
                              btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400';
                            } else {
                              btnStyle = 'opacity-40';
                            }
                          } else if (isSelected) {
                            btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
                          }

                          return (
                            <button
                              key={String(choice.val)}
                              type="button"
                              disabled={isChecked}
                              onClick={() => setSubAnswers(prev => ({ ...prev, [subQ.id]: choice.val }))}
                              className={`px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${btnStyle}`}
                            >
                              {choice.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill blank or Info Gap SubQuestion */}
                    {(subQ.type === 'fill_blank' || subQ.type === 'info_gap') && (
                      <div className="pl-8 space-y-1.5 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            disabled={isChecked}
                            value={String(subAnswers[subQ.id] || '')}
                            onChange={e => setSubAnswers(prev => ({ ...prev, [subQ.id]: e.target.value }))}
                            placeholder={subQ.type === 'info_gap' ? "Gõ thông tin trích xuất từ bài..." : "Nhập từ cần điền..."}
                            className={`flex-1 p-2.5 rounded-lg text-xs font-semibold border ${
                              isChecked
                                ? isSubCorrect
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : `${theme.inputBg} ${theme.border} focus:border-emerald-500`
                            }`}
                          />
                        </div>
                        {isChecked && !isSubCorrect && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Đáp án đúng: <strong>{subQ.correctText}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SubQuestion Explanation */}
                    {isChecked && subQ.explanation && (
                      <div className="mt-2.5 pl-8 text-[11px] text-amber-500 border-t border-inherit pt-1.5">
                        💡 <strong>Giải thích:</strong> {subQ.explanation}
                      </div>
                    )}

                    {/* SubQuestion Evidence */}
                    {isChecked && subQ.evidence && (
                      <div className="mt-1.5 pl-8 text-[11px] text-sky-600 dark:text-sky-400 flex items-start gap-1">
                        <span>🔍</span>
                        <div>
                          <strong>Dẫn chứng từ bài đọc:</strong> "{subQ.evidence}"
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. MULTIPLE CHOICE / COLLOCATION / TRUE_FALSE / READING / MIXED PRACTICE OPTIONS (STANDARD SINGLE-QUESTION) */}
        {!currentEx.passageClozeText && !(currentEx.subQuestions && currentEx.subQuestions.length > 0) && (currentEx.type === 'multiple_choice' || currentEx.type === 'collocation' || currentEx.type === 'true_false' || currentEx.type === 'image_identify' || currentEx.type === 'reading' || currentEx.type === 'listening' || (currentEx.type === 'mixed_practice' && currentEx.options && currentEx.options.length > 0)) && (() => {
          const effectiveLayout = currentEx.mcLayout || mcLayout;
          const effectiveShowABCD = currentEx.showOptionLabels !== undefined ? currentEx.showOptionLabels : showABCD;
          const optionList = currentEx.type === 'true_false' ? ['Đúng (True)', 'Sai (False)'] : (currentEx.options || []);

          return (
            <div className="space-y-2.5 pt-1">
              {/* Question Header & Layout / ABCD Setting Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                    Lựa chọn đáp án:
                  </span>
                  {currentEx.isReverseChoice && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                      🔄 Trắc nghiệm đảo ngược (Nghĩa ➔ Từ)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  {/* Quick Toggle ABCD */}
                  <button
                    id="btn-toggle-abcd"
                    type="button"
                    onClick={() => {
                      const next = !showABCD;
                      setShowABCD(next);
                      localStorage.setItem('app_quiz_show_abcd', String(next));
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      effectiveShowABCD
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-400 line-through'
                    }`}
                    title={effectiveShowABCD ? "Đang hiện nhãn A-B-C-D. Nhấn để tắt (giúp tránh nhiễu não, tập trung vào từ)" : "Đang ẩn nhãn ABCD. Nhấn để bật lại"}
                  >
                    <span className="font-bold">ABCD:</span>
                    <span>{effectiveShowABCD ? 'Bật' : 'Tắt (Chống nhiễu)'}</span>
                  </button>

                  {/* Quick Switch Layout */}
                  <button
                    id="btn-switch-mc-layout"
                    type="button"
                    onClick={() => {
                      const next = effectiveLayout === 'stacked' ? 'grid_2x2' : 'stacked';
                      setMcLayout(next);
                      localStorage.setItem('app_quiz_mc_layout', next);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      effectiveLayout === 'grid_2x2'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                        : `${theme.badgeBg} ${theme.border} text-neutral-600 dark:text-neutral-300`
                    }`}
                    title="Chuyển đổi kiểu: Khung chữ nhật xếp chồng (mặc định) / 4 ô vuông dạng Quiz"
                  >
                    {effectiveLayout === 'grid_2x2' ? (
                      <>
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>4 ô vuông</span>
                      </>
                    ) : (
                      <>
                        <List className="w-3.5 h-3.5" />
                        <span>Xếp chồng</span>
                      </>
                    )}
                  </button>

                  {/* Setting modal opener */}
                  <button
                    id="btn-open-mc-settings"
                    type="button"
                    onClick={() => setShowMcSettingsModal(true)}
                    className={`p-1.5 rounded-lg border ${theme.border} ${theme.badgeBg} hover:opacity-80 text-neutral-500 hover:text-emerald-500 transition-all cursor-pointer`}
                    title="Cài đặt bố cục & hiển thị câu hỏi trắc nghiệm"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Layout 1: 4 ô vuông (Lưới 2x2 như app Quiz) */}
              {effectiveLayout === 'grid_2x2' ? (() => {
                const hasLongOption = optionList.some(o => typeof o === 'string' && o.length > 35);
                return (
                  <div className={`grid ${hasLongOption ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} gap-2.5 sm:gap-3 pt-1`}>
                    {optionList.map((option, idx) => {
                      const isSelected = selectedOptions.includes(idx);
                      const isTargetCorrect = currentEx.correctOptions?.includes(idx);

                      let buttonStyle = `${theme.card} ${theme.border} hover:border-emerald-500/60 hover:shadow-xs`;
                      if (isChecked) {
                        if (isTargetCorrect) {
                          buttonStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500/30';
                        } else if (isSelected && !isTargetCorrect) {
                          buttonStyle = 'border-rose-500 bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30';
                        } else {
                          buttonStyle = `${theme.card} opacity-40`;
                        }
                      } else if (isSelected) {
                        buttonStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs ring-1 ring-emerald-500/30';
                      }

                      return (
                        <button
                          key={idx}
                          id={`btn-option-${idx}`}
                          disabled={isChecked}
                          onClick={() => setSelectedOptions([idx])}
                          className={`p-4 sm:p-5 rounded-2xl border text-center flex flex-col items-center justify-center min-h-[90px] h-auto text-xs sm:text-sm font-semibold transition-all relative group cursor-pointer select-none ${buttonStyle}`}
                        >
                          {effectiveShowABCD && (
                            <span className="absolute top-2.5 left-2.5 w-6 h-6 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-[10px] sm:text-[11px] text-neutral-600 dark:text-neutral-300">
                              {String.fromCharCode(65 + idx)}
                            </span>
                          )}
                          <span className="leading-relaxed break-words whitespace-normal px-4 max-w-full text-center">
                            {option}
                          </span>
                          {isChecked && isTargetCorrect && (
                            <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })() : (
                /* Layout 2: Khung chữ nhật xếp chồng (Mặc định) */
                <div className="space-y-2 pt-1">
                  {optionList.map((option, idx) => {
                    const isSelected = selectedOptions.includes(idx);
                    const isTargetCorrect = currentEx.correctOptions?.includes(idx);

                    let buttonStyle = `${theme.card} ${theme.border} hover:border-emerald-500/50`;
                    if (isChecked) {
                      if (isTargetCorrect) {
                        buttonStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
                      } else if (isSelected && !isTargetCorrect) {
                        buttonStyle = 'border-rose-500 bg-rose-500/15 text-rose-500';
                      } else {
                        buttonStyle = `${theme.card} opacity-50`;
                      }
                    } else if (isSelected) {
                      buttonStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs';
                    }

                    return (
                      <button
                        key={idx}
                        id={`btn-option-${idx}`}
                        disabled={isChecked}
                        onClick={() => setSelectedOptions([idx])}
                        className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start justify-between gap-3 text-xs sm:text-sm font-medium transition-all cursor-pointer select-none ${buttonStyle}`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {effectiveShowABCD && (
                            <span className="w-6 h-6 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-[11px] shrink-0 text-neutral-600 dark:text-neutral-300 mt-0.5">
                              {String.fromCharCode(65 + idx)}
                            </span>
                          )}
                          <span className="leading-relaxed break-words whitespace-normal flex-1">{option}</span>
                        </div>
                        {isChecked && isTargetCorrect && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 6. FILL BLANK / FILL IN BLANK / TRANSLATION / MIXED PRACTICE TEXT */}
        {(currentEx.type === 'fill_blank' || currentEx.type === 'fill_in_blank' || currentEx.type === 'translation' || (currentEx.type === 'mixed_practice' && !currentEx.options?.length && !currentEx.matchingPairs?.length)) && (
          <div className="space-y-3 pt-1">
            {currentEx.hint && (
              <div className={`p-3 rounded-xl border ${theme.border} bg-amber-500/10 border-amber-500/20 text-amber-500 text-xs flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>Gợi ý: <strong>{currentEx.hint}</strong></span>
              </div>
            )}
            <input
              id="input-text-answer"
              type="text"
              autoFocus
              disabled={isChecked}
              value={textAnswer}
              onChange={e => setTextAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isChecked && handleCheck()}
              placeholder="Nhập câu trả lời hoặc từ cần điền..."
              className={`w-full p-3.5 rounded-xl ${theme.inputBg} text-base font-semibold border ${theme.border} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500`}
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
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                <span className="font-bold text-rose-600 dark:text-rose-400 block text-[11px] uppercase tracking-wider">
                  Câu chứa lỗi sai:
                </span>
                <p className={`text-sm font-semibold leading-relaxed select-text ${
                  settings.theme === 'light' 
                    ? 'text-rose-950' 
                    : settings.theme === 'sepia' 
                    ? 'text-[#4a1515]' 
                    : 'text-rose-200'
                }`}>
                  {currentEx.wrongSentence}
                </p>
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

        {/* 11. PRONUNCIATION & SPEAKING DRILL */}
        {(currentEx.type === 'pronunciation' || currentEx.type === 'speaking') && (
          <InteractivePronunciationPractice
            exercise={currentEx}
            disabled={isChecked}
            onEvaluationComplete={(isPassed, spokenText, accuracyPercent) => {
              setSpokenTranscript(spokenText);
              if (isPassed) {
                // Tự động kiểm tra và hoàn thành câu khi đọc đúng
                handleCheck(true, `${spokenText} (${accuracyPercent}%)`);
              }
            }}
          />
        )}

        {/* ------------------------------------------------------------- */}
        {/* CHECK & FEEDBACK SECTION */}
        {/* ------------------------------------------------------------- */}

        {!isChecked ? (
          currentEx.type !== 'flashcard_recall' && (
            <div className="pt-3 flex items-center gap-2.5">
              {currentIndex > 0 && (
                <button
                  id="btn-prev-question-bottom"
                  type="button"
                  onClick={handlePrevious}
                  className={`py-3.5 px-4 rounded-xl border ${theme.border} ${theme.card} hover:${theme.highlight} text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95`}
                  title="Quay lại câu trước"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>
              )}
              <button
                id="btn-check-practice-answer"
                onClick={() => handleCheck()}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
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

            {/* Action buttons: Prev / Retry / Next */}
            <div className="pt-2 flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {currentIndex > 0 && (
                <button
                  id="btn-prev-question-after-check"
                  type="button"
                  onClick={handlePrevious}
                  className={`py-2.5 px-3.5 rounded-xl border ${theme.border} ${theme.card} hover:${theme.highlight} text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95`}
                  title="Quay lại câu trước"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                </button>
              )}
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span>{currentIndex < availableExercises.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL HOÀN THÀNH ĐỢT (Round Completion Interstitial Modal) */}
      {showRoundCompleteModal && (
        <div 
          id="modal-round-complete"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            className={`w-full max-w-md ${theme.card} border ${theme.border} rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200`}
          >
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>

            {/* Title & Info */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <span>ĐỢT {roundData.currentRound} / {roundData.totalRounds} HOÀN TẤT</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                Hoàn thành xuất sắc Đợt {roundData.currentRound}!
              </h3>
              <p className={`text-xs sm:text-sm ${theme.textMuted} leading-relaxed`}>
                Bạn đã nắm vững {roundData.roundWords.length} thẻ từ vựng và hoàn thành {roundData.roundTotalItems - roundData.roundWords.length} câu Quiz của đợt này.
              </p>
            </div>

            {/* Mastered Words in this Round */}
            {roundData.roundWords.length > 0 && (
              <div className={`p-4 rounded-2xl ${theme.highlight} border ${theme.border} space-y-2 text-left`}>
                <span className={`text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider block`}>
                  Từ vựng đã làm chủ ở đợt này:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {roundData.roundWords.map((w, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/25 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action button: Proceed to next round */}
            <button
              id="btn-continue-next-round"
              onClick={handleStartNextRound}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <span>Bắt đầu Đợt {roundData.currentRound + 1} ({roundData.allRounds[roundData.currentRound]?.words.length || 3} từ tiếp theo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT CÂU HỎI TRẮC NGHIỆM (Multiple Choice Settings Modal) */}
      {showMcSettingsModal && (
        <div 
          id="modal-mc-settings"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowMcSettingsModal(false)}
        >
          <div 
            className={`w-full max-w-md ${theme.card} border ${theme.border} rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-scaleUp`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Cài đặt câu hỏi trắc nghiệm
                  </h3>
                  <p className={`text-[11px] ${theme.textMuted}`}>
                    Tùy chỉnh giao diện theo phong cách học tập của bạn
                  </p>
                </div>
              </div>
              <button
                id="btn-close-mc-settings"
                type="button"
                onClick={() => setShowMcSettingsModal(false)}
                className={`p-1.5 rounded-lg border ${theme.border} hover:opacity-75 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Setting 1: Layout Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-sky-500" />
                  <span>Bố cục các ô đáp án</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {mcLayout === 'stacked' ? 'Mặc định: Xếp chồng' : 'Đang chọn: 4 ô vuông'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Stacked Option */}
                <button
                  id="btn-setting-layout-stacked"
                  type="button"
                  onClick={() => {
                    setMcLayout('stacked');
                    localStorage.setItem('app_quiz_mc_layout', 'stacked');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    mcLayout === 'stacked'
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : `${theme.border} ${theme.badgeBg} hover:border-neutral-400 dark:hover:border-neutral-600`
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <List className="w-4 h-4" />
                      <span>Xếp chồng</span>
                    </span>
                    {mcLayout === 'stacked' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className={`text-[10px] leading-snug ${mcLayout === 'stacked' ? 'text-emerald-700/80 dark:text-emerald-300/80' : theme.textMuted}`}>
                    Khung chữ nhật nằm ngang xếp dọc như bản cũ (dễ đọc câu dài).
                  </p>
                </button>

                {/* 4 Square Grid Option */}
                <button
                  id="btn-setting-layout-grid"
                  type="button"
                  onClick={() => {
                    setMcLayout('grid_2x2');
                    localStorage.setItem('app_quiz_mc_layout', 'grid_2x2');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    mcLayout === 'grid_2x2'
                      ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/30 text-sky-600 dark:text-sky-400'
                      : `${theme.border} ${theme.badgeBg} hover:border-neutral-400 dark:hover:border-neutral-600`
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <LayoutGrid className="w-4 h-4" />
                      <span>4 ô vuông (Quiz)</span>
                    </span>
                    {mcLayout === 'grid_2x2' && <Check className="w-4 h-4 text-sky-500" />}
                  </div>
                  <p className={`text-[10px] leading-snug ${mcLayout === 'grid_2x2' ? 'text-sky-700/80 dark:text-sky-300/80' : theme.textMuted}`}>
                    Lưới 4 khối vuông cân xứng như app Quiz / Kahoot / Duolingo.
                  </p>
                </button>
              </div>
            </div>

            {/* Setting 2: ABCD Toggle */}
            <div className="space-y-2.5 pt-2 border-t border-inherit">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                    Hiển thị nhãn A, B, C, D
                  </span>
                  <p className={`text-[10px] ${theme.textMuted} mt-0.5 max-w-[260px]`}>
                    Tắt đi khi bạn cảm thấy chữ cái làm <strong className="text-neutral-700 dark:text-neutral-300">nhiễu não</strong>, giúp tập trung 100% vào từ vựng.
                  </p>
                </div>

                {/* Toggle switch button */}
                <button
                  id="btn-setting-toggle-abcd"
                  type="button"
                  onClick={() => {
                    const next = !showABCD;
                    setShowABCD(next);
                    localStorage.setItem('app_quiz_show_abcd', String(next));
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    showABCD ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showABCD ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status explanation */}
              <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2 ${
                showABCD 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {showABCD 
                    ? 'Đang BẬT nhãn: Mỗi ô sẽ có chữ A, B, C, D đứng đầu.' 
                    : 'Đang TẮT nhãn (Chống nhiễu não): Chỉ hiển thị nội dung đáp án thuần túy.'}
                </span>
              </div>
            </div>

            {/* Footer / Apply */}
            <div className="pt-2">
              <button
                id="btn-apply-mc-settings"
                type="button"
                onClick={() => setShowMcSettingsModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
              >
                Đã hiểu & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
