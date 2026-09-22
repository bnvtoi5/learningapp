import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  BookOpen,
  Layers,
  Edit3,
  Trash2,
  Send,
  Square,
  Bookmark,
  Check,
  AlignLeft,
  Copy,
  HelpCircle,
  Code
} from 'lucide-react';
import { Topic, Lesson, Exercise, DifficultyLevel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  generateGrammarExercisesFromAI, 
  convertGrammarItemToExercise,
  GrammarGeneratedItem,
  GrammarGenerationResult,
  POPULAR_GRAMMAR_TOPICS
} from '../utils/grammarGenerator';

interface GrammarGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  lessons: Lesson[];
  selectedLessonId?: string;
  onExercisesCreated: (exercises: Exercise[]) => void;
}

const GRAMMAR_EXERCISE_TYPES = [
  { type: 'mixed', label: 'Hỗn hợp tất cả các dạng (Khuyên dùng)', icon: '🎯' },
  { type: 'multiple_choice', label: 'Trắc nghiệm ngữ pháp 4 lựa chọn', icon: '📝' },
  { type: 'sentence_builder', label: 'Sắp xếp trật tự từ thành câu đúng', icon: '🧩' },
  { type: 'error_correction', label: 'Tìm và sửa lỗi sai trong câu', icon: '🔍' },
  { type: 'fill_in_blank', label: 'Chia dạng đúng của từ / động từ', icon: '✍️' },
  { type: 'translation', label: 'Dịch câu / Viết lại câu ngữ pháp', icon: '🌐' }
];

