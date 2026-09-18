import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  Check, 
  Copy, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Edit3,
  Shuffle,
  Volume2,
  Code
} from 'lucide-react';
import { Lesson, Topic, Exercise, ExerciseType, MemriseExerciseItem, MemriseGenerationResponse } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MemriseExerciseGeneratorProps {
  lessons: Lesson[];
  topics: Topic[];
  defaultLessonId?: string;
  onSaveExercise: (exercise: Exercise) => void;
  onFinished?: () => void;
}

const SAMPLE_WORDS = ['resilient', 'authentic', 'diligent', 'profound', 'empathy'];

export const MemriseExerciseGenerator: React.FC<MemriseExerciseGeneratorProps> = ({
  lessons = [],
  topics = [],
  defaultLessonId,
  onSaveExercise,
  onFinished,
}) => {
  const { settings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    defaultLessonId || lessons[0]?.id || ''
  );
  const [vocabInput, setVocabInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatedExercises, setGeneratedExercises] = useState<MemriseExerciseItem[]>([]);
  
  // JSON Modal state
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Parse words from raw input
  const parsedWords = React.useMemo(() => {
    return vocabInput
      .split(/[\n,;]+/)
      .map(w => w.replace(/^[\d\s.\-•*)]+/, '').trim())
      .filter(w => w.length > 0);
  }, [vocabInput]);

  const uniqueWords = React.useMemo(() => {
    return Array.from(new Set(parsedWords));
  }, [parsedWords]);

  // Group generated exercises by word
  const groupedExercises = React.useMemo(() => {
    const groups: { [word: string]: MemriseExerciseItem[] } = {};
    generatedExercises.forEach(ex => {
      const w = ex.word || 'unknown';
      if (!groups[w]) groups[w] = [];
      groups[w].push(ex);
    });
    return groups;
  }, [generatedExercises]);

  // Call AI Backend API
  const handleGenerateAI = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (uniqueWords.length === 0) {
      setErrorMsg('Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.');
      return;
    }

    if (!selectedLessonId) {
      setErrorMsg('Vui lòng chọn bài học (Lesson) trước khi tạo bài tập.');
      return;
    }

    setIsGenerating(true);

    const geminiApiKey = settings.providerApiKeys?.gemini || settings.customApiKey || settings.customGeminiApiKey;
    const effectiveModel = (settings.aiProviderType === 'gemini' || !settings.aiProviderType)
      ? (settings.aiModel || 'gemini-3.1-flash-lite')
      : (settings.aiModel || 'gemini-3.1-flash-lite');

    try {
      const response = await fetch('/api/generate-memrise-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vocabularyList: uniqueWords,
          vocabList: uniqueWords,
          customApiKey: geminiApiKey,
          model: effectiveModel,
          batchSize: 3
        }),
      });

      const data: MemriseGenerationResponse = await response.json();

      if (data.error) {
        setErrorMsg(data.error);
        setIsGenerating(false);
        return;
      }

      if (data.exercises && data.exercises.length > 0) {
        setGeneratedExercises(data.exercises);
        setSuccessMsg(`Đã tạo thành công ${data.exercises.length} bài tập Memrise cho ${data.total_words_processed || uniqueWords.length} từ vựng!`);
      } else {
        setErrorMsg('Không nhận được dữ liệu bài tập từ AI. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      console.error('Error generating Memrise exercises:', err);
      setErrorMsg('Không thể kết nối với máy chủ AI. Vui lòng thử lại sau.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Import from JSON
  const handleImportJson = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!jsonInput.trim()) {
      setErrorMsg('Vui lòng dán nội dung JSON vào ô nhập.');
      return;
    }

    try {
      const cleanJson = jsonInput.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.error) {
        setErrorMsg(`Lỗi từ dữ liệu JSON: ${parsed.error}`);
        return;
      }

      if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
        setGeneratedExercises(parsed.exercises);
        setShowJsonModal(false);
        setJsonInput('');
        setSuccessMsg(`Đã nhập thành công ${parsed.exercises.length} bài tập Memrise từ mã JSON!`);
      } else {
        setErrorMsg('Cấu trúc JSON không hợp lệ. Cần có mảng "exercises".');
      }
    } catch (err: any) {
      setErrorMsg('Mã JSON không hợp lệ: ' + err.message);
    }
  };

  // Copy current JSON
  const handleCopyJson = () => {
    const jsonOutput = {
      status: 'success',
      total_words_processed: Object.keys(groupedExercises).length,
      exercises: generatedExercises,
    };
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Save all generated exercises to target lesson
  const handleSaveAllToLesson = () => {
    if (!selectedLessonId) {
      setErrorMsg('Vui lòng chọn bài học để lưu bài tập.');
      return;
    }

    if (generatedExercises.length === 0) {
      setErrorMsg('Chưa có bài tập nào được tạo.');
      return;
    }

    let savedCount = 0;
    generatedExercises.forEach((item, idx) => {
      // Map Memrise type to ExerciseType
      let exType: ExerciseType = 'multiple_choice';
      if (item.type === 'fill_in_blank') exType = 'fill_in_blank';
      else if (item.type === 'spelling') exType = 'spelling';
      else if (item.type === 'typing') exType = 'typing';
      else if (item.type === 'multiple_choice') exType = 'multiple_choice';

      // Find correct option index for multiple choice
      let correctOpts: number[] = [0];
      if (item.options && item.options.length > 0) {
        const foundIdx = item.options.indexOf(item.correct_answer);
        correctOpts = [foundIdx >= 0 ? foundIdx : 0];
      }

      const newEx: Exercise = {
        id: `memrise_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        lessonId: selectedLessonId,
        type: exType,
        skill: 'vocabulary',
        difficulty: 'scaffolded',
        question: item.question,
        vocabWord: item.word,
        correctText: item.correct_answer,
        hint: item.hint,
        shuffledLetters: item.shuffled_letters,
        memriseStage: item.type,
        options: item.options,
        correctOptions: correctOpts,
        explanation: item.type === 'fill_in_blank' && item.hint 
          ? `Gợi ý dịch: ${item.hint}` 
          : `Từ vựng gốc: ${item.word}`,
        order: idx + 1,
      };

      onSaveExercise(newEx);
      savedCount++;
    });

    setSuccessMsg(`🎉 Đã lưu thành công tất cả ${savedCount} bài tập Memrise vào bài học!`);
    setGeneratedExercises([]);
    setVocabInput('');
  };

  // Remove single exercise
  const handleRemoveExercise = (id: string) => {
    setGeneratedExercises(prev => prev.filter(e => e.id !== id));
  };

  // Quick TTS pronunciation preview
  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Intro Header */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${theme.border} ${theme.card} relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Bộ Tạo Bài Tập Memrise (AI 4 Dạng Chuẩn)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  Memrise Drill
                </span>
              </h3>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Chuyển đổi danh sách từ vựng thành 4 giai đoạn ghi nhớ: 
                <strong> 1. Trắc nghiệm</strong> → 
                <strong> 2. Điền từ ví dụ</strong> → 
                <strong> 3. Xếp ký tự</strong> → 
                <strong> 4. Tự gõ từ</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonModal(true)}
              className={`px-3 py-1.5 rounded-xl border ${theme.border} text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-500 transition-all cursor-pointer`}
            >
              <Code className="w-3.5 h-3.5 text-sky-500" />
              <span>Nhập JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Lesson Selection */}
      <div className={`p-4 rounded-2xl border ${theme.border} ${theme.card} space-y-3`}>
        <label className={`text-xs font-semibold ${theme.textMuted} flex items-center gap-1.5`}>
          <Layers className="w-3.5 h-3.5 text-emerald-500" />
          <span>Chọn bài học nhận bài tập *:</span>
        </label>
        <select
          id="select-memrise-target-lesson"
          value={selectedLessonId}
          onChange={e => setSelectedLessonId(e.target.value)}
          className={`w-full p-3 rounded-xl border ${theme.border} ${theme.inputBg} text-xs font-medium focus:border-emerald-500 cursor-pointer`}
        >
          {lessons.length === 0 && <option value="">Chưa có bài học nào. Vui lòng tạo bài học trước.</option>}
          {lessons.map(l => {
            const parentTopic = topics.find(t => t.id === l.topicId);
            return (
              <option key={l.id} value={l.id}>
                {parentTopic ? `[${parentTopic.title}] - ` : ''}{l.title}
              </option>
            );
          })}
        </select>
      </div>

      {/* Vocabulary Words Input Area */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${theme.border} ${theme.card} space-y-3`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-semibold ${theme.textMuted} flex items-center gap-1.5`}>
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Danh sách từ vựng tiếng Anh:</span>
            <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-500">
              {uniqueWords.length} từ hợp lệ
            </span>
            <button
              type="button"
              onClick={() => setVocabInput(SAMPLE_WORDS.join('\n'))}
              className="text-[11px] text-sky-500 hover:underline cursor-pointer"
            >
              Nạp 5 từ mẫu
            </button>
          </div>
        </div>

        <textarea
          id="textarea-memrise-vocab-list"
          rows={5}
          value={vocabInput}
          onChange={e => setVocabInput(e.target.value)}
          placeholder={`Ví dụ:\nresilient\nauthentic\ndiligent\nprofound\nempathy\n\n(Mỗi từ trên một dòng hoặc phân cách bởi dấu phẩy)`}
          className={`w-full p-3.5 rounded-xl border ${theme.border} ${theme.inputBg} text-xs font-mono focus:border-emerald-500 leading-relaxed`}
        />

        {/* Action button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className={`text-[11px] ${theme.textMuted}`}>
            💡 Hệ thống AI sẽ tự động tạo trắc nghiệm nghĩa, câu ví dụ điền từ, tráo ký tự và bài gõ từ cho từng từ.
          </p>
          <button
            id="btn-generate-memrise-ai"
            type="button"
            disabled={isGenerating || uniqueWords.length === 0}
            onClick={handleGenerateAI}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-all active:scale-95"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý {uniqueWords.length} từ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Tạo {uniqueWords.length * 4} bài tập Memrise (AI)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onFinished && (
            <button
              onClick={onFinished}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500"
            >
              Luyện tập ngay
            </button>
          )}
        </div>
      )}

      {/* Generated Exercises Preview */}
      {generatedExercises.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-inherit pb-3">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>Xem trước kết quả bài tập</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {generatedExercises.length} câu hỏi
                </span>
              </h4>
              <p className={`text-[11px] ${theme.textMuted}`}>
                {Object.keys(groupedExercises).length} từ vựng đã được tạo thành công
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className={`px-3 py-1.5 rounded-xl border ${theme.border} text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-500 transition-all cursor-pointer`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
              </button>

              <button
                id="btn-save-all-memrise"
                type="button"
                onClick={handleSaveAllToLesson}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Lưu toàn bộ {generatedExercises.length} bài vào bài học</span>
              </button>
            </div>
          </div>

          {/* Words Cards */}
          <div className="space-y-4">
            {(Object.entries(groupedExercises) as [string, MemriseExerciseItem[]][]).map(([word, items], wordIdx) => (
              <div 
                key={wordIdx}
                className={`p-4 rounded-2xl border ${theme.border} ${theme.card} space-y-3 shadow-xs`}
              >
                {/* Word Header */}
                <div className="flex items-center justify-between border-b border-inherit pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 font-bold text-xs flex items-center justify-center">
                      {wordIdx + 1}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                      {word}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakWord(word)}
                      title="Nghe phát âm"
                      className="p-1 rounded-md hover:bg-neutral-500/10 text-neutral-400 hover:text-emerald-500 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`text-[11px] ${theme.textMuted} font-medium`}>
                    4 dạng bài tập
                  </span>
                </div>

                {/* 4 Exercise Items Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  {items.map(ex => {
                    let badgeLabel = 'Trắc nghiệm';
                    let badgeColor = 'bg-blue-500/15 text-blue-500';
                    let icon = <HelpCircle className="w-3.5 h-3.5" />;

                    if (ex.type === 'fill_in_blank') {
                      badgeLabel = 'Điền từ ví dụ';
                      badgeColor = 'bg-sky-500/15 text-sky-500';
                      icon = <FileText className="w-3.5 h-3.5" />;
                    } else if (ex.type === 'spelling') {
                      badgeLabel = 'Xếp ký tự';
                      badgeColor = 'bg-amber-500/15 text-amber-500';
                      icon = <Shuffle className="w-3.5 h-3.5" />;
                    } else if (ex.type === 'typing') {
                      badgeLabel = 'Tự gõ từ';
                      badgeColor = 'bg-emerald-500/15 text-emerald-500';
                      icon = <Edit3 className="w-3.5 h-3.5" />;
                    }

                    return (
                      <div 
                        key={ex.id}
                        className={`p-3 rounded-xl border ${theme.border} ${theme.highlight} space-y-2 text-xs relative group`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${badgeColor}`}>
                            {icon}
                            <span>{badgeLabel}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            title="Xóa câu này"
                            className="text-neutral-400 hover:text-rose-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Question */}
                        <div className="font-semibold leading-relaxed">
                          {ex.question}
                        </div>

                        {/* Specific details */}
                        {ex.type === 'multiple_choice' && ex.options && (
                          <div className="grid grid-cols-1 gap-1 pt-1">
                            {ex.options.map((opt, optIdx) => {
                              const isCorrect = opt === ex.correct_answer;
                              return (
                                <div 
                                  key={optIdx} 
                                  className={`p-1.5 px-2.5 rounded-lg text-[11px] flex items-center justify-between ${
                                    isCorrect 
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30' 
                                      : `${theme.card} border ${theme.border} ${theme.textMuted}`
                                  }`}
                                >
                                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                  {isCorrect && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {ex.type === 'fill_in_blank' && (
                          <div className="space-y-1 pt-1">
                            {ex.hint && (
                              <div className={`text-[11px] ${theme.textMuted} italic`}>
                                💡 Dịch nghĩa: {ex.hint}
                              </div>
                            )}
                            <div className="text-[11px] font-bold text-emerald-500">
                              Đáp án điền: <span className="underline">{ex.correct_answer}</span>
                            </div>
                          </div>
                        )}

                        {ex.type === 'spelling' && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`text-[11px] ${theme.textMuted}`}>Ký tự xáo trộn:</span>
                              {(ex.shuffled_letters || []).map((l, lIdx) => (
                                <span 
                                  key={lIdx}
                                  className="w-5 h-5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center uppercase"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-500">
                              Từ đúng: <span className="tracking-wide">{ex.correct_answer}</span>
                            </div>
                          </div>
                        )}

                        {ex.type === 'typing' && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-bold text-emerald-500">
                              Từ cần gõ: <span className="font-mono">{ex.correct_answer}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-xl p-5 rounded-2xl border ${theme.border} ${theme.card} space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-500" />
                <span>Nhập mã JSON Memrise bài tập</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className={`text-xs ${theme.textMuted}`}>
              Dán cấu trúc JSON chứa danh sách bài tập (có trường <code>exercises</code>) để hiển thị và lưu bài tập:
            </p>

            <textarea
              rows={8}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder={`{\n  "status": "success",\n  "total_words_processed": 1,\n  "exercises": [\n    {\n      "id": "ex_1",\n      "word": "cat",\n      "type": "spelling",\n      "question": "Sắp xếp...",\n      "shuffled_letters": ["c", "a", "t"],\n      "correct_answer": "cat"\n    }\n  ]\n}`}
              className={`w-full p-3 rounded-xl border ${theme.border} ${theme.inputBg} text-xs font-mono focus:border-emerald-500 leading-relaxed`}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit">
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className={`px-3.5 py-2 rounded-xl border ${theme.border} text-xs font-semibold cursor-pointer`}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận nạp JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
