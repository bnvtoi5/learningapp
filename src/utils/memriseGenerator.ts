import { Exercise, MemriseExerciseItem, MemriseGenerationResult } from '../types';
import { loadSettings } from './storage';
import { createClozeLettersPattern } from './singleVocabGenerator';

export const MEMRISE_SYSTEM_PROMPT = `Bạn là một AI Backend Module chuyên dụng, có nhiệm vụ chuyển đổi danh sách từ vựng được người dùng cung cấp thành một cấu trúc dữ liệu bài tập (JSON) theo phong cách Memrise hoàn chỉnh.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
1. MỖI DÒNG trong danh sách tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
2. TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.
3. Nếu một dòng có dạng "friendly: thân thiện, cởi mở" hoặc "friendly, thân thiện, cởi mở", thì từ tiếng Anh là "friendly" và toàn bộ nghĩa tiếng Việt là "thân thiện, cởi mở".

CHỈ ĐỊNH NGHIÊM NGẶT VỀ DỮ LIỆU:
1. KHÔNG ĐƯỢC TỰ TẠO SAMPLE DATA. Nếu người dùng nhập danh sách trống hoặc không hợp lệ, hãy trả về JSON: {"error": "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý."}.
2. Chỉ xử lý CHÍNH XÁC những từ vựng có trong danh sách được người dùng cung cấp ở tin nhắn tiếp theo.

NHIỆM VỤ CỦA BẠN:
Với mỗi dòng từ vựng trong danh sách, hãy tạo ra các bài tập theo trình tự logic sư phạm (1 Flashcard + 6 Quiz cho mỗi từ):
- Bước 0: "flashcard" (Thẻ học từ vựng trước khi vào quiz). Giúp người học nắm vững từ vựng, phiên âm chuẩn quốc tế IPA, giải nghĩa tiếng Việt rõ ràng, câu ví dụ tự nhiên kèm bản dịch tiếng Việt trước khi bắt đầu làm bài tập trắc nghiệm/luyện tập.
- Bước 1: "multiple_choice" (Trắc nghiệm xuôi: Từ tiếng Anh ➔ Chọn nghĩa tiếng Việt). Hỏi nghĩa của từ tiếng Anh. Tạo ra 3 đáp án nhiễu (distractors) hợp lý từ các từ vựng khác hoặc kho từ vựng cùng trình độ.
- Bước 2: "multiple_choice" đảo ngược (Trắc nghiệm đảo: Nghĩa tiếng Việt ➔ Chọn từ tiếng Anh đúng). Câu hỏi dạng: "Từ tiếng Anh nào sau đây có nghĩa là '[meaning]'?". 4 options là các từ tiếng Anh (gồm từ đúng và 3 từ tiếng Anh nhiễu hợp lý). Đánh dấu "is_reverse": true.
- Bước 3: "fill_in_blank" (Điền từ vào câu ví dụ ngữ cảnh). Tạo 1 câu ví dụ tiếng Anh có nghĩa rõ ràng, ẩn từ đó đi bằng ký tự "___". Cung cấp câu dịch nghĩa tiếng Việt làm gợi ý ("hint").
- Bước 4: "vocab_cloze" (Khuyết ký tự từ vựng ngẫu nhiên). Câu hỏi: "Điền từ tiếng Anh có nghĩa: \\"[meaning]\\"". Tạo mẫu chuỗi ký tự khuyết "clozeLetters" với các chữ cái và dấu gạch dưới "_" cách nhau bởi khoảng trắng (ví dụ: "_ r _ e n d _ y" hoặc "f _ _ e n d l y"), ẩn từ 35%-60% chữ cái ngẫu nhiên trên toàn bộ từ (đầu, giữa, cuối).
- Bước 5: "spelling" (Sắp xếp ký tự). Câu hỏi: "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"[meaning]\\"". Tạo một mảng "shuffled_letters" chứa các chữ cái của từ đó đã được tráo đổi ngẫu nhiên vị trí. TUYỆT ĐỐI KHÔNG để lộ từ gốc trong câu hỏi của bài tập spelling.
- Bước 6: "typing" (Tự gõ từ). Câu hỏi: "Gõ từ tiếng Anh có nghĩa: \\"[meaning]\\"". Cung cấp định nghĩa/gợi ý tiếng Việt và bắt người dùng gõ lại chính xác từ gốc tiếng Anh.

ĐỊNH DẠNG ĐẦU RA (OUTPUT FORMAT):
- Trả về CHỈ duy nhất khối JSON có cấu trúc như bên dưới.
- KHÔNG viết thêm lời mở đầu, lời giải thích, hoặc ký hiệu Markdown \`\`\`json ngoại trừ khối JSON thuần túy.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "total_words_processed": 0,
  "exercises": [
    {
      "id": "string",
      "word": "từ gốc",
      "type": "flashcard",
      "question": "Ghi nhớ từ vựng: [word]",
      "meaning": "giải nghĩa tiếng Việt",
      "phonetic": "/phiên âm IPA/",
      "example": "Câu ví dụ tiếng Anh ngắn gọn chứa [word]",
      "example_translation": "Bản dịch tiếng Việt của câu ví dụ",
      "correct_answer": "từ gốc"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "multiple_choice",
      "question": "Nghĩa của từ '[word]' là gì?",
      "options": ["đáp án đúng", "đáp án nhiễu 1", "đáp án nhiễu 2", "đáp án nhiễu 3"],
      "correct_answer": "đáp án đúng"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "multiple_choice",
      "is_reverse": true,
      "question": "Từ tiếng Anh nào sau đây có nghĩa là '[meaning]'?",
      "options": ["[word]", "từ tiếng Anh nhiễu 1", "từ tiếng Anh nhiễu 2", "từ tiếng Anh nhiễu 3"],
      "correct_answer": "[word]"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "fill_in_blank",
      "question": "The local people are remarkably ___ to all visitors.",
      "hint": "Người dân địa phương rất thân thiện với tất cả du khách.",
      "correct_answer": "từ gốc"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "vocab_cloze",
      "question": "Điền từ tiếng Anh có nghĩa: \\"[meaning]\\"",
      "hint": "[Giải nghĩa tiếng Việt của từ]",
      "phonetic": "/phiên âm IPA/",
      "clozeLetters": "f _ _ e n d l y",
      "correct_answer": "từ gốc"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "spelling",
      "question": "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"[meaning]\\"",
      "shuffled_letters": ["r", "f", "i", "e", "n", "d", "l", "y"],
      "correct_answer": "từ gốc"
    },
    {
      "id": "string",
      "word": "từ gốc",
      "type": "typing",
      "question": "Gõ từ tiếng Anh có nghĩa: \\"[meaning]\\"",
      "hint": "[Giải nghĩa tiếng Việt của từ]",
      "correct_answer": "từ gốc"
    }
  ]
}`;

