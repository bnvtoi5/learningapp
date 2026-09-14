import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  HelpCircle, 
  Volume2, 
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  Exercise, 
  ExerciseType, 
  SkillCategory, 
  DifficultyLevel,
  MatchingPair,
  MediaAsset 
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
  { type: 'listening', label: 'Luyện nghe 3 bước (Listening)' },
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

  // Audio / Listening fields
  const [audioUrl, setAudioUrl] = useState('');
  const [audioText, setAudioText] = useState('');
  const [audioPredictionHint, setAudioPredictionHint] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Load exercise data on open
  useEffect(() => {
    if (!exercise) return;
    setExType(exercise.type);
    setExSkill(exercise.skill);
    setExDifficulty(exercise.difficulty);
    setExQuestion(exercise.question || '');
    setExInstruction(exercise.instruction || '');
    setExContext(exercise.context || '');
    setExExplanation(exercise.explanation || '');
    setExGrammarHint(exercise.grammarHint || '');
    setExCorrectText(exercise.correctText || '');
    setExWrongSentence(exercise.wrongSentence || '');
    setExErrorType(exercise.errorType || '');

    setAudioUrl(exercise.audioUrl || '');
    setAudioText(exercise.audioText || '');
    setAudioPredictionHint(exercise.audioPredictionHint || '');
    setTranscript(exercise.transcript || '');

    setVocabWord(exercise.vocabWord || exercise.correctText || '');
    setVocabMeaning(exercise.vocabMeaning || '');
    setPhonetic(exercise.phonetic || '');
    setClozeLetters(exercise.clozeLetters || '');

    if (exercise.options && exercise.options.length > 0) {
      setOptions(exercise.options);
      setCorrectOptionIdx(exercise.correctOptions?.[0] || 0);
    } else {
      setOptions(['', '', '', '']);
      setCorrectOptionIdx(0);
    }

    if (exercise.matchingPairs && exercise.matchingPairs.length > 0) {
      setMatchingPairs(exercise.matchingPairs);
    } else {
      setMatchingPairs([
        { id: '1', left: '', right: '' },
        { id: '2', left: '', right: '' },
      ]);
    }
  }, [exercise, isOpen]);

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
    if (!exQuestion.trim() && !vocabWord.trim()) {
      setErrorMessage('Vui lòng nhập nội dung câu hỏi hoặc từ vựng.');
      return;
    }
    setErrorMessage(null);

    const updated: Exercise = {
      ...exercise,
      type: exType,
      skill: exSkill,
      difficulty: exDifficulty,
      question: exQuestion.trim() || (vocabMeaning ? `Nghĩa: ${vocabMeaning}` : 'Từ vựng:'),
      instruction: exInstruction.trim() || undefined,
      context: (exType === 'reading' || exType === 'speaking') && exContext.trim() ? exContext.trim() : undefined,
      explanation: exExplanation.trim() || undefined,
      grammarHint: exGrammarHint.trim() || undefined,
      correctText: exCorrectText.trim() || vocabWord.trim(),
      vocabWord: vocabWord.trim() || exCorrectText.trim() || undefined,
      vocabMeaning: vocabMeaning.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      clozeLetters: clozeLetters.trim() || undefined,
    };

    if (exType === 'multiple_choice' || exType === 'reading' || exType === 'collocation' || exType === 'image_identify') {
      updated.options = options.filter(o => o.trim().length > 0);
      updated.correctOptions = [correctOptionIdx];
    } else if (exType === 'true_false') {
      updated.correctOptions = [correctOptionIdx];
    } else if (exType === 'matching') {
      updated.matchingPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
    } else if (exType === 'listening') {
      updated.audioUrl = audioUrl.trim() || undefined;
      updated.audioText = audioText.trim() || undefined;
      updated.audioPredictionHint = audioPredictionHint.trim() || undefined;
      updated.transcript = transcript.trim() || undefined;
      updated.options = options.filter(o => o.trim().length > 0);
      updated.correctOptions = [correctOptionIdx];
    } else if (exType === 'error_correction') {
      updated.wrongSentence = exWrongSentence.trim();
      updated.errorType = exErrorType.trim();
    } else if (exType === 'sentence_builder') {
      updated.scrambledWords = (exCorrectText.trim() || vocabWord.trim()).split(/\s+/);
    }

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl ${theme.card} rounded-2xl shadow-2xl border ${theme.border} max-h-[90vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-base">Chỉnh sửa câu hỏi bài tập</h3>
          </div>
          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.highlight} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Type, Skill, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Loại bài tập:
              </label>
              <select
                id="edit-select-type"
                value={exType}
                onChange={e => setExType(e.target.value as ExerciseType)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
              >
                {EXERCISE_TYPES.map(t => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Kỹ năng:
              </label>
              <select
                id="edit-select-skill"
                value={exSkill}
                onChange={e => setExSkill(e.target.value as SkillCategory)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs capitalize`}
              >
                <option value="vocabulary">Từ vựng (Vocabulary)</option>
                <option value="grammar">Ngữ pháp (Grammar)</option>
                <option value="reading">Đọc hiểu (Reading)</option>
                <option value="listening">Luyện nghe (Listening)</option>
                <option value="speaking">Luyện nói (Speaking)</option>
                <option value="writing">Luyện viết (Writing)</option>
                <option value="mixed">Tổng hợp (Mixed)</option>
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Độ khó:
              </label>
              <select
                id="edit-select-difficulty"
                value={exDifficulty}
                onChange={e => setExDifficulty(e.target.value as DifficultyLevel)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
              >
                <option value="scaffolded">🟢 Scaffolded</option>
                <option value="guided">🟡 Guided</option>
                <option value="controlled">🟠 Controlled</option>
                <option value="independent">🔴 Independent</option>
                <option value="challenge">⚫ Challenge</option>
              </select>
            </div>
          </div>

          {/* Active Recall / Vocab specific inputs */}
          {(exType === 'vocab_cloze' || exType === 'flashcard_recall' || exType === 'listen_spell' || exType === 'anagram') && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <span className="text-xs font-semibold text-emerald-500 block">
                ⭐ Thiết lập từ vựng Active Recall:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Từ tiếng Anh mục tiêu *:
                  </label>
                  <input
                    id="edit-input-vocab-word"
                    type="text"
                    required
                    value={vocabWord}
                    onChange={e => setVocabWord(e.target.value)}
                    placeholder="VD: friendly, delicious..."
                    className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Nghĩa tiếng Việt / Gợi ý *:
                  </label>
                  <input
                    id="edit-input-vocab-meaning"
                    type="text"
                    value={vocabMeaning}
                    onChange={e => setVocabMeaning(e.target.value)}
                    placeholder="VD: thân thiện, ngon miệng..."
                    className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Phiên âm IPA (tùy chọn):
                  </label>
                  <input
                    id="edit-input-phonetic"
                    type="text"
                    value={phonetic}
                    onChange={e => setPhonetic(e.target.value)}
                    placeholder="VD: /ˈfrend.li/"
                    className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-mono`}
                  />
                </div>

                {exType === 'vocab_cloze' && (
                  <div>
                    <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                      Mẫu khuyết ký tự (tùy chọn):
                    </label>
                    <input
                      id="edit-input-cloze-letters"
                      type="text"
                      value={clozeLetters}
                      onChange={e => setClozeLetters(e.target.value)}
                      placeholder="VD: f _ _ e n d l y (để trống sẽ tự tạo)"
                      className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs font-mono`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Đề bài / Câu hỏi *:
            </label>
            <input
              id="edit-input-question"
              type="text"
              required
              value={exQuestion}
              onChange={e => setExQuestion(e.target.value)}
              placeholder="Nội dung câu hỏi..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm`}
            />
          </div>

          {/* Reading Context Passage ONLY for Reading */}
          {exType === 'reading' && (
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Đoạn văn bài đọc (Reading Passage):
              </label>
              <textarea
                id="edit-input-context"
                rows={4}
                value={exContext}
                onChange={e => setExContext(e.target.value)}
                placeholder="Nhập đoạn văn đọc hiểu tại đây..."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-serif`}
              />
            </div>
          )}

          {/* Options for Multiple Choice / Collocation / Listening */}
          {(exType === 'multiple_choice' || exType === 'reading' || exType === 'collocation' || exType === 'image_identify' || exType === 'listening') && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                Các phương án lựa chọn (A, B, C, D) & Đánh dấu đáp án đúng *:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-correct-opt"
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
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listening Specific Setup */}
          {exType === 'listening' && (
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" />
                  <span>Cài đặt âm thanh bài nghe (Listening Track)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Kho Media / Tải lên MP3</span>
                </button>
              </div>

              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Đường dẫn / File âm thanh (Audio URL hoặc tải file):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={audioUrl}
                    onChange={e => setAudioUrl(e.target.value)}
                    placeholder="https://... hoặc data:audio/... (hoặc chọn từ Kho Media ở trên)"
                    className={`flex-1 p-2.5 rounded-xl ${theme.inputBg} text-xs font-mono`}
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
                  Hoặc nội dung văn bản cho giọng đọc AI (TTS) đọc nếu không có file âm thanh:
                </label>
                <textarea
                  rows={2}
                  value={audioText}
                  onChange={e => setAudioText(e.target.value)}
                  placeholder="Nhập đoạn văn bản tiếng Anh để hệ thống tự phát âm giọng chuẩn bản xứ..."
                  className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Gợi ý trước khi nghe (Prediction Hint):
                  </label>
                  <input
                    type="text"
                    value={audioPredictionHint}
                    onChange={e => setAudioPredictionHint(e.target.value)}
                    placeholder="VD: Chú ý thời gian hoặc địa điểm..."
                    className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Lời thoại (Audio Transcript sau khi làm bài):
                  </label>
                  <input
                    type="text"
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder="Transcript hiển thị khi học sinh đối chiếu..."
                    className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Matching Pairs Setup */}
          {exType === 'matching' && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">
                    Thiết kế các cặp nối (Cột A ➔ Cột B):
                  </span>
                  <span className={`text-[10px] ${theme.textMuted}`}>
                    Học sinh sẽ ghép từ/câu Cột A tương ứng với Cột B. Cột B sẽ tự động đảo vị trí khi làm bài.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddMatchingPair}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm cặp nối</span>
                </button>
              </div>

              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={pair.id || idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold w-5 text-center text-neutral-400">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={pair.left}
                      onChange={e => handleUpdateMatchingPair(idx, 'left', e.target.value)}
                      placeholder={`Cột A #${idx + 1} (Từ/Cụm từ)`}
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs`}
                    />
                    <span className="text-emerald-500 font-bold">➔</span>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={e => handleUpdateMatchingPair(idx, 'right', e.target.value)}
                      placeholder={`Cột B #${idx + 1} (Nghĩa/Đáp án)`}
                      className={`flex-1 p-2 rounded-xl ${theme.inputBg} text-xs`}
                    />
                    {matchingPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMatchingPair(idx)}
                        className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Xóa cặp này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correct Text for Cloze / Translation / Sentence builder */}
          {(exType === 'fill_blank' || exType === 'sentence_builder' || exType === 'translation') && (
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Đáp án chuẩn xác *:
              </label>
              <input
                id="edit-input-correct-text"
                type="text"
                required
                value={exCorrectText}
                onChange={e => setExCorrectText(e.target.value)}
                placeholder="Đáp án đúng..."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm`}
              />
            </div>
          )}

          {/* Error correction */}
          {exType === 'error_correction' && (
            <div className="space-y-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Câu chứa lỗi sai:
                </label>
                <input
                  type="text"
                  value={exWrongSentence}
                  onChange={e => setExWrongSentence(e.target.value)}
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Câu sau khi sửa đúng:
                </label>
                <input
                  type="text"
                  value={exCorrectText}
                  onChange={e => setExCorrectText(e.target.value)}
                  className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
                />
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Giải thích tại sao đúng / sai:
            </label>
            <textarea
              id="edit-input-explanation"
              rows={2}
              value={exExplanation}
              onChange={e => setExExplanation(e.target.value)}
              placeholder="Giải thích ngữ pháp hoặc từ vựng..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              id="btn-cancel-edit-exercise"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border ${theme.border} text-xs font-medium`}
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-save-edit-exercise"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Media Library Modal for selecting/uploading audio files */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        initialTab="audio"
        onClose={() => setIsMediaModalOpen(false)}
        onSelectAsset={(asset: MediaAsset) => {
          if (asset.type === 'audio') {
            if (asset.url) {
              setAudioUrl(asset.url);
            } else if (asset.name) {
              setAudioText(asset.name);
            }
          }
          setIsMediaModalOpen(false);
        }}
      />
    </div>
  );
};
