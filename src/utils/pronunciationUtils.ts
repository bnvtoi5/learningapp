import { Exercise, DifficultyLevel } from '../types';

export interface ParsedPronunciationItem {
  id: string;
  targetText: string;
  phonetic?: string;
  meaning?: string;
  isSingleWord: boolean;
  wordsCount: number;
  passAccuracy: number; // Ngưỡng % để đạt (ví dụ: 70%)
}

export interface WordMatchStatus {
  original: string;
  clean: string;
  matched: boolean;
  word?: string;
  isMatched?: boolean;
}

export interface PronunciationEvaluationResult {
  isPassed: boolean;
  accuracyPercent: number;
  requiredThreshold: number;
  isSingleWord: boolean;
  spokenClean: string;
  spokenText?: string;
  targetClean: string;
  wordsAnalysis: WordMatchStatus[];
  feedbackMessage: string;
  feedback?: string;
}

/**
 * Chuẩn hóa chuỗi phát âm: Chuyển chữ thường, bỏ dấu câu và khoảng trắng thừa.
 */
export function normalizeSpeechText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách một dòng văn bản thành từ/câu, phiên âm và nghĩa.
 * Hỗ trợ các định dạng phổ biến:
 * 1. word | phonetic | meaning
 * 2. word : meaning
 * 3. word - meaning
 * 4. Hoặc nguyên một câu tiếng Anh: "Good morning, how are you today?"
 */
export function parsePronunciationLine(rawLine: string, defaultAccuracy: number = 70): ParsedPronunciationItem | null {
  const line = rawLine.trim();
  if (!line) return null;

  let targetText = '';
  let phonetic = '';
  let meaning = '';

  // 1. Phân tách bằng dấu gạch đứng (|): word | /IPA/ | meaning
  if (line.includes('|')) {
    const parts = line.split('|').map(p => p.trim());
    targetText = parts[0] || '';
    if (parts.length >= 3) {
      phonetic = parts[1] || '';
      meaning = parts.slice(2).join(' | ');
    } else if (parts.length === 2) {
      if (parts[1].startsWith('/') || parts[1].startsWith('[')) {
        phonetic = parts[1];
      } else {
        meaning = parts[1];
      }
    }
  } 
  // 2. Phân tách bằng dấu hai chấm (:): targetText : meaning
  else if (line.includes(':')) {
    const parts = line.split(':');
    targetText = parts[0].trim();
    meaning = parts.slice(1).join(':').trim();
  }
  // 3. Phân tách bằng dấu gạch ngang (-): targetText - meaning
  else if (/[-–—]/.test(line)) {
    const parts = line.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      targetText = parts[0].trim();
      meaning = parts.slice(1).join(' - ').trim();
    } else {
      targetText = line;
    }
  }
  // 4. Nguyên văn câu hoặc từ
  else {
    targetText = line;
  }

  targetText = targetText.trim();
  if (!targetText) return null;

  // Đếm số từ trong targetText
  const words = targetText.split(/\s+/).filter(w => w.length > 0);
  const wordsCount = words.length;
  const isSingleWord = wordsCount <= 1;

  return {
    id: 'pron_' + Math.random().toString(36).substring(2, 9),
    targetText,
    phonetic: phonetic || undefined,
    meaning: meaning || undefined,
    isSingleWord,
    wordsCount,
    passAccuracy: defaultAccuracy,
  };
}

/**
 * Phân tích danh sách dòng phát âm từ chuỗi người dùng nhập (1 DÒNG = 1 BÀI TẬP PHÁT ÂM).
 */
export function parsePronunciationLines(rawText: string, defaultAccuracy: number = 70): ParsedPronunciationItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const items: ParsedPronunciationItem[] = [];

  for (const line of lines) {
    const parsed = parsePronunciationLine(line, defaultAccuracy);
    if (parsed) {
      items.push(parsed);
    }
  }

  return items;
}