export const CHUNK_SIZE = 3;
export const QUIZ_TYPES_PER_WORD = 6;

/**
 * Trộn ngẫu nhiên mảng
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sắp xếp các bài tập Memrise theo từng đợt (Round/Chunk, mặc định CHUNK_SIZE = 3 từ/đợt):
 * - ĐẦU ĐỢT: Tất cả Flashcard của các từ trong đợt (Flashcard W1, Flashcard W2, Flashcard W3).
 * - TIẾP THEO: Xen kẽ các từ trong cùng một dạng Quiz (15 Quiz / đợt):
 *   + Quiz 1 (Từ ➔ Nghĩa): W1, W2, W3
 *   + Quiz 2 (Nghĩa ➔ Từ): W1, W2, W3
 *   + Quiz 3 (Điền từ khuyết): W1, W2, W3
 *   + Quiz 4 (Spelling xáo chữ): W1, W2, W3
 *   + Quiz 5 (Typing gõ từ): W1, W2, W3
 * - Sau khi hoàn thành đợt hiện tại mới chuyển sang đợt tiếp theo.
 * - Đợt cuối nếu còn 1 hay 2 từ cũng tuân thủ thứ tự tương tự.
 */
export function orderExercisesInBatches(
  exercises: MemriseExerciseItem[],
  batchSize: number = CHUNK_SIZE
): MemriseExerciseItem[] {
  if (!exercises || exercises.length === 0) return [];

  // Lấy danh sách các từ duy nhất theo thứ tự xuất hiện ban đầu
  const uniqueWords: string[] = [];
  exercises.forEach(ex => {
    const w = (ex.word || '').trim();
    if (w && !uniqueWords.includes(w)) {
      uniqueWords.push(w);
    }
  });

  if (uniqueWords.length === 0) return exercises;

  const result: MemriseExerciseItem[] = [];

  // Phân loại dạng câu hỏi
  const isFlashcard = (ex: MemriseExerciseItem) => ex.type === 'flashcard';
  const isMcStandard = (ex: MemriseExerciseItem) => ex.type === 'multiple_choice' && !ex.is_reverse;
  const isMcReverse = (ex: MemriseExerciseItem) => ex.type === 'multiple_choice' && !!ex.is_reverse;
  const isFillBlank = (ex: MemriseExerciseItem) => ex.type === 'fill_in_blank';
  const isVocabCloze = (ex: MemriseExerciseItem) => ex.type === 'vocab_cloze';
  const isSpelling = (ex: MemriseExerciseItem) => ex.type === 'spelling';
  const isTyping = (ex: MemriseExerciseItem) => ex.type === 'typing';

  // Chia uniqueWords thành các batch (mỗi batch tối đa batchSize từ, mặc định CHUNK_SIZE = 3)
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batchWords = uniqueWords.slice(i, i + batchSize);
    
    // Lấy tất cả bài tập thuộc các từ trong batch này
    const batchExercises = exercises.filter(ex => 
      batchWords.includes((ex.word || '').trim())
    );

    // 1. TẤT CẢ FLASHCARD CỦA ĐỢT LÊN ĐẦU (Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const fcs = batchExercises.filter(ex => isFlashcard(ex) && (ex.word || '').trim() === word);
      result.push(...fcs);
    });

    // 2. Quiz 1 — Từ ➔ Nghĩa (Multiple Choice Standard: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const mcs = batchExercises.filter(ex => isMcStandard(ex) && (ex.word || '').trim() === word);
      result.push(...mcs);
    });

    // 3. Quiz 2 — Nghĩa ➔ Từ (Multiple Choice Reverse: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const mcRevs = batchExercises.filter(ex => isMcReverse(ex) && (ex.word || '').trim() === word);
      result.push(...mcRevs);
    });

    // 4. Quiz 3 — Fill in Blank (Điền từ vào câu: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const fibs = batchExercises.filter(ex => isFillBlank(ex) && (ex.word || '').trim() === word);
      result.push(...fibs);
    });

    // 5. Quiz 4 — Vocab Cloze (Điền ký tự khuyết: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const clozes = batchExercises.filter(ex => isVocabCloze(ex) && (ex.word || '').trim() === word);
      result.push(...clozes);
    });

    // 6. Quiz 5 — Spelling (Sắp xếp ký tự: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const sps = batchExercises.filter(ex => isSpelling(ex) && (ex.word || '').trim() === word);
      result.push(...sps);
    });

    // 7. Quiz 6 — Typing (Tự gõ từ vựng: Word 1, Word 2, Word 3)
    batchWords.forEach(word => {
      const typs = batchExercises.filter(ex => isTyping(ex) && (ex.word || '').trim() === word);
      result.push(...typs);
    });

    // Bất kỳ bài tập phụ nào chưa khớp dạng trên của các từ trong batch này
    const usedIds = new Set(result.map(r => r.id));
    batchExercises.forEach(ex => {
      if (!usedIds.has(ex.id)) {
        result.push(ex);
      }
    });
  }

  // Bổ sung những bài tập không thuộc danh sách uniqueWords (nếu có)
  const includedIds = new Set(result.map(r => r.id));
  exercises.forEach(ex => {
    if (!includedIds.has(ex.id)) {
      result.push(ex);
    }
  });

  return result;
}