export const GrammarGeneratorModal: React.FC<GrammarGeneratorModalProps> = ({
  isOpen,
  onClose,
  topics,
  lessons,
  selectedLessonId,
  onExercisesCreated,
}) => {
  const { settings, getThemeClasses, updateSettings } = useTheme();
  const theme = getThemeClasses();

  const [topicInput, setTopicInput] = useState('Present Perfect vs Past Simple');
  const [ruleNote, setRuleNote] = useState('Nhấn mạnh dấu hiệu nhận biết since, for, ago, yesterday');
  const [exerciseType, setExerciseType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('guided');
  const [targetLessonId, setTargetLessonId] = useState<string>(
    selectedLessonId || lessons[0]?.id || ''
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GrammarGenerationResult | null>(null);
  const [saveSuccessCount, setSaveSuccessCount] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<GrammarGeneratedItem | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSystemPrompt = `Bạn là chuyên gia sư phạm tiếng Anh hàng đầu, chuyên thiết kế bài tập ngữ pháp theo giáo trình Cambridge/IELTS/TOEFL.
NHIỆM VỤ:
Tạo ra chính xác ${questionCount} câu hỏi bài tập ngữ pháp chất lượng cao chuyên sâu về chủ điểm: "${topicInput.trim() || 'Chủ điểm ngữ pháp'}".
${ruleNote.trim() ? `Ghi chú ngữ pháp bổ sung từ giáo viên: "${ruleNote.trim()}"` : ''}
Dạng bài yêu cầu: "${exerciseType}"
Độ khó: "${difficulty}"

HƯỚNG DẪN CÁC DẠNG BÀI:
- Nếu targetType = "sentence_builder":
  + question: "Sắp xếp các từ sau thành câu hoàn chỉnh đúng ngữ pháp"
  + scrambledWords: Mảng các từ bị xáo trộn thứ tự
  + correctAnswer: Câu tiếng Anh chuẩn xác hoàn chỉnh
  + hint: Gợi ý công thức hoặc nghĩa câu
  + explanation: Giải thích chi tiết trật tự từ và công thức ngữ pháp bằng tiếng Việt.
- Nếu targetType = "error_correction":
  + question: "Tìm và sửa lỗi sai ngữ pháp trong câu sau"
  + errorSentence: Câu tiếng Anh chứa duy nhất 1 lỗi sai điển hình về chủ điểm ngữ pháp này
  + errorPart: Từ/cụm từ bị sai
  + correction: Từ/cụm từ sửa đúng
  + correctAnswer: correction
  + hint: Vị trí hoặc dấu hiệu lỗi
  + explanation: Phân tích vì sao sai và tại sao sửa như vậy bằng tiếng Việt.
- Nếu targetType = "multiple_choice":
  + question: Câu tiếng Anh có chỗ trống "____" hoặc yêu cầu chọn phương án đúng
  + options: 4 phương án trắc nghiệm A, B, C, D tập trung vào các bẫy ngữ pháp thường gặp
  + correctOptionIdx: 0, 1, 2 hoặc 3
  + correctAnswer: Phương án đúng
  + hint: Dấu hiệu nhận biết thì, liên từ, hoặc cấu trúc
  + explanation: Giải thích chi tiết từng đáp án vì sao đúng và vì sao 3 phương án còn lại sai bằng tiếng Việt.
- Nếu targetType = "fill_in_blank":
  + question: Câu tiếng Anh có "____ (từ gốc trong ngoặc)"
  + correctAnswer: Dạng đúng của từ sau khi chia theo quy tắc ngữ pháp
  + hint: Dấu hiệu nhận biết
  + explanation: Giải thích quy tắc chia từ bằng tiếng Việt.
- Nếu targetType = "translation":
  + question: Dịch câu tiếng Việt sau sang tiếng Anh áp dụng cấu trúc ${topicInput.trim() || 'ngữ pháp'}
  + correctAnswer: Câu tiếng Anh chuẩn xác
  + hint: Cấu trúc cần dùng
  + explanation: Phân tích cấu trúc câu tiếng Anh bằng tiếng Việt.
- Nếu targetType = "mixed":
  + Chia đều các câu hỏi theo các dạng trên (sentence_builder, error_correction, multiple_choice, fill_in_blank, translation).`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentSystemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

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

    const trimmed = topicInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập chủ điểm ngữ pháp cần tạo bài tập.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const result = await generateGrammarExercisesFromAI({
        topic: trimmed,
        ruleNote: ruleNote.trim(),
        exerciseType,
        questionCount,
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
        setErrorMessage(err.message || 'Lỗi xử lý khi tạo bài tập ngữ pháp.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSelectPreset = (p: typeof POPULAR_GRAMMAR_TOPICS[0]) => {
    setTopicInput(p.title);
    setRuleNote(p.rule);
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
      setErrorMessage('Vui lòng chọn bài học mục tiêu.');
      return;
    }

    const newExercises = generationResult.items.map(item => 
      convertGrammarItemToExercise(item, targetLessonId, difficulty)
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
        {/* HEADER */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.border} ${theme.highlight} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">AI Tạo Bài Tập Ngữ Pháp Chuyên Sâu</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  Grammar Engine
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Nhập chủ điểm ngữ pháp ➔ AI tạo câu hỏi đa dạng (Trắc nghiệm, sửa lỗi, sắp xếp câu, chia động từ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick theme switcher */}
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

        {/* BODY */}
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
              <span>Đã thêm thành công {saveSuccessCount} bài tập ngữ pháp vào bài học! Đang đóng...</span>
            </div>
          )}

          {/* POPULAR PRESETS */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-purple-500" />
              Chủ điểm ngữ pháp gợi ý nhanh:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GRAMMAR_TOPICS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    topicInput === p.title
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : `${theme.border} hover:border-purple-500/30 opacity-80 hover:opacity-100`
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold block">
                  Tên chủ điểm ngữ pháp:
                </label>
                <span className="text-[10px] text-purple-400 font-medium">
                  Chủ đề cốt lõi AI sẽ tập trung tạo câu hỏi
                </span>
              </div>
              <input
                type="text"
                value={topicInput}
                onChange={e => {
                  setTopicInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ví dụ: Câu bị động (Passive Voice) với Modal Verbs hoặc Phân biệt Gerund và To-Infinitive..."
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold block">
                  Ghi chú cấu trúc, công thức & yêu cầu chi tiết (Tùy chọn):
                </label>
                <span className="text-[10px] text-purple-400 font-medium">
                  Nhập công thức, dấu hiệu nhận biết, bẫy ngữ pháp, danh sách từ ngoại lệ...
                </span>
              </div>
              <textarea
                rows={3}
                value={ruleNote}
                onChange={e => setRuleNote(e.target.value)}
                placeholder="Ví dụ:&#10;- Công thức: S + modal + be + V3/ed (must be done, should be checked)&#10;- Nhấn mạnh dấu hiệu: since/for, already, yet&#10;- Tạo các câu bẫy về mạo từ hoặc danh từ số nhiều&#10;- Giải thích chi tiết dấu hiệu nhận biết từng đáp án"
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed resize-y`}
              />
            </div>

            {/* PROMPT PREVIEW TOGGLE */}
            <div className={`rounded-xl border ${theme.border} overflow-hidden transition-all`}>
              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity bg-neutral-500/5`}
              >
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Code className="w-3.5 h-3.5" />
                  {showPromptPreview ? 'Ẩn Prompt System gửi đến Gemini AI' : 'Xem Prompt System chi tiết gửi đến Gemini AI'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {showPromptPreview ? 'Thu gọn ▲' : 'Mở rộng ▼'}
                </span>
              </button>

              {showPromptPreview && (
                <div className="p-3 bg-neutral-900/90 text-neutral-200 border-t border-neutral-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Prompt thực tế sẽ gửi tới API Gemini:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors flex items-center gap-1 text-white cursor-pointer"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép Prompt'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed p-2.5 rounded-lg bg-black/50 border border-white/10 whitespace-pre-wrap max-h-48 overflow-y-auto select-all text-neutral-300">
                    {currentSystemPrompt}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* CONFIG ROW: DẠNG BÀI, SỐ CÂU, BÀI HỌC, ĐỘ KHÓ */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Dạng bài tập:</label>
              <select
                value={exerciseType}
                onChange={e => setExerciseType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500`}
              >
                {GRAMMAR_EXERCISE_TYPES.map(g => (
                  <option key={g.type} value={g.type}>{g.icon} {g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Số lượng câu:</label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value={5}>5 câu bài tập</option>
                <option value={8}>8 câu bài tập</option>
                <option value={10}>10 câu bài tập</option>
                <option value={15}>15 câu bài tập</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Độ khó:</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="scaffolded">Cơ bản (Scaffolded)</option>
                <option value="guided">Tiêu chuẩn (Guided)</option>
                <option value="controlled">Thử thách (Controlled)</option>
                <option value="challenge">Nâng cao (Challenge)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Lưu vào bài học:</label>
              <select
                value={targetLessonId}
                onChange={e => setTargetLessonId(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500`}
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
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {loading && (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Dừng tạo ngay nếu mạng lag"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Dừng tạo (Stop)</span>
              </button>
            )}

            <button
              type="button"
              disabled={loading || !topicInput.trim()}
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích & tạo bài tập...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Tạo {questionCount} bài tập ngữ pháp (AI)</span>
                </>
              )}
            </button>
          </div>

          {/* RESULTS */}
          {generationResult && generationResult.items.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-inherit">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  Bộ câu hỏi ngữ pháp đã tạo ({generationResult.items.length} câu)
                </h3>
                <span className="text-xs text-purple-500 font-semibold">
                  Chủ điểm: {generationResult.topic}
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {generationResult.items.map((item, index) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border ${theme.border} ${theme.card} space-y-2 text-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-500 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                            {item.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
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
                        <div className="space-y-2 p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Nội dung câu hỏi:</label>
                            <input
                              type="text"
                              value={editingItemData.question}
                              onChange={e => setEditingItemData({ ...editingItemData, question: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Đáp án đúng:</label>
                            <input
                              type="text"
                              value={editingItemData.correctAnswer}
                              onChange={e => setEditingItemData({ ...editingItemData, correctAnswer: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Giải thích ngữ pháp (Tiếng Việt):</label>
                            <input
                              type="text"
                              value={editingItemData.explanation}
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
                              className="px-3 py-1 rounded text-xs bg-purple-500 text-white font-bold"
                            >
                              Lưu sửa đổi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="font-semibold text-[13px]">{item.question}</p>

                          {item.errorSentence && (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 font-mono text-amber-500">
                              Câu cần sửa: "{item.errorSentence}"
                            </div>
                          )}

                          {item.scrambledWords && (
                            <div className="flex flex-wrap gap-1 py-1">
                              {item.scrambledWords.map((w, wIdx) => (
                                <span key={wIdx} className="px-2 py-0.5 rounded border border-inherit bg-inherit">
                                  {w}
                                </span>
                              ))}
                            </div>
                          )}

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

                          <div className={`text-[11px] ${theme.textMuted} pt-1 border-t border-inherit/40`}>
                            <strong className="text-emerald-500">Đáp án chuẩn: </strong>
                            <span className="font-bold text-emerald-500">{item.correctAnswer}</span>
                            {item.explanation && (
                              <div className="mt-1 text-slate-400">
                                💡 <em>{item.explanation}</em>
                              </div>
                            )}
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

        {/* FOOTER */}
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
