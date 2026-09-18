import { Exercise, ExerciseType, DifficultyLevel } from '../types';
import { loadSettings } from './storage';

export interface GrammarGeneratedItem {
  id: string;
  topic: string;
  type: ExerciseType;
  question: string;
  hint?: string;
  correctAnswer: string;
  options?: string[];
  correctOptionIdx?: number;
  scrambledWords?: string[];
  errorSentence?: string;
  errorPart?: string;
  correction?: string;
  explanation: string;
}

export interface GrammarGenerationResult {
  status: 'success' | 'error';
  topic: string;
  targetType: string;
  items: GrammarGeneratedItem[];
  error?: string;
}

/**
 * Các chủ điểm ngữ pháp thông dụng được tạo sẵn gợi ý cho giáo viên
 */
export const POPULAR_GRAMMAR_TOPICS = [
  { id: 'present_perfect', title: 'Hiện tại hoàn thành (Present Perfect)', rule: 'have/has + V3/ed (since/for, already, yet)' },
  { id: 'past_simple_vs_continuous', title: 'Quá khứ đơn & Quá khứ tiếp diễn', rule: 'when/while, hành động đang diễn ra thì hành động khác chen vào' },
  { id: 'conditional_2_3', title: 'Câu điều kiện loại 2 & 3 (Conditionals)', rule: 'If + S + V2/ed, S + would + V / If + S + had V3, S + would have V3' },
  { id: 'passive_voice', title: 'Câu bị động (Passive Voice)', rule: 'S + be + V3/ed + by O' },
  { id: 'relative_clauses', title: 'Mệnh đề quan hệ (who, whom, which, that, whose)', rule: 'Đại từ quan hệ xác định và không xác định' },
  { id: 'reported_speech', title: 'Câu tường thuật (Reported Speech)', rule: 'Lùi thì, đổi đại từ, đổi trạng từ chỉ thời gian/nơi chốn' },
  { id: 'gerund_infinitive', title: 'Danh động từ & Động từ nguyên mẫu (Gerund & To-V)', rule: 'enjoy/avoid/admit + V-ing, want/decide/agree + to V' },
  { id: 'modals', title: 'Động từ khuyết thiếu (Must, Should, May, Might, Can)', rule: 'modal verbs và modal perfect (must have V3, should have V3)' },
  { id: 'comparisons', title: 'Cấu trúc so sánh (So sánh hơn, nhất, kép)', rule: 'adj-er/more adj, the adj-est/the most adj, the more... the more...' },
  { id: 'wish_clauses', title: 'Câu ước với WISH / IF ONLY', rule: 'Wish ở hiện tại (lùi quá khứ đơn), wish ở quá khứ (lùi quá khứ hoàn thành)' },
];

/**
 * Trình tạo offline cho bài tập ngữ pháp khi không có mạng
 */