/**
 * Sắp xếp mảng bài tập Exercise[] chuẩn theo cấu trúc round / đợt:
 * - CHUNK_SIZE = 3 cặp từ vựng / đợt
 * - 3 Flashcards đầu đợt
 * - 15 Quiz xen kẽ (MC chuẩn -> MC đảo -> Fill Blank -> Spelling -> Typing)
 */
export function orderStandardExercisesInBatches(
  exercises: Exercise[],
  batchSize: number = CHUNK_SIZE
): Exercise[] {
  if (!exercises || exercises.length === 0) return [];

  // Lấy danh sách các từ vựng duy nhất
  const uniqueWords: string[] = [];
  exercises.forEach(ex => {
    const w = (ex.vocabWord || ex.word || (ex.type === 'flashcard_recall' ? ex.question : '') || '').trim();
    if (w && !uniqueWords.includes(w)) {
      uniqueWords.push(w);
    }
  });

  if (uniqueWords.length === 0) return exercises;

  const result: Exercise[] = [];

  const isFlashcard = (ex: Exercise) => ex.type === 'flashcard_recall';
  const isMcStandard = (ex: Exercise) => ex.type === 'multiple_choice' && !ex.isReverseChoice;
  const isMcReverse = (ex: Exercise) => ex.type === 'multiple_choice' && !!ex.isReverseChoice;
  const isFillBlank = (ex: Exercise) => ex.type === 'fill_blank' || ex.type === 'fill_in_blank';
  const isVocabCloze = (ex: Exercise) => ex.type === 'vocab_cloze';
  const isSpelling = (ex: Exercise) => ex.type === 'spelling' || ex.type === 'anagram';
  const isTyping = (ex: Exercise) => ex.type === 'typing';

  const getWord = (ex: Exercise) => (ex.vocabWord || ex.word || '').trim();

  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batchWords = uniqueWords.slice(i, i + batchSize);
    const batchExercises = exercises.filter(ex => batchWords.includes(getWord(ex)));

    // 1. Flashcards của cả đợt lên đầu
    batchWords.forEach(word => {
      const fcs = batchExercises.filter(ex => isFlashcard(ex) && getWord(ex) === word);
      result.push(...fcs);
    });

    // 2. Quiz 1: Từ -> Nghĩa
    batchWords.forEach(word => {
      const mcs = batchExercises.filter(ex => isMcStandard(ex) && getWord(ex) === word);
      result.push(...mcs);
    });

    // 3. Quiz 2: Nghĩa -> Từ
    batchWords.forEach(word => {
      const mcRevs = batchExercises.filter(ex => isMcReverse(ex) && getWord(ex) === word);
      result.push(...mcRevs);
    });

    // 4. Quiz 3: Fill in Blank (Điền từ vào câu ví dụ)
    batchWords.forEach(word => {
      const fibs = batchExercises.filter(ex => isFillBlank(ex) && getWord(ex) === word);
      result.push(...fibs);
    });

    // 5. Quiz 4: Vocab Cloze (Điền ký tự khuyết)
    batchWords.forEach(word => {
      const clozes = batchExercises.filter(ex => isVocabCloze(ex) && getWord(ex) === word);
      result.push(...clozes);
    });

    // 6. Quiz 5: Spelling
    batchWords.forEach(word => {
      const sps = batchExercises.filter(ex => isSpelling(ex) && getWord(ex) === word);
      result.push(...sps);
    });

    // 7. Quiz 6: Typing
    batchWords.forEach(word => {
      const typs = batchExercises.filter(ex => isTyping(ex) && getWord(ex) === word);
      result.push(...typs);
    });

    // Các bài tập khác thuộc batchWords
    const usedIds = new Set(result.map(r => r.id));
    batchExercises.forEach(ex => {
      if (!usedIds.has(ex.id)) {
        result.push(ex);
      }
    });
  }

  // Bổ sung các bài tập không thuộc uniqueWords (nếu có)
  const includedIds = new Set(result.map(r => r.id));
  exercises.forEach(ex => {
    if (!includedIds.has(ex.id)) {
      result.push(ex);
    }
  });

  return result.map((ex, idx) => ({ ...ex, order: idx + 1 }));
}

