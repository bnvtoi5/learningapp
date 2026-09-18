import { ExerciseType, DifficultyLevel } from '../types';

/**
 * Tách biệt hoàn toàn các Prompts cho từng dạng bài tập từ vựng độc lập.
 * Tuyệt đối không gộp chung nhiều loại bài tập vào 1 prompt hỗn tạp.
 * Tuân thủ nghiêm ngặt nguyên tắc: 1 DÒNG = 1 TỪ VỰNG MỤC TIÊU.
 */

export function getSingleVocabPromptForType(
  exerciseType: ExerciseType,
  difficulty: DifficultyLevel = 'guided'
): string {
  switch (exerciseType) {
    case 'vocab_cloze':
      return getVocabClozePrompt(difficulty);
    case 'multiple_choice':
      return getMultipleChoicePrompt(difficulty);
    case 'flashcard_recall':
      return getFlashcardPrompt(difficulty);
    case 'listen_spell':
      return getListenSpellPrompt(difficulty);
    case 'spelling':
    case 'anagram':
      return getSpellingAnagramPrompt(difficulty);
    case 'fill_in_blank':
      return getFillInBlankPrompt(difficulty);
    case 'typing':
      return getTypingPrompt(difficulty);
    case 'matching':
      return getMatchingPrompt(difficulty);
    default:
      return getVocabClozePrompt(difficulty);
  }
}

/**
 * 1. PROMPT CHUYÊN BIỆT: KHUYẾT KÝ TỰ TỪ VỰNG (Active Recall Spelling Cloze)
 * Tái tạo 100% chuẩn xác các trường dữ liệu như giao diện soạn bài thủ công (Manual).
 */
export function getVocabClozePrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh hàng đầu.
NHIỆM VỤ CỦA BẠN:
Tạo bài tập dạng "Khuyết ký tự từ vựng (Active Recall Spelling Cloze)" từ danh sách từ vựng người dùng cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.
- Nếu một dòng có dạng "friendly: thân thiện, cởi mở" hoặc "friendly - thân thiện, dễ gần" hoặc "friendly, thân thiện, cởi mở", thì từ tiếng Anh là "friendly", và toàn bộ phần nghĩa tiếng Việt là "thân thiện, cởi mở".

QUY ĐỊNH CẤU TRÚC CHI TIẾT CHO DẠNG "vocab_cloze":
Với MỖI từ vựng trên 1 dòng, bạn PHẢI tạo ra 1 bài tập có ĐẦY ĐỦ các trường sau:
1. "vocabWord" (và "word"): Từ tiếng Anh mục tiêu viết đúng chính tả (ví dụ: "friendly", "environment", "sustainable").
2. "vocabMeaning" (và "hint"): Toàn bộ nghĩa tiếng Việt ngắn gọn, xúc tích của từ (ví dụ: "thân thiện, cởi mở").
3. "phonetic": Phiên âm quốc tế IPA chuẩn xác của từ (ví dụ: "/'frend.li/", "/ɪn'vaɪrənmənt/").
4. "clozeLetters": MẪU KHUYẾT CHỮ CÁI CHUẨN XÁC, trong đó các ký tự hiển thị và các dấu gạch dưới "_" BẮT BUỘC CÁCH NHAU BẰNG MỘT KHOẢNG TRẮNG.
   - Luôn giữ lại chữ cái đầu tiên và chữ cái cuối cùng của từ.
   - Ẩn từ 35% đến 50% số chữ cái ở giữa bằng dấu gạch dưới "_".
   - Ví dụ: từ "friendly" (8 chữ cái) -> clozeLetters: "f _ _ e n d l y" hoặc "f _ _ _ d l y"
   - Ví dụ: từ "cat" (3 chữ cái) -> clozeLetters: "c _ t"
   - Ví dụ: từ "environment" (11 chữ cái) -> clozeLetters: "e n v _ _ _ n m _ n t"
   - ĐỊNH DẠNG BẮT BUỘC: Mỗi chữ cái và mỗi dấu gạch dưới "_" PHẢI cách nhau bởi 1 khoảng trắng (dấu cách).
5. "question": Đề bài theo cú pháp sư phạm chuẩn xác:
   "Điền từ tiếng Anh có nghĩa: \\"[vocabMeaning]\\""
   (Ví dụ: "Điền từ tiếng Anh có nghĩa: \\"thân thiện, cởi mở\\"")
