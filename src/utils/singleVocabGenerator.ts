import { Exercise, ExerciseType, DifficultyLevel } from '../types';
import { loadSettings } from './storage';
import { getSingleVocabPromptForType } from './singleVocabPrompts';

export interface SingleVocabGeneratedItem {
  id: string;
  word: string;
  vocabWord?: string;
  vocabMeaning?: string;
  type: ExerciseType;
  question: string;
  hint?: string;
  correctAnswer: string;
  correct_answer?: string;
  correctText?: string;
  options?: string[];
  correctOptionIdx?: number;
  clozeTemplate?: string;
  clozeLetters?: string;
  missingLetters?: string[];
  shuffledLetters?: string[];
  exampleSentence?: string;
  phonetic?: string;
  matchingPairs?: { id: string; left: string; right: string }[];
  explanation?: string;
}

export interface SingleVocabGenerationResult {
  status: 'success' | 'error';
  exerciseType: ExerciseType;
  items: SingleVocabGeneratedItem[];
  error?: string;
}

/**
 * Tách một dòng văn bản thành từ tiếng Anh và nghĩa tiếng Việt tương ứng.
 * TUYỆT ĐỐI TUÂN THỦ: 1 DÒNG = 1 TỪ VỰNG.
 * Không bao giờ xem dấu phẩy (,) nằm trong dòng là dấu phân cách nhiều từ.
 */
export function parseVocabLine(rawLine: string): { word: string; meaning: string } {
  const line = rawLine.trim();
  if (!line) return { word: '', meaning: '' };

  // 1. Dấu hai chấm: "word : meaning, meaning2"
  if (line.includes(':')) {
    const parts = line.split(':');
    const word = parts[0].trim();
    const meaning = parts.slice(1).join(':').trim();
    return { word, meaning };
  }

  // 2. Dấu gạch ngang: "word - meaning, meaning2"
  if (/[-–—]/.test(line)) {
    const parts = line.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      const word = parts[0].trim();
      const meaning = parts.slice(1).join(' - ').trim();
      return { word, meaning };
    }
  }

  // 3. Dấu Tab
  if (line.includes('\t')) {
    const parts = line.split('\t');
    const word = parts[0].trim();
    const meaning = parts.slice(1).join(' ').trim();
    return { word, meaning };
  }

  // 4. Trong dấu ngoặc đơn: "word (meaning, meaning2)"
  const parenMatch = line.match(/^([^(]+)\(([^)]+)\)/);
  if (parenMatch) {
    return {
      word: parenMatch[1].trim(),
      meaning: parenMatch[2].trim()
    };
  }

  // 5. Từ tiếng Anh rồi đến dấu phẩy đầu tiên: "friendly, thân thiện, cởi mở"
  // Dấu phẩy đầu tiên tách từ tiếng Anh với nghĩa, các dấu phẩy sau thuộc về nghĩa tiếng Việt
  const commaMatch = line.match(/^([a-zA-Z\s'-]+?)\s*,\s*(.+)$/);
  if (commaMatch && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(commaMatch[1])) {
    return {
      word: commaMatch[1].trim(),
      meaning: commaMatch[2].trim()
    };
  }

  // 6. Chỉ có từ vựng
  return {
    word: line,
    meaning: ''
  };
}

/**
 * Phân tích danh sách từ vựng từ chuỗi input.
 * BẮT BUỘC CHỈ PHÂN TÁCH THEO DÒNG MỚI (\n), KHÔNG TÁCH THEO DẤU PHẨY (,).
 */
export function parseVocabList(rawText: string): { word: string; meaning: string }[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const items: { word: string; meaning: string }[] = [];
  for (const line of lines) {
    const parsed = parseVocabLine(line);
    if (parsed.word) {
      items.push(parsed);
    }
  }
  return items;
}

/**
 * Tạo mẫu khuyết chữ cái chuẩn xác cho dạng vocab_cloze.
 * Các ký tự và dấu gạch dưới "_" được cách nhau bởi khoảng trắng (ví dụ: "f _ _ e n d l y").
 */
export function createClozeLettersPattern(word: string): { clozeLetters: string; missingLetters: string[] } {
  const chars = word.split('');
  const missing: string[] = [];
  const maskIndices = new Set<number>();

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/[a-zA-Z]/.test(ch)) {
      if (chars.length <= 4) {
        if (i === 1) maskIndices.add(i);
      } else {
        // Luôn giữ ký tự đầu (i=0) và ký tự cuối (i=length-1)
        if (i > 0 && i < chars.length - 1) {
          // Ẩn xen kẽ 40% - 50%
          if (i % 2 === 1 || Math.random() < 0.45) {
            maskIndices.add(i);
          }
        }
      }
    }
  }

  // Đảm bảo có ít nhất 1 chữ cái bị ẩn
  if (maskIndices.size === 0 && chars.length > 1) {
    maskIndices.add(Math.floor(chars.length / 2));
  }

  const clozeChars = chars.map((ch, idx) => {
    if (maskIndices.has(idx)) {
      missing.push(ch.toLowerCase());
      return '_';
    }
    return ch;
  });

  return {
    clozeLetters: clozeChars.join(' '), // Định dạng chuẩn có khoảng trắng: "f _ _ e n d l y"
    missingLetters: missing
  };
}