/**
 * Tạo bài tập Memrise cục bộ ngoại tuyến (Offline fallback) khi không có mạng hoặc chưa cấu hình API Key
 * Tự động chia theo đợt 3 từ (Flashcard lên đầu từng đợt -> Câu hỏi liên quan)
 */
export function generateOfflineMemriseExercises(
  rawInput: string,
  batchSize: number = 3
): MemriseGenerationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      status: 'error',
      error: 'Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.'
    };
  }

  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      status: 'error',
      error: 'Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.'
    };
  }

  const parsedVocab: { word: string; meaning: string }[] = [];
  for (const line of lines) {
    let word = '';
    let meaning = '';

    if (line.includes(':')) {
      const parts = line.split(':');
      word = parts[0].trim();
      meaning = parts.slice(1).join(':').trim();
    } else if (line.includes(' - ')) {
      const parts = line.split(' - ');
      word = parts[0].trim();
      meaning = parts.slice(1).join(' - ').trim();
    } else if (line.includes('(') && line.includes(')')) {
      const match = line.match(/^([^(]+)\(([^)]+)\)/);
      if (match) {
        word = match[1].trim();
        meaning = match[2].trim();
      } else {
        word = line;
      }
    } else {
      word = line;
    }

    if (word) {
      parsedVocab.push({
        word,
        meaning: meaning || `Nghĩa của từ ${word}`
      });
    }
  }

  if (parsedVocab.length === 0) {
    return {
      status: 'error',
      error: 'Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.'
    };
  }

  const commonDistractors = [
    'chăm chỉ, siêng năng', 'thông minh, nhanh trí', 'thân thiện, cởi mở',
    'khám phá, tìm hiểu', 'quyết định, lựa chọn', 'phát triển, mở rộng',
    'thành công, rực rỡ', 'hòa bình, yên tĩnh', 'quan trọng, thiết yếu'
  ];

  const exercises: MemriseExerciseItem[] = [];

  // CHIA THEO TỪNG ĐỢT (BATCH MẶC ĐỊNH 3 TỪ)
  for (let b = 0; b < parsedVocab.length; b += batchSize) {
    const batchVocab = parsedVocab.slice(b, b + batchSize);
    const batchNum = Math.floor(b / batchSize) + 1;

    // 1. TẤT CẢ FLASHCARD CỦA ĐỢT NÀY LÊN ĐẦU TIÊN
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      exercises.push({
        id: `${baseId}_fc`,
        word,
        type: 'flashcard',
        question: `Học từ mới: ${word}`,
        meaning,
        phonetic: `/${word.toLowerCase()}/`,
        example: `The word "${word}" is frequently used in daily English communication.`,
        example_translation: `Từ "${word}" thường xuyên xuất hiện trong giao tiếp tiếng Anh hàng ngày.`,
        correct_answer: word
      });
    });

    // 2. CÁC BÀI TẬP QUIZ XEN KẼ THEO DẠNG CHO TẤT CẢ CÁC TỪ TRONG ĐỢT NÀY
    // 2.1. Quiz 1 — Từ ➔ Nghĩa (Multiple Choice Standard cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      const otherMeanings = parsedVocab
        .filter(v => v.word !== word)
        .map(v => v.meaning);
      
      const distractorsPool = [...otherMeanings, ...commonDistractors];
      const pickedDistractors = shuffleArray(distractorsPool).slice(0, 3);
      const options = shuffleArray([meaning, ...pickedDistractors]);

      exercises.push({
        id: `${baseId}_mc`,
        word,
        type: 'multiple_choice',
        question: `Nghĩa của từ '${word}' là gì?`,
        options,
        correct_answer: meaning
      });
    });

    // 2.2. Quiz 2 — Nghĩa ➔ Từ (Multiple Choice Reverse cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      const otherEnglishWords = parsedVocab
        .filter(v => v.word.toLowerCase() !== word.toLowerCase())
        .map(v => v.word);
      const fallbackEnglishPool = ['memory', 'diligent', 'explore', 'decision', 'concept', 'knowledge', 'practice', 'language'];
      const englishDistractors = shuffleArray([...otherEnglishWords, ...fallbackEnglishPool.filter(w => w.toLowerCase() !== word.toLowerCase())]).slice(0, 3);
      const reverseOptions = shuffleArray([word, ...englishDistractors]);

      exercises.push({
        id: `${baseId}_mc_rev`,
        word,
        type: 'multiple_choice',
        is_reverse: true,
        question: `Từ tiếng Anh nào sau đây có nghĩa là: "${meaning}"?`,
        options: reverseOptions,
        correct_answer: word
      });
    });

    // 2.3. Quiz 3 — Fill in Blank (Điền từ vào câu ví dụ cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      exercises.push({
        id: `${baseId}_fib`,
        word,
        type: 'fill_in_blank',
        question: `Điền từ thích hợp vào chỗ trống: The word "___" is very important in this context.`,
        hint: `Từ cần điền mang ý nghĩa: ${meaning}`,
        correct_answer: word
      });
    });

    // 2.4. Quiz 4 — Vocab Cloze (Khuyết ký tự ngẫu nhiên cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;
      const { clozeLetters } = createClozeLettersPattern(word);

      exercises.push({
        id: `${baseId}_cloze`,
        word,
        type: 'vocab_cloze',
        question: `Điền từ tiếng Anh có nghĩa: "${meaning}"`,
        hint: meaning,
        clozeLetters,
        clozeTemplate: clozeLetters,
        correct_answer: word
      });
    });

    // 2.5. Quiz 5 — Spelling (Sắp xếp ký tự xáo trộn cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      const letters = word.toLowerCase().split('').filter(c => c !== ' ');
      let shuffled = shuffleArray(letters);
      if (shuffled.join('') === letters.join('') && letters.length > 1) {
        shuffled = letters.reverse();
      }

      exercises.push({
        id: `${baseId}_sp`,
        word,
        type: 'spelling',
        question: meaning ? `Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: "${meaning}"` : `Sắp xếp các chữ cái sau để tạo thành từ đúng`,
        shuffled_letters: shuffled,
        correct_answer: word
      });
    });

    // 2.6. Quiz 6 — Typing (Gõ lại từ theo nghĩa cho Word 1, Word 2, Word 3)
    batchVocab.forEach((item, indexWithinBatch) => {
      const globalIndex = b + indexWithinBatch;
      const baseId = `batch${batchNum}_${globalIndex}_${item.word.replace(/[^a-zA-Z0-9]/g, '')}`;
      const word = item.word;
      const meaning = item.meaning;

      exercises.push({
        id: `${baseId}_tp`,
        word,
        type: 'typing',
        question: meaning ? `Gõ từ tiếng Anh có nghĩa: "${meaning}"` : `Gõ chính xác từ vựng tiếng Anh`,
        hint: meaning,
        correct_answer: word
      });
    });
  }

  return {
    status: 'success',
    total_words_processed: parsedVocab.length,
    exercises
  };
}