/**
 * Tính khoảng cách Levenshtein giữa 2 chuỗi để hỗ trợ nhận diện tương đồng âm thanh.
 */
function calculateLevenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a.length || !b.length) return 0.0;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Đánh giá kết quả phát âm của học sinh:
 * - Nếu là từ đơn lẻ: App nghe đúng từ đó (hoặc tương đồng >= 82%) => Coi như xong (Hoàn thành / Đạt 100%).
 * - Nếu 1 dòng là một câu nhiều chữ: Phải đáp ứng tỷ lệ % khớp (so với ngưỡng passThreshold do người dùng điều chỉnh).
 */
export function evaluatePronunciation(
  targetText: string,
  spokenText: string,
  options?: {
    isSingleWord?: boolean;
    requiredThreshold?: number; // mặc định 70%
  }
): PronunciationEvaluationResult {
  const targetClean = normalizeSpeechText(targetText);
  const spokenClean = normalizeSpeechText(spokenText);

  const rawWords = targetText.split(/\s+/).filter(w => w.length > 0);
  const isSingleWord = options?.isSingleWord !== undefined 
    ? options.isSingleWord 
    : (rawWords.length <= 1);
  const requiredThreshold = options?.requiredThreshold ?? 70;

  // Trường hợp học sinh chưa nói gì
  if (!spokenClean) {
    return {
      isPassed: false,
      accuracyPercent: 0,
      requiredThreshold,
      isSingleWord,
      spokenClean: '',
      targetClean,
      wordsAnalysis: rawWords.map(w => ({ original: w, clean: normalizeSpeechText(w), matched: false })),
      feedbackMessage: 'Chưa nhận diện được giọng nói. Vui lòng bấm vào Micro và phát âm lại.',
    };
  }

  // 1. XỬ LÝ TỪ ĐƠN LẺ
  if (isSingleWord) {
    const singleTarget = targetClean;
    const spokenTokens = spokenClean.split(' ').filter(Boolean);

    // So sánh trực tiếp
    const isDirectMatch = singleTarget === spokenClean;
    // Kiểm tra nếu trong chuỗi nhận diện có chứa từ này
    const isIncluded = spokenTokens.includes(singleTarget) || spokenClean.includes(singleTarget);
    // Tính độ tương đồng Levenshtein
    const maxSim = Math.max(
      calculateLevenshteinSimilarity(singleTarget, spokenClean),
      ...spokenTokens.map(tok => calculateLevenshteinSimilarity(singleTarget, tok))
    );
    const isSimMatch = maxSim >= 0.82;

    const isPassed = isDirectMatch || isIncluded || isSimMatch;
    const accuracyPercent = isPassed ? 100 : Math.round(maxSim * 100);

    return {
      isPassed,
      accuracyPercent,
      requiredThreshold: 100, // Từ đơn yêu cầu nghe đúng
      isSingleWord: true,
      spokenClean,
      targetClean,
      wordsAnalysis: [
        {
          original: targetText,
          clean: singleTarget,
          matched: isPassed,
          word: targetText,
          isMatched: isPassed,
        },
      ],
      feedbackMessage: isPassed 
        ? '🎉 Tuyệt vời! Bạn đã phát âm chuẩn xác từ này!' 
        : `App nghe được: "${spokenText}". Hãy bấm nghe mẫu và thử phát âm lại nhé!`,
      feedback: isPassed 
        ? '🎉 Tuyệt vời! Bạn đã phát âm chuẩn xác từ này!' 
        : `App nghe được: "${spokenText}". Hãy bấm nghe mẫu và thử phát âm lại nhé!`,
      spokenText,
    };
  }

  // 2. XỬ LÝ CÂU NHIỀU CHỮ (Sentence / Multi-word)
  const targetTokens = targetClean.split(' ').filter(Boolean);
  const spokenTokens = spokenClean.split(' ').filter(Boolean);

  // Tạo mảng đánh dấu từ nào đã được dùng trong spokenTokens
  const usedSpokenIndices = new Set<number>();
  const wordsAnalysis: WordMatchStatus[] = [];

  let matchedCount = 0;

  for (let i = 0; i < targetTokens.length; i++) {
    const tToken = targetTokens[i];
    const origWord = rawWords[i] || tToken;

    let foundMatch = false;

    // Tìm kiếm trong spokenTokens lân cận hoặc bất kỳ vị trí hợp lý
    for (let j = 0; j < spokenTokens.length; j++) {
      if (usedSpokenIndices.has(j)) continue;

      const sToken = spokenTokens[j];
      if (sToken === tToken || calculateLevenshteinSimilarity(tToken, sToken) >= 0.8) {
        foundMatch = true;
        usedSpokenIndices.add(j);
        break;
      }
    }

    if (foundMatch) {
      matchedCount++;
    }

    wordsAnalysis.push({
      original: origWord,
      clean: tToken,
      matched: foundMatch,
      word: origWord,
      isMatched: foundMatch,
    });
  }

  const accuracyPercent = Math.min(100, Math.round((matchedCount / Math.max(1, targetTokens.length)) * 100));
  const isPassed = accuracyPercent >= requiredThreshold;

  let feedbackMessage = '';
  if (isPassed) {
    feedbackMessage = `🎉 Đạt ${accuracyPercent}% (Yêu cầu: ${requiredThreshold}%). Phát âm rất tốt, hoàn thành câu!`;
  } else {
    feedbackMessage = `Đạt ${accuracyPercent}% (Yêu cầu: ${requiredThreshold}%). Còn một số từ chưa chuẩn (màu đỏ). Hãy bấm nghe lại và luyện tập tiếp nhé!`;
  }

  return {
    isPassed,
    accuracyPercent,
    requiredThreshold,
    isSingleWord: false,
    spokenClean,
    spokenText,
    targetClean,
    wordsAnalysis,
    feedbackMessage,
    feedback: feedbackMessage,
  };
}

