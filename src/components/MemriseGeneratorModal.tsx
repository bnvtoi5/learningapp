import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Layers, 
  BookOpen, 
  FileText, 
  RotateCcw,
  List,
  Type,
  HelpCircle,
  Code,
  Download,
  Upload,
  CreditCard,
  Square
} from 'lucide-react';
import { Topic, Lesson, Exercise, MemriseExerciseItem, MemriseGenerationResult } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  MEMRISE_SYSTEM_PROMPT, 
  generateMemriseExercisesFromAI, 
  convertMemriseItemToExercise,
  generateOfflineMemriseExercises,
  orderExercisesInBatches
} from '../utils/memriseGenerator';

interface MemriseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  lessons: Lesson[];
  selectedLessonId?: string;
  onExercisesCreated: (exercises: Exercise[]) => void;
}

export const MemriseGeneratorModal: React.FC<MemriseGeneratorModalProps> = ({
  isOpen,
  onClose,
  topics,
  lessons,
  selectedLessonId,
  onExercisesCreated,
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [activeTab, setActiveTab] = useState<'ai' | 'json' | 'prompt'>('ai');
  const [targetLessonId, setTargetLessonId] = useState<string>(
    selectedLessonId || lessons[0]?.id || ''
  );

  const [vocabInput, setVocabInput] = useState('');
  const [batchSize, setBatchSize] = useState<number>(3);
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<MemriseGenerationResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [saveSuccessCount, setSaveSuccessCount] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentLesson = lessons.find(l => l.id === targetLessonId);
  const currentTopic = currentLesson ? topics.find(t => t.id === currentLesson.topicId) : null;

  // Đồng bộ cấu hình AI & API Key từ Mascot / Cài đặt hệ thống
  const geminiApiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
  const effectiveModel = (settings.aiProviderType === 'gemini' || !settings.aiProviderType)
    ? (settings.aiModel || 'gemini-3.1-flash-lite')
    : (settings.aiModel || 'gemini-3.1-flash-lite');

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setErrorMessage('Đã dừng quá trình tạo bài tập theo yêu cầu.');
  };

  // Xử lý tạo bài tập bằng AI
  const handleGenerateAI = async () => {
    setErrorMessage(null);
    setSaveSuccessCount(null);

    const trimmed = vocabInput.trim();
    if (!trimmed) {
      setErrorMessage('Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const result = await generateMemriseExercisesFromAI({
        vocabInput: trimmed,
        customApiKey: geminiApiKey,
        model: effectiveModel,
        batchSize,
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
        setErrorMessage(err.message || 'Lỗi khi gọi AI xử lý bài tập.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Nạp ví dụ mẫu (2 đợt = 6 từ vựng để người dùng kiểm chứng ngay)
  const handleLoadSample = () => {
    setVocabInput(
`diligent: chăm chỉ, cần cù, siêng năng
explore: khám phá, thám hiểm, tìm tòi
decision: sự quyết định, lựa chọn
memory: trí nhớ, ký ức, kỷ niệm
persist: kiên trì, bền bỉ, kiên định
creative: sáng tạo, giàu trí tưởng tượng`
    );
    setErrorMessage(null);
  };

  // Xử lý nạp JSON trực tiếp
  const handleImportJson = () => {
    setErrorMessage(null);
    setSaveSuccessCount(null);

    const trimmed = jsonInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng dán chuỗi JSON Memrise cần nhập.');
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
        throw new Error('Dữ liệu JSON phải chứa mảng "exercises".');
      }
      const ordered = orderExercisesInBatches(parsed.exercises, batchSize);
      setGenerationResult({
        status: 'success',
        total_words_processed: parsed.total_words_processed || ordered.length / 6,
        exercises: ordered
      });
    } catch (err: any) {
      setErrorMessage(`Lỗi phân tích JSON: ${err.message}`);
    }
  };

  // Sao chép Prompt
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(MEMRISE_SYSTEM_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Sao chép kết quả JSON
  const handleCopyResultJson = () => {
    if (!generationResult) return;
    navigator.clipboard.writeText(JSON.stringify(generationResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Lưu toàn bộ bài tập vào bài học đã chọn
  const handleSaveAllToLesson = () => {
    if (!generationResult?.exercises || generationResult.exercises.length === 0) return;
    if (!targetLessonId) {
      setErrorMessage('Vui lòng chọn Bài học để lưu danh sách bài tập vào.');
      return;
    }

    const convertedExercises: Exercise[] = generationResult.exercises.map((item, idx) => 
      convertMemriseItemToExercise(item, targetLessonId, idx + 1)
    );

    onExercisesCreated(convertedExercises);
    setSaveSuccessCount(convertedExercises.length);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Nhóm các bài tập theo từng Đợt (Batch) để hiển thị trực quan quy trình học
  const batchGroups = useMemo(() => {
    const list = generationResult?.exercises || [];
    if (list.length === 0) return [];

    const uWords: string[] = [];
    list.forEach(ex => {
      const w = (ex.word || '').trim();
      if (w && !uWords.includes(w)) uWords.push(w);
    });

    const bSize = batchSize || 3;
    const groups: {
      batchNum: number;
      words: string[];
      flashcards: MemriseExerciseItem[];
      quizzes: MemriseExerciseItem[];
    }[] = [];

    for (let i = 0; i < uWords.length; i += bSize) {
      const bWords = uWords.slice(i, i + bSize);
      const bNum = Math.floor(i / bSize) + 1;
      const bExs = list.filter(ex => bWords.includes((ex.word || '').trim()));
      
      const fcs = bExs.filter(ex => ex.type === 'flashcard');
      const qzs = bExs.filter(ex => ex.type !== 'flashcard');

      groups.push({
        batchNum: bNum,
        words: bWords,
        flashcards: fcs,
        quizzes: qzs
      });
    }

    return groups;
  }, [generationResult, batchSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={`${theme.card} border ${theme.border} w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden`}>
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-inherit flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  AI Memrise: Tạo Bộ 4 Dạng Bài Tập Từ Vựng
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Memrise Style
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Chuyển danh sách từ vựng thành 4 dạng: Trắc nghiệm 4 đáp án, Điền từ vào ví dụ, Xếp chữ cái và Tự gõ từ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-neutral-500/10 ${theme.textMuted} hover:text-inherit cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TARGET LESSON SELECTOR */}
        <div className={`p-4 border-b border-inherit ${theme.highlight} flex flex-wrap items-center gap-3 text-xs`}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Lưu bài tập vào Bài học:</span>
          </div>
          <select
            value={targetLessonId}
            onChange={e => setTargetLessonId(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border ${theme.border} ${theme.inputBg} font-medium flex-1 min-w-[240px]`}
          >
            {lessons.map(les => {
              const top = topics.find(t => t.id === les.topicId);
              return (
                <option key={les.id} value={les.id}>
                  {top ? `[${top.title}] ` : ''}{les.title}
                </option>
              );
            })}
          </select>
          {currentTopic && (
            <span className={`px-2.5 py-1 rounded-md text-[11px] bg-sky-500/10 text-sky-500 border border-sky-500/20`}>
              Chủ đề: {currentTopic.title}
            </span>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-inherit px-4 text-xs font-semibold gap-2 pt-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1. Tạo bằng AI Backend Module
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'json' 
                ? 'border-emerald-500 text-emerald-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            2. Nhập trực tiếp JSON Memrise
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'prompt' 
                ? 'border-sky-500 text-sky-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            3. Xem System Prompt Chuẩn
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: AI GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <List className="w-4 h-4 text-amber-500" />
                  Danh sách từ vựng cần chuyển đổi (Mỗi từ 1 dòng):
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className={`text-[11px] text-amber-500 hover:underline cursor-pointer flex items-center gap-1 font-semibold`}
                >
                  <Sparkles className="w-3 h-3" /> Nạp ví dụ mẫu (6 từ - 2 đợt)
                </button>
              </div>

              <textarea
                value={vocabInput}
                onChange={e => {
                  setVocabInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                rows={6}
                placeholder={`Nhập danh sách từ vựng tiếng Anh (mỗi dòng 1 từ):&#10;diligent: chăm chỉ, cần cù&#10;explore: khám phá, tìm tòi&#10;decision: sự quyết định, lựa chọn&#10;memory: trí nhớ, ký ức&#10;persist: kiên trì, bền bỉ&#10;creative: sáng tạo, đổi mới`}
                className={`w-full p-3.5 rounded-xl border ${theme.border} ${theme.inputBg} text-xs sm:text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none`}
              />

              {/* Synced AI Model Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 px-2.5 rounded-lg bg-neutral-500/10 border border-neutral-500/20">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span className={theme.textMuted}>Mô hình AI đồng bộ Mascot:</span>
                  <span className="font-bold text-sky-400 font-mono">{effectiveModel}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className={geminiApiKey ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {geminiApiKey ? '● Khóa API cá nhân (Đang dùng)' : '⚡ Máy chủ AI Studio'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Chia đợt học:
                  </span>
                  <select
                    value={batchSize}
                    onChange={e => setBatchSize(Number(e.target.value))}
                    className={`px-2.5 py-1.5 rounded-lg border ${theme.border} ${theme.card} text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none`}
                  >
                    <option value={2}>2 từ / đợt</option>
                    <option value={3}>3 từ / đợt (Khuyên dùng)</option>
                    <option value={4}>4 từ / đợt</option>
                    <option value={5}>5 từ / đợt</option>
                  </select>
                  <span className={`text-[11px] ${theme.textMuted} hidden sm:inline`}>
                    (Tất cả Flashcard của đợt lên đầu ➔ Sau đó là Quiz)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {loading && (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Dừng ngay lập tức nếu AI đang xử lý lâu hoặc bị lag"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng tạo (Stop)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGenerateAI}
                    className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-white font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                      loading ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        Đang xử lý theo đợt...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Tạo Bài Tập Theo Đợt ({batchSize} từ/đợt)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT DIRECT JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-500" />
                Dán khối JSON Memrise cấu trúc chuẩn:
              </label>

              <textarea
                value={jsonInput}
                onChange={e => {
                  setJsonInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                rows={7}
                placeholder={`{\n  "status": "success",\n  "total_words_processed": 1,\n  "exercises": [\n    {\n      "id": "ex_1",\n      "word": "cat",\n      "type": "multiple_choice",\n      "question": "Nghĩa của từ 'cat' là gì?",\n      "options": ["con mèo", "con chó", "con chim", "con cá"],\n      "correct_answer": "con mèo"\n    }\n  ]\n}`}
                className={`w-full p-3.5 rounded-xl border ${theme.border} ${theme.inputBg} text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none`}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Phân tích & Tải JSON lên
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM PROMPT VIEWER */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  System Instruction Prompt chuyên dụng cho Memrise Generator:
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${theme.border} ${theme.card} flex items-center gap-1.5 hover:border-sky-500 cursor-pointer`}
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? 'Đã sao chép!' : 'Sao chép Prompt'}
                </button>
              </div>

              <pre className={`p-4 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[360px]`}>
                {MEMRISE_SYSTEM_PROMPT}
              </pre>
            </div>
          )}

          {/* ERROR BANNER */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SUCCESS BANNER */}
          {saveSuccessCount !== null && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Đã lưu thành công <strong>{saveSuccessCount} bài tập Memrise</strong> vào bài học!</span>
            </div>
          )}

          {/* GENERATION RESULTS PREVIEW */}
          {generationResult && generationResult.exercises && (
            <div className="mt-6 space-y-4 pt-4 border-t border-inherit">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    Kết quả xử lý ({generationResult.exercises.length} bài tập / {generationResult.total_words_processed || batchGroups.reduce((acc, g) => acc + g.words.length, 0)} từ vựng - {batchGroups.length} đợt)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyResultJson}
                    className={`px-3 py-1.5 rounded-lg border ${theme.border} ${theme.card} text-xs font-semibold flex items-center gap-1.5 hover:border-amber-500 cursor-pointer`}
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedJson ? 'Đã sao chép JSON!' : 'Sao chép JSON'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllToLesson}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Lưu tất cả ({generationResult.exercises.length}) vào Bài học
                  </button>
                </div>
              </div>

              {/* LIST OF EXERCISES ORGANIZED BY BATCH */}
              <div className="space-y-6">
                {batchGroups.map(group => (
                  <div key={group.batchNum} className={`p-4 sm:p-5 rounded-2xl border ${theme.border} ${theme.card} space-y-4 shadow-sm`}>
                    {/* BATCH HEADER */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-inherit pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-sm">
                          ĐỢT {group.batchNum}
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {group.words.length} từ: {group.words.map(w => `"${w}"`).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <span>Trình tự:</span>
                        <strong className="text-amber-300">{group.flashcards.length} Flashcard đầu</strong>
                        <span>➔</span>
                        <span>{group.quizzes.length} Quiz sau</span>
                      </div>
                    </div>

                    {/* 1. FLASHCARDS AT THE BEGINNING OF THE BATCH */}
                    {group.flashcards.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                          <CreditCard className="w-4 h-4 text-amber-400" />
                          <span>1. Thẻ học từ vựng mở đầu đợt ({group.flashcards.length} Flashcard lên đầu):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {group.flashcards.map((fc, fcIdx) => (
                            <div key={fc.id || fcIdx} className={`p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 relative overflow-hidden`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-amber-400">
                                  {fc.word}
                                </span>
                                {fc.phonetic && (
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    {fc.phonetic}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-emerald-300">
                                {fc.meaning}
                              </div>
                              {fc.example && (
                                <div className="text-[10px] text-neutral-300 italic pt-1 border-t border-amber-500/20">
                                  <div>"{fc.example}"</div>
                                  {fc.example_translation && (
                                    <div className="text-neutral-400 not-italic">➔ {fc.example_translation}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. QUIZZES RELATED TO THIS BATCH */}
                    {group.quizzes.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>2. Các câu hỏi Quiz kiểm tra của đợt ({group.quizzes.length} bài tập):</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {group.quizzes.map((ex, qIdx) => (
                            <div key={ex.id || qIdx} className={`p-3 rounded-lg border ${theme.border} ${theme.highlight} space-y-1.5`}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1 text-emerald-400">
                                  {ex.type === 'multiple_choice' && (ex.is_reverse ? 'Trắc nghiệm đảo ngược (Nghĩa ➔ Từ)' : 'Trắc nghiệm (Từ ➔ Nghĩa)')}
                                  {ex.type === 'fill_in_blank' && 'Điền từ (Fill in Blank)'}
                                  {ex.type === 'spelling' && 'Sắp xếp ký tự (Spelling)'}
                                  {ex.type === 'typing' && 'Tự gõ từ (Typing)'}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  Từ: <strong className="text-amber-400">{ex.word}</strong>
                                </span>
                              </div>

                              <p className="text-[11px] font-medium text-neutral-300">
                                {ex.question}
                              </p>

                              {ex.options && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {ex.options.map((opt, oIdx) => (
                                    <span 
                                      key={oIdx} 
                                      className={`px-2 py-0.5 rounded text-[10px] ${
                                        opt === ex.correct_answer 
                                          ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' 
                                          : 'bg-neutral-800 text-neutral-400'
                                      }`}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {ex.hint && (
                                <p className="text-[10px] text-sky-400 italic">
                                  Gợi ý: {ex.hint}
                                </p>
                              )}

                              {ex.shuffled_letters && (
                                <div className="flex gap-1 pt-1">
                                  {ex.shuffled_letters.map((char, cIdx) => (
                                    <span key={cIdx} className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 font-bold flex items-center justify-center uppercase text-[10px]">
                                      {char}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-inherit flex items-center justify-between bg-neutral-900/40">
          <span className={`text-[11px] ${theme.textMuted}`}>
            {generationResult?.exercises ? `Đã tạo ${generationResult.exercises.length} bài tập.` : 'Sẵn sàng xử lý dữ liệu từ vựng theo phong cách Memrise.'}
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border ${theme.border} text-xs font-semibold hover:bg-neutral-500/10 cursor-pointer`}
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