/**
 * Gọi AI Backend Module để chuyển đổi danh sách từ vựng thành 4 dạng bài tập Memrise
 */
export async function generateMemriseExercisesFromAI(params: {
  vocabInput: string;
  customApiKey?: string;
  model?: string;
  batchSize?: number;
  signal?: AbortSignal;
}): Promise<MemriseGenerationResult> {
  const { vocabInput, customApiKey, model, batchSize = 3, signal } = params;

  if (signal?.aborted) {
    return {
      status: 'error',
      error: 'Đã dừng quá trình tạo bài tập Memrise theo yêu cầu.'
    };
  }

  if (!vocabInput || !vocabInput.trim()) {
    return {
      status: 'error',
      error: 'Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý.'
    };
  }

  // Tự động đồng bộ API Key & Model từ cài đặt Mascot/Hệ thống nếu chưa truyền trực tiếp
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
    // ignore
  }

  if (!resolvedModel) {
    resolvedModel = 'gemini-3.1-flash-lite';
  }

  // Thử gọi qua endpoint server /api/generate-memrise-exercises trước
  try {
    const res = await fetch('/api/generate-memrise-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        vocabularyList: vocabInput,
        vocabList: vocabInput,
        customApiKey: resolvedApiKey,
        model: resolvedModel,
        batchSize
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        return { status: 'error', error: data.error };
      }
      if (data.status === 'success' && Array.isArray(data.exercises)) {
        // Đảm bảo tuyệt đối bài tập được xếp theo đợt 3 từ, flashcard lên đầu
        data.exercises = orderExercisesInBatches(data.exercises, batchSize);
        return data as MemriseGenerationResult;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        status: 'error',
        error: 'Đã dừng quá trình tạo bài tập Memrise theo yêu cầu.'
      };
    }
    console.warn('Backend /api/generate-memrise-exercises error, falling back to direct / offline...', err);
  }

  if (signal?.aborted) {
    return {
      status: 'error',
      error: 'Đã dừng quá trình tạo bài tập Memrise theo yêu cầu.'
    };
  }

  // Fallback sang xử lý offline thông minh theo đợt
  return generateOfflineMemriseExercises(vocabInput, batchSize);
}