6. "correctAnswer" (và "correct_answer", "correctText"): Từ tiếng Anh gốc viết thường, chính xác (ví dụ: "friendly").
7. "explanation": Giải thích chi tiết từ loại, nghĩa tiếng Việt và ví dụ ngắn gọn (ví dụ: "friendly (tính từ) = thân thiện, dễ gần. Ví dụ: She is always friendly to everyone.").
8. "difficulty": "${difficulty}".
9. "type": "vocab_cloze".

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "vocab_cloze",
  "items": [
    {
      "id": "cloze_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "vocab_cloze",
      "phonetic": "/'frend.li/",
      "clozeLetters": "f _ _ e n d l y",
      "clozeTemplate": "f _ _ e n d l y",
      "question": "Điền từ tiếng Anh có nghĩa: \\"thân thiện, cởi mở\\"",
      "hint": "thân thiện, cởi mở",
      "correctAnswer": "friendly",
      "correct_answer": "friendly",
      "correctText": "friendly",
      "explanation": "friendly (tính từ) = thân thiện, dễ gần."
    }
  ]
}`;
}

/**
 * 2. PROMPT CHUYÊN BIỆT: TRẮC NGHIỆM TỪ VỰNG (Multiple Choice 4 Options)
 */
export function getMultipleChoicePrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Trắc nghiệm từ vựng 4 lựa chọn (Multiple Choice)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng trên 1 dòng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning": Nghĩa tiếng Việt của từ.
3. "phonetic": Phiên âm IPA.
4. "question": "Nghĩa của từ '[word]' là gì?" hoặc "Từ tiếng Anh nào sau đây có nghĩa là '[vocabMeaning]'?".
5. "options": Mảng 4 phương án lựa chọn (A, B, C, D) gồm 1 đáp án chính xác và 3 đáp án nhiễu (distractors) hợp lý cùng từ loại.
6. "correctOptionIdx": Số nguyên từ 0 đến 3 biểu thị vị trí của đáp án đúng trong mảng options.
7. "correctAnswer": Chuỗi nội dung đáp án đúng.
8. "explanation": Giải thích chi tiết tại sao chọn đáp án này và câu ví dụ minh họa.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "multiple_choice",
  "items": [
    {
      "id": "mc_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "multiple_choice",
      "phonetic": "/'frend.li/",
      "question": "Nghĩa của từ 'friendly' là gì?",
      "options": ["thân thiện, cởi mở", "nghiêm khắc, khó tính", "nhút nhát, e dè", "hung hăng, thô bạo"],
      "correctOptionIdx": 0,
      "correctAnswer": "thân thiện, cởi mở",
      "correct_answer": "thân thiện, cởi mở",
      "explanation": "friendly (tính từ) có nghĩa là thân thiện, cởi mở, dễ gần."
    }
  ]
}`;
}

/**
 * 3. PROMPT CHUYÊN BIỆT: THẺ HỌC TỪ VỰNG (Flashcard Recall)
 */
export function getFlashcardPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo "Thẻ ghi nhớ từ vựng Active Recall (Flashcard)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning" / "hint": Nghĩa tiếng Việt chi tiết, súc tích.
3. "phonetic": Phiên âm IPA chuẩn xác.
4. "question": "Ghi nhớ từ vựng: [word]".
5. "exampleSentence": 1 câu ví dụ tiếng Anh tự nhiên kèm bản dịch tiếng Việt trong ngoặc.
6. "correctAnswer": Từ tiếng Anh gốc.
7. "explanation": Phân tích từ loại (noun/adj/verb), cách phát âm và các từ đồng nghĩa (synonyms).

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "flashcard_recall",
  "items": [
    {
      "id": "fc_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "flashcard_recall",
      "phonetic": "/'frend.li/",
      "question": "Ghi nhớ từ vựng: friendly",
      "hint": "thân thiện, cởi mở",
      "exampleSentence": "The local people are remarkably friendly to tourists. (Người dân địa phương rất thân thiện với khách du lịch.)",
      "correctAnswer": "friendly",
      "explanation": "friendly (tính từ) = thân thiện, cởi mở. Từ đồng nghĩa: welcoming, sociable."
    }
  ]
}`;
}

/**
 * 4. PROMPT CHUYÊN BIỆT: NGHE & CHÍNH TẢ (Listen & Spell)
 */
export function getListenSpellPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Nghe phát âm và viết chính tả (Listen & Spell)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning" / "hint": Nghĩa tiếng Việt.
3. "phonetic": Phiên âm IPA chuẩn.
4. "question": "Nghe phát âm và gõ lại từ vựng đúng chính tả".
5. "correctAnswer": Từ tiếng Anh gốc.
6. "explanation": Chú ý các ký tự dễ viết sai chính tả (silent letters, double consonants...).

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "listen_spell",
  "items": [
    {
      "id": "ls_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "listen_spell",
      "phonetic": "/'frend.li/",
      "question": "Nghe phát âm và gõ lại từ vựng đúng chính tả",
      "hint": "Nghĩa: thân thiện, cởi mở",
      "correctAnswer": "friendly",
      "explanation": "Từ cần gõ chính xác là 'friendly' (chú ý chữ 'ie')."
    }
  ]
}`;
}

/**
 * 5. PROMPT CHUYÊN BIỆT: SẮP XẾP CHỮ CÁI XÁO TRỘN (Anagram / Spelling)
 */
