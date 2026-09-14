import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Trash2, 
  BookOpen, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  FileText,
  Volume2,
  Mic,
  AlignLeft,
  Grid,
  Check,
  Zap,
  RotateCcw
} from 'lucide-react';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  ExerciseType, 
  SkillCategory, 
  DifficultyLevel,
  MatchingPair 
} from '../types';
import { useTheme } from '../context/ThemeContext';

interface ExerciseBuilderProps {
  topics?: Topic[];
  lessons?: Lesson[];
  initialContext?: {
    type: 'topic' | 'lesson' | 'exercise';
    targetId?: string;
  };
  onSaveTopic: (topic: Topic) => void;
  onSaveLesson: (lesson: Lesson) => void;
  onSaveExercise: (exercise: Exercise) => void;
  onFinished: () => void;
}

const EXERCISE_TYPES: { type: ExerciseType; label: string; desc: string }[] = [
  { type: 'vocab_cloze', label: 'Khuyết ký tự từ vựng', desc: 'Active Recall: Điền khuyết ký tự trong từ vựng' },
  { type: 'flashcard_recall', label: 'Lật thẻ ghi nhớ', desc: 'Active Recall: Lật thẻ xem từ, phiên âm & tự đánh giá' },
  { type: 'listen_spell', label: 'Nghe phát âm & gõ từ', desc: 'Dictation: Nghe phát âm chuẩn và gõ lại đúng chính tả' },
  { type: 'anagram', label: 'Xếp chữ cái thành từ', desc: 'Active Recall: Chạm xếp chữ cái xáo trộn thành từ vựng' },
  { type: 'collocation', label: 'Ghép cụm từ cố định', desc: 'Chọn từ kết hợp tự nhiên (make/do/take...)' },
  { type: 'multiple_choice', label: 'Trắc nghiệm chọn đáp án', desc: 'Chọn 1 hoặc nhiều phương án đúng' },
  { type: 'true_false', label: 'Đúng / Sai (True/False)', desc: 'Phán đoán tính đúng sai của phát biểu' },
  { type: 'fill_blank', label: 'Điền từ vào chỗ trống', desc: 'Điền dạng đúng của từ vào câu' },
  { type: 'sentence_builder', label: 'Sắp xếp câu', desc: 'Ghép các từ xáo trộn thành câu hoàn chỉnh' },
  { type: 'matching', label: 'Nối cặp (Matching)', desc: 'Ghép từ - nghĩa, câu hỏi - đáp án' },
  { type: 'error_correction', label: 'Sửa lỗi sai', desc: 'Tìm lỗi, viết lại câu và chọn bản chất lỗi' },
  { type: 'translation', label: 'Dịch câu', desc: 'Dịch Việt ↔ Anh với gợi ý hoặc tự dịch' },
  { type: 'speaking', label: 'Luyện nói (Speaking)', desc: 'Đọc to, nói phản xạ, tình huống role-play' },
  { type: 'writing', label: 'Luyện viết (Writing)', desc: 'Viết câu/đoạn văn theo tiêu chuẩn ngữ pháp' },
  { type: 'reading', label: 'Đọc hiểu (Reading)', desc: 'Đoạn văn đọc tìm thông tin, keyword, main idea' },
  { type: 'listening', label: 'Luyện nghe (Listening)', desc: 'Quy trình 3 bước: dự đoán, nghe, transcript' },
  { type: 'mixed_practice', label: 'Tổng hợp ngữ cảnh', desc: 'Tự phân tích tình huống để dùng cấu trúc đúng' },
];

