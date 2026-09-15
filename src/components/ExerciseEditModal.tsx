import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  HelpCircle, 
  Volume2, 
  FileText,
  Plus,
  Trash2,
  BookOpen,
  EyeOff,
  Eye,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Exercise, 
  ExerciseType, 
  SkillCategory, 
  DifficultyLevel,
  MatchingPair,
  MediaAsset,
  SubQuestion,
  SubQuestionType 
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { MediaLibraryModal } from './MediaLibraryModal';

interface ExerciseEditModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedExercise: Exercise) => void;
}

const EXERCISE_TYPES: { type: ExerciseType; label: string }[] = [
  { type: 'vocab_cloze', label: 'Khuyết ký tự từ vựng (Spelling Cloze)' },
  { type: 'flashcard_recall', label: 'Lật thẻ ghi nhớ (Flashcard Recall)' },
  { type: 'listen_spell', label: 'Nghe phát âm & gõ từ (Dictation)' },
  { type: 'anagram', label: 'Xếp chữ cái thành từ (Anagram)' },
  { type: 'collocation', label: 'Ghép cụm từ cố định (Collocation)' },
  { type: 'multiple_choice', label: 'Trắc nghiệm chọn đáp án' },
  { type: 'true_false', label: 'Đúng / Sai (True/False)' },
  { type: 'fill_blank', label: 'Điền từ vào chỗ trống' },
  { type: 'sentence_builder', label: 'Sắp xếp từ thành câu' },
  { type: 'matching', label: 'Nối cặp (Matching)' },
  { type: 'error_correction', label: 'Tìm và sửa lỗi sai' },
  { type: 'translation', label: 'Dịch câu (Việt ↔ Anh)' },
  { type: 'speaking', label: 'Luyện nói (Speaking)' },
  { type: 'writing', label: 'Luyện viết (Writing)' },
  { type: 'reading', label: 'Đọc hiểu (Reading)' },
  { type: 'listening', label: 'Luyện nghe (Listening)' },
  { type: 'mixed_practice', label: 'Bài tập tổng hợp' },
];