/**
 * Trộn ngẫu nhiên chữ cái cho anagram / spelling
 */
function shuffleLetters(word: string): string[] {
  const letters = word.toLowerCase().split('').filter(c => /[a-zA-Z]/.test(c));
  const shuffled = [...letters].sort(() => Math.random() - 0.5);
  if (shuffled.join('') === letters.join('') && letters.length > 1) {
    return letters.reverse();
  }
  return shuffled;
}

/**
 * Thuật toán ngoại tuyến cục bộ sinh bài tập từ vựng đơn lẻ.
 * Tuân thủ 100% quy tắc: 1 DÒNG = 1 TỪ VỰNG.
 */
export function generateOfflineSingleVocabExercises(params: {
  vocabList: string;
  exerciseType: ExerciseType;
  difficulty?: DifficultyLevel;
}): SingleVocabGenerationResult {
  const { vocabList, exerciseType } = params;
  const parsedItems = parseVocabList(vocabList);

  if (parsedItems.length === 0) {
    return {
      status: 'error',
      exerciseType,
      items: [],
      error: 'Danh sách từ vựng trống. Vui lòng nhập ít nhất 1 dòng từ vựng.'
    };
  }

  const items: SingleVocabGeneratedItem[] = [];

  parsedItems.forEach((entry, idx) => {
    const word = entry.word;
    const meaning = entry.meaning || `nghĩa của từ "${word}"`;
    const baseId = `sv_${Date.now()}_${idx}_${word.replace(/[^a-zA-Z0-9]/g, '')}`;

    if (exerciseType === 'vocab_cloze') {
      const { clozeLetters, missingLetters } = createClozeLettersPattern(word);
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'vocab_cloze',
        phonetic: `/${word.toLowerCase()}/`,
        clozeLetters: clozeLetters,
        clozeTemplate: clozeLetters,
        missingLetters: missingLetters,
        question: `Điền từ tiếng Anh có nghĩa: "${meaning}"`,
        hint: meaning,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `${word} (từ vựng) = ${meaning}.`
      });
    } else if (exerciseType === 'multiple_choice') {
      const distractors = [
        'sự phát triển nhanh chóng',
        'khả năng thích ứng linh hoạt',
        'môi trường học tập tích cực'
      ];
      const allOptions = [meaning, ...distractors].sort(() => Math.random() - 0.5);
      const correctOptionIdx = allOptions.indexOf(meaning);

      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'multiple_choice',
        phonetic: `/${word.toLowerCase()}/`,
        question: `Nghĩa của từ '${word}' là gì?`,
        options: allOptions,
        correctOptionIdx,
        correctAnswer: meaning,
        correct_answer: meaning,
        hint: `Từ vựng "${word}"`,
        explanation: `"${word}" có nghĩa chính xác là "${meaning}".`
      });
    } else if (exerciseType === 'flashcard_recall') {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'flashcard_recall',
        phonetic: `/${word.toLowerCase()}/`,
        question: `Ghi nhớ từ vựng: ${word}`,
        hint: meaning,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        exampleSentence: `Practice using "${word}" in daily communication. (${meaning})`,
        explanation: `${word} (từ vựng) = ${meaning}. Hãy lặp lại để ghi nhớ sâu sắc.`
      });
    } else if (exerciseType === 'listen_spell') {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'listen_spell',
        phonetic: `/${word.toLowerCase()}/`,
        question: `Nghe phát âm và gõ lại từ vựng đúng chính tả`,
        hint: `Nghĩa: ${meaning}`,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `Từ cần gõ chính xác là "${word}" (${meaning}).`
      });
    } else if (exerciseType === 'anagram' || exerciseType === 'spelling') {
      const shuffled = shuffleLetters(word);
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: exerciseType,
        phonetic: `/${word.toLowerCase()}/`,
        question: `Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: "${meaning}"`,
        shuffledLetters: shuffled,
        hint: meaning,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `${word} = ${meaning}.`
      });
    } else if (exerciseType === 'fill_in_blank') {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'fill_in_blank',
        phonetic: `/${word.toLowerCase()}/`,
        question: `The topic relates to "___" in our current context.`,
        hint: `Nghĩa của câu ví dụ liên quan đến: ${meaning}`,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `Từ cần điền là "${word}" (${meaning}).`
      });
    } else if (exerciseType === 'typing') {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'typing',
        phonetic: `/${word.toLowerCase()}/`,
        question: `Gõ từ tiếng Anh có nghĩa: "${meaning}"`,
        hint: `Bắt đầu bằng chữ '${word.charAt(0).toUpperCase()}', gồm ${word.length} chữ cái.`,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `${word} (tính từ/danh từ) = ${meaning}.`
      });
    } else if (exerciseType === 'matching') {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: 'matching',
        question: `Ghép từ vựng tiếng Anh với nghĩa tiếng Việt tương ứng:`,
        matchingPairs: [
          { id: `pair_${idx}`, left: word, right: meaning }
        ],
        correctAnswer: `${word} = ${meaning}`,
        explanation: `Cặp từ vựng: ${word} ➔ ${meaning}`
      });
    } else {
      items.push({
        id: baseId,
        word,
        vocabWord: word,
        vocabMeaning: meaning,
        type: exerciseType,
        question: `Luyện tập từ vựng: ${word} (${meaning})`,
        hint: meaning,
        correctAnswer: word,
        correct_answer: word,
        correctText: word,
        explanation: `${word} = ${meaning}.`
      });
    }
  });

  return {
    status: 'success',
    exerciseType,
    items
  };
}

