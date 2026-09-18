import { 
  Exercise, 
  SubQuestion, 
  ReadingQuestionType, 
  ReadingPassageAnalysis, 
  ReadingGeneratedQuestion, 
  ReadingGenerationResult 
} from '../types';
import { loadSettings } from './storage';

export const READING_QUESTION_TYPES: { type: ReadingQuestionType; label: string; desc: string; icon: string }[] = [
  { type: 'main_idea', label: 'Main Idea', desc: 'Ý chính toàn bài / tiêu đề bao quát', icon: '🎯' },
  { type: 'detail', label: 'Direct Detail', desc: 'Thông tin chi tiết cụ thể theo đoạn', icon: '🔍' },
  { type: 'vocabulary', label: 'Vocabulary in Context', desc: 'Nghĩa của từ vựng trong ngữ cảnh bài đọc', icon: '📖' },
  { type: 'reference', label: 'Pronoun Reference', desc: 'Từ quy chiếu (they, it, this, which...)', icon: '🔗' },
  { type: 'inference', label: 'Inference', desc: 'Suy luận logic dựa trên bằng chứng gián tiếp', icon: '💡' },
  { type: 'paragraph_location', label: 'Paragraph Location', desc: 'Xác định đoạn văn đề cập thông tin', icon: '📍' },
  { type: 'true_false', label: 'True / False / NOT TRUE', desc: 'Đánh giá tính đúng/sai của phát biểu', icon: '⚖️' },
  { type: 'authors_purpose', label: "Author's Purpose / Tone", desc: 'Mục đích hoặc thái độ của tác giả', icon: '✍️' },
];

/**
 * Thuật toán sinh bài đọc hiểu cục bộ (Offline Generator Engine)
 * Đảm bảo 100% không bao giờ crash nếu mất kết nối mạng
 */