export const ExerciseEditModal: React.FC<ExerciseEditModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onSave,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [exType, setExType] = useState<ExerciseType>('multiple_choice');
  const [exSkill, setExSkill] = useState<SkillCategory>('vocabulary');
  const [exDifficulty, setExDifficulty] = useState<DifficultyLevel>('guided');
  const [exQuestion, setExQuestion] = useState('');
  const [exInstruction, setExInstruction] = useState('');
  const [exContext, setExContext] = useState('');
  const [exExplanation, setExExplanation] = useState('');
  const [exGrammarHint, setExGrammarHint] = useState('');
  const [exCorrectText, setExCorrectText] = useState('');
  const [exWrongSentence, setExWrongSentence] = useState('');
  const [exErrorType, setExErrorType] = useState('');
  const [exIsHidden, setExIsHidden] = useState<boolean>(false);

  // Vocab fields
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [clozeLetters, setClozeLetters] = useState('');

  // Options
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);

  // Matching
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reading specific
  const [readingQuestionType, setReadingQuestionType] = useState('Main Idea');
  const [evidenceRegion, setEvidenceRegion] = useState('');

  // Audio / Listening fields
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [audioText, setAudioText] = useState('');
  const [predictionHint, setPredictionHint] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Comprehension mode & SubQuestions for Reading and Listening
  const [comprehensionMode, setComprehensionMode] = useState<'multiple_sub' | 'passage_cloze'>('multiple_sub');
  const [passageClozeText, setPassageClozeText] = useState('');
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([]);

  // Load exercise data on open
  useEffect(() => {
    if (!exercise || !isOpen) return;

    setExType(exercise.type);
    setExSkill(exercise.skill);
    setExDifficulty(exercise.difficulty || 'guided');
    setExQuestion(exercise.question || '');
    setExInstruction(exercise.instruction || '');
    setExContext(exercise.context || '');
    setExExplanation(exercise.explanation || '');
    setExGrammarHint(exercise.grammarHint || '');
    setExCorrectText(exercise.correctText || '');
    setExWrongSentence(exercise.wrongSentence || '');
    setExErrorType(exercise.errorType || '');
    setExIsHidden(!!exercise.isHidden);

    // Audio / Listening
    setAudioUrl(exercise.audioUrl || '');
    setAudioTitle(exercise.audioTitle || '');
    setAudioText(exercise.audioText || '');
    setPredictionHint(exercise.audioPredictionHint || '');
    setTranscript(exercise.transcript || '');

    // Reading
    setReadingQuestionType(exercise.readingQuestionType || 'Main Idea');
    setEvidenceRegion(exercise.evidenceRegion || '');

    // Vocab
    setVocabWord(exercise.vocabWord || exercise.correctText || '');
    setVocabMeaning(exercise.vocabMeaning || '');
    setPhonetic(exercise.phonetic || '');
    setClozeLetters(exercise.clozeLetters || '');

    // Options
    if (exercise.options && exercise.options.length > 0) {
      setOptions(exercise.options);
      setCorrectOptionIdx(exercise.correctOptions?.[0] || 0);
    } else {
      setOptions(['', '', '', '']);
      setCorrectOptionIdx(0);
    }

    // Matching
    if (exercise.matchingPairs && exercise.matchingPairs.length > 0) {
      setMatchingPairs(exercise.matchingPairs);
    } else {
      setMatchingPairs([
        { id: '1', left: '', right: '' },
        { id: '2', left: '', right: '' },
      ]);
    }

    // SubQuestions & Cloze Passage
    if (exercise.subQuestions && exercise.subQuestions.length > 0) {
      setSubQuestions(exercise.subQuestions);
      setComprehensionMode('multiple_sub');
      setPassageClozeText(exercise.passageClozeText || '');
    } else if (exercise.passageClozeText) {
      setPassageClozeText(exercise.passageClozeText);
      setComprehensionMode('passage_cloze');
      setSubQuestions([]);
    } else if (exercise.type === 'reading' || exercise.type === 'listening') {
      // If reading/listening was previously saved as single multiple choice, map it to 1 subQuestion
      setComprehensionMode('multiple_sub');
      if (exercise.options && exercise.options.length > 0) {
        setSubQuestions([{
          id: 'sub_' + Date.now(),
          type: 'multiple_choice',
          prompt: exercise.question || 'Chọn đáp án chính xác nhất:',
          options: [...exercise.options],
          correctOptionIdx: exercise.correctOptions?.[0] || 0,
          explanation: exercise.explanation || '',
        }]);
      } else {
        setSubQuestions([{
          id: 'sub_' + Date.now(),
          type: 'multiple_choice',
          prompt: '',
          options: ['', '', '', ''],
          correctOptionIdx: 0,
          explanation: '',
        }]);
      }
    } else {
      setSubQuestions([]);
      setPassageClozeText('');
    }

    setErrorMessage(null);
  }, [exercise, isOpen]);

  // SubQuestion Helpers
  const handleAddSubQuestion = (type: SubQuestionType = 'multiple_choice') => {
    const newSub: SubQuestion = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type,
      prompt: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : undefined,
      correctOptionIdx: 0,
      correctTrueFalse: true,
      correctText: '',
      explanation: '',
    };
    setSubQuestions(prev => [...prev, newSub]);
  };

  const handleRemoveSubQuestion = (index: number) => {
    setSubQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateSubQuestion = (index: number, updates: Partial<SubQuestion>) => {
    setSubQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Matching Pair Helpers
  const handleAddMatchingPair = () => {
    setMatchingPairs(prev => [
      ...prev,
      { id: 'pair_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6), left: '', right: '' },
    ]);
  };

  const handleRemoveMatchingPair = (index: number) => {
    setMatchingPairs(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMatchingPair = (index: number, field: 'left' | 'right', value: string) => {
    setMatchingPairs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  if (!isOpen || !exercise) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exQuestion.trim() && !vocabWord.trim() && !exContext.trim() && subQuestions.length === 0 && !passageClozeText.trim()) {
      setErrorMessage('Vui lòng nhập nội dung đề bài hoặc câu hỏi.');
      return;
    }
    setErrorMessage(null);

    const updated: Exercise = {
      ...exercise,
      type: exType,
      skill: exSkill,
      difficulty: exDifficulty,
      question: exQuestion.trim() || (comprehensionMode === 'passage_cloze' ? 'Nghe/Đọc và điền từ thích hợp vào chỗ trống' : (vocabMeaning ? `Nghĩa: ${vocabMeaning}` : 'Câu hỏi:')),
      instruction: exInstruction.trim() || undefined,
      context: (exType === 'reading' || exType === 'speaking') && exContext.trim() ? exContext.trim() : undefined,
      explanation: exExplanation.trim() || undefined,
      grammarHint: exGrammarHint.trim() || undefined,
      correctText: exCorrectText.trim() || vocabWord.trim() || undefined,
      vocabWord: vocabWord.trim() || undefined,
      vocabMeaning: vocabMeaning.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      clozeLetters: clozeLetters.trim() || undefined,
      isHidden: exIsHidden,
    };

    // Extended reading / listening: Multiple sub-questions or cloze passage
    if ((exType === 'reading' || exType === 'listening') && comprehensionMode === 'multiple_sub') {
      updated.subQuestions = subQuestions.filter(q => q.prompt.trim().length > 0 || (q.options && q.options.some(o => o.trim().length > 0)));
      updated.passageClozeText = undefined;
    } else if ((exType === 'reading' || exType === 'listening') && comprehensionMode === 'passage_cloze') {
      updated.passageClozeText = passageClozeText.trim();
      updated.subQuestions = undefined;
    }

    if (exType === 'multiple_choice' || exType === 'collocation' || exType === 'image_identify') {
      updated.options = options.filter(o => o.trim().length > 0);
      updated.correctOptions = [correctOptionIdx];
    } else if (exType === 'true_false') {
      updated.correctOptions = [correctOptionIdx];
    } else if (exType === 'matching') {
      updated.matchingPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
    } else if (exType === 'error_correction') {
      updated.wrongSentence = exWrongSentence.trim();
      updated.errorType = exErrorType.trim();
    } else if (exType === 'sentence_builder') {
      updated.scrambledWords = (exCorrectText.trim() || vocabWord.trim()).split(/\s+/);
    } else if (exType === 'listening') {
      updated.audioUrl = audioUrl.trim() || undefined;
      updated.audioTitle = audioTitle.trim() || undefined;
      updated.audioText = audioText.trim() || undefined;
      updated.audioPredictionHint = predictionHint.trim() || undefined;
      updated.transcript = transcript.trim() || undefined;
    } else if (exType === 'reading') {
      updated.readingQuestionType = readingQuestionType;
      updated.evidenceRegion = evidenceRegion.trim() || undefined;
    }

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className={`w-full max-w-2xl ${theme.card} rounded-2xl shadow-2xl border ${theme.border} my-8 overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Modal Header */}
        <div className="p-4 border-b border-inherit flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <div>
              <h3 className="font-bold text-sm">Chỉnh sửa câu hỏi bài tập</h3>
              <p className={`text-[10px] ${theme.textMuted}`}>Cập nhật nội dung, đáp án & cài đặt hiển thị</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.highlight} hover:opacity-80 cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Visibility Toggle Switch */}
          <div className={`p-3 rounded-xl border ${exIsHidden ? 'border-amber-500/30 bg-amber-500/5' : 'border-neutral-500/20 bg-neutral-500/5'} flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              {exIsHidden ? (
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <EyeOff className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="text-xs font-bold block">
                  {exIsHidden ? 'Đang ẩn câu hỏi với học sinh' : 'Hiển thị câu hỏi với học sinh'}
                </span>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  {exIsHidden 
                    ? 'Học sinh sẽ không thấy câu này khi làm bài luyện tập của bài học' 
                    : 'Học sinh có thể luyện tập câu hỏi này'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={exIsHidden}
                onChange={e => setExIsHidden(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Type & Skill & Difficulty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Dạng bài tập:
              </label>
              <select
                value={exType}
                onChange={e => {
                  const newType = e.target.value as ExerciseType;
                  setExType(newType);
                  if (newType === 'reading' || newType === 'listening') {
                    setExSkill(newType);
                    setComprehensionMode('multiple_sub');
                    if (subQuestions.length === 0) {
                      handleAddSubQuestion('multiple_choice');
                    }
                  } else if (newType === 'vocab_cloze' || newType === 'flashcard_recall' || newType === 'listen_spell' || newType === 'anagram') {
                    setExSkill('vocabulary');
                  }
                }}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
              >
                {EXERCISE_TYPES.map(t => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Kỹ năng chính:
              </label>
              <select
                value={exSkill}
                onChange={e => setExSkill(e.target.value as SkillCategory)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
              >
                <option value="vocabulary">Từ vựng (Vocabulary)</option>
                <option value="grammar">Ngữ pháp (Grammar)</option>
                <option value="pronunciation">Phát âm (Pronunciation)</option>
                <option value="reading">Đọc hiểu (Reading)</option>
                <option value="listening">Luyện nghe (Listening)</option>
                <option value="speaking">Nói (Speaking)</option>
                <option value="writing">Viết (Writing)</option>
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Cấp độ phân hóa:
              </label>
              <select
                value={exDifficulty}
                onChange={e => setExDifficulty(e.target.value as DifficultyLevel)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
              >
                <option value="guided">Nhận biết / Có gợi ý (Guided)</option>
                <option value="independent">Thông hiểu / Độc lập (Independent)</option>
                <option value="challenge">Vận dụng / Thử thách (Challenge)</option>
              </select>
            </div>
          </div>

          {/* Question Title */}
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Đề bài / Câu hỏi chính *:
            </label>
            <input
              type="text"
              value={exQuestion}
              onChange={e => setExQuestion(e.target.value)}
              placeholder="VD: Choose the best answer, Điền từ vào chỗ trống..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
            />
          </div>

          {/* Reading Passage */}
          {exType === 'reading' && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Đoạn văn đọc hiểu (Reading Passage):</span>
                </span>
                <span className={`text-[10px] ${theme.textMuted}`}>Học sinh sẽ đọc đoạn văn này để trả lời các câu hỏi</span>
              </div>
              <textarea
                rows={5}
                value={exContext}
                onChange={e => setExContext(e.target.value)}
                placeholder="Dán nội dung bài đọc vào đây..."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-serif leading-relaxed border ${theme.border}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className={`text-[11px] font-semibold ${theme.textMuted} block mb-1`}>
                    Dạng câu hỏi đọc hiểu:
                  </label>
                  <select
                    value={readingQuestionType}
                    onChange={e => setReadingQuestionType(e.target.value)}
                    className={`w-full p-1.5 rounded-lg ${theme.inputBg} text-xs border ${theme.border}`}
                  >
                    <option value="Main Idea">Ý chính toàn bài (Main Idea)</option>
                    <option value="Detail">Chi tiết sự kiện (Detail / Fact)</option>
                    <option value="Inference">Suy luận logic (Inference)</option>
                    <option value="Vocabulary in Context">Từ vựng theo ngữ cảnh (Vocabulary)</option>
                    <option value="Reference">Đại từ chỉ định (Reference)</option>
                    <option value="Author Attitude">Thái độ tác giả (Tone / Purpose)</option>
                  </select>
                </div>
                <div>
                  <label className={`text-[11px] font-semibold ${theme.textMuted} block mb-1`}>
                    Dẫn chứng bài đọc (Evidence):
                  </label>
                  <input
                    type="text"
                    value={evidenceRegion}
                    onChange={e => setEvidenceRegion(e.target.value)}
                    placeholder="VD: Dòng 3-5 đoạn 2..."
                    className={`w-full p-1.5 rounded-lg ${theme.inputBg} text-xs border ${theme.border}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Listening Audio Configuration */}
          {exType === 'listening' && (
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" />
                  <span>Cài đặt âm thanh bài nghe</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Kho Media / MP3</span>
                </button>
              </div>

              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Tiêu đề hiển thị thanh phát âm thanh:
                </label>
                <input
                  type="text"
                  value={audioTitle}
                  onChange={e => setAudioTitle(e.target.value)}
                  placeholder="VD: Conversation at the hotel reception..."
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  File âm thanh / Audio URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={audioUrl}
                    onChange={e => setAudioUrl(e.target.value)}
                    placeholder="https://... hoặc bấm nút Kho Media để tải file"
                    className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs font-mono border ${theme.border}`}
                  />
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() => setAudioUrl('')}
                      className="px-2 py-1 rounded-lg border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/10 cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Văn bản giọng đọc AI (TTS) (nếu không có file mp3):
                </label>
                <textarea
                  rows={2}
                  value={audioText}
                  onChange={e => setAudioText(e.target.value)}
                  placeholder="Nhập đoạn văn bản tiếng Anh để hệ thống tự phát âm chuẩn..."
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Gợi ý trước khi nghe (Prediction Hint):
                  </label>
                  <input
                    type="text"
                    value={predictionHint}
                    onChange={e => setPredictionHint(e.target.value)}
                    placeholder="VD: Chú ý nghe các con số và thời gian..."
                    className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Transcript (Lời thoại hiển thị khi chữa bài):
                  </label>
                  <input
                    type="text"
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder="Lời thoại bài nghe..."
                    className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comprehension Mode Selector for Reading & Listening */}
          {(exType === 'reading' || exType === 'listening') && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 block">
                  Cài đặt phương án làm bài ({exType === 'listening' ? 'Bài Nghe' : 'Đọc Hiểu'}):
                </span>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  Chọn thiết kế nhiều câu hỏi con (hoặc 1 câu đơn), hoặc nghe/đọc điền từ khuyết
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComprehensionMode('multiple_sub');
                    if (subQuestions.length === 0) {
                      handleAddSubQuestion('multiple_choice');
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    comprehensionMode === 'multiple_sub'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                      : `${theme.card} ${theme.border} hover:border-emerald-500/50`
                  }`}
                >
                  <div className="font-semibold">Nhiều câu hỏi con (hoặc 1 câu đơn)</div>
                  <div className={`text-[10px] ${theme.textMuted} font-normal mt-0.5`}>Trắc nghiệm, Đúng/Sai, Điền từ, Info Gap</div>
                </button>

                <button
                  type="button"
                  onClick={() => setComprehensionMode('passage_cloze')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    comprehensionMode === 'passage_cloze'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                      : `${theme.card} ${theme.border} hover:border-emerald-500/50`
                  }`}
                >
                  <div className="font-semibold">Nghe/Đọc điền từ khuyết</div>
                  <div className={`text-[10px] ${theme.textMuted} font-normal mt-0.5`}>Điền khuyết trực tiếp vào đoạn văn [...]</div>
                </button>
              </div>
            </div>
          )}

          {/* SubQuestions Manager for Reading & Listening */}
          {(exType === 'reading' || exType === 'listening') && comprehensionMode === 'multiple_sub' && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">
                    Danh sách câu hỏi con ({subQuestions.length} câu):
                  </span>
                  <span className={`text-[10px] ${theme.textMuted}`}>
                    Trắc nghiệm (Multiple Choice), Đúng/Sai (True/False), Điền từ, Info Gap
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddSubQuestion('multiple_choice')}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Trắc nghiệm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubQuestion('true_false')}
                    className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Đúng / Sai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubQuestion('fill_blank')}
                    className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Điền từ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubQuestion('info_gap')}
                    className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Info Gap</span>
                  </button>
                </div>
              </div>

              {subQuestions.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-inherit text-center text-xs text-neutral-400">
                  Chưa có câu hỏi con nào. Bấm nút phía trên để thêm câu hỏi.
                </div>
              ) : (
                <div className="space-y-3">
                  {subQuestions.map((subQ, idx) => (
                    <div key={subQ.id || idx} className={`p-3 rounded-xl border ${theme.border} ${theme.card} space-y-2.5 shadow-xs`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <select
                            value={subQ.type}
                            onChange={e => {
                              const newType = e.target.value as SubQuestionType;
                              handleUpdateSubQuestion(idx, {
                                type: newType,
                                options: newType === 'multiple_choice' ? (subQ.options?.length ? subQ.options : ['', '', '', '']) : undefined,
                                correctTrueFalse: newType === 'true_false' ? true : undefined,
                              });
                            }}
                            className={`p-1 rounded-lg ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
                          >
                            <option value="multiple_choice">Trắc nghiệm (Multiple Choice)</option>
                            <option value="true_false">Đúng / Sai (True / False)</option>
                            <option value="fill_blank">Điền khuyết (Fill in the blank)</option>
                            <option value="info_gap">Information Gap / Completion</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubQuestion(idx)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Xóa câu hỏi con này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Prompt */}
                      <div>
                        <input
                          type="text"
                          value={subQ.prompt}
                          onChange={e => handleUpdateSubQuestion(idx, { prompt: e.target.value })}
                          placeholder={
                            subQ.type === 'info_gap'
                              ? 'VD: The speaker mentions that the meeting will start at...'
                              : subQ.type === 'true_false'
                              ? 'VD: The company will expand to Asia next month.'
                              : `Nội dung câu hỏi con #${idx + 1}...`
                          }
                          className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-medium border ${theme.border}`}
                        />
                      </div>

                      {/* Multiple choice options */}
                      {subQ.type === 'multiple_choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(subQ.options || ['', '', '', '']).map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name={`edit_subq_correct_${idx}`}
                                checked={subQ.correctOptionIdx === oIdx}
                                onChange={() => handleUpdateSubQuestion(idx, { correctOptionIdx: oIdx })}
                                className="text-emerald-500"
                              />
                              <span className="text-xs font-bold w-4 text-neutral-400">{String.fromCharCode(65 + oIdx)}.</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const opts = [...(subQ.options || ['', '', '', ''])];
                                  opts[oIdx] = e.target.value;
                                  handleUpdateSubQuestion(idx, { options: opts });
                                }}
                                placeholder={`Lựa chọn ${String.fromCharCode(65 + oIdx)}`}
                                className={`flex-1 p-1.5 rounded-lg ${theme.inputBg} text-xs border ${theme.border}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* True / False */}
                      {subQ.type === 'true_false' && (
                        <div className="flex items-center gap-3 pt-1">
                          <span className={`text-xs ${theme.textMuted}`}>Đáp án đúng:</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSubQuestion(idx, { correctTrueFalse: true })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                              subQ.correctTrueFalse === true
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : `${theme.inputBg} ${theme.border} text-neutral-400`
                            }`}
                          >
                            Đúng (True)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSubQuestion(idx, { correctTrueFalse: false })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                              subQ.correctTrueFalse === false
                                ? 'bg-rose-600 text-white border-rose-500'
                                : `${theme.inputBg} ${theme.border} text-neutral-400`
                            }`}
                          >
                            Sai (False)
                          </button>
                        </div>
                      )}

                      {/* Fill blank & Info gap */}
                      {(subQ.type === 'fill_blank' || subQ.type === 'info_gap') && (
                        <div className="space-y-1 pt-1">
                          <label className={`text-[11px] font-semibold ${theme.textMuted} block`}>
                            Đáp án đúng (hỗ trợ nhiều đáp án phân tách bằng dấu / hoặc |):
                          </label>
                          <input
                            type="text"
                            value={subQ.correctText || ''}
                            onChange={e => handleUpdateSubQuestion(idx, { correctText: e.target.value })}
                            placeholder="VD: dolphin / dolphins hoặc 10 o'clock"
                            className={`w-full p-1.5 rounded-lg ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
                          />
                        </div>
                      )}

                      {/* Explanation */}
                      <div>
                        <input
                          type="text"
                          value={subQ.explanation || ''}
                          onChange={e => handleUpdateSubQuestion(idx, { explanation: e.target.value })}
                          placeholder="Giải thích đáp án cho câu hỏi con này (tùy chọn)..."
                          className={`w-full p-1.5 rounded-lg ${theme.inputBg} text-[11px] text-neutral-400 border ${theme.border}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cloze Passage for Reading & Listening */}
          {(exType === 'reading' || exType === 'listening') && comprehensionMode === 'passage_cloze' && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">
                    Đoạn văn điền từ khuyết (Passage Cloze):
                  </span>
                  <span className={`text-[11px] ${theme.textMuted}`}>
                    Đặt từ cần điền trong ngoặc vuông <strong>[từ_khuyết]</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPassageClozeText(prev => prev ? `${prev} [từ_khuyết]` : 'The speaker mentions [apple] and [banana].');
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Chèn [từ]</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={passageClozeText}
                onChange={e => setPassageClozeText(e.target.value)}
                placeholder="VD: She likes [reading] books in the [library] every weekend."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-mono leading-relaxed border ${theme.border}`}
              />
            </div>
          )}

          {/* Standard Multiple Choice Options (for multiple_choice, collocation, image_identify) */}
          {(exType === 'multiple_choice' || exType === 'collocation' || exType === 'image_identify') && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                Các lựa chọn (A, B, C, D) & Chọn đáp án đúng *:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-correct-opt-choice"
                      checked={correctOptionIdx === idx}
                      onChange={() => setCorrectOptionIdx(idx)}
                      className="text-emerald-500"
                    />
                    <span className="text-xs font-bold w-4">{String.fromCharCode(65 + idx)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...options];
                        next[idx] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True / False for standard true_false type */}
          {exType === 'true_false' && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                Đáp án chuẩn *:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="edit-tf-choice"
                    checked={correctOptionIdx === 0}
                    onChange={() => setCorrectOptionIdx(0)}
                    className="text-emerald-500"
                  />
                  <span>Đúng (True)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="edit-tf-choice"
                    checked={correctOptionIdx === 1}
                    onChange={() => setCorrectOptionIdx(1)}
                    className="text-emerald-500"
                  />
                  <span>Sai (False)</span>
                </label>
              </div>
            </div>
          )}

          {/* Vocab Cloze specific fields */}
          {exType === 'vocab_cloze' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-inherit">
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Từ đầy đủ *:</label>
                <input
                  type="text"
                  value={vocabWord}
                  onChange={e => setVocabWord(e.target.value)}
                  placeholder="VD: friendly"
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Nghĩa tiếng Việt:</label>
                <input
                  type="text"
                  value={vocabMeaning}
                  onChange={e => setVocabMeaning(e.target.value)}
                  placeholder="VD: thân thiện"
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Phiên âm:</label>
                <input
                  type="text"
                  value={phonetic}
                  onChange={e => setPhonetic(e.target.value)}
                  placeholder="VD: /ˈfrend.li/"
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Khuyết ký tự (gợi ý):</label>
                <input
                  type="text"
                  value={clozeLetters}
                  onChange={e => setClozeLetters(e.target.value)}
                  placeholder="VD: f _ _ e n d l y"
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
            </div>
          )}

          {/* Matching Pairs setup */}
          {exType === 'matching' && (
            <div className="space-y-2.5 p-3.5 rounded-xl border border-inherit">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">Các cặp nối (Cột A - Cột B):</span>
                <button
                  type="button"
                  onClick={handleAddMatchingPair}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm cặp nối</span>
                </button>
              </div>
              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={pair.id || idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold w-5 text-center text-neutral-400">{idx + 1}.</span>
                    <input
                      type="text"
                      value={pair.left}
                      onChange={e => handleUpdateMatchingPair(idx, 'left', e.target.value)}
                      placeholder="Cột A (Vế trái)"
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                    />
                    <span className="text-neutral-400">↔</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={e => handleUpdateMatchingPair(idx, 'right', e.target.value)}
                      placeholder="Cột B (Vế phải)"
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                    />
                    {matchingPairs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMatchingPair(idx)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error correction */}
          {exType === 'error_correction' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-inherit">
              <div className="sm:col-span-2">
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Câu chứa lỗi sai *:</label>
                <input
                  type="text"
                  value={exWrongSentence}
                  onChange={e => setExWrongSentence(e.target.value)}
                  placeholder="VD: She go to school yesterday."
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Câu đúng / Sửa lại *:</label>
                <input
                  type="text"
                  value={exCorrectText}
                  onChange={e => setExCorrectText(e.target.value)}
                  placeholder="VD: She went to school yesterday."
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>Loại lỗi sai:</label>
                <input
                  type="text"
                  value={exErrorType}
                  onChange={e => setExErrorType(e.target.value)}
                  placeholder="VD: Past simple verb tense"
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>
            </div>
          )}

          {/* Fill blank / Sentence Builder / Translation / Speaking / Writing correctText */}
          {(exType === 'fill_blank' || exType === 'sentence_builder' || exType === 'translation' || exType === 'speaking' || exType === 'writing') && (
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Đáp án chuẩn / Câu mẫu *:
              </label>
              <input
                type="text"
                value={exCorrectText}
                onChange={e => setExCorrectText(e.target.value)}
                placeholder="VD: The weather is very nice today."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
              />
            </div>
          )}

          {/* Explanation & Hint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Giải thích chi tiết (hiển thị khi sửa bài):
              </label>
              <textarea
                rows={2}
                value={exExplanation}
                onChange={e => setExExplanation(e.target.value)}
                placeholder="Giải thích vì sao chọn đáp án này..."
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Gợi ý ngữ pháp (Hint):
              </label>
              <textarea
                rows={2}
                value={exGrammarHint}
                onChange={e => setExGrammarHint(e.target.value)}
                placeholder="Gợi ý công thức hoặc dấu hiệu nhận biết..."
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl border ${theme.border} text-xs font-medium cursor-pointer`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Media Library Asset Picker */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        initialTab="audio"
        onClose={() => setIsMediaModalOpen(false)}
        onSelectAsset={(asset: MediaAsset) => {
          if (asset.type === 'audio') {
            const storageId = `idb:${asset.id}`;
            setAudioUrl(storageId);
            if (asset.name && !audioTitle) {
              setAudioTitle(asset.name.replace(/\.[^/.]+$/, ''));
            }
          }
          setIsMediaModalOpen(false);
        }}
      />
    </div>
  );
};
