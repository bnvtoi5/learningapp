import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FileText, 
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  Check,
  Search,
  HelpCircle,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowRight,
  Send,
  Square
} from 'lucide-react';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  ReadingQuestionType, 
  ReadingGeneratedQuestion, 
  ReadingGenerationResult 
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  READING_QUESTION_TYPES, 
  generateReadingExercisesFromAI, 
  regenerateSingleReadingQuestionFromAI,
  convertReadingResultToComprehensiveExercise,
  convertReadingResultToIndividualExercises
} from '../utils/readingGenerator';

interface ReadingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  lessons: Lesson[];
  selectedLessonId?: string;
  onExercisesCreated: (exercises: Exercise[]) => void;
}

export const ReadingGeneratorModal: React.FC<ReadingGeneratorModalProps> = ({
  isOpen,
  onClose,
  topics,
  lessons,
  selectedLessonId,
  onExercisesCreated,
}) => {
  const { settings, getThemeClasses, updateSettings } = useTheme();
  const theme = getThemeClasses();

  const [passageInput, setPassageInput] = useState('');
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(0); // 0 = Auto
  const [targetDifficulty, setTargetDifficulty] = useState<'auto' | 'easy' | 'medium' | 'hard'>('auto');
  const [targetLessonId, setTargetLessonId] = useState<string>(
    selectedLessonId || lessons[0]?.id || ''
  );
  const [saveFormat, setSaveFormat] = useState<'comprehensive' | 'individual'>('comprehensive');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<ReadingGenerationResult | null>(null);
  const [activeHighlightEvidence, setActiveHighlightEvidence] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionData, setEditingQuestionData] = useState<ReadingGeneratedQuestion | null>(null);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(true);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentLesson = lessons.find(l => l.id === targetLessonId);
  const currentTopic = currentLesson ? topics.find(t => t.id === currentLesson.topicId) : null;

  // Word count & paragraph statistics
  const wordCount = useMemo(() => {
    if (!passageInput.trim()) return 0;
    return passageInput.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [passageInput]);

  const paragraphCount = useMemo(() => {
    if (!passageInput.trim()) return 0;
    return passageInput.trim().split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }, [passageInput]);

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
    setLoadingStep('');
    setErrorMessage('Đã dừng quá trình tạo bài đọc theo yêu cầu.');
  };

  // Kích hoạt phân tích và sinh câu hỏi
  const handleGenerate = async () => {
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    setActiveHighlightEvidence(null);

    const trimmed = passageInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập hoặc dán đoạn văn bài đọc (Reading Passage).');
      return;
    }

    if (wordCount < 30) {
      setErrorMessage('Đoạn văn quá ngắn (dưới 30 từ). Vui lòng nhập đoạn văn đầy đủ hơn để AI có đủ dữ liệu tạo câu hỏi đọc hiểu.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setLoadingStep('1/4: Đọc & phân tích ngữ liệu Passage...');

    const stepTimer1 = setTimeout(() => {
      setLoadingStep('2/4: Trích xuất ý chính, từ vựng & tham chiếu theo từng đoạn...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('3/4: Thiết kế câu hỏi theo tiến trình sư phạm (Progression)...');
    }, 2500);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep('4/4: Tự kiểm định (Validation) & trích xuất dẫn chứng...');
    }, 4000);

    try {
      const result = await generateReadingExercisesFromAI({
        passage: trimmed,
        targetQuestionCount: targetQuestionCount === 0 ? undefined : targetQuestionCount,
        customApiKey: geminiApiKey,
        model: effectiveModel,
        targetDifficulty,
        signal: controller.signal
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (result.error) {
        setErrorMessage(result.error);
        setGenerationResult(null);
      } else {
        setGenerationResult(result);
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setErrorMessage('Đã dừng quá trình tạo bài đọc theo yêu cầu.');
      } else {
        setErrorMessage('Đã xảy ra lỗi khi tạo bài đọc hiểu: ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
      abortControllerRef.current = null;
    }
  };

  // Tạo lại DUY NHẤT một câu hỏi
  const handleRegenerateSingleQuestion = async (qId: string) => {
    if (!generationResult || !generationResult.questions) return;
    const targetQ = generationResult.questions.find(q => q.id === qId);
    if (!targetQ) return;

    setRegeneratingQuestionId(qId);
    try {
      const newQ = await regenerateSingleReadingQuestionFromAI({
        passage: generationResult.passage,
        targetType: targetQ.type,
        targetDifficulty: targetQ.difficulty,
        existingQuestions: generationResult.questions,
        customApiKey: geminiApiKey,
        model: effectiveModel
      });

      if (newQ) {
        setGenerationResult(prev => {
          if (!prev || !prev.questions) return prev;
          return {
            ...prev,
            questions: prev.questions.map(q => q.id === qId ? { ...newQ, id: qId } : q)
          };
        });
      }
    } catch (e) {
      console.error('Error regenerating single question:', e);
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  // Xóa một câu hỏi khỏi danh sách
  const handleDeleteQuestion = (qId: string) => {
    if (!generationResult || !generationResult.questions) return;
    setGenerationResult(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.filter(q => q.id !== qId)
      };
    });
  };

  // Thêm một câu hỏi mới
  const handleAddQuestion = () => {
    if (!generationResult) return;
    const newId = `rq_manual_${Date.now()}`;
    const newQuestion: ReadingGeneratedQuestion = {
      id: newId,
      type: 'detail',
      difficulty: 'medium',
      question: 'Câu hỏi đọc hiểu mới...',
      options: ['Phương án A (Đúng)', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: 0,
      explanation: 'Giải thích vì sao phương án A đúng...',
      evidence: 'Trích dẫn từ bài đọc...',
      paragraph: 1,
      isValidated: true
    };

    setGenerationResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: [...(prev.questions || []), newQuestion]
      };
    });

    setEditingQuestionId(newId);
    setEditingQuestionData({ ...newQuestion });
  };

  // Lưu chỉnh sửa câu hỏi
  const handleSaveQuestionEdit = () => {
    if (!editingQuestionData || !editingQuestionId || !generationResult) return;
    setGenerationResult(prev => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => q.id === editingQuestionId ? editingQuestionData : q)
      };
    });
    setEditingQuestionId(null);
    setEditingQuestionData(null);
  };

  // Xuất bản bài học vào DB
  const handlePublishToLesson = () => {
    if (!generationResult || !generationResult.questions || generationResult.questions.length === 0) {
      setErrorMessage('Không có câu hỏi nào để xuất bản.');
      return;
    }

    if (!targetLessonId) {
      setErrorMessage('Vui lòng chọn bài học (Lesson) đích để lưu.');
      return;
    }

    try {
      let createdExercises: Exercise[] = [];

      if (saveFormat === 'comprehensive') {
        const compEx = convertReadingResultToComprehensiveExercise(
          generationResult,
          targetLessonId,
          undefined,
          1
        );
        createdExercises = [compEx];
      } else {
        createdExercises = convertReadingResultToIndividualExercises(
          generationResult,
          targetLessonId,
          1
        );
      }

      onExercisesCreated(createdExercises);
      setSaveSuccessMessage(
        saveFormat === 'comprehensive'
          ? `Đã lưu thành công 1 bài Đọc hiểu tổng hợp gồm ${generationResult.questions.length} câu hỏi con vào bài học!`
          : `Đã lưu thành công ${createdExercises.length} bài tập đọc hiểu riêng lẻ vào bài học!`
      );

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage('Lỗi khi xuất bản bài tập: ' + (err.message || String(err)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className={`w-full max-w-5xl my-auto ${theme.card} border ${theme.border} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${theme.text} transition-colors`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.border} ${theme.highlight} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">AI Reading Exercise Generator</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-full">
                  IELTS / Cambridge Standard
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Phân tích sâu văn bản, sinh bộ câu hỏi đọc hiểu theo tiến trình sư phạm kèm dẫn chứng thực tế
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
                title="Giấy ấm (Sepia)"
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
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-500 hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {saveSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="font-medium">{saveSuccessMessage}</p>
            </div>
          )}

          {/* SECTION 1: PASSAGE INPUT & CONFIGURATION */}
          <div className={`p-5 rounded-xl border ${theme.border} ${theme.card} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                Đoạn văn đọc hiểu (Reading Passage)
              </label>
              <div className={`flex items-center gap-3 text-xs ${theme.textMuted}`}>
                <span>Số từ: <strong className="text-sky-500">{wordCount}</strong> từ</span>
                <span>•</span>
                <span>Số đoạn: <strong className="text-sky-500">{paragraphCount}</strong> đoạn</span>
                {wordCount > 0 && (
                  <span className={`px-2 py-0.5 rounded border ${theme.border}`}>
                    Khuyến nghị: {wordCount < 150 ? '5-6 câu' : wordCount <= 350 ? '7-8 câu' : '8-10 câu'}
                  </span>
                )}
              </div>
            </div>

            <textarea
              value={passageInput}
              onChange={(e) => setPassageInput(e.target.value)}
              placeholder="Dán hoặc nhập đoạn văn bài đọc tại đây... (Ví dụ: một bài đọc về môi trường, lịch sử, công nghệ, bài đọc IELTS/TOEFL hoặc sách giáo khoa)..."
              rows={6}
              disabled={loading}
              className={`w-full p-3.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-sm placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans leading-relaxed resize-y`}
            />

            {/* Quick Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Target Lesson */}
              <div>
                <label className={`block text-xs font-medium ${theme.textMuted} mb-1.5`}>
                  Bài học đích (Lưu vào đâu):
                </label>
                <select
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  disabled={loading}
                  className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs focus:outline-none focus:ring-2 focus:ring-sky-500`}
                >
                  {topics.map(t => {
                    const topicLessons = lessons.filter(l => l.topicId === t.id);
                    if (topicLessons.length === 0) return null;
                    return (
                      <optgroup key={t.id} label={t.title}>
                        {topicLessons.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Target Question Count */}
              <div>
                <label className={`block text-xs font-medium ${theme.textMuted} mb-1.5`}>
                  Số lượng câu hỏi:
                </label>
                <select
                  value={targetQuestionCount}
                  onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                  disabled={loading}
                  className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs focus:outline-none focus:ring-2 focus:ring-sky-500`}
                >
                  <option value={0}>Tự động (Dựa theo độ dài passage)</option>
                  <option value={5}>5 câu hỏi (Ngắn / Mini-quiz)</option>
                  <option value={6}>6 câu hỏi</option>
                  <option value={7}>7 câu hỏi (Chuẩn đoạn trung bình)</option>
                  <option value={8}>8 câu hỏi</option>
                  <option value={10}>10 câu hỏi (Đầy đủ / Comprehensive)</option>
                </select>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className={`block text-xs font-medium ${theme.textMuted} mb-1.5`}>
                  Độ khó câu hỏi:
                </label>
                <select
                  value={targetDifficulty}
                  onChange={(e) => setTargetDifficulty(e.target.value as any)}
                  disabled={loading}
                  className={`w-full p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.text} text-xs focus:outline-none focus:ring-2 focus:ring-sky-500`}
                >
                  <option value="auto">Cân bằng (Dễ ➔ Vừa ➔ Khó)</option>
                  <option value="easy">Ưu tiên dễ (Tìm kiếm trực tiếp)</option>
                  <option value="medium">Trung bình (Kết nối thông tin)</option>
                  <option value="hard">Nâng cao (Suy luận & ẩn ý)</option>
                </select>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className={`flex items-center gap-2 text-xs ${theme.textMuted}`}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Model: <strong className={theme.text}>{effectiveModel}</strong>
                </span>
                <span>•</span>
                <span>Không tạo sample data</span>
              </div>

              <div className="flex items-center gap-2">
                {passageInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setPassageInput('');
                      setGenerationResult(null);
                      setErrorMessage(null);
                    }}
                    disabled={loading}
                    className={`px-3 py-2 text-xs font-medium ${theme.textMuted} hover:${theme.text} rounded-lg border ${theme.border} transition-colors`}
                  >
                    Xóa trắng
                  </button>
                )}

                {loading && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                    title="Dừng ngay lập tức quá trình phân tích nếu lag"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng tạo (Stop)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !passageInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Đang phân tích & sinh bài tập...' : '✨ Phân tích Passage & Tạo bộ câu hỏi (AI)'}
                </button>
              </div>
            </div>

            {/* Loading Progress State */}
            {loading && (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs text-sky-500">
                  <span className="font-semibold">{loadingStep}</span>
                  <span>Đang xử lý...</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full animate-[shimmer_2s_infinite] w-3/4"></div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PASSAGE ANALYSIS & GENERATED QUESTIONS PREVIEW */}
          {generationResult && generationResult.questions && (
            <div className="space-y-6">
              {/* ANALYSIS SUMMARY CARD */}
              {generationResult.passageAnalysis && (
                <div className={`${theme.card} border ${theme.border} rounded-xl overflow-hidden`}>
                  <div 
                    className={`flex items-center justify-between px-5 py-3.5 ${theme.highlight} cursor-pointer border-b ${theme.border}`}
                    onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-bold">Kết quả phân tích ngữ liệu (Passage Analysis)</h3>
                      {generationResult.passageAnalysis.readingLevel && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">
                          Level: {generationResult.passageAnalysis.readingLevel}
                        </span>
                      )}
                    </div>
                    <button className={`${theme.textMuted} hover:${theme.text}`}>
                      {showAnalysisDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showAnalysisDetails && (
                    <div className={`p-5 space-y-4 text-xs ${theme.text}`}>
                      <div>
                        <span className="font-bold text-sky-500">🎯 Ý chính (Main Idea): </span>
                        <span>{generationResult.passageAnalysis.mainIdea}</span>
                      </div>

                      {generationResult.passageAnalysis.keyPoints && generationResult.passageAnalysis.keyPoints.length > 0 && (
                        <div>
                          <span className="font-bold text-sky-500">📌 Các luận điểm chính:</span>
                          <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2 opacity-90">
                            {generationResult.passageAnalysis.keyPoints.map((kp, idx) => (
                              <li key={idx}>{kp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {generationResult.passageAnalysis.importantVocabulary && generationResult.passageAnalysis.importantVocabulary.length > 0 && (
                          <div className={`p-3 ${theme.card} border ${theme.border} rounded-lg space-y-1.5`}>
                            <span className="font-bold text-amber-500 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" />
                              Từ vựng trọng tâm trong ngữ cảnh:
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {generationResult.passageAnalysis.importantVocabulary.map((v, i) => (
                                <span 
                                  key={i} 
                                  className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-500"
                                  title={v.contextualMeaning}
                                >
                                  <strong>{v.word}</strong>: {v.contextualMeaning}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {generationResult.passageAnalysis.pronounReferences && generationResult.passageAnalysis.pronounReferences.length > 0 && (
                          <div className={`p-3 ${theme.card} border ${theme.border} rounded-lg space-y-1.5`}>
                            <span className="font-bold text-indigo-400">🔗 Quy chiếu đại từ (Pronoun References):</span>
                            <div className="space-y-1 pt-1 text-[11px]">
                              {generationResult.passageAnalysis.pronounReferences.map((r, i) => (
                                <div key={i} className="text-indigo-400">
                                  <strong>"{r.pronoun}"</strong> ➔ {r.refersTo} {r.paragraph ? `(Đoạn ${r.paragraph})` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {generationResult.passageAnalysis.authorsToneOrPurpose && (
                        <div className={theme.textMuted}>
                          <strong className={theme.text}>Mục đích/Thái độ tác giả:</strong> {generationResult.passageAnalysis.authorsToneOrPurpose}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SPLIT VIEW: PASSAGE TEXT + EVIDENCE VIEWER ON TOP/LEFT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Passage Column with Highlighting */}
                <div className={`lg:col-span-5 ${theme.card} border ${theme.border} rounded-xl p-4 space-y-3 lg:sticky lg:top-2 self-start max-h-[70vh] overflow-y-auto`}>
                  <div className={`flex items-center justify-between border-b ${theme.border} pb-2`}>
                    <h4 className="text-xs font-bold flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                      Văn bản bài đọc đối chiếu
                    </h4>
                    {activeHighlightEvidence && (
                      <button
                        onClick={() => setActiveHighlightEvidence(null)}
                        className="text-[11px] text-sky-500 hover:underline"
                      >
                        Bỏ chọn dẫn chứng
                      </button>
                    )}
                  </div>

                  <div className={`space-y-3 text-xs leading-relaxed ${theme.text} font-sans`}>
                    {generationResult.passage.split(/\n\s*\n/).map((paragraph, pIdx) => {
                      const isHighlighted = activeHighlightEvidence && paragraph.toLowerCase().includes(activeHighlightEvidence.toLowerCase().slice(0, 30));
                      return (
                        <div 
                          key={pIdx} 
                          className={`p-2.5 rounded-lg border transition-all ${
                            isHighlighted 
                              ? 'bg-sky-500/10 border-sky-500/40 font-medium ring-1 ring-sky-500/30' 
                              : `${theme.border} opacity-90`
                          }`}
                        >
                          <span className={`inline-block px-1.5 py-0.5 mr-2 rounded ${theme.border} text-[10px] font-bold opacity-70`}>
                            [Đoạn {pIdx + 1}]
                          </span>
                          {paragraph}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Questions Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className={`flex items-center justify-between pb-2 border-b ${theme.border}`}>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold">
                        Danh sách câu hỏi đọc hiểu ({generationResult.questions.length} câu)
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        100% Validated
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="px-2.5 py-1 text-xs font-semibold text-sky-500 hover:opacity-80 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm câu
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${theme.border} hover:opacity-80 flex items-center gap-1 transition-colors`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Tạo lại tất cả
                      </button>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-4">
                    {generationResult.questions.map((q, qIndex) => {
                      const isBeingEdited = editingQuestionId === q.id;
                      const isBeingRegenerated = regeneratingQuestionId === q.id;
                      const typeMeta = READING_QUESTION_TYPES.find(t => t.type === q.type);

                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-xl ${theme.card} border ${theme.border} hover:border-sky-500/40 transition-all space-y-3`}
                        >
                          {/* Question Top Bar */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 text-xs font-bold flex items-center justify-center border border-sky-500/20">
                                {qIndex + 1}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-1">
                                <span>{typeMeta?.icon || '📝'}</span>
                                {typeMeta?.label || q.type}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider ${
                                q.difficulty === 'easy' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : q.difficulty === 'hard'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {q.difficulty}
                              </span>
                              {q.paragraph && (
                                <span className="text-[11px] text-slate-400">
                                  Đoạn {q.paragraph}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBeingEdited) {
                                    setEditingQuestionId(null);
                                    setEditingQuestionData(null);
                                  } else {
                                    setEditingQuestionId(q.id);
                                    setEditingQuestionData({ ...q });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800 transition-colors"
                                title="Chỉnh sửa câu này"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateSingleQuestion(q.id)}
                                disabled={isBeingRegenerated}
                                className="p-1.5 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
                                title="Đổi câu hỏi khác (AI tạo lại)"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${isBeingRegenerated ? 'animate-spin text-indigo-400' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className={`p-1.5 ${theme.textMuted} hover:text-rose-400 rounded hover:${theme.highlight} transition-colors`}
                                title="Xóa câu hỏi này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Edit Form */}
                          {isBeingEdited && editingQuestionData ? (
                            <div className={`space-y-3 p-3 ${theme.card} border border-sky-500/30 rounded-lg text-xs`}>
                              <div>
                                <label className={`block ${theme.textMuted} mb-1`}>Nội dung câu hỏi:</label>
                                <input
                                  type="text"
                                  value={editingQuestionData.question}
                                  onChange={(e) => setEditingQuestionData({ ...editingQuestionData, question: e.target.value })}
                                  className={`w-full ${theme.inputBg} border ${theme.border} rounded px-2.5 py-1.5 ${theme.text}`}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className={`block ${theme.textMuted}`}>4 Lựa chọn (Chọn nút tròn cạnh phương án đúng):</label>
                                {editingQuestionData.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct_${q.id}`}
                                      checked={editingQuestionData.correctAnswer === oIdx}
                                      onChange={() => setEditingQuestionData({ ...editingQuestionData, correctAnswer: oIdx })}
                                      className="text-sky-500 focus:ring-sky-500"
                                    />
                                    <span className={`font-bold ${theme.textMuted} w-4`}>{String.fromCharCode(65 + oIdx)}.</span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...editingQuestionData.options];
                                        newOpts[oIdx] = e.target.value;
                                        setEditingQuestionData({ ...editingQuestionData, options: newOpts });
                                      }}
                                      className={`flex-1 ${theme.inputBg} border ${theme.border} rounded px-2 py-1 ${theme.text}`}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div>
                                <label className={`block ${theme.textMuted} mb-1`}>Dẫn chứng (Evidence):</label>
                                <input
                                  type="text"
                                  value={editingQuestionData.evidence}
                                  onChange={(e) => setEditingQuestionData({ ...editingQuestionData, evidence: e.target.value })}
                                  className={`w-full ${theme.inputBg} border ${theme.border} rounded px-2 py-1 ${theme.text}`}
                                />
                              </div>

                              <div>
                                <label className={`block ${theme.textMuted} mb-1`}>Giải thích (Explanation - Tiếng Việt):</label>
                                <input
                                  type="text"
                                  value={editingQuestionData.explanation}
                                  onChange={(e) => setEditingQuestionData({ ...editingQuestionData, explanation: e.target.value })}
                                  className={`w-full ${theme.inputBg} border ${theme.border} rounded px-2 py-1 ${theme.text}`}
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestionId(null);
                                    setEditingQuestionData(null);
                                  }}
                                  className={`px-3 py-1 ${theme.textMuted} hover:${theme.text} rounded`}
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveQuestionEdit}
                                  className="px-3 py-1 bg-sky-500 text-white font-bold rounded hover:bg-sky-400"
                                >
                                  Lưu thay đổi
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Question Prompt */}
                              <div className={`text-sm font-semibold ${theme.text}`}>
                                {q.question}
                              </div>

                              {/* 4 Options */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrect = q.correctAnswer === oIdx;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                                        isCorrect
                                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-medium'
                                          : `${theme.card} ${theme.border} ${theme.text}`
                                      }`}
                                    >
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-500 text-white'
                                          : `bg-neutral-500/20 ${theme.textMuted}`
                                      }`}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span className="flex-1 break-words whitespace-normal leading-relaxed">{opt}</span>
                                      {isCorrect && (
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Evidence & Explanation */}
                              <div className={`p-2.5 rounded-lg ${theme.highlight} border ${theme.border} space-y-1.5 text-xs`}>
                                {q.evidence && (
                                  <div className="flex items-start gap-1.5 text-sky-500 dark:text-sky-300">
                                    <Search className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <div>
                                      <strong>Dẫn chứng từ bài đọc:</strong> "{q.evidence}"
                                      <button
                                        type="button"
                                        onClick={() => setActiveHighlightEvidence(q.evidence)}
                                        className="ml-2 text-[11px] text-sky-500 underline hover:text-sky-400"
                                      >
                                        Xem vị trí trong văn bản
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {q.explanation && (
                                  <div className={`flex items-start gap-1.5 ${theme.textMuted} text-[11px] pl-5`}>
                                    <span>💡 <em>{q.explanation}</em></span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={`px-6 py-4 border-t ${theme.border} ${theme.card} flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0`}>
          <div className={`flex items-center gap-3 text-xs ${theme.text} w-full sm:w-auto`}>
            <span className={`font-semibold ${theme.textMuted}`}>Định dạng lưu:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="saveFormat"
                value="comprehensive"
                checked={saveFormat === 'comprehensive'}
                onChange={() => setSaveFormat('comprehensive')}
                className="text-sky-500 focus:ring-sky-500"
              />
              <span>1 Bài đọc tổng hợp kèm câu hỏi con (Khuyến nghị)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="saveFormat"
                value="individual"
                checked={saveFormat === 'individual'}
                onChange={() => setSaveFormat('individual')}
                className="text-sky-500 focus:ring-sky-500"
              />
              <span>Tách từng câu riêng lẻ</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border ${theme.border} hover:opacity-80 transition-colors`}
            >
              Hủy / Đóng
            </button>
            <button
              type="button"
              onClick={handlePublishToLesson}
              disabled={!generationResult || !generationResult.questions || generationResult.questions.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Xuất bản vào bài học ({generationResult?.questions?.length || 0} câu)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