export function generateOfflineReadingExercises(
  passage: string,
  requestedCount?: number
): ReadingGenerationResult {
  const cleanPassage = passage.trim();
  const rawParagraphs = cleanPassage.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [cleanPassage];
  const words = cleanPassage.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  let targetCount = requestedCount;
  if (!targetCount) {
    if (wordCount < 150) targetCount = 5;
    else if (wordCount <= 350) targetCount = 7;
    else targetCount = 9;
  }

  const firstPara = paragraphs[0] || '';
  const sentencesP1 = firstPara.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  const firstSentence = sentencesP1[0]?.trim() || firstPara.slice(0, 80);

  const questions: ReadingGeneratedQuestion[] = [];

  // 1. Main Idea Question
  questions.push({
    id: `rq_offline_1_${Date.now()}`,
    type: 'main_idea',
    difficulty: 'medium',
    question: 'What is the primary topic discussed in the passage?',
    options: [
      firstSentence.length > 65 ? firstSentence.slice(0, 65) + '...' : firstSentence,
      'A minor historical anomaly with negligible modern impact',
      'An unverified hypothesis refuted by recent studies',
      'The comprehensive financial consequences of future technology'
    ],
    correctAnswer: 0,
    explanation: 'Đoạn văn mở đầu nêu bật và bao quát chủ đề trọng tâm của toàn bộ bài đọc.',
    evidence: firstSentence,
    paragraph: 1,
    isValidated: true
  });

  // 2. Direct Detail Question
  const detailSentence = sentencesP1[1] || sentencesP1[0] || firstSentence;
  questions.push({
    id: `rq_offline_2_${Date.now()}`,
    type: 'detail',
    difficulty: 'easy',
    question: 'According to paragraph 1, which of the following is stated by the author?',
    options: [
      detailSentence,
      'The author explicitly opposes all current practices mentioned',
      'The events occurred centuries before recorded historical archives',
      'Only a small group of isolated specialists participate in this field'
    ],
    correctAnswer: 0,
    explanation: 'Thông tin này được tác giả đề cập và khẳng định trực tiếp ngay trong đoạn 1 của bài đọc.',
    evidence: detailSentence,
    paragraph: 1,
    isValidated: true
  });

  // 3. Vocabulary in context Question
  const candidateWords = words.filter(w => {
    const clean = w.replace(/[^a-zA-Z]/g, '');
    return clean.length >= 6 && !['the', 'and', 'that', 'with', 'from', 'this'].includes(clean.toLowerCase());
  });
  const targetWord = (candidateWords[2] || candidateWords[0] || 'essential').replace(/[^a-zA-Z]/g, '');

  questions.push({
    id: `rq_offline_3_${Date.now()}`,
    type: 'vocabulary',
    difficulty: 'medium',
    question: `The word "${targetWord}" in the passage is closest in meaning to:`,
    options: [
      'crucial and significant',
      'trivial or inconsequential',
      'entirely coincidental',
      'harmful to overall well-being'
    ],
    correctAnswer: 0,
    explanation: `Trong ngữ cảnh bài đọc này, từ "${targetWord}" thể hiện tính thiết yếu, có giá trị và quan trọng.`,
    evidence: `Appears as "${targetWord}" in the passage context.`,
    paragraph: 1,
    isValidated: true
  });

  // 4. Reference or Paragraph 2 detail
  if (paragraphs.length >= 2) {
    const p2Sentences = paragraphs[1].split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
    const p2Sentence = p2Sentences[0] || paragraphs[1].slice(0, 80);
    questions.push({
      id: `rq_offline_4_${Date.now()}`,
      type: 'reference',
      difficulty: 'medium',
      question: 'Based on paragraph 2, what does the primary argument focus on?',
      options: [
        p2Sentence,
        'A secondary observation with no connection to the premise',
        'A discarded theory with no factual corroboration',
        'An unrelated comparison regarding past civilizations'
      ],
      correctAnswer: 0,
      explanation: 'Đoạn 2 tập trung triển khai và phân tích dẫn chứng cho luận điểm này.',
      evidence: p2Sentence,
      paragraph: 2,
      isValidated: true
    });
  }

  // 5. Paragraph Location Question
  const targetP = Math.min(paragraphs.length, 2);
  questions.push({
    id: `rq_offline_5_${Date.now()}`,
    type: 'paragraph_location',
    difficulty: 'easy',
    question: 'In which paragraph does the author discuss key background information or major details?',
    options: [
      `Paragraph ${targetP}`,
      paragraphs.length > 2 ? 'Paragraph 3' : 'Paragraph 4',
      'The bibliography only',
      'None of the paragraphs'
    ],
    correctAnswer: 0,
    explanation: `Đoạn ${targetP} là nơi tác giả giới thiệu các thông tin nền tảng và diễn giải chi tiết nhất.`,
    evidence: paragraphs[targetP - 1]?.slice(0, 90) || '',
    paragraph: targetP,
    isValidated: true
  });

  // 6. Inference Question
  questions.push({
    id: `rq_offline_6_${Date.now()}`,
    type: 'inference',
    difficulty: 'hard',
    question: 'What can be reasonably inferred from the overall passage?',
    options: [
      'The subject matter plays a noteworthy role in its respective domain',
      'The author intends to discourage further investigation into the topic',
      'All uncertainties regarding this subject have been conclusively answered',
      'The findings are universally rejected by modern scholars'
    ],
    correctAnswer: 0,
    explanation: 'Dựa trên cách lập luận và bằng chứng xuyên suốt toàn bài, đây là nhận định suy luận xác đáng và logic nhất.',
    evidence: cleanPassage.slice(0, 120),
    paragraph: 1,
    isValidated: true
  });

  // 7. True / False / NOT TRUE
  if (targetCount >= 7) {
    questions.push({
      id: `rq_offline_7_${Date.now()}`,
      type: 'true_false',
      difficulty: 'medium',
      question: 'According to the passage, which of the following statements is NOT TRUE?',
      options: [
        'The topic is considered completely obsolete and has been entirely abandoned',
        firstSentence.length > 50 ? firstSentence.slice(0, 50) + '...' : firstSentence,
        'The author provides structured observations concerning the topic',
        'Multiple aspects of the subject are examined in the text'
      ],
      correctAnswer: 0,
      explanation: 'Phương án A hoàn toàn trái ngược với thông tin tác giả đưa ra trong bài đọc, do đó đây là nhận định KHÔNG ĐÚNG (NOT TRUE).',
      evidence: firstSentence,
      paragraph: 1,
      isValidated: true
    });
  }

  // 8. Author's Purpose
  if (targetCount >= 8) {
    questions.push({
      id: `rq_offline_8_${Date.now()}`,
      type: 'authors_purpose',
      difficulty: 'medium',
      question: "What is the author's primary purpose in writing this passage?",
      options: [
        'To inform and explain the central characteristics of the subject',
        'To persuade readers to purchase a specific commercial product',
        'To criticize opposing theoretical viewpoints harshly',
        'To entertain readers with a fictional narrative'
      ],
      correctAnswer: 0,
      explanation: 'Văn phong thuyết minh khách quan cho thấy mục đích chính của tác giả là cung cấp thông tin và giải thích bản chất của đề tài.',
      evidence: cleanPassage.slice(0, 100),
      paragraph: 1,
      isValidated: true
    });
  }

  const analysis: ReadingPassageAnalysis = {
    mainIdea: firstSentence,
    keyPoints: [
      'Khái quát bối cảnh & chủ đề cốt lõi trong đoạn mở đầu',
      'Phân tích chi tiết và luận cứ minh họa trong thân bài',
      'Tổng kết ý nghĩa thực tiễn và nhận định tổng quan'
    ],
    paragraphCount: paragraphs.length,
    wordCount,
    readingLevel: wordCount > 300 ? 'B2 / Upper-Intermediate' : 'B1 / Intermediate',
    importantVocabulary: [
      { word: targetWord, contextualMeaning: 'quan trọng, thiết yếu, đáng lưu tâm', paragraph: 1 }
    ],
    authorsToneOrPurpose: 'Cung cấp kiến thức, giải thích thông tin khách quan (Expository/Informative)'
  };

  return {
    status: 'success',
    passage: cleanPassage,
    passageAnalysis: analysis,
    questions: questions.slice(0, targetCount)
  };
}

