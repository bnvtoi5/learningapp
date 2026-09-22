import { Exercise, ExerciseType, DifficultyLevel } from '../types';
import { loadSettings } from './storage';

export interface GrammarGeneratedItem {
  id: string;
  topic: string;
  type: ExerciseType;
  question: string;
  originalSentence?: string;
  transformationCue?: string;
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
  inferredRule?: string;
  targetType: string;
  items: GrammarGeneratedItem[];
  error?: string;
}

/**
 * Các chủ điểm chuyển đổi câu tương đương thông dụng nhất (Sentence Transformation Presets)
 */
export const POPULAR_TRANSFORMATION_TOPICS = [
  { 
    id: 'when_while_past', 
    title: 'Nối câu bằng WHEN / WHILE (Quá khứ tiếp diễn & Quá khứ đơn)', 
    rule: 'While + S + was/were V-ing, S + V2/ed  <=>  S + was/were V-ing when S + V2/ed',
    sampleInput: `TASK 2: COMBINE THE TWO SENTENCES USING WHEN OR WHILE WHERE APPROPRIATE. (p.44)
Key:
1. While they were cleaning the streets, it started to rain. / They were cleaning the streets when it started to rain.
2. While I was watching TV, I saw the floods and landslides in the area. / I was watching TV when I saw the floods and landslides in the area.
3. While Tim was searching for employment opportunities, he found a job advert from a non-governmental organisation. / Tim was searching for employment opportunities when he found a job advert from a non-governmental organisation.
4. They decided to help build a community centre for young people while they were visiting some poor villages. / They were visiting some poor villages when they decided to help build a community centre for young people.`
  },
  { 
    id: 'conditional_2_to_3', 
    title: 'Chuyển đổi câu điều kiện (Loại 2 ➔ Loại 3 hoặc If ➔ Unless)', 
    rule: 'If + S + V2/ed, S + would + V  ➔  If + S + had + V3/ed, S + would have + V3/ed. Unless = If... not.',
    sampleInput: `Chuyển đổi câu điều kiện tương đương:
1. If you don't study hard, you will fail the test. -> Unless you study hard, you will fail the test.
2. I didn't know your phone number, so I didn't call you. -> If I had known your phone number, I would have called you.
3. Because he was careless, he crashed the car. -> If he hadn't been careless, he wouldn't have crashed the car.`
  },
  { 
    id: 'active_to_passive', 
    title: 'Chủ động ➔ Bị động (Active ➔ Passive Voice)', 
    rule: 'S + V + O ➔ O + be + V3/ed + (by S). Chú ý chia thì của "be" và modal verbs.',
    sampleInput: `Chuyển từ câu chủ động sang bị động tương đương:
1. Volunteer students are cleaning the dirty streets now. -> The dirty streets are being cleaned by volunteer students now.
2. They built this community center in 2020. -> This community center was built in 2020.
3. We must protect wild animals from poaching. -> Wild animals must be protected from poaching.`
  },
  { 
    id: 'direct_to_reported', 
    title: 'Trực tiếp ➔ Gián tiếp (Reported Speech)', 
    rule: 'Lùi thì, đổi đại từ, đổi trạng từ chỉ thời gian và nơi chốn.',
    sampleInput: `Chuyển sang câu tường thuật gián tiếp:
1. "I saw the floods on TV yesterday," Tom said. -> Tom said that he had seen the floods on TV the day before.
2. "Are you looking for a volunteer job?" Mary asked me. -> Mary asked me if I was looking for a volunteer job.`
  },
  { 
    id: 'because_to_because_of', 
    title: 'Because / Although ➔ Because of / In spite of', 
    rule: 'Because + Clause ➔ Because of + N/V-ing. Although + Clause ➔ Despite / In spite of + N/V-ing.',
    sampleInput: `Viết lại câu dùng Because of hoặc In spite of:
1. Because it was raining heavily, we couldn't go camping. -> Because of the heavy rain, we couldn't go camping.
2. Although they were tired, they continued helping the flood victims. -> In spite of being tired, they continued helping the flood victims.`
  },
  { 
    id: 'so_such_too_enough', 
    title: 'So...that / Such...that ➔ Too...to / Enough to', 
    rule: 'So + adj + that <=> Such + (a/an) + adj + N + that <=> Too + adj + (for O) + to V <=> Not + adj + enough + to V',
    sampleInput: `Viết lại câu tương đương:
1. The flood water was so deep that cars could not pass. -> The flood water was too deep for cars to pass.
2. He wasn't strong enough to carry that heavy bag. -> He was too weak to carry that heavy bag.`
  },
  { 
    id: 'comparisons_rewriting', 
    title: 'So sánh hơn ➔ So sánh bằng / So sánh nhất', 
    rule: 'A is more ... than B <=> B is not as ... as A. No one is as ... as A <=> A is the most ...',
    sampleInput: `Viết lại câu so sánh tương đương:
1. Playing tennis is more interesting than watching TV. -> Watching TV is not as interesting as playing tennis.
2. Mount Everest is higher than any other mountain in the world. -> Mount Everest is the highest mountain in the world.`
  },
  { 
    id: 'wish_if_only', 
    title: 'Câu ước WISH / IF ONLY', 
    rule: 'Ước trái hiện tại: S + wish + S + V2/ed (were). Ước trái quá khứ: S + wish + S + had + V3/ed.',
    sampleInput: `Viết lại câu dùng WISH / IF ONLY:
1. I don't have enough time to volunteer for this project. -> I wish I had enough time to volunteer for this project.
2. Tim regrets not taking that job opportunity. -> Tim wishes he had taken that job opportunity.`
  }
];