/**
 * Chuyển đổi một ParsedPronunciationItem thành một đối tượng Exercise hoàn chỉnh.
 */
export function convertPronunciationItemToExercise(
  item: ParsedPronunciationItem,
  lessonId: string,
  difficulty: DifficultyLevel = 'guided'
): Exercise {
  const isSingle = item.isSingleWord;

  return {
    id: item.id || ('ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    lessonId,
    type: 'pronunciation',
    skill: 'speaking',
    difficulty,
    question: isSingle 
      ? `Lắng nghe và phát âm từ: ${item.targetText}` 
      : `Lắng nghe và phát âm câu: ${item.targetText}`,
    instruction: isSingle
      ? 'Bấm nút loa để nghe phát âm mẫu, sau đó bấm Micro để đọc lại. Đọc đúng từ là hoàn thành bài.'
      : `Bấm nút loa để nghe cả câu, sau đó bấm Micro để đọc lại toàn bộ câu (Cần đạt độ chính xác tối thiểu ${item.passAccuracy}%).`,
    correctText: item.targetText,
    vocabWord: isSingle ? item.targetText : undefined,
    vocabMeaning: item.meaning || undefined,
    phonetic: item.phonetic || undefined,
    pronunciationAccuracy: item.passAccuracy,
    isSingleWord: isSingle,
    targetWordsCount: item.wordsCount,
    explanation: isSingle
      ? (item.meaning ? `Nghĩa: ${item.meaning}. Phiên âm: ${item.phonetic || 'Chưa cập nhật'}.` : 'Hãy chú ý phát âm rõ phụ âm cuối và trọng âm.')
      : (item.meaning ? `Bản dịch: "${item.meaning}".` : 'Hãy chú ý nhịp điệu và ngữ điệu tự nhiên của cả câu.'),
  };
}