/**
 * Chuyển đổi MemriseExerciseItem thành cấu trúc Exercise chuẩn của hệ thống
 */
export function convertMemriseItemToExercise(
  item: MemriseExerciseItem,
  lessonId: string,
  order: number
): Exercise {
  const base: Exercise = {
    id: item.id || `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    lessonId,
    type: item.type === 'fill_in_blank' ? 'fill_blank' : (item.type === 'flashcard' ? 'flashcard_recall' : item.type),
    skill: 'vocabulary',
    difficulty: 'guided',
    question: item.question,
    word: item.word,
    vocabWord: item.word,
    correct_answer: item.correct_answer,
    order,
    instruction: 
      item.type === 'flashcard' ? 'Học từ mới: Xem nghĩa, phiên âm và phát âm chuẩn trước khi vào quiz' :
      item.type === 'multiple_choice' ? (item.is_reverse ? 'Chọn từ tiếng Anh có nghĩa tương ứng' : 'Chọn nghĩa tiếng Việt chính xác nhất của từ') :
      item.type === 'fill_in_blank' ? 'Điền từ vựng thích hợp vào chỗ trống' :
      item.type === 'vocab_cloze' ? 'Điền các ký tự còn thiếu để hoàn thiện từ tiếng Anh' :
      item.type === 'spelling' ? 'Chạm/kéo các chữ cái để ghép thành từ vựng đúng chính tả' :
      'Gõ chính xác từ vựng tiếng Anh theo gợi ý nghĩa'
  };

  if (item.type === 'flashcard') {
    base.type = 'flashcard_recall';
    base.vocabWord = item.word;
    base.vocabMeaning = item.meaning || item.correct_answer;
    base.phonetic = item.phonetic || '';
    base.context = item.example ? `${item.example}${item.example_translation ? `\n(${item.example_translation})` : ''}` : undefined;
    base.explanation = `${item.word} ${item.phonetic ? item.phonetic : ''}: ${item.meaning || item.correct_answer}`;
  } else if (item.type === 'multiple_choice') {
    base.options = item.options || [item.correct_answer];
    const correctIdx = base.options.indexOf(item.correct_answer);
    base.correctOptions = [correctIdx >= 0 ? correctIdx : 0];
    base.correctText = item.correct_answer;
    base.isReverseChoice = !!item.is_reverse;
    base.explanation = item.is_reverse 
      ? `"${item.correct_answer}" chính là từ tiếng Anh có nghĩa: "${item.meaning || item.question}".`
      : `Nghĩa chính xác của "${item.word}" là "${item.correct_answer}".`;
  } else if (item.type === 'fill_in_blank') {
    base.correctText = item.correct_answer;
    base.hint = item.hint;
    base.grammarHint = item.hint;
    base.explanation = item.hint ? `Gợi ý: ${item.hint}` : undefined;
  } else if (item.type === 'vocab_cloze') {
    base.type = 'vocab_cloze';
    base.vocabWord = item.word;
    base.vocabMeaning = item.meaning || item.hint;
    base.phonetic = item.phonetic || '';
    const resolvedCloze = item.clozeLetters || item.clozeTemplate || createClozeLettersPattern(item.word).clozeLetters;
    base.clozeLetters = resolvedCloze;
    base.correctText = item.correct_answer;
    base.hint = item.hint || item.meaning;
    base.question = item.question || (base.vocabMeaning ? `Điền từ tiếng Anh có nghĩa: "${base.vocabMeaning}"` : 'Điền các ký tự còn thiếu vào từ');
    base.explanation = `${item.word}: ${item.meaning || item.hint || ''}`;
  } else if (item.type === 'spelling') {
    base.correctText = item.correct_answer;
    base.shuffled_letters = item.shuffled_letters || item.word.split('').sort(() => Math.random() - 0.5);
    base.shuffledLetters = base.shuffled_letters;
    // Đảm bảo tiêu đề câu hỏi không làm lộ từ vựng
    if (item.meaning || item.hint) {
      base.question = `Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: "${item.meaning || item.hint}"`;
    } else if (base.question && (base.question.includes(':') || base.question.includes('đúng:'))) {
      base.question = 'Sắp xếp các chữ cái sau để tạo thành từ đúng';
    }
    base.explanation = `Từ đúng chính tả là: "${item.correct_answer}".`;
  } else if (item.type === 'typing') {
    base.correctText = item.correct_answer;
    base.hint = item.hint || item.meaning;
    if (item.meaning || item.hint) {
      base.question = `Gõ từ tiếng Anh có nghĩa: "${item.meaning || item.hint}"`;
    }
    base.explanation = `Từ vựng cần gõ là: "${item.correct_answer}".`;
  }

  return base;
}