/**
 * Các chủ điểm ngữ pháp thông dụng được tạo sẵn gợi ý cho giáo viên
 */
export const POPULAR_GRAMMAR_TOPICS = [
  { id: 'present_perfect', title: 'Hiện tại hoàn thành (Present Perfect)', rule: 'have/has + V3/ed (since/for, already, yet)' },
  { id: 'past_simple_vs_continuous', title: 'Quá khứ đơn & Quá khứ tiếp diễn (When/While)', rule: 'when/while, hành động đang diễn ra thì hành động khác chen vào' },
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
  mode?: 'general' | 'transformation';
  rawInput?: string;
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
    mode = 'general',
    rawInput,
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

  const effectiveInput = (rawInput && rawInput.trim()) ? rawInput.trim() : topic.trim();
  if (!effectiveInput) {
    return {
      status: 'error',
      topic,
      targetType: exerciseType,
      items: [],
      error: 'Vui lòng nhập chủ điểm ngữ pháp hoặc dán nội dung/ví dụ cần tạo bài tập.'
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
        topic: topic.trim(),
        rawInput: effectiveInput,
        mode,
        ruleNote,
        exerciseType,
        questionCount,
        difficulty,
        customApiKey: resolvedApiKey,
        model: resolvedModel
      })
    });

    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.warn('[Grammar AI] Response is not valid JSON:', rawText.slice(0, 100));
    }

    if (res.ok && data) {
      if (data.status === 'success' && Array.isArray(data.items) && data.items.length > 0) {
        return data as GrammarGenerationResult;
      }
      if (data.error) {
        return {
          status: 'error',
          topic,
          targetType: exerciseType,
          items: [],
          error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        };
      }
    } else {
      let serverErr = 'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.';
      if (data?.error) {
        serverErr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (rawText && rawText.includes('The page c')) {
        serverErr = 'Không thể kết nối đến máy chủ AI từ thiết bị này. Vui lòng nhập API Key cá nhân trong phần chọn Mô hình để tạo bài tập trực tiếp.';
      }
      return {
        status: 'error',
        topic,
        targetType: exerciseType,
        items: [],
        error: serverErr
      };
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
    topic: effectiveInput,
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
    instruction: item.type === 'translation' 
      ? (item.hint ? `Gợi ý: ${item.hint}` : 'Viết lại câu sao cho nghĩa tương đương')
      : (item.hint ? `Gợi ý: ${item.hint}` : undefined),
    hint: item.hint,
    grammarHint: item.hint,
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