/**
 * Gọi AI sinh bài tập từ vựng đơn lẻ qua backend endpoint.
 * Hệ thống sử dụng prompt CHUYÊN BIỆT theo từng dạng bài tập cụ thể.
 */
export async function generateSingleVocabFromAI(params: {
  vocabList: string;
  exerciseType: ExerciseType;
  difficulty?: DifficultyLevel;
  customApiKey?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<SingleVocabGenerationResult> {
  const { vocabList, exerciseType, difficulty = 'guided', customApiKey, model, signal } = params;

  if (signal?.aborted) {
    return {
      status: 'error',
      exerciseType,
      items: [],
      error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
    };
  }

  const trimmed = vocabList.trim();
  if (!trimmed) {
    return {
      status: 'error',
      exerciseType,
      items: [],
      error: 'Danh sách từ vựng trống. Vui lòng nhập ít nhất 1 từ vựng.'
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
    const res = await fetch('/api/single-vocab-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        vocabList: trimmed,
        exerciseType,
        difficulty,
        customApiKey: resolvedApiKey,
        model: resolvedModel
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.items) && data.items.length > 0) {
        // Chuẩn hóa dữ liệu đầu ra để đảm bảo 100% tương thích
        const normalizedItems: SingleVocabGeneratedItem[] = data.items.map((item: any) => {
          const rawWord = item.vocabWord || item.word || item.correctAnswer || '';
          const rawMeaning = item.vocabMeaning || item.hint || '';
          const cloze = item.clozeLetters || item.clozeTemplate;

          let finalQuestion = item.question;
          if (item.type === 'vocab_cloze' && !finalQuestion.includes('Điền từ tiếng Anh có nghĩa')) {
            finalQuestion = `Điền từ tiếng Anh có nghĩa: "${rawMeaning || rawWord}"`;
          }

          return {
            ...item,
            word: rawWord,
            vocabWord: rawWord,
            vocabMeaning: rawMeaning,
            clozeLetters: cloze,
            clozeTemplate: cloze,
            question: finalQuestion,
            correctAnswer: item.correctAnswer || rawWord,
            correct_answer: item.correct_answer || item.correctAnswer || rawWord,
            correctText: item.correctText || item.correctAnswer || rawWord,
          };
        });

        return {
          status: 'success',
          exerciseType,
          items: normalizedItems
        };
      }
      if (data.error) {
        console.warn('[Single Vocab AI] Server returned error:', data.error);
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        status: 'error',
        exerciseType,
        items: [],
        error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
      };
    }
    console.warn('[Single Vocab AI] Backend request failed, falling back to local generator...', err);
  }

  if (signal?.aborted) {
    return {
      status: 'error',
      exerciseType,
      items: [],
      error: 'Đã dừng quá trình tạo bài tập theo yêu cầu.'
    };
  }

  // Fallback offline engine
  return generateOfflineSingleVocabExercises({
    vocabList: trimmed,
    exerciseType,
    difficulty
  });
}

/**
 * Chuyển đổi SingleVocabGeneratedItem thành Exercise hoàn chỉnh của hệ thống.
 * Tương thích 100% với cấu trúc bài tập của ExerciseBuilder thủ công.
 */
export function convertSingleVocabItemToExercise(
  item: SingleVocabGeneratedItem,
  lessonId: string,
  difficulty: DifficultyLevel = 'guided'
): Exercise {
  const targetWord = (item.vocabWord || item.word || item.correctAnswer || '').trim();
  const targetMeaning = (item.vocabMeaning || item.hint || '').trim();
  const targetCloze = (item.clozeLetters || item.clozeTemplate || '').trim();

  const ex: Exercise = {
    id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    lessonId,
    type: item.type,
    skill: 'vocabulary',
    difficulty,
    question: item.question || (item.type === 'vocab_cloze' ? `Điền từ tiếng Anh có nghĩa: "${targetMeaning}"` : `Luyện tập từ vựng: ${targetWord}`),
    hint: targetMeaning || item.hint,
    explanation: item.explanation || (targetMeaning ? `${targetWord} = ${targetMeaning}` : `Từ vựng: ${targetWord}`),
    vocabWord: targetWord,
    vocabMeaning: targetMeaning || undefined,
    word: targetWord,
    correct_answer: item.correct_answer || item.correctAnswer || targetWord,
    correctText: item.correctText || item.correctAnswer || targetWord,
    options: item.options || [],
    correctOptions: item.correctOptionIdx !== undefined ? [item.correctOptionIdx] : undefined,
    clozeLetters: targetCloze || undefined,
    shuffledLetters: item.shuffledLetters,
    shuffled_letters: item.shuffledLetters,
    matchingPairs: item.matchingPairs,
    phonetic: item.phonetic || undefined,
    context: item.exampleSentence || undefined
  };

  return ex;
}
