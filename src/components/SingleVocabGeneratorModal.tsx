import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  List,
  Type,
  HelpCircle,
  Square,
  BookOpen,
  Layers,
  Edit3,
  Trash2,
  Send,
  Check,
  Plus
} from 'lucide-react';
import { Topic, Lesson, Exercise, ExerciseType, DifficultyLevel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  generateSingleVocabFromAI, 
  convertSingleVocabItemToExercise,
  SingleVocabGeneratedItem,
  SingleVocabGenerationResult
} from '../utils/singleVocabGenerator';

interface SingleVocabGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  lessons: Lesson[];
  selectedLessonId?: string;
  onExercisesCreated: (exercises: Exercise[]) => void;
}

const VOCAB_EXERCISE_TYPES: { type: ExerciseType; label: string; desc: string; icon: string }[] = [
  { 
    type: 'vocab_cloze', 
    label: 'Điền khuyết ký tự (Active Recall Cloze)', 
    desc: 'Ẩn một số chữ cái trong từ (ví dụ: b__ut_f_l), người học tự điền chữ thiếu', 
    icon: '🔤' 
  },
  { 
    type: 'multiple_choice', 
    label: 'Trắc nghiệm 4 lựa chọn (Multiple Choice)', 
    desc: 'Chọn nghĩa tiếng Việt chính xác với 3 đáp án gây nhiễu hợp lý', 
    icon: '📝' 
  },
  { 
    type: 'flashcard_recall', 
    label: 'Thẻ ghi nhớ từ vựng (Flashcard Recall)', 
    desc: 'Mặt trước hiện từ & IPA, mặt sau hiện nghĩa tiếng Việt và câu ví dụ', 
    icon: '📇' 
  },
  { 
    type: 'listen_spell', 
    label: 'Nghe phát âm & Viết chính tả (Listen & Spell)', 
    desc: 'Luyện kỹ năng nghe âm thanh chuẩn và gõ lại đúng chính tả từ vựng', 
    icon: '🎧' 
  },
  { 
    type: 'anagram', 
    label: 'Xếp chữ cái xáo trộn (Anagram / Word Scramble)', 
    desc: 'Các chữ cái trong từ bị đảo lộn, học viên xếp lại thành từ gốc', 
    icon: '🧩' 
  },
  { 
    type: 'fill_in_blank', 
    label: 'Điền từ vào câu ngữ cảnh (Context Sentence Fill)', 
    desc: 'Câu ví dụ che từ bằng "___", học viên chọn hoặc điền từ vào ngữ cảnh', 
    icon: '✍️' 
  },
  { 
    type: 'typing', 
    label: 'Tự gõ từ vựng (Active Typing Recall)', 
    desc: 'Cho định nghĩa/nghĩa tiếng Việt, học viên chủ động gõ lại từ tiếng Anh', 
    icon: '⌨️' 
  },
  { 
    type: 'matching', 
    label: 'Ghép cặp Từ - Nghĩa (Vocabulary Matching)', 
    desc: 'Nối từ tiếng Anh với định nghĩa hoặc bản dịch tiếng Việt tương ứng', 
    icon: '🔗' 
  }
];