export const ExerciseBuilder: React.FC<ExerciseBuilderProps> = ({
  topics = [],
  lessons = [],
  initialContext,
  onSaveTopic,
  onSaveLesson,
  onSaveExercise,
  onFinished,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  // Active form section tab
  const [activeTab, setActiveTab] = useState<'exercise' | 'lesson' | 'topic'>(
    initialContext?.type || (topics.length === 0 ? 'topic' : 'exercise')
  );
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Topic Form
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicSubject, setTopicSubject] = useState('Tiếng Anh');
  const [topicSkill, setTopicSkill] = useState<SkillCategory>('vocabulary');

  // Lesson Form
  const [targetTopicId, setTargetTopicId] = useState<string>(topics?.[0]?.id || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonKnowledge, setLessonKnowledge] = useState('');

  // Exercise Form
  const [targetLessonId, setTargetLessonId] = useState<string>(lessons?.[0]?.id || '');
  const [exType, setExType] = useState<ExerciseType>('vocab_cloze');
  const [exSkill, setExSkill] = useState<SkillCategory>('vocabulary');
  const [exDifficulty, setExDifficulty] = useState<DifficultyLevel>('guided');
  const [exQuestion, setExQuestion] = useState('');
  const [exInstruction, setExInstruction] = useState('');
  const [exContext, setExContext] = useState('');
  const [exExplanation, setExExplanation] = useState('');
  const [exGrammarHint, setExGrammarHint] = useState('');
  const [exKeywords, setExKeywords] = useState('');

  // Vocab fields
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [clozeLetters, setClozeLetters] = useState('');

  // Specific answers
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [exCorrectText, setExCorrectText] = useState('');
  const [exWrongSentence, setExWrongSentence] = useState('');
  const [exErrorType, setExErrorType] = useState('Subject-verb agreement');
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { id: '1', left: '', right: '' },
    { id: '2', left: '', right: '' },
    { id: '3', left: '', right: '' },
  ]);

  // Audio / Listening
  const [audioText, setAudioText] = useState('');
  const [predictionHint, setPredictionHint] = useState('');
  const [transcript, setTranscript] = useState('');
  const [readingQuestionType, setReadingQuestionType] = useState('Main Idea');
  const [evidenceRegion, setEvidenceRegion] = useState('');

  // Handle initial context passed from navigation
  useEffect(() => {
    if (initialContext) {
      if (initialContext.type === 'topic') {
        setActiveTab('topic');
      } else if (initialContext.type === 'lesson') {
        setActiveTab('lesson');
        if (initialContext.targetId) setTargetTopicId(initialContext.targetId);
      } else if (initialContext.type === 'exercise') {
        setActiveTab('exercise');
        if (initialContext.targetId) setTargetLessonId(initialContext.targetId);
      }
    }
  }, [initialContext]);

  // Reset exercise state when switching types
  const handleTypeChange = (newType: ExerciseType) => {
    setExType(newType);
    setExContext(''); // ALWAYS reset context so it never leaks between types
    if (newType === 'vocab_cloze' || newType === 'flashcard_recall' || newType === 'listen_spell' || newType === 'anagram') {
      setExSkill('vocabulary');
    }
  };

  // 1-Click Fast Template Generator for Testing
  const applyTemplate = (type: ExerciseType) => {
    handleTypeChange(type);
    setExContext(''); // Clear context by default

    switch (type) {
      case 'vocab_cloze':
        setExSkill('vocabulary');
        setVocabWord('friendly');
        setVocabMeaning('thân thiện, cởi mở');
        setPhonetic('/ˈfrend.li/');
        setClozeLetters('f _ _ e n d l y');
        setExQuestion('Điền từ tiếng Anh có nghĩa: "thân thiện, cởi mở"');
        setExInstruction('Nhập từ chính xác dựa theo các chữ cái gợi ý');
        setExExplanation('friendly (tính từ) = thân thiện, dễ gần.');
        break;

      case 'flashcard_recall':
        setExSkill('vocabulary');
        setVocabWord('generous');
        setVocabMeaning('rộng lượng, hào phóng, sẵn sàng cho đi');
        setPhonetic('/ˈdʒen.ər.əs/');
        setExQuestion('Người có tính cách rộng lượng, sẵn sàng chia sẻ tiền bạc hoặc thời gian');
        setExExplanation('generous (adj): sẵn lòng giúp đỡ hoặc cho người khác nhiều hơn bình thường.');
        break;

      case 'listen_spell':
        setExSkill('vocabulary');
        setVocabWord('environment');
        setVocabMeaning('môi trường xung quanh');
        setPhonetic('/ɪnˈvaɪ.rən.mənt/');
        setExQuestion('Nghe phát âm và gõ lại từ vựng chính xác:');
        setExInstruction('Bấm nút loa để nghe và kiểm tra chính tả');
        setExExplanation('environment /ɪnˈvaɪ.rən.mənt/: môi trường.');
        break;

      case 'anagram':
        setExSkill('vocabulary');
        setVocabWord('helpful');
        setVocabMeaning('hay giúp đỡ người khác, có ích');
        setExQuestion('Sắp xếp các chữ cái sau thành từ có nghĩa: "hay giúp đỡ"');
        setExExplanation('helpful = help + ful (tính từ).');
        break;

      case 'collocation':
        setExSkill('vocabulary');
        setExQuestion('Chọn từ thích hợp điền vào chỗ trống: "She always ___ her homework before dinner."');
        setOptions(['does', 'makes', 'takes', 'plays']);
        setCorrectOptionIdx(0);
        setExExplanation('Cụm từ cố định (collocation) chuẩn là "do homework", không dùng "make homework".');
        break;

      case 'multiple_choice':
        setExSkill('grammar');
        setExQuestion('Chọn đáp án đúng nhất: "He _____ to the gym three times a week."');
        setOptions(['goes', 'go', 'is going', 'went']);
        setCorrectOptionIdx(0);
        setExExplanation('Chủ ngữ "He" ngôi thứ ba số ít đi với thì hiện tại đơn diễn tả thói quen cần thêm -es vào "go" -> "goes".');
        break;

      case 'true_false':
        setExSkill('grammar');
        setExQuestion('"The sun rises in the West." Phát biểu trên là Đúng hay Sai?');
        setCorrectOptionIdx(1); // False
        setExExplanation('Mặt trời mọc ở hướng Đông (East) và lặn ở hướng Tây (West), nên phát biểu này Sai.');
        break;

      case 'fill_blank':
        setExSkill('grammar');
        setExQuestion('Cho dạng đúng của động từ trong ngoặc: "They (live) _____ in Hanoi since 2015."');
        setExCorrectText('have lived');
        setExGrammarHint('Dấu hiệu: "since 2015" -> thì hiện tại hoàn thành: have/has + V3/ed.');
        setExExplanation('Chủ ngữ "They" đi với "have lived" theo công thức Hiện tại hoàn thành.');
        break;

      case 'sentence_builder':
        setExSkill('grammar');
        setExQuestion('Sắp xếp các từ sau thành một câu hoàn chỉnh:');
        setExCorrectText('I usually go to school by bus');
        setExExplanation('Trật tự chuẩn: Chủ ngữ (I) + Trạng từ (usually) + Động từ (go to school) + Phương tiện (by bus).');
        break;

      case 'matching':
        setExSkill('vocabulary');
        setExQuestion('Ghép từ tiếng Anh ở cột trái với nghĩa tương ứng ở cột phải:');
        setMatchingPairs([
          { id: '1', left: 'friendly', right: 'thân thiện' },
          { id: '2', left: 'helpful', right: 'hay giúp đỡ' },
          { id: '3', left: 'classmate', right: 'bạn cùng lớp' },
        ]);
        setExExplanation('friendly = thân thiện; helpful = hay giúp đỡ; classmate = bạn cùng lớp.');
        break;

      case 'error_correction':
        setExSkill('grammar');
        setExQuestion('Tìm lỗi sai và sửa lại câu sau:');
        setExWrongSentence('She go to school every day.');
        setExCorrectText('She goes to school every day.');
        setExErrorType('Subject-verb agreement');
        setExExplanation('Chủ ngữ "She" ngôi thứ ba số ít cần chia "goes".');
        break;

      case 'translation':
        setExSkill('writing');
        setExQuestion('Dịch câu sau sang tiếng Anh: "Nam đang học bài trong phòng."');
        setExKeywords('Nam, study, in the room');
        setExCorrectText('Nam is studying in the room');
        setExExplanation('Thì hiện tại tiếp diễn: S + is/am/are + V-ing.');
        break;

      case 'reading':
        setExSkill('reading');
        // Reading context is ONLY set here!
        setExContext('Anna lives in a quiet village near Da Lat. Every morning, she wakes up at 5:30 to water the flowers in her garden before going to school. Her favorite flower is the purple hydrangea.');
        setExQuestion('What is the main topic of the passage?');
        setReadingQuestionType('Main Idea');
        setEvidenceRegion('Anna lives in a quiet village near Da Lat. Every morning, she wakes up at 5:30...');
        setOptions([
          'Anna\'s morning routine in her village',
          'How to grow hydrangeas',
          'The history of Da Lat',
          'Anna\'s school exams'
        ]);
        setCorrectOptionIdx(0);
        setExExplanation('Toàn bộ đoạn văn mô tả thói quen buổi sáng thức dậy chăm sóc vườn của Anna.');
        break;

      case 'listening':
        setExSkill('listening');
        setExQuestion('What time does the class start?');
        setAudioText('Good morning students. Please remember that our class begins at eight o clock sharp.');
        setTranscript('Good morning students. Please remember that our class begins at eight o\'clock sharp.');
        setOptions(['7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM']);
        setCorrectOptionIdx(1);
        setExExplanation('Người nói thông báo: "...our class begins at eight o\'clock sharp".');
        break;
    }
  };

  // Submit Exercise
  const handleSubmitExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonId) {
      setStatusBanner({ type: 'error', text: 'Vui lòng chọn bài học cho câu hỏi này.' });
      return;
    }

    const newExercise: Exercise = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      lessonId: targetLessonId,
      type: exType,
      skill: exSkill,
      difficulty: exDifficulty,
      question: exQuestion.trim() || (vocabMeaning ? `Nghĩa: ${vocabMeaning}` : 'Câu hỏi:'),
      instruction: exInstruction.trim() || undefined,
      // Strictly ONLY attach context if it is reading or speaking
      context: (exType === 'reading' || exType === 'speaking') && exContext.trim() ? exContext.trim() : undefined,
      explanation: exExplanation.trim() || undefined,
      grammarHint: exGrammarHint.trim() || undefined,
      correctText: exCorrectText.trim() || vocabWord.trim() || undefined,
      vocabWord: vocabWord.trim() || undefined,
      vocabMeaning: vocabMeaning.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      clozeLetters: clozeLetters.trim() || undefined,
    };

    if (exType === 'multiple_choice' || exType === 'collocation' || exType === 'image_identify' || exType === 'reading') {
      newExercise.options = options.filter(o => o.trim().length > 0);
      newExercise.correctOptions = [correctOptionIdx];
    } else if (exType === 'true_false') {
      newExercise.correctOptions = [correctOptionIdx];
    } else if (exType === 'matching') {
      newExercise.matchingPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
    } else if (exType === 'error_correction') {
      newExercise.wrongSentence = exWrongSentence.trim();
      newExercise.errorType = exErrorType.trim();
    } else if (exType === 'sentence_builder') {
      newExercise.scrambledWords = (exCorrectText.trim() || vocabWord.trim()).split(/\s+/);
    } else if (exType === 'listening') {
      newExercise.audioText = audioText.trim();
      newExercise.audioPredictionHint = predictionHint.trim();
      newExercise.transcript = transcript.trim();
      newExercise.options = options.filter(o => o.trim().length > 0);
      newExercise.correctOptions = [correctOptionIdx];
    }

    onSaveExercise(newExercise);
    setStatusBanner({ type: 'success', text: 'Đã lưu câu hỏi bài tập thành công!' });
    // Clear question for next
    setExQuestion('');
    setVocabWord('');
    setVocabMeaning('');
    setClozeLetters('');
    setExCorrectText('');
    setExContext('');
  };

  // Submit Topic
  const handleSubmitTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    const newTopic: Topic = {
      id: 'topic_' + Date.now(),
      title: topicTitle.trim(),
      description: topicDesc.trim(),
      subject: topicSubject.trim() || 'Tiếng Anh',
      primarySkill: topicSkill,
      createdAt: Date.now(),
    };

    onSaveTopic(newTopic);
    setTargetTopicId(newTopic.id);
    setTopicTitle('');
    setTopicDesc('');
    setStatusBanner({
      type: 'success',
      text: `Đã tạo chủ đề "${newTopic.title}" thành công! Bây giờ bạn có thể tiếp tục tạo bài học đầu tiên.`
    });
    setActiveTab('lesson');
  };

  // Submit Lesson
  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTopicId || !lessonTitle.trim()) return;

    const newLesson: Lesson = {
      id: 'lesson_' + Date.now(),
      topicId: targetTopicId,
      title: lessonTitle.trim(),
      description: lessonDesc.trim(),
      knowledgeSummary: lessonKnowledge.trim() || undefined,
      order: lessons.filter(l => l.topicId === targetTopicId).length + 1,
    };

    onSaveLesson(newLesson);
    setTargetLessonId(newLesson.id);
    setLessonTitle('');
    setLessonDesc('');
    setLessonKnowledge('');
    setStatusBanner({
      type: 'success',
      text: `Đã tạo bài học "${newLesson.title}" thành công! Bây giờ bạn có thể thêm câu hỏi vào bài này.`
    });
    setActiveTab('exercise');
  };

  return (
    <div className={`space-y-6 pb-24 ${typo.fontSize} ${typo.lineHeight} animate-in fade-in duration-150`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Soạn nội dung học tập</h2>
          <p className={`text-xs ${theme.textMuted}`}>
            Tự do tạo chủ đề, bài học và các dạng bài tập theo cấu trúc bài giảng.
          </p>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusBanner && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-150 ${
          statusBanner.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : statusBanner.type === 'error'
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 hover:opacity-75 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-inherit gap-2 overflow-x-auto pb-1">
        {[
          { id: 'topic', label: '1. Tạo chủ đề (Topic)', icon: BookOpen },
          { id: 'lesson', label: '2. Tạo bài học (Lesson)', icon: Layers },
          { id: 'exercise', label: '3. Thêm câu hỏi / Bài tập', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isSelected 
                  ? 'border-emerald-500 text-emerald-500' 
                  : `border-transparent ${theme.textMuted} hover:opacity-80`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXERCISE CREATOR */}
      {/* ============================================================== */}
      {activeTab === 'exercise' && (
        <form onSubmit={handleSubmitExercise} className={`${theme.card} p-5 rounded-2xl border ${theme.border} space-y-5`}>
          {/* Target Lesson selection */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.textMuted} block`}>
              Thêm vào bài học nào *:
            </label>
            {lessons.length === 0 ? (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500 flex items-center justify-between">
                <span>Chưa có bài học nào. Bạn cần tạo bài học trước!</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('lesson')}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-semibold"
                >
                  Tạo bài học ngay
                </button>
              </div>
            ) : (
              <select
                id="select-target-lesson"
                value={targetLessonId}
                onChange={e => setTargetLessonId(e.target.value)}
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-medium`}
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
            )}
          </div>

          {/* Quick 1-Click Template Bar for Instant Testing */}
          <div className="space-y-2 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Mẫu thử nhanh (Bấm 1 chạm để điền mẫu từng dạng bài):</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: 'vocab_cloze', label: '⭐ Khuyết từ vựng (Recall)' },
                { type: 'flashcard_recall', label: '⭐ Lật thẻ (Recall)' },
                { type: 'listen_spell', label: '⭐ Nghe & gõ (Dictation)' },
                { type: 'anagram', label: '⭐ Xếp chữ cái' },
                { type: 'collocation', label: 'Ghép cụm từ' },
                { type: 'multiple_choice', label: 'Trắc nghiệm' },
                { type: 'true_false', label: 'Đúng / Sai' },
                { type: 'fill_blank', label: 'Điền từ khuyết' },
                { type: 'sentence_builder', label: 'Sắp xếp câu' },
                { type: 'matching', label: 'Nối cặp' },
                { type: 'error_correction', label: 'Sửa lỗi sai' },
                { type: 'reading', label: 'Đọc hiểu' },
                { type: 'listening', label: 'Luyện nghe' },
              ].map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => applyTemplate(t.type as ExerciseType)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    exType === t.type 
                      ? 'border-emerald-500 bg-emerald-600 text-white font-bold' 
                      : `${theme.border} ${theme.highlight}`
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Type, Skill, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Dạng bài tập:
              </label>
              <select
                id="builder-select-type"
                value={exType}
                onChange={e => handleTypeChange(e.target.value as ExerciseType)}
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
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
                id="builder-select-skill"
                value={exSkill}
                onChange={e => setExSkill(e.target.value as SkillCategory)}
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs capitalize`}
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
                Độ khó sư phạm:
              </label>
              <select
                id="builder-select-diff"
                value={exDifficulty}
                onChange={e => setExDifficulty(e.target.value as DifficultyLevel)}
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
              >
                <option value="scaffolded">🟢 Scaffolded (Nhiều gợi ý)</option>
                <option value="guided">🟡 Guided (Có cấu trúc)</option>
                <option value="controlled">🟠 Controlled (Tình huống)</option>
                <option value="independent">🔴 Independent (Tự làm)</option>
                <option value="challenge">⚫ Challenge (Thách thức)</option>
              </select>
            </div>
          </div>

          {/* Active Recall / Vocab Section */}
          {(exType === 'vocab_cloze' || exType === 'flashcard_recall' || exType === 'listen_spell' || exType === 'anagram') && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <span className="text-xs font-bold text-emerald-500 block">
                ⭐ Cài đặt từ vựng Active Recall:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Từ tiếng Anh mục tiêu *:
                  </label>
                  <input
                    id="input-builder-vocab-word"
                    type="text"
                    required
                    value={vocabWord}
                    onChange={e => setVocabWord(e.target.value)}
                    placeholder="VD: friendly, generous..."
                    className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                    Nghĩa tiếng Việt / Gợi ý *:
                  </label>
                  <input
                    id="input-builder-vocab-meaning"
                    type="text"
                    value={vocabMeaning}
                    onChange={e => setVocabMeaning(e.target.value)}
                    placeholder="VD: thân thiện, rộng lượng..."
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
                    id="input-builder-phonetic"
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
                      Mẫu khuyết chữ cái (tùy chọn):
                    </label>
                    <input
                      id="input-builder-cloze-letters"
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

          {/* Question / Prompt */}
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Đề bài / Câu hỏi *:
            </label>
            <input
              id="input-builder-question"
              type="text"
              required
              value={exQuestion}
              onChange={e => setExQuestion(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-medium`}
            />
          </div>

          {/* Reading Passage ONLY for Reading */}
          {exType === 'reading' && (
            <div className="space-y-2 p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5">
              <label className="text-xs font-semibold text-sky-500 block">
                📖 Đoạn văn bài đọc (Reading Passage):
              </label>
              <textarea
                id="input-builder-reading-passage"
                rows={4}
                value={exContext}
                onChange={e => setExContext(e.target.value)}
                placeholder="Dán nội dung bài đọc vào đây..."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-serif`}
              />
            </div>
          )}

          {/* Options for Multiple Choice / Collocation */}
          {(exType === 'multiple_choice' || exType === 'collocation' || exType === 'reading' || exType === 'image_identify') && (
            <div className="space-y-2">
              <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                Các phương án lựa chọn & Đánh dấu đáp án đúng:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-opt-choice"
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

          {/* Correct text for Fill Blank / Sentence builder / Translation */}
          {(exType === 'fill_blank' || exType === 'sentence_builder' || exType === 'translation') && (
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Đáp án chính xác *:
              </label>
              <input
                id="input-builder-correct-text"
                type="text"
                required
                value={exCorrectText}
                onChange={e => setExCorrectText(e.target.value)}
                placeholder="Đáp án đúng..."
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
              />
            </div>
          )}

          {/* Error correction inputs */}
          {exType === 'error_correction' && (
            <div className="space-y-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Câu chứa lỗi sai *:
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
                  Câu sau khi sửa đúng *:
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
              Giải thích chi tiết ngữ pháp / từ vựng:
            </label>
            <textarea
              id="input-builder-explanation"
              rows={2}
              value={exExplanation}
              onChange={e => setExExplanation(e.target.value)}
              placeholder="Giải thích vì sao đúng, quy tắc cốt lõi..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div className="pt-2">
            <button
              id="btn-save-new-exercise"
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu câu hỏi vào bài học</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LESSON CREATOR */}
      {/* ============================================================== */}
      {activeTab === 'lesson' && (
        <form onSubmit={handleSubmitLesson} className={`${theme.card} p-5 rounded-2xl border ${theme.border} space-y-4`}>
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Thuộc chủ đề nào *:
            </label>
            {topics.length === 0 ? (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500">
                Chưa có chủ đề nào. Vui lòng chuyển sang tab "3. Tạo chủ đề mới" trước!
              </div>
            ) : (
              <select
                value={targetTopicId}
                onChange={e => setTargetTopicId(e.target.value)}
                className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-medium`}
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.subject})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tên bài học *:
            </label>
            <input
              type="text"
              required
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
              placeholder="VD: Bài 1 - Tính từ miêu tả tính cách..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Mô tả mục tiêu bài học:
            </label>
            <input
              type="text"
              value={lessonDesc}
              onChange={e => setLessonDesc(e.target.value)}
              placeholder="VD: Nắm vững 10 tính từ phổ biến và cách dùng trong câu..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tóm tắt lý thuyết cốt lõi (Pha Learn):
            </label>
            <textarea
              rows={3}
              value={lessonKnowledge}
              onChange={e => setLessonKnowledge(e.target.value)}
              placeholder="Công thức hoặc quy tắc ngữ pháp trọng tâm..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Tạo bài học</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TOPIC CREATOR */}
      {/* ============================================================== */}
      {activeTab === 'topic' && (
        <form onSubmit={handleSubmitTopic} className={`${theme.card} p-5 rounded-2xl border ${theme.border} space-y-4`}>
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tên chủ đề *:
            </label>
            <input
              type="text"
              required
              value={topicTitle}
              onChange={e => setTopicTitle(e.target.value)}
              placeholder="VD: Tiếng Anh Lớp 9 - Unit 1: Local Community..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Môn học:
              </label>
              <input
                type="text"
                value={topicSubject}
                onChange={e => setTopicSubject(e.target.value)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Kỹ năng trọng tâm:
              </label>
              <select
                value={topicSkill}
                onChange={e => setTopicSkill(e.target.value as SkillCategory)}
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
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Mô tả ngắn:
            </label>
            <textarea
              rows={2}
              value={topicDesc}
              onChange={e => setTopicDesc(e.target.value)}
              placeholder="Mô tả nội dung chương học..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              <span>Tạo chủ đề</span>
            </button>
          </div>

          {/* Existing Topics List for quick verification */}
          <div className="pt-4 border-t border-inherit space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                Chủ đề đã có ({topics.length})
              </h4>
            </div>

            {topics.length === 0 ? (
              <p className={`text-xs ${theme.textMuted} italic`}>
                Chưa có chủ đề nào được tạo. Hãy điền form bên trên và bấm "Tạo chủ đề".
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {topics.map(t => {
                  const topicLessons = lessons.filter(l => l.topicId === t.id);
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border ${theme.border} ${theme.card} flex items-center justify-between gap-2`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{t.title}</div>
                        <div className={`text-[10px] ${theme.textMuted} flex items-center gap-2 mt-0.5`}>
                          <span>{t.subject}</span>
                          <span>•</span>
                          <span>{topicLessons.length} bài học</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetTopicId(t.id);
                          setActiveTab('lesson');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600/15 hover:bg-sky-600/25 text-sky-600 dark:text-sky-400 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all"
                      >
                        + Thêm bài
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