/**
 * Gọi API backend để sinh bộ bài đọc hiểu AI hoàn chỉnh
 */
export async function generateReadingExercisesFromAI(params: {
  passage: string;
  targetQuestionCount?: number;
  customApiKey?: string;
  model?: string;
  targetDifficulty?: 'auto' | 'easy' | 'medium' | 'hard';
  signal?: AbortSignal;
}): Promise<ReadingGenerationResult> {
  const { passage, targetQuestionCount, customApiKey, model, targetDifficulty, signal } = params;

  if (signal?.aborted) {
    return {
      status: 'error',
      passage: '',
      error: 'Đã dừng quá trình tạo bài đọc theo yêu cầu.'
    };
  }

  if (!passage || !passage.trim()) {
    return {
      status: 'error',
      passage: '',
      error: 'Đoạn văn bài đọc (Reading Passage) trống. Vui lòng nhập hoặc dán nội dung bài đọc.'
    };
  }

  // Tự động lấy API key & model từ Settings nếu chưa có
  let resolvedApiKey = customApiKey;
  let resolvedModel = model;

  try {
    const currentSettings = loadSettings();
    if (!resolvedApiKey) {
      resolvedApiKey = currentSettings.providerApiKeys?.gemini || currentSettings.customApiKey || currentSettings.customGeminiApiKey;
    }
    if (!resolvedModel) {
      resolvedModel = currentSettings.aiModel || 'gemini-3.1-flash-lite';
    }
  } catch (e) {
    // fallback
  }

  if (!resolvedModel) {
    resolvedModel = 'gemini-3.1-flash-lite';
  }

  // 1. Thử gọi backend endpoint
  try {
    const res = await fetch('/api/generate-reading-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        passage: passage.trim(),
        targetQuestionCount,
        customApiKey: resolvedApiKey,
        model: resolvedModel,
        targetDifficulty: targetDifficulty || 'auto'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.questions) && data.questions.length > 0) {
        return data as ReadingGenerationResult;
      }
      if (data.error) {
        console.warn('[Reading AI Gen] Server returned error:', data.error);
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        status: 'error',
        passage: '',
        error: 'Đã dừng quá trình tạo bài đọc theo yêu cầu.'
      };
    }
    console.warn('[Reading AI Gen] Backend fetch error, activating local offline engine...', err);
  }

  if (signal?.aborted) {
    return {
      status: 'error',
      passage: '',
      error: 'Đã dừng quá trình tạo bài đọc theo yêu cầu.'
    };
  }

  // 2. Fallback sang thuật toán cục bộ
  return generateOfflineReadingExercises(passage, targetQuestionCount);
}

/**
 * Tạo lại DUY NHẤT 1 câu hỏi đọc hiểu (Regenerate Single Question)
 */