export const SingleVocabGeneratorModal: React.FC<SingleVocabGeneratorModalProps> = ({
  isOpen,
  onClose,
  topics,
  lessons,
  selectedLessonId,
  onExercisesCreated,
}) => {
  const { settings, getThemeClasses, updateSettings } = useTheme();
  const theme = getThemeClasses();

  const [selectedType, setSelectedType] = useState<ExerciseType>('vocab_cloze');
  const [vocabInput, setVocabInput] = useState('');
  const [targetLessonId, setTargetLessonId] = useState<string>(
    selectedLessonId || lessons[0]?.id || ''
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('guided');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<SingleVocabGenerationResult | null>(null);
  const [saveSuccessCount, setSaveSuccessCount] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<SingleVocabGeneratedItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentLesson = lessons.find(l => l.id === targetLessonId);
  const currentTopic = currentLesson ? topics.find(t => t.id === currentLesson.topicId) : null;

  const geminiApiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
  const effectiveModel = (settings.aiProviderType === 'gemini' || !settings.aiProviderType)
    ? (settings.aiModel || 'gemini-3.1-flash-lite')
    : (settings.aiModel || 'gemini-3.1-flash-lite');

  if (!isOpen) return null;

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setErrorMessage('Đã dừng quá trình tạo bài tập theo yêu cầu.');
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setSaveSuccessCount(null);

    const trimmed = vocabInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập danh sách từ vựng cần tạo bài tập.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const result = await generateSingleVocabFromAI({
        vocabList: trimmed,
        exerciseType: selectedType,
        difficulty,
        customApiKey: geminiApiKey,
        model: effectiveModel,
        signal: controller.signal
      });

      if (result.error) {
        setErrorMessage(result.error);
        setGenerationResult(null);
      } else {
        setGenerationResult(result);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setErrorMessage('Đã dừng quá trình tạo bài tập theo yêu cầu.');
      } else {
        setErrorMessage(err.message || 'Lỗi xử lý khi tạo bài tập từ vựng.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleLoadSample = () => {
    setVocabInput(
`sustainable: bền vững, có thể duy trì lâu dài
biodiversity: đa dạng sinh học
ecosystem: hệ sinh thái
conservation: sự bảo tồn thiên nhiên
endangered: có nguy cơ tuyệt chủng
habitat: môi trường sống tự nhiên
renewable: có thể tái tạo được
emissions: khí thải, sự phát thải`
    );
    setErrorMessage(null);
  };

  const handleDeleteItem = (id: string) => {
    if (!generationResult) return;
    setGenerationResult({
      ...generationResult,
      items: generationResult.items.filter(item => item.id !== id)
    });
  };

  const handleSaveEdit = () => {
    if (!generationResult || !editingItemData) return;
    setGenerationResult({
      ...generationResult,
      items: generationResult.items.map(item => 
        item.id === editingItemData.id ? editingItemData : item
      )
    });
    setEditingItemId(null);
    setEditingItemData(null);
  };

  const handlePublish = () => {
    if (!generationResult || generationResult.items.length === 0) return;
    if (!targetLessonId) {
      setErrorMessage('Vui lòng chọn bài học mục tiêu để lưu bài tập.');
      return;
    }

    const newExercises = generationResult.items.map(item => 
      convertSingleVocabItemToExercise(item, targetLessonId, difficulty)
    );

    onExercisesCreated(newExercises);
    setSaveSuccessCount(newExercises.length);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className={`w-full max-w-4xl my-auto ${theme.card} border ${theme.border} ${theme.text} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors`}
      >
        {/* MODAL HEADER */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.border} ${theme.highlight} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">AI Tạo Bài Tập Từ Vựng Đơn Lẻ</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  Single Type Generator
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Nhập danh sách từ ➔ Tự động sinh hàng loạt câu hỏi cho đúng 1 dạng bài tập bạn chọn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick theme switcher buttons */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-neutral-500/20 bg-neutral-500/10 text-xs">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${settings.theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                title="Chế độ Sáng"
              >
                ☀️ Sáng
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'sepia' })}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${settings.theme === 'sepia' ? 'bg-[#f5ede0] text-[#2c2419] shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                title="Giấy ấm"
              >
                📜 Giấy ấm
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${settings.theme === 'dark' ? 'bg-slate-800 text-slate-100 shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                title="Chế độ Tối"
              >
                🌙 Tối
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'oled' })}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${settings.theme === 'oled' ? 'bg-black text-emerald-400 shadow-xs border border-emerald-500/30' : 'opacity-70 hover:opacity-100'}`}
                title="Neon"
              >
                ⚡ Neon
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border ${theme.border} hover:opacity-80 transition-opacity`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccessCount !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đã thêm thành công {saveSuccessCount} bài tập vào bài học! Đang đóng cửa sổ...</span>
            </div>
          )}

          {/* CHỌN LOẠI BÀI TẬP DUY NHẤT */}
          <div className="space-y-2">
            <label className="text-xs font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-500" />
              Chọn 1 dạng bài tập mục tiêu để tạo hàng loạt:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {VOCAB_EXERCISE_TYPES.map(vt => {
                const isSelected = selectedType === vt.type;
                return (
                  <button
                    key={vt.type}
                    type="button"
                    onClick={() => setSelectedType(vt.type)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20' 
                        : `${theme.border} ${theme.card} hover:border-sky-500/40`
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">{vt.icon}</span>
                        {isSelected && <Check className="w-4 h-4 text-sky-500" />}
                      </div>
                      <div className="font-bold text-xs leading-tight mb-1">{vt.label}</div>
                      <div className={`text-[11px] ${theme.textMuted} leading-tight line-clamp-2`}>{vt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TARGET LESSON & DIFFICULTY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold block mb-1.5">
                Bài học đích (Target Lesson):
              </label>
              <select
                value={targetLessonId}
                onChange={e => setTargetLessonId(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-sky-500`}
              >
                {lessons.map(l => {
                  const t = topics.find(tp => tp.id === l.topicId);
                  return (
                    <option key={l.id} value={l.id}>
                      {t ? `[${t.title}] ` : ''}{l.title}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5">
                Mức độ hỗ trợ / Độ khó:
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-sky-500`}
              >
                <option value="scaffolded">Scaffolded (Rất cơ bản - nhiều gợi ý)</option>
                <option value="guided">Guided (Tiêu chuẩn - vừa sức)</option>
                <option value="controlled">Controlled (Kiểm soát - ít gợi ý)</option>
                <option value="challenge">Challenge (Nâng cao - thử thách)</option>
              </select>
            </div>
          </div>

          {/* VOCABULARY INPUT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <List className="w-4 h-4 text-sky-500" />
                <span>Danh sách từ vựng (<strong>1 dòng = 1 từ</strong>, dấu phẩy sau từ dùng cho nghĩa tiếng Việt):</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-sky-500 hover:underline font-semibold cursor-pointer"
              >
                + Nạp danh sách mẫu (8 từ)
              </button>
            </div>

            <textarea
              rows={6}
              value={vocabInput}
              onChange={e => {
                setVocabInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={`friendly: thân thiện, cởi mở, dễ gần\nsustainable - phát triển bền vững, lâu dài\nenvironment (môi trường sống, hệ sinh thái)\nbiodiversity, đa dạng sinh học\nconservation`}
              className={`w-full p-3.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} font-mono text-xs outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed`}
            />

            <div className="flex items-center justify-between pt-1">
              <span className={`text-[11px] ${theme.textMuted}`}>
                ⚡ <strong>Quy tắc 1 dòng = 1 từ</strong>: Dấu phẩy (,) trong cùng 1 dòng sẽ giữ nguyên làm nghĩa tiếng Việt.
              </span>

              <div className="flex items-center gap-2">
                {loading && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Dừng ngay lập tức quá trình tạo"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng tạo (Stop)</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={loading || !vocabInput.trim()}
                  onClick={handleGenerate}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Đang tạo {selectedType}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tạo bài tập AI ({selectedType})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTS PREVIEW */}
          {generationResult && generationResult.items.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-inherit">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">
                    Kết quả tạo bài tập ({generationResult.items.length} câu)
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                    Đã chuẩn bị sẵn sàng
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {generationResult.items.map((item, index) => {
                  const isEditing = editingItemId === item.id;
                  const word = item.vocabWord || item.word || item.correctAnswer;
                  const cloze = item.clozeLetters || item.clozeTemplate;
                  const meaning = item.vocabMeaning || item.hint;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border ${theme.border} ${theme.card} space-y-2 text-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-500 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="font-bold text-sm text-sky-500">{word}</span>
                          {item.phonetic && (
                            <span className={`text-[11px] font-mono ${theme.textMuted}`}>
                              {item.phonetic}
                            </span>
                          )}
                          {cloze && (
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 tracking-widest text-[11px]">
                              {cloze}
                            </span>
                          )}
                          {meaning && (
                            <span className={`text-[11px] ${theme.textMuted} italic`}>
                              ({meaning})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingItemId(null);
                                setEditingItemData(null);
                              } else {
                                setEditingItemId(item.id);
                                setEditingItemData({ ...item });
                              }
                            }}
                            className={`p-1.5 rounded-lg border ${theme.border} hover:opacity-80`}
                            title="Sửa câu này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className={`p-1.5 rounded-lg border ${theme.border} text-rose-500 hover:bg-rose-500/10`}
                            title="Xóa câu này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing && editingItemData ? (
                        <div className="space-y-2 p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/5">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Nội dung câu hỏi:</label>
                            <input
                              type="text"
                              value={editingItemData.question}
                              onChange={e => setEditingItemData({ ...editingItemData, question: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          {editingItemData.type === 'vocab_cloze' && (
                            <div>
                              <label className="block text-[11px] font-semibold mb-1">Mẫu khuyết (cách nhau bởi dấu cách, ví dụ: f _ _ e n d l y):</label>
                              <input
                                type="text"
                                value={editingItemData.clozeLetters || editingItemData.clozeTemplate || ''}
                                onChange={e => setEditingItemData({ ...editingItemData, clozeLetters: e.target.value, clozeTemplate: e.target.value })}
                                className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs font-mono`}
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Đáp án đúng:</label>
                            <input
                              type="text"
                              value={editingItemData.correctAnswer}
                              onChange={e => setEditingItemData({ ...editingItemData, correctAnswer: e.target.value, correct_answer: e.target.value, correctText: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Giải thích:</label>
                            <input
                              type="text"
                              value={editingItemData.explanation || ''}
                              onChange={e => setEditingItemData({ ...editingItemData, explanation: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1 rounded text-xs border border-inherit"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-3 py-1 rounded text-xs bg-sky-500 text-white font-bold"
                            >
                              Lưu sửa đổi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium">{item.question}</p>
                          {item.options && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {item.options.map((opt, oIdx) => (
                                <div 
                                  key={oIdx}
                                  className={`p-1.5 rounded border text-[11px] ${
                                    oIdx === item.correctOptionIdx 
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold' 
                                      : `${theme.border} opacity-80`
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`text-[11px] ${theme.textMuted} pt-1`}>
                            <strong>Đáp án: </strong>
                            <span className="text-emerald-500 font-bold">{item.correctAnswer}</span>
                            {item.explanation && <span> — {item.explanation}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={`px-5 py-3.5 border-t ${theme.border} ${theme.card} flex items-center justify-between shrink-0`}>
          <div className={`text-xs ${theme.textMuted}`}>
            {generationResult ? `Đã tạo ${generationResult.items.length} bài tập` : 'Sẵn sàng tạo'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border ${theme.border} hover:opacity-80`}
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!generationResult || generationResult.items.length === 0}
              onClick={handlePublish}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Xuất bản vào bài học ({generationResult?.items.length || 0})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