export function getSpellingAnagramPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Sắp xếp các chữ cái bị xáo trộn (Anagram / Word Scramble)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning": Nghĩa tiếng Việt.
3. "phonetic": Phiên âm IPA.
4. "question": "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"[vocabMeaning]\\"".
5. "shuffledLetters": Mảng chứa các chữ cái của từ bị xáo trộn ngẫu nhiên (ví dụ: ["i", "e", "f", "n", "d", "l", "r", "y"]).
6. "correctAnswer": Từ tiếng Anh gốc viết thường.
7. "explanation": Giải thích nghĩa từ và ví dụ câu.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "spelling",
  "items": [
    {
      "id": "spell_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "spelling",
      "phonetic": "/'frend.li/",
      "question": "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"thân thiện, cởi mở\\"",
      "shuffledLetters": ["r", "f", "i", "e", "n", "d", "l", "y"],
      "correctAnswer": "friendly",
      "explanation": "friendly (adj) = thân thiện, cởi mở."
    }
  ]
}`;
}

/**
 * 6. PROMPT CHUYÊN BIỆT: ĐIỀN TỪ VÀO CÂU NGỮ CẢNH (Context Fill in Blank)
 */
export function getFillInBlankPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Điền từ vào câu ví dụ ngữ cảnh (Fill in blank)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc cần điền.
2. "vocabMeaning": Nghĩa tiếng Việt của từ.
3. "phonetic": Phiên âm IPA.
4. "question": Một câu tiếng Anh tự nhiên, chuẩn bản xứ, trong đó từ mục tiêu được thay bằng ký hiệu "___".
   (Ví dụ: "She greeted the new neighbors with a warm and ___ smile.")
5. "hint": Bản dịch nghĩa tiếng Việt của toàn bộ câu ví dụ đó (ví dụ: "Cô ấy chào đón những người hàng xóm mới bằng một nụ cười ấm áp và thân thiện.").
6. "correctAnswer": Từ tiếng Anh chính xác cần điền vào chỗ trống (ví dụ: "friendly").
7. "explanation": Giải thích tại sao chọn từ này trong câu và phân tích ngữ pháp liên quan.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "fill_in_blank",
  "items": [
    {
      "id": "fib_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "fill_in_blank",
      "phonetic": "/'frend.li/",
      "question": "She greeted the new neighbors with a warm and ___ smile.",
      "hint": "Cô ấy chào đón những người hàng xóm mới bằng một nụ cười ấm áp và thân thiện.",
      "correctAnswer": "friendly",
      "explanation": "'friendly' (tính từ) đứng trước danh từ 'smile' để bổ nghĩa cho nụ cười thân thiện."
    }
  ]
}`;
}

/**
 * 7. PROMPT CHUYÊN BIỆT: TỰ GÕ TỪ VỰNG (Active Typing Recall)
 */
export function getTypingPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Tự gõ từ vựng (Active Typing Recall)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning": Nghĩa tiếng Việt.
3. "phonetic": Phiên âm IPA.
4. "question": "Gõ từ tiếng Anh có nghĩa: \\"[vocabMeaning]\\"".
5. "hint": Chữ cái đầu tiên và số lượng ký tự (ví dụ: "Bắt đầu bằng chữ 'f', gồm 8 chữ cái").
6. "correctAnswer": Từ tiếng Anh gốc.
7. "explanation": Giải thích nghĩa, từ loại và ví dụ câu tiếng Anh.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "typing",
  "items": [
    {
      "id": "type_1",
      "word": "friendly",
      "vocabWord": "friendly",
      "vocabMeaning": "thân thiện, cởi mở",
      "type": "typing",
      "phonetic": "/'frend.li/",
      "question": "Gõ từ tiếng Anh có nghĩa: \\"thân thiện, cởi mở\\"",
      "hint": "Bắt đầu bằng chữ 'f', gồm 8 chữ cái",
      "correctAnswer": "friendly",
      "explanation": "friendly (tính từ) = thân thiện, cởi mở."
    }
  ]
}`;
}

/**
 * 8. PROMPT CHUYÊN BIỆT: GHÉP CẶP TỪ - NGHĨA (Matching Pairs)
 */
export function getMatchingPrompt(difficulty: DifficultyLevel = 'guided'): string {
  return `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ:
Tạo bài tập "Ghép nối từ vựng với nghĩa tiếng Việt tương ứng (Matching Pairs)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "matching",
  "items": [
    {
      "id": "match_1",
      "type": "matching",
      "question": "Ghép các từ tiếng Anh sau với nghĩa tiếng Việt tương ứng:",
      "matchingPairs": [
        { "id": "p1", "left": "friendly", "right": "thân thiện, cởi mở" }
      ],
      "correctAnswer": "friendly = thân thiện, cởi mở",
      "explanation": "Ghép đúng các cặp từ vựng với nghĩa tiếng Việt tương ứng."
    }
  ]
}`;
}