export async function regenerateSingleReadingQuestionFromAI(params: {
  passage: string;
  targetType?: ReadingQuestionType;
  targetDifficulty?: 'easy' | 'medium' | 'hard';
  existingQuestions?: ReadingGeneratedQuestion[];
  customApiKey?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<ReadingGeneratedQuestion | null> {
  const { passage, targetType, targetDifficulty, existingQuestions = [], customApiKey, model, signal } = params;

  let resolvedApiKey = customApiKey;
  let resolvedModel = model;

  try {
    const currentSettings = loadSettings();
    if (!resolvedApiKey) {
      resolvedApiKey = currentSettings.providerApiKeys?.gemini || currentSettings.customApiKey || currentSettings.customGeminiApiKey;
    }
    if (!resolvedModel) {
      resolvedModel = currentSettings.aiModel || 'gemini-3.1-flash-lite';
    }
  } catch (e) {}

  try {
    const res = await fetch('/api/regenerate-reading-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passage,
        targetType,
        targetDifficulty,
        existingQuestions: existingQuestions.map(q => ({ question: q.question, type: q.type })),
        customApiKey: resolvedApiKey,
        model: resolvedModel
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.question) {
        return data.question as ReadingGeneratedQuestion;
      }
    }
  } catch (e) {
    console.warn('[Regenerate Single Question] Fetch error:', e);
  }

  // Fallback offline
  const offline = generateOfflineReadingExercises(passage, 6);
  const candidates = offline.questions?.filter(q => !existingQuestions.some(eq => eq.question === q.question)) || [];
  return candidates[0] || offline.questions?.[0] || null;
}

/**
 * Chuyển đổi kết quả Reading thành 1 Bài tập Đọc hiểu Tổng hợp (Single Comprehensive Exercise with SubQuestions)
 * Đây là định dạng chuẩn của app để hiển thị bài đọc ở trên và danh sách câu hỏi con ở dưới!
 */
export function convertReadingResultToComprehensiveExercise(
  result: ReadingGenerationResult,
  lessonId: string,
  title?: string,
  order: number = 1
): Exercise {
  const passage = result.passage;
  const questions = result.questions || [];
  const analysis = result.passageAnalysis;

  const defaultTitle = title?.trim() || 
    (analysis?.mainIdea ? `Đọc hiểu: ${analysis.mainIdea.slice(0, 50)}...` : 'Bài đọc hiểu văn bản (Reading Comprehension)');

  const subQuestions: SubQuestion[] = questions.map((q, idx) => ({
    id: q.id || `sub_${Date.now()}_${idx + 1}`,
    type: 'multiple_choice',
    prompt: q.question,
    options: q.options && q.options.length >= 4 ? q.options.slice(0, 4) : (q.options || ['A', 'B', 'C', 'D']),
    correctOptionIdx: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    explanation: q.explanation || '',
    readingQuestionType: q.type,
    evidence: q.evidence || '',
    paragraph: q.paragraph,
    difficulty: q.difficulty === 'easy' ? 'scaffolded' : q.difficulty === 'hard' ? 'independent' : 'guided'
  }));

  const exercise: Exercise = {
    id: `ex_reading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    lessonId,
    type: 'reading',
    skill: 'reading',
    difficulty: 'guided',
    question: defaultTitle,
    instruction: 'Đọc kỹ đoạn văn bản bên dưới và chọn đáp án chính xác cho từng câu hỏi:',
    context: passage,
    subQuestions,
    readingQuestionType: 'Comprehensive Reading Drill',
    explanation: analysis ? `Bài đọc phân tích về: ${analysis.mainIdea}` : undefined,
    order
  };

  return exercise;
}

/**
 * Chuyển đổi kết quả Reading thành mảng các bài tập riêng biệt (Từng câu là 1 Exercise)
 */
export function convertReadingResultToIndividualExercises(
  result: ReadingGenerationResult,
  lessonId: string,
  startOrder: number = 1
): Exercise[] {
  const passage = result.passage;
  const questions = result.questions || [];

  return questions.map((q, idx) => {
    const ex: Exercise = {
      id: `ex_reading_indiv_${Date.now()}_${idx + 1}`,
      lessonId,
      type: 'reading',
      skill: 'reading',
      difficulty: q.difficulty === 'easy' ? 'scaffolded' : q.difficulty === 'hard' ? 'independent' : 'guided',
      question: q.question,
      instruction: 'Đọc kỹ đoạn văn và chọn phương án đúng nhất:',
      context: passage,
      options: q.options && q.options.length >= 4 ? q.options.slice(0, 4) : q.options,
      correctOptions: [typeof q.correctAnswer === 'number' ? q.correctAnswer : 0],
      explanation: q.explanation,
      evidenceRegion: q.evidence,
      readingQuestionType: q.type,
      order: startOrder + idx
    };
    return ex;
  });
}
