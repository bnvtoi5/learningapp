import React, { useState } from 'react';
import { 
  Volume2, 
  Mic, 
  Sparkles, 
  Settings2, 
  HelpCircle, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Plus, 
  Trash2, 
  ArrowRight,
  BookOpen,
  Search,
  Check
} from 'lucide-react';
import { Topic, Lesson, Exercise, DifficultyLevel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  parsePronunciationLines, 
  ParsedPronunciationItem, 
  convertPronunciationItemToExercise 
} from '../utils/pronunciationUtils';
import { 
  analyzeSingleVocabWithAI, 
  enrichPronunciationLinesWithAI, 
  SingleVocabAIAnalysis 
} from '../utils/pronunciationAI';
import { speakText } from '../utils/audio';

interface PronunciationGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  lessons: Lesson[];
  selectedLessonId?: string;
  onExercisesCreated: (exercises: Exercise[]) => void;
}

export const PronunciationGeneratorModal: React.FC<PronunciationGeneratorModalProps> = ({
  isOpen,
  onClose,
  topics,
  lessons,
  selectedLessonId,
  onExercisesCreated,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [rawInput, setRawInput] = useState<string>(
    `apple\nenvironment : môi trường sinh thái\npronunciation | /prəˌnʌn.siˈeɪ.ʃən/ | sự phát âm\nGood morning, how are you today?\nProtecting the environment is essential for our future.`
  );
  const [targetLessonId, setTargetLessonId] = useState<string>(
    selectedLessonId || lessons[0]?.id || ''
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('guided');
  const [defaultThreshold, setDefaultThreshold] = useState<number>(70);
  const [isEnrichingAI, setIsEnrichingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Tab tìm kiếm / AI từ vựng đơn lẻ
  const [showSingleSearch, setShowSingleSearch] = useState(false);
  const [singleWordInput, setSingleWordInput] = useState('');
  const [isSearchingSingle, setIsSearchingSingle] = useState(false);
  const [singleAnalysis, setSingleAnalysis] = useState<SingleVocabAIAnalysis | null>(null);

  // Danh sách dòng đã được phân tích
  const [parsedItems, setParsedItems] = useState<ParsedPronunciationItem[]>(() => 
    parsePronunciationLines(
      `apple\nenvironment : môi trường sinh thái\npronunciation | /prəˌnʌn.siˈeɪ.ʃən/ | sự phát âm\nGood morning, how are you today?\nProtecting the environment is essential for our future.`,
      70
    )
  );

  if (!isOpen) return null;

  // Cập nhật khi người dùng chỉnh sửa văn bản nhập theo dòng
  const handleInputChange = (text: string) => {
    setRawInput(text);
    const parsed = parsePronunciationLines(text, defaultThreshold);
    setParsedItems(parsed);
  };

  // Cập nhật ngưỡng % mặc định
  const handleThresholdChange = (val: number) => {
    setDefaultThreshold(val);
    setParsedItems(prev => prev.map(item => ({
      ...item,
      passAccuracy: item.isSingleWord ? 100 : val,
    })));
  };

  // Thay đổi ngưỡng % cho từng câu riêng biệt
  const handleItemThresholdChange = (id: string, newThresh: number) => {
    setParsedItems(prev => prev.map(it => it.id === id ? { ...it, passAccuracy: newThresh } : it));
  };

  // Xóa một dòng khỏi danh sách xem trước
  const handleRemoveItem = (id: string) => {
    setParsedItems(prev => prev.filter(it => it.id !== id));
  };

  // Bấm nút AI phân tích toàn bộ danh sách dòng: Tự động điền IPA & nghĩa tiếng Việt
  const handleEnrichWithAI = async () => {
    if (!rawInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập ít nhất 1 dòng văn bản để AI phân tích.' });
      return;
    }

    setIsEnrichingAI(true);
    setStatusMessage({ type: 'info', text: 'AI đang phân tích các dòng, điền IPA và dịch nghĩa tiếng Việt...' });

    try {
      const enriched = await enrichPronunciationLinesWithAI(rawInput);
      if (enriched.length > 0) {
        const updatedItems: ParsedPronunciationItem[] = enriched.map((en, idx) => {
          const words = en.targetText.trim().split(/\s+/).filter(Boolean);
          const isSingle = en.isSingleWord ?? (words.length <= 1);
          return {
            id: 'pron_enrich_' + idx + '_' + Math.random().toString(36).substring(2, 6),
            targetText: en.targetText,
            phonetic: en.phonetic || undefined,
            meaning: en.meaning || undefined,
            isSingleWord: isSingle,
            wordsCount: words.length,
            passAccuracy: isSingle ? 100 : defaultThreshold,
          };
        });

        setParsedItems(updatedItems);
        // Đồng bộ lại textarea hiển thị đẹp
        const formattedLines = updatedItems.map(item => {
          if (item.phonetic && item.meaning) {
            return `${item.targetText} | ${item.phonetic} | ${item.meaning}`;
          } else if (item.meaning) {
            return `${item.targetText} : ${item.meaning}`;
          }
          return item.targetText;
        }).join('\n');
        setRawInput(formattedLines);

        setStatusMessage({
          type: 'success',
          text: `Đã hoàn tất phân tích AI cho ${updatedItems.length} dòng thành công!`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Không nhận được dữ liệu từ AI. Hãy kiểm tra lại API Key hoặc mạng của bạn.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Có lỗi xảy ra khi gọi AI phân tích phát âm.'
      });
    } finally {
      setIsEnrichingAI(false);
    }
  };

  // Tra cứu AI cho 1 từ vựng đơn lẻ
  const handleSearchSingleWord = async () => {
    if (!singleWordInput.trim()) return;
    setIsSearchingSingle(true);
    setSingleAnalysis(null);
    try {
      const res = await analyzeSingleVocabWithAI(singleWordInput);
      if (res) {
        setSingleAnalysis(res);
      } else {
        setStatusMessage({ type: 'error', text: 'Không thể tra cứu từ vựng này. Vui lòng thử lại.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Lỗi tra cứu: ' + (e?.message || 'Không thể kết nối AI.') });
    } finally {
      setIsSearchingSingle(false);
    }
  };

  // Thêm từ vựng đơn lẻ vừa tra cứu vào danh sách bài tập phát âm
  const handleAddSingleToDrill = () => {
    if (!singleAnalysis) return;
    const newItem: ParsedPronunciationItem = {
      id: 'pron_' + Math.random().toString(36).substring(2, 7),
      targetText: singleAnalysis.word,
      phonetic: singleAnalysis.phonetic,
      meaning: singleAnalysis.meaning,
      isSingleWord: true,
      wordsCount: 1,
      passAccuracy: 100,
    };
    setParsedItems(prev => [newItem, ...prev]);
    setRawInput(prev => `${singleAnalysis.word} | ${singleAnalysis.phonetic} | ${singleAnalysis.meaning}\n` + prev);
    setStatusMessage({ type: 'success', text: `Đã thêm từ "${singleAnalysis.word}" vào danh sách phát âm!` });
    setSingleAnalysis(null);
    setSingleWordInput('');
    setShowSingleSearch(false);
  };

  // Xác nhận tạo toàn bộ các bài tập phát âm và lưu vào bài học
  const handleSaveExercises = () => {
    if (parsedItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Danh sách bài tập trống. Vui lòng nhập ít nhất 1 dòng.' });
      return;
    }
    if (!targetLessonId) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn bài học để lưu bài tập phát âm.' });
      return;
    }

    const exercisesToCreate: Exercise[] = parsedItems.map(item => 
      convertPronunciationItemToExercise(item, targetLessonId, difficulty)
    );

    onExercisesCreated(exercisesToCreate);
    onClose();
  };

  const singleWordsCount = parsedItems.filter(i => i.isSingleWord).length;
  const sentenceCount = parsedItems.filter(i => !i.isSingleWord).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="pronunciation-generator-modal"
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${theme.border} ${theme.card} overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  AI Tạo Bài Tập Phát Âm Theo Dòng (Pronunciation Drill)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  AI Sư Phạm
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Nhập liệu tách biệt theo dòng (1 dòng = 1 bài tập). Từ đơn đọc đúng là xong, câu dài theo tỷ lệ % tùy chỉnh.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border ${theme.border} ${theme.highlight} ${theme.textMuted} hover:text-foreground transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
            statusMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
            statusMessage.type === 'error' ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' :
            'bg-sky-500/15 text-sky-600 border-sky-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 animate-spin" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* Cấu hình chung: Chọn bài học & Ngưỡng % & Tra cứu AI từ đơn */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Chọn bài học */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Bài học đích:</span>
              </label>
              <select
                value={targetLessonId}
                onChange={e => setTargetLessonId(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} ${theme.inputBg} focus:ring-2 focus:ring-emerald-500`}
              >
                {lessons.map(l => {
                  const parentTopic = topics.find(t => t.id === l.topicId);
                  return (
                    <option key={l.id} value={l.id}>
                      [{parentTopic?.title || 'Chủ đề'}] - {l.title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Tỷ lệ % Đạt đối với Câu nhiều chữ */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-500" />
                  <span>Tỷ lệ % đạt (Câu nhiều chữ):</span>
                </label>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/30">
                  {defaultThreshold}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={defaultThreshold}
                  onChange={e => handleThresholdChange(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>

            {/* 3. Phím tắt AI từ vựng đơn lẻ */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setShowSingleSearch(!showSingleSearch)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  showSingleSearch 
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500' 
                    : `border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10`
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>{showSingleSearch ? 'Đóng AI Tra Cứu Từ Đơn' : '🔍 AI Từ Vựng Đơn Lẻ (Tra IPA & Mẹo)'}</span>
              </button>
            </div>
          </div>

          {/* Panel AI Tra cứu Từ vựng đơn lẻ (khi mở ra) */}
          {showSingleSearch && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Tra Cứu & Tạo Nhanh Cho 1 Từ Vựng Đơn Lẻ:</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (Tự động điền IPA chuẩn, nghĩa & mẹo phát âm)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập 1 từ tiếng Anh (ví dụ: enthusiastic, extraordinary, apple)..."
                  value={singleWordInput}
                  onChange={e => setSingleWordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSingleWord()}
                  className={`flex-1 px-3 py-2 text-xs rounded-xl border ${theme.border} ${theme.inputBg}`}
                />
                <button
                  type="button"
                  onClick={handleSearchSingleWord}
                  disabled={isSearchingSingle || !singleWordInput.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSearchingSingle ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>{isSearchingSingle ? 'Đang phân tích...' : 'Phân tích AI'}</span>
                </button>
              </div>

              {singleAnalysis && (
                <div className="p-3.5 rounded-xl border border-indigo-500/25 bg-background/80 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{singleAnalysis.word}</span>
                      <span className="text-xs font-mono text-indigo-500 font-semibold">{singleAnalysis.phonetic}</span>
                      <button 
                        type="button" 
                        onClick={() => speakText(singleAnalysis.word)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Nghĩa:</span> {singleAnalysis.meaning}
                    </p>
                    {singleAnalysis.pronunciationTips && (
                      <p className="text-[11px] text-teal-600 dark:text-teal-400">
                        💡 <span className="font-semibold">Mẹo:</span> {singleAnalysis.pronunciationTips}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSingleToDrill}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm vào danh sách</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Vùng Nhập liệu tách biệt theo dòng */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Nhập liệu theo dòng (Mỗi dòng là 1 từ hoặc 1 câu riêng biệt):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnrichWithAI}
                  disabled={isEnrichingAI || !rawInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isEnrichingAI ? 'animate-spin' : ''}`} />
                  <span>{isEnrichingAI ? 'AI Đang Xử Lý...' : '✨ AI Điền IPA & Dịch Nghĩa Toàn Bộ'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={rawInput}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Dán hoặc nhập danh sách từ vựng / câu vào đây, mỗi dòng là 1 bài tập:&#10;apple&#10;environment : môi trường sống&#10;pronunciation | /prəˌnʌn.siˈeɪ.ʃən/ | sự phát âm&#10;Good morning, how are you today?&#10;I love studying English every day."
              className={`w-full p-3.5 text-xs font-mono rounded-xl border ${theme.border} ${theme.inputBg} focus:ring-2 focus:ring-emerald-500 leading-relaxed custom-scrollbar`}
            />

            {/* Thống kê dòng đã nhận diện */}
            <div className="flex flex-wrap items-center justify-between text-xs py-1 px-1 text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">
                  Tổng cộng: <strong className="text-emerald-500">{parsedItems.length}</strong> bài tập phát âm
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  🎯 {singleWordsCount} từ đơn lẻ (Đọc đúng là xong)
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                  📝 {sentenceCount} câu nhiều chữ (Yêu cầu ≥ {defaultThreshold}%)
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground italic">
                Hỗ trợ định dạng: word | IPA | nghĩa hoặc word : nghĩa
              </span>
            </div>
          </div>

          {/* Danh sách xem trước từng bài tập phát âm (Preview Cards) */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Xem trước danh sách bài tập phát âm ({parsedItems.length} mục):</span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {parsedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border ${theme.border} ${theme.highlight} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{item.targetText}</span>
                        {item.phonetic && (
                          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10">
                            {item.phonetic}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => speakText(item.targetText)}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors"
                          title="Nghe phát âm thử"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {item.meaning && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-semibold text-foreground">Nghĩa:</span> {item.meaning}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cột trạng thái & quy tắc đánh giá */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {item.isSingleWord ? (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                        🎯 Từ đơn (Nghe đúng là xong)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Ngưỡng:</span>
                        <select
                          value={item.passAccuracy}
                          onChange={e => handleItemThresholdChange(item.id, Number(e.target.value))}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${theme.border} ${theme.inputBg} text-teal-600 dark:text-teal-400`}
                        >
                          {[50, 60, 70, 75, 80, 85, 90, 95].map(pct => (
                            <option key={pct} value={pct}>
                              ≥ {pct}%
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Xóa bài tập này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {parsedItems.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  Chưa có bài tập nào. Hãy nhập các dòng từ vựng hoặc câu ở trên.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Sẽ tạo <strong className="text-foreground">{parsedItems.length}</strong> bài tập phát âm vào bài học đã chọn.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-semibold text-foreground`}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveExercises}
              disabled={parsedItems.length === 0 || !targetLessonId}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Thêm {parsedItems.length} Bài Tập Phát Âm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