export function generateOfflineGrammarExercises(params: {
  topic: string;
  exerciseType: string;
  count?: number;
  difficulty?: DifficultyLevel;
}): GrammarGenerationResult {
  const { topic, exerciseType, count = 5 } = params;

  const sampleItems: GrammarGeneratedItem[] = [
    {
      id: `gm_${Date.now()}_1`,
      topic,
      type: 'multiple_choice',
      question: `Chọn phương án đúng cho câu sau: "By the time we arrived, the train _____ already."`,
      options: ['has left', 'had left', 'left', 'leaves'],
      correctOptionIdx: 1,
      correctAnswer: 'had left',
      hint: 'Hành động xảy ra trước một mốc thời gian trong quá khứ.',
      explanation: 'Dùng quá khứ hoàn thành (had left) vì hành động tàu rời đi xảy ra trước thời điểm "by the time we arrived" trong quá khứ.'
    },
    {
      id: `gm_${Date.now()}_2`,
      topic,
      type: 'error_correction',
      question: 'Tìm và sửa lỗi sai trong câu sau:',
      errorSentence: 'If I was you, I will accept the scholarship immediately.',
      errorPart: 'was',
      correction: 'were',
      correctAnswer: 'were',
      hint: 'Câu điều kiện loại 2 giả định điều không có thật ở hiện tại.',
      explanation: 'Trong câu điều kiện loại 2, mệnh đề IF sử dụng "were" cho tất cả các ngôi (If I were you) và mệnh đề chính dùng "would" thay vì "will".'
    },
    {
      id: `gm_${Date.now()}_3`,
      topic,
      type: 'sentence_builder',
      question: 'Sắp xếp các từ sau thành câu đúng ngữ pháp:',
      scrambledWords: ['never', 'seen', 'have', 'such', 'I', 'a', 'beautiful', 'painting.'],
      correctAnswer: 'I have never seen such a beautiful painting.',
      hint: 'Cấu trúc thì hiện tại hoàn thành với trạng từ "never".',
      explanation: 'Trạng từ tần suất "never" đứng giữa trợ động từ "have" và quá khứ phân từ "seen": S + have/has + never + V3/ed.'
    },
    {
      id: `gm_${Date.now()}_4`,
      topic,
      type: 'fill_in_blank',
      question: 'Hoàn thành câu bằng dạng đúng của từ trong ngoặc: She suggested _____ (take) a taxi because of the heavy rain.',
      correctAnswer: 'taking',
      hint: 'Cấu trúc với động từ suggest.',
      explanation: 'Động từ "suggest" đi trực tiếp với V-ing: suggest doing something (đề xuất làm việc gì).'
    },
    {
      id: `gm_${Date.now()}_5`,
      topic,
      type: 'translation',
      question: 'Dịch câu sau sang tiếng Anh áp dụng cấu trúc ngữ pháp tương ứng: "Tôi ước gì tôi đã không lãng phí thời gian ngày hôm qua."',
      correctAnswer: 'I wish I had not wasted my time yesterday.',
      hint: 'Câu ước cho một sự việc trong quá khứ (Wish + Past Perfect).',
      explanation: 'Ước cho một điều trái với thực tế trong quá khứ: S + wish + S + had (not) + V3/ed.'
    }
  ];

  let filtered = sampleItems;
  if (exerciseType !== 'mixed') {
    filtered = sampleItems.filter(item => item.type === exerciseType);
    if (filtered.length === 0) {
      filtered = sampleItems;
    }
  }

  // Cắt đủ số lượng
  const resultItems = filtered.slice(0, count);

  return {
    status: 'success',
    topic,
    targetType: exerciseType,
    items: resultItems
  };
}

/**
 * Gọi AI sinh bài tập ngữ pháp qua backend API
 */
export async function generateGrammarExercisesFromAI(params: {
  topic: string;
  ruleNote?: string;
  exerciseType: string;
  questionCount?: number;
  difficulty?: DifficultyLevel;
  customApiKey?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<GrammarGenerationResult> {
  const { 
    topic, 
    ruleNote, 
    exerciseType, 
    questionCount = 5, 
    difficulty = 'guided', 
    customApiKey, 
    model, 
    signal 
  } = params;

  if (signal?.aborted) {
    return {
      status: 'error',
      topic,
      targetType: exerciseType,
      items: [],
      error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
    };
  }

  const trimmed = topic.trim();
  if (!trimmed) {
    return {
      status: 'error',
      topic,
      targetType: exerciseType,
      items: [],
      error: 'Vui lòng nhập chủ điểm ngữ pháp cần tạo bài tập.'
    };
  }

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

  if (!resolvedModel) {
    resolvedModel = 'gemini-3.1-flash-lite';
  }

  try {
    const res = await fetch('/api/grammar-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        topic: trimmed,
        ruleNote,
        exerciseType,
        questionCount,
        difficulty,
        customApiKey: resolvedApiKey,
        model: resolvedModel
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.items) && data.items.length > 0) {
        return data as GrammarGenerationResult;
      }
      if (data.error) {
        console.warn('[Grammar AI] Server error:', data.error);
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        status: 'error',
        topic,
        targetType: exerciseType,
        items: [],
        error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
      };
    }
    console.warn('[Grammar AI] Backend failed, falling back offline...', err);
  }

  if (signal?.aborted) {
    return {
      status: 'error',
      topic,
      targetType: exerciseType,
      items: [],
      error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
    };
  }

  return generateOfflineGrammarExercises({
    topic: trimmed,
    exerciseType,
    count: questionCount,
    difficulty
  });
}

/**
 * Chuyển đổi GrammarGeneratedItem thành Exercise của app
 */
export function convertGrammarItemToExercise(
  item: GrammarGeneratedItem,
  lessonId: string,
  difficulty: DifficultyLevel = 'guided'
): Exercise {
  const ex: Exercise = {
    id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    lessonId,
    type: item.type,
    skill: 'grammar',
    difficulty,
    question: item.question,
    hint: item.hint,
    explanation: item.explanation,
    correct_answer: item.correctAnswer,
    options: item.options || [],
    correctOptions: item.correctOptionIdx !== undefined ? [item.correctOptionIdx] : undefined,
    scrambledWords: item.scrambledWords,
    wrongSentence: item.errorSentence,
    errorType: item.errorPart,
    correctText: item.correction || item.correctAnswer,
    context: `Chủ điểm: ${item.topic}`
  };

  return ex;
}
