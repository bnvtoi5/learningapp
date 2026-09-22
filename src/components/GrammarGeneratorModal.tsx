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
  Code,
  ArrowRightLeft,
  FileText,
  Lightbulb,
  CheckCheck
} from 'lucide-react';
import { Topic, Lesson, Exercise, DifficultyLevel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  generateGrammarExercisesFromAI, 
  convertGrammarItemToExercise,
  GrammarGeneratedItem,
  GrammarGenerationResult,
  POPULAR_GRAMMAR_TOPICS,
  POPULAR_TRANSFORMATION_TOPICS
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
  { type: 'translation', label: 'Viết lại câu tương đương (Tự luận)', icon: '✍️' },
  { type: 'multiple_choice', label: 'Trắc nghiệm câu tương đương (4 lựa chọn)', icon: '📝' },
  { type: 'sentence_builder', label: 'Sắp xếp từ thành câu tương đương', icon: '🧩' },
  { type: 'error_correction', label: 'Tìm và sửa lỗi sai trong câu chuyển đổi', icon: '🔍' },
  { type: 'fill_in_blank', label: 'Điền từ / liên từ vào chỗ trống', icon: '⚡' }
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

  const [activeTab, setActiveTab] = useState<'transformation' | 'general'>('transformation');
  const [topicInput, setTopicInput] = useState(
    'TASK 2: COMBINE THE TWO SENTENCES USING WHEN OR WHILE WHERE APPROPRIATE. (p.44)\n' +
    '* Key:\n' +
    '1. While they were cleaning the streets, it started to rain. / They were cleaning the streets when it started to rain.\n' +
    '2. While I was watching TV, I saw the floods and landslides in the area. / I was watching TV when I saw the floods and landslides in the area.\n' +
    '3. While Tim was searching for employment opportunities, he found a job advert from a non-governmental organisation. / Tim was searching for employment opportunities when he found a job advert from a non-governmental organisation.\n' +
    '4. They decided to help build a community centre for young people while they were visiting some poor villages. / They were visiting some poor villages when they decided to help build a community centre for young people.'
  );
  const [ruleNote, setRuleNote] = useState('');
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

  const handleCopyPrompt = () => {
    const promptPreview = `CHẾ ĐỘ: ${activeTab === 'transformation' ? 'Chuyển đổi dạng tương đương' : 'Chủ điểm tổng quát'}
YÊU CẦU / VÍ DỤ TỪ NGƯỜI DÙNG:
${topicInput}

GHI CHÚ THÊM:
${ruleNote}

DẠNG BÀI: ${exerciseType} | SỐ CÂU: ${questionCount} | ĐỘ KHÓ: ${difficulty}`;
    navigator.clipboard.writeText(promptPreview);
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
      setErrorMessage('Vui lòng nhập yêu cầu hoặc dán nội dung/ví dụ vào ô nhập liệu.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const result = await generateGrammarExercisesFromAI({
        topic: trimmed.slice(0, 100),
        rawInput: trimmed,
        mode: activeTab,
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

  const handleSelectTransformationPreset = (p: typeof POPULAR_TRANSFORMATION_TOPICS[0]) => {
    setTopicInput(p.sampleInput || p.title);
    setRuleNote(p.rule);
    setErrorMessage(null);
  };

  const handleSelectGeneralPreset = (p: typeof POPULAR_GRAMMAR_TOPICS[0]) => {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">AI Tạo Bài Tập Ngữ Pháp & Chuyển Đổi Câu Tương Đương</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Smart Transformation
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Hỗ trợ nhập yêu cầu ngắn/mơ hồ hoặc dán ví dụ/Key từ SGK ➔ AI tự bóc tách quy tắc & tạo bài tập đa dạng
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

        {/* MODE TABS */}
        <div className={`px-5 pt-3 pb-0 border-b ${theme.border} flex items-center gap-3 bg-neutral-500/5 shrink-0`}>
          <button
            type="button"
            onClick={() => setActiveTab('transformation')}
            className={`pb-2.5 px-1.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transformation'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-inherit'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Chuyển đổi dạng tương đương & Viết lại câu (Khi/While, ĐK 2➔3, Bị động...)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-1.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-inherit'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Chủ điểm ngữ pháp thông dụng (Hiện tại hoàn thành, Mệnh đề quan hệ...)</span>
          </button>
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                {activeTab === 'transformation' ? 'Mẫu chuyển đổi tương đương phổ biến:' : 'Chủ điểm ngữ pháp gợi ý nhanh:'}
              </label>
              <span className="text-[11px] text-purple-400 font-medium">Bấm để điền mẫu nhanh</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activeTab === 'transformation' ? (
                POPULAR_TRANSFORMATION_TOPICS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectTransformationPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      topicInput.includes(p.title) || (p.sampleInput && topicInput === p.sampleInput)
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                        : `${theme.border} hover:border-purple-500/30 opacity-80 hover:opacity-100`
                    }`}
                  >
                    {p.title}
                  </button>
                ))
              ) : (
                POPULAR_GRAMMAR_TOPICS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectGeneralPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      topicInput === p.title
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                        : `${theme.border} hover:border-purple-500/30 opacity-80 hover:opacity-100`
                    }`}
                  >
                    {p.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* MAIN INPUT FORM */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold block flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  {activeTab === 'transformation'
                    ? 'Yêu cầu chuyển đổi câu / Văn bản bài tập SGK / Ví dụ kèm Key:'
                    : 'Tên chủ điểm hoặc nội dung ngữ pháp:'}
                </label>
                <div className="flex items-center gap-2">
                  {activeTab === 'transformation' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTopicInput(POPULAR_TRANSFORMATION_TOPICS[0].sampleInput);
                        setRuleNote(POPULAR_TRANSFORMATION_TOPICS[0].rule);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 font-semibold transition-colors"
                    >
                      Dán mẫu: Nối câu When/While (SGK p.44)
                    </button>
                  )}
                  {activeTab === 'transformation' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTopicInput('Chuyển từ câu điều kiện loại 2 sang loại 3 và viết lại câu điều kiện với Unless');
                        setRuleNote('If + S + V2/ed, S + would + V -> If + S + had V3, S + would have V3. Unless = If not.');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-semibold transition-colors"
                    >
                      Dán mẫu: Điều kiện 2 ➔ 3
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={activeTab === 'transformation' ? 6 : 3}
                value={topicInput}
                onChange={e => {
                  setTopicInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={
                  activeTab === 'transformation'
                    ? "Nhập bất kỳ yêu cầu nào (dù ngắn hay mơ hồ, ví dụ: 'chuyển từ câu điều kiện 2 sang 3', 'chủ động sang bị động')\nHOẶC dán toàn bộ đoạn văn bản đề bài SGK/giáo viên chứa ví dụ và Key đáp án:\n\nVí dụ: TASK 2: COMBINE THE TWO SENTENCES USING WHEN OR WHILE WHERE APPROPRIATE...\nKey: 1. While they were cleaning the streets, it started to rain. / They were cleaning the streets when it started to rain..."
                    : "Ví dụ: Thì hiện tại hoàn thành, Mệnh đề quan hệ xác định và không xác định, Câu bị động với Modal Verbs..."
                }
                className={`w-full p-3 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed resize-y font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold block flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Ghi chú quy tắc / Công thức bổ sung (Tùy chọn):
                </label>
                <span className="text-[10px] text-purple-400 font-medium">
                  Có thể để trống nếu đã nhập trong nội dung trên
                </span>
              </div>
              <textarea
                rows={2}
                value={ruleNote}
                onChange={e => setRuleNote(e.target.value)}
                placeholder="Ví dụ: Công thức: While S + was/were V-ing, S + V2/ed  <=>  S + was/were V-ing when S + V2/ed. Nếu có nhiều cách viết đều đúng, hãy phân tách bằng dấu gạch chéo ' / '."
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
                  {showPromptPreview ? 'Ẩn xem trước yêu cầu gửi đến AI' : 'Xem chi tiết cấu hình phân tích của AI'}
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
                      Thông tin gửi tới Backend /api/grammar-generate:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors flex items-center gap-1 text-white cursor-pointer"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép thông tin'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed p-2.5 rounded-lg bg-black/50 border border-white/10 whitespace-pre-wrap max-h-48 overflow-y-auto select-all text-neutral-300">
                    {`Mode: ${activeTab}\nTargetType: ${exerciseType}\nQuestionCount: ${questionCount}\nDifficulty: ${difficulty}\nInput: ${topicInput}\nRuleNote: ${ruleNote}`}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* CONFIG ROW */}
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
                <option value={4}>4 câu bài tập</option>
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
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:from-purple-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích cấu trúc & tạo bài tập...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Tạo {questionCount} bài tập {activeTab === 'transformation' ? 'chuyển đổi tương đương' : 'ngữ pháp'}</span>
                </>
              )}
            </button>
          </div>

          {/* RESULTS */}
          {generationResult && generationResult.items.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-inherit">
              {/* INFERRED RULE BANNER */}
              {generationResult.inferredRule && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/10 border border-purple-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Quy tắc chuyển đổi tương đương AI đã nhận diện:</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed opacity-95">
                    {generationResult.inferredRule}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  Bộ câu hỏi đã tạo ({generationResult.items.length} câu)
                </h3>
                <span className="text-xs text-purple-400 font-semibold">
                  Chủ điểm: {generationResult.topic}
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {generationResult.items.map((item, index) => {
                  const isEditing = editingItemId === item.id;
                  const alternatives = item.correctAnswer.split(/\s*[/|]\s*/).filter(Boolean);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border ${theme.border} ${theme.card} space-y-2 text-xs shadow-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-400 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {item.type === 'translation' ? 'Viết lại câu tương đương' : item.type}
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
                            <label className="block text-[11px] font-semibold mb-1">Nội dung câu hỏi / đề bài:</label>
                            <input
                              type="text"
                              value={editingItemData.question}
                              onChange={e => setEditingItemData({ ...editingItemData, question: e.target.value })}
                              className={`w-full p-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text} text-xs`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">Đáp án đúng (có thể phân tách nhiều cách viết bằng ' / '):</label>
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
                          <p className="font-semibold text-[13px] leading-relaxed">{item.question}</p>

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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {item.options.map((opt, oIdx) => (
                                <div 
                                  key={oIdx}
                                  className={`p-2 rounded-lg border text-[11px] ${
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

                          <div className={`text-[11px] ${theme.textMuted} pt-1.5 border-t border-inherit/40 space-y-1`}>
                            <div>
                              <strong className="text-emerald-500">Đáp án chuẩn: </strong>
                              {alternatives.length > 1 ? (
                                <div className="mt-1 space-y-0.5">
                                  {alternatives.map((alt, aIdx) => (
                                    <div key={aIdx} className="text-emerald-400 font-medium font-mono text-[11px]">
                                      • Cách {aIdx + 1}: {alt.trim()}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-bold text-emerald-500">{item.correctAnswer}</span>
                              )}
                            </div>

                            {item.hint && (
                              <div className="text-purple-400">
                                <strong>Gợi ý: </strong>{item.hint}
                              </div>
                            )}

                            {item.explanation && (
                              <div className="text-slate-400">
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
