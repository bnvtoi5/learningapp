import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Trích xuất và phân tích cú pháp JSON an toàn từ phản hồi của AI.
 * Sử dụng thuật toán đếm ngoặc cân bằng (Balanced Braces) để loại bỏ mọi ký tự thừa
 * hoặc nhận xét mà AI có thể thêm vào sau khối JSON (ngăn chặn triệt để lỗi
 * "Unexpected non-whitespace character after JSON").
 */
function safeExtractJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error("Phản hồi từ AI rỗng hoặc không đúng định dạng.");
  }
  const trimmed = text.trim();

  // 1. Thử parse trực tiếp
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Gỡ bỏ code block markdown (```json ... ```)
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Trích xuất chính xác khối JSON bằng thuật toán đếm ngoặc cân bằng (Balanced Braces)
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const openChar = isObject ? '{' : '[';
    const closeChar = isObject ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    let endIdx = -1;

    for (let i = startIdx; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
    }

    if (endIdx !== -1) {
      const candidate = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Loại bỏ dấu phẩy thừa trước khi đóng ngoặc (trailing comma fix)
        try {
          const sanitized = candidate
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');
          return JSON.parse(sanitized);
        } catch {}
      }
    }
  }

  // 4. Fallback cuối cùng: Regex
  const regex = /\{[\s\S]*\}/;
  const match = cleaned.match(regex);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      const sanitized = match[0].replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized);
    }
  }

  throw new Error("Không thể phân tích dữ liệu JSON từ AI. Dữ liệu không đúng cấu trúc.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Memrise 4-Stage Exercise AI Generator Endpoint (Accepts both route aliases)
  const handleMemriseGenerate = async (req: express.Request, res: express.Response) => {
    try {
      const { vocabularyList, vocabList, customApiKey, model } = req.body;
      const inputList = vocabularyList || vocabList;

      // 1. TÁCH THEO TỪNG DÒNG (Không tách dấu phẩy/chấm phẩy trong dòng để giữ trọn vẹn nghĩa tiếng Việt)
      let lines: string[] = [];
      if (Array.isArray(inputList)) {
        lines = inputList.map(w => String(w || '').trim()).filter(Boolean);
      } else if (typeof inputList === 'string') {
        lines = inputList
          .split(/\r?\n/)
          .map(line => line.replace(/^[\d\s.\-•*)]+/, '').trim())
          .filter(Boolean);
      }

      // CHỈ ĐỊNH 1: Nếu danh sách trống hoặc không hợp lệ, trả về thông báo lỗi chuẩn
      if (!lines || lines.length === 0) {
        return res.json({ 
          error: "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý." 
        });
      }

      // 2. LỌC VÀ XÁC ĐỊNH TỪNG TỪ VỰNG KÈM NGHĨA CHO MỖI DÒNG
      interface ParsedItem {
        originalLine: string;
        word: string;
        meaning: string;
      }

      const parsedItems: ParsedItem[] = [];
      const seenWords = new Set<string>();

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
            word = line.trim();
          }
        } else {
          word = line.trim();
        }

        word = word.replace(/^["']|["']$/g, '').trim();

        if (word) {
          const lower = word.toLowerCase();
          if (!seenWords.has(lower)) {
            seenWords.add(lower);
            parsedItems.push({
              originalLine: line,
              word,
              meaning
            });
          }
        }
      }

      if (parsedItems.length === 0) {
        return res.json({ 
          error: "Không tìm thấy từ vựng hợp lệ trong danh sách được cung cấp." 
        });
      }

      const batchSize = typeof req.body.batchSize === 'number' && req.body.batchSize > 0 ? req.body.batchSize : 3;

      // PROMPT CHUẨN XÁC, ĐẦY ĐỦ 7 GIAI ĐOẠN (1 FLASHCARD + 6 DẠNG QUIZ)
      const systemPrompt = `Bạn là một AI Backend Module chuyên dụng, có nhiệm vụ chuyển đổi danh sách từ vựng được người dùng cung cấp thành một cấu trúc dữ liệu bài tập (JSON) theo phong cách Memrise hoàn chỉnh.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
1. MỖI DÒNG trong danh sách tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
2. TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.
3. Nếu một dòng có dạng "friendly: thân thiện, cởi mở" hoặc "friendly, thân thiện, cởi mở", thì từ tiếng Anh là "friendly" và toàn bộ nghĩa tiếng Việt là "thân thiện, cởi mở".

CHỈ ĐỊNH NGHIÊM NGẶT VỀ DỮ LIỆU:
1. KHÔNG ĐƯỢC TỰ TẠO SAMPLE DATA. Nếu người dùng nhập danh sách trống hoặc không hợp lệ, hãy trả về JSON: {"error": "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý."}.
2. Chỉ xử lý CHÍNH XÁC những từ vựng có trong danh sách được người dùng cung cấp ở tin nhắn tiếp theo.

NHIỆM VỤ CỦA BẠN:
Với mỗi từ vựng trong danh sách, hãy tạo ra các bài tập theo trình tự logic sư phạm sau (1 Flashcard + 6 Quiz cho mỗi từ):
- Bước 0: "flashcard" (Thẻ học từ vựng trước khi vào quiz). Giúp người học nắm vững từ vựng, phiên âm chuẩn quốc tế IPA, giải nghĩa tiếng Việt rõ ràng, câu ví dụ tự nhiên kèm bản dịch tiếng Việt trước khi bắt đầu làm bài tập trắc nghiệm/luyện tập.
- Bước 1: "multiple_choice" (Trắc nghiệm xuôi: Từ tiếng Anh ➔ Chọn nghĩa tiếng Việt). Hỏi nghĩa của từ tiếng Anh. Tạo ra 3 đáp án nhiễu (distractors) hợp lý từ các từ vựng khác hoặc kho từ vựng cùng trình độ.
- Bước 2: "multiple_choice" đảo ngược (Trắc nghiệm đảo: Nghĩa tiếng Việt ➔ Chọn từ tiếng Anh đúng). Câu hỏi dạng: "Từ tiếng Anh nào sau đây có nghĩa là '[meaning]'?". 4 options là các từ tiếng Anh (gồm từ đúng và 3 từ tiếng Anh nhiễu hợp lý). Đánh dấu "is_reverse": true.
- Bước 3: "fill_in_blank" (Điền từ vào câu ví dụ ngữ cảnh). Tạo 1 câu ví dụ tiếng Anh có nghĩa rõ ràng, ẩn từ đó đi bằng ký tự "___". Cung cấp câu dịch nghĩa tiếng Việt làm gợi ý ("hint").
- Bước 4: "vocab_cloze" (Khuyết ký tự ngẫu nhiên trong từ). Câu hỏi: "Điền từ tiếng Anh có nghĩa: \\"[meaning]\\"". Chuỗi "clozeLetters" gồm các ký tự và dấu gạch dưới "_" cách nhau bởi khoảng trắng (ví dụ: "d _ l _ g _ n t"), ẩn ngẫu nhiên 35%-60% chữ cái ở các vị trí linh hoạt (đầu, giữa, cuối).
- Bước 5: "spelling" (Sắp xếp ký tự đảo). Câu hỏi: "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"[meaning]\\"". Mảng "shuffled_letters" chứa các chữ cái bị xáo trộn. TUYỆT ĐỐI KHÔNG để lộ từ gốc hay các chữ cái trong câu hỏi của bài tập spelling để tránh lộ đáp án.
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
      "question": "Học từ mới: [word]",
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

      // 3. TỰ ĐỘNG CHIA THEO TỪNG ĐỢT BẰNG CODE (Cứ 3 dòng = 1 đợt theo setting)
      const batches: ParsedItem[][] = [];
      for (let i = 0; i < parsedItems.length; i += batchSize) {
        batches.push(parsedItems.slice(i, i + batchSize));
      }

      // Khởi tạo Gemini client nếu có API key
      const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || '');

      let aiClient: GoogleGenAI | null = null;
      if (apiKey) {
        try {
          aiClient = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              }
            }
          });
        } catch (e) {
          console.warn("[Memrise AI Gen] Failed to initialize GoogleGenAI:", e);
        }
      }

      // Helper tạo mẫu khuyết ký tự clozeLetters
      const makeClozeLetters = (w: string) => {
        const clean = w.trim();
        const chars = clean.split('');
        const letterIdxs: number[] = [];
        chars.forEach((c, idx) => {
          if (/[a-zA-Z]/.test(c)) letterIdxs.push(idx);
        });
        if (letterIdxs.length <= 2) {
          const blankIdx = letterIdxs[Math.floor(Math.random() * letterIdxs.length)];
          return chars.map((c, i) => (i === blankIdx ? '_' : c)).join(' ');
        }
        const numBlanks = Math.max(1, Math.min(letterIdxs.length - 1, Math.round(letterIdxs.length * 0.45)));
        const shuffled = [...letterIdxs].sort(() => Math.random() - 0.5);
        const blanks = new Set(shuffled.slice(0, numBlanks));
        return chars.map((c, i) => (blanks.has(i) ? '_' : c)).join(' ');
      };

      // Hàm tạo bài tập cục bộ cho 1 đợt (fallback khi không có mạng hoặc lỗi API)
      const generateLocalBatch = (batchItems: ParsedItem[], batchNum: number) => {
        const bExs: any[] = [];
        const distractorPool = ['chăm chỉ, cần cù', 'khám phá, tìm hiểu', 'quyết định, lựa chọn', 'thành công, xuất sắc', 'phát triển bền vững', 'hòa bình, tĩnh lặng'];

        // 1. TẤT CẢ FLASHCARD CỦA ĐỢT NÀY LÊN ĐẦU
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          bExs.push({
            id: `${baseId}_fc`,
            word: cleanWord,
            type: 'flashcard',
            question: `Học từ mới: ${cleanWord}`,
            meaning,
            phonetic: `/${cleanWord.toLowerCase()}/`,
            example: `The word "${cleanWord}" is essential in everyday communication.`,
            example_translation: `Từ "${cleanWord}" rất quan trọng trong giao tiếp hàng ngày.`,
            correct_answer: cleanWord
          });
        });

        // 2. CÁC BÀI TẬP QUIZ XEN KẼ THEO DẠNG CHO TẤT CẢ CÁC TỪ TRONG ĐỢT
        // 2.1. Quiz 1 — Từ ➔ Nghĩa (Multiple Choice Standard)
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          const otherMeanings = batchItems.filter(it => it.word !== cleanWord).map(it => it.meaning).filter(Boolean);
          const mcOptions = [meaning, ...otherMeanings, ...distractorPool]
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 4)
            .sort(() => Math.random() - 0.5);

          bExs.push({
            id: `${baseId}_mc`,
            word: cleanWord,
            type: 'multiple_choice',
            question: `Nghĩa của từ '${cleanWord}' là gì?`,
            options: mcOptions,
            correct_answer: meaning
          });
        });

        // 2.2. Quiz 2 — Nghĩa ➔ Từ (Multiple Choice Reverse)
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          const otherWords = batchItems.filter(it => it.word.toLowerCase() !== cleanWord.toLowerCase()).map(it => it.word);
          const engPool = ['diligent', 'explore', 'decision', 'memory', 'persist', 'creative', 'knowledge', 'practice'];
          const reverseOptions = [cleanWord, ...otherWords, ...engPool.filter(w => w.toLowerCase() !== cleanWord.toLowerCase())]
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 4)
            .sort(() => Math.random() - 0.5);

          bExs.push({
            id: `${baseId}_mc_rev`,
            word: cleanWord,
            type: 'multiple_choice',
            is_reverse: true,
            question: `Từ tiếng Anh nào sau đây có nghĩa là: "${meaning}"?`,
            options: reverseOptions,
            correct_answer: cleanWord
          });
        });

        // 2.3. Quiz 3 — Fill in Blank
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          bExs.push({
            id: `${baseId}_fib`,
            word: cleanWord,
            type: 'fill_in_blank',
            question: `Điền từ thích hợp vào chỗ trống: The word "___" is very important here.`,
            hint: `Từ cần điền mang ý nghĩa: ${meaning}`,
            correct_answer: cleanWord
          });
        });

        // 2.4. Quiz 4 — Vocab Cloze (Khuyết ký tự)
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;
          const clozeLetters = makeClozeLetters(cleanWord);

          bExs.push({
            id: `${baseId}_clz`,
            word: cleanWord,
            type: 'vocab_cloze',
            question: `Điền từ tiếng Anh có nghĩa: "${meaning}"`,
            hint: meaning,
            phonetic: `/${cleanWord.toLowerCase()}/`,
            clozeLetters,
            clozeTemplate: clozeLetters,
            correct_answer: cleanWord
          });
        });

        // 2.5. Quiz 5 — Spelling
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          const letters = cleanWord.toLowerCase().split('').filter(c => c !== ' ');
          let shuffled = [...letters].sort(() => Math.random() - 0.5);
          if (shuffled.join('') === cleanWord.toLowerCase().replace(/ /g, '') && letters.length > 1) {
            shuffled = [...letters].reverse();
          }

          bExs.push({
            id: `${baseId}_spel`,
            word: cleanWord,
            type: 'spelling',
            question: `Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: "${meaning}"`,
            shuffled_letters: shuffled,
            correct_answer: cleanWord
          });
        });

        // 2.6. Quiz 6 — Typing
        batchItems.forEach((item, idx) => {
          const cleanWord = item.word;
          const meaning = item.meaning || `Nghĩa của từ '${cleanWord}'`;
          const baseId = `batch${batchNum}_${idx}_${cleanWord.replace(/[^a-zA-Z0-9]/g, '')}`;

          bExs.push({
            id: `${baseId}_typ`,
            word: cleanWord,
            type: 'typing',
            question: `Gõ từ tiếng Anh có nghĩa: "${meaning}"`,
            hint: meaning,
            correct_answer: cleanWord
          });
        });

        return bExs;
      };

      // Hàm gọi AI cho đúng 1 đợt từ vựng (chỉ gửi danh sách các dòng của riêng đợt đó)
      const generateSingleBatchWithGemini = async (ai: GoogleGenAI, batchItems: ParsedItem[], batchNum: number): Promise<any[] | null> => {
        const batchPrompt = batchItems.map(item => item.originalLine).join('\n');
        const userPrompt = `Danh sách từ vựng cần xử lý:\n${batchPrompt}`;
        const requestedModel = model?.trim() || "gemini-3.1-flash-lite";
        const clientFallbacks = Array.isArray(req.body.fallbackModels) ? req.body.fallbackModels.filter(Boolean) : [];
        const fallbackModels = [
          requestedModel,
          ...clientFallbacks,
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        for (const candModel of fallbackModels) {
          try {
            const resGen = await ai.models.generateContent({
              model: candModel,
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.2,
                maxOutputTokens: 4000,
                responseMimeType: "application/json",
              }
            });

            let rawText = resGen?.text || '';
            rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
            if (rawText) {
              const parsed = JSON.parse(rawText);
              if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
                // TỰ ĐỘNG BẰNG CODE: Sắp xếp theo thứ tự Flashcards -> 6 Quiz xen kẽ
                const rawExs = parsed.exercises;
                const batchWords = batchItems.map(it => it.word.trim().toLowerCase());
                const orderedBatch: any[] = [];

                // 1. Flashcards của cả đợt lên đầu
                batchWords.forEach(w => {
                  const fcs = rawExs.filter((ex: any) => ex.type === 'flashcard' && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...fcs);
                });

                // 2. Quiz 1: Từ -> Nghĩa (MC standard)
                batchWords.forEach(w => {
                  const mcs = rawExs.filter((ex: any) => ex.type === 'multiple_choice' && !ex.is_reverse && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...mcs);
                });

                // 3. Quiz 2: Nghĩa -> Từ (MC reverse)
                batchWords.forEach(w => {
                  const mcRevs = rawExs.filter((ex: any) => ex.type === 'multiple_choice' && !!ex.is_reverse && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...mcRevs);
                });

                // 4. Quiz 3: Fill in blank
                batchWords.forEach(w => {
                  const fibs = rawExs.filter((ex: any) => ex.type === 'fill_in_blank' && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...fibs);
                });

                // 5. Quiz 4: Vocab Cloze
                batchWords.forEach(w => {
                  const clozes = rawExs.filter((ex: any) => ex.type === 'vocab_cloze' && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...clozes);
                });

                // 6. Quiz 5: Spelling
                batchWords.forEach(w => {
                  const sps = rawExs.filter((ex: any) => ex.type === 'spelling' && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...sps);
                });

                // 7. Quiz 6: Typing
                batchWords.forEach(w => {
                  const typs = rawExs.filter((ex: any) => ex.type === 'typing' && (ex.word || '').trim().toLowerCase() === w);
                  orderedBatch.push(...typs);
                });

                // Bài tập sót lại nếu có
                const orderedIds = new Set(orderedBatch.map(ex => ex.id));
                rawExs.forEach((ex: any) => {
                  if (!orderedIds.has(ex.id)) {
                    orderedBatch.push(ex);
                  }
                });

                return orderedBatch;
              }
            }
          } catch (err) {
            console.warn(`[Memrise Batch ${batchNum}] Model ${candModel} error:`, err);
          }
        }
        return null;
      };

      // XỬ LÝ TỪNG ĐỢT VÀ GHÉP KẾT QUẢ THEO THỨ TỰ
      const allExercises: any[] = [];

      for (let b = 0; b < batches.length; b++) {
        const batchItems = batches[b];
        const batchNum = b + 1;
        let batchExercises: any[] | null = null;

        if (aiClient) {
          try {
            batchExercises = await generateSingleBatchWithGemini(aiClient, batchItems, batchNum);
          } catch (apiErr) {
            console.warn(`[Memrise AI Gen] Error calling Gemini for batch ${batchNum}:`, apiErr);
          }
        }

        // Nếu AI không khả dụng hoặc lỗi, fallback tạo cục bộ cho đợt này
        if (!batchExercises || batchExercises.length === 0) {
          batchExercises = generateLocalBatch(batchItems, batchNum);
        }

        allExercises.push(...batchExercises);
      }

      return res.json({
        status: "success",
        total_words_processed: parsedItems.length,
        exercises: allExercises
      });
    } catch (err: any) {
      console.error("[Memrise AI Gen] Server error:", err);
      return res.status(500).json({ 
        error: "Đã xảy ra lỗi khi xử lý danh sách từ vựng. Vui lòng thử lại." 
      });
    }
  };

  app.post("/api/generate-memrise-exercises", handleMemriseGenerate);
  app.post("/api/memrise-generate", handleMemriseGenerate);

  // ==========================================
  // AI READING EXERCISE GENERATOR ENDPOINTS
  // ==========================================
  const READING_SYSTEM_PROMPT = `Bạn là chuyên gia khảo thí ngôn ngữ học và sư phạm tiếng Anh hàng đầu (IELTS / TOEFL / Cambridge Assessment expert).
Nhiệm vụ của bạn là nhận một đoạn Reading Passage, phân tích sâu và sinh một bộ câu hỏi Đọc hiểu (Reading Comprehension Exercises) chuẩn mực, có cấu trúc và có giá trị luyện đọc cao.

QUY TRÌNH BẮT BUỘC:
1. PHÂN TÍCH PASSAGE TRƯỚC:
- Xác định Main Idea (ý chính toàn bài).
- Xác định các Key Details, Important Facts.
- Phân tích Quan hệ Nguyên nhân - Kết quả (Cause/Effect) & So sánh - Tương phản (Comparison/Contrast) nếu có.
- Trích xuất Từ vựng quan trọng theo ngữ cảnh (Contextual Vocabulary).
- Xác định Pronouns & References (từ quy chiếu: they, it, this, these... trong các đoạn).
- Phân tích thông tin theo từng đoạn (Paragraph breakdown) và các thông tin có thể suy luận (Inference evidence).
- Xác định Author's Purpose / Tone nếu văn bản phù hợp.

2. CÁC DẠNG CÂU HỎI (QUESTION TYPES):
- "main_idea": Ý chính toàn bài hoặc chủ đề chính. (VD: "What is the main idea of the passage?")
- "detail": Chi tiết cụ thể trong bài. (VD: "According to paragraph 2, why...?")
- "vocabulary": Từ vựng trong ngữ cảnh. (VD: "The word 'X' in paragraph 2 is closest in meaning to...?")
- "reference": Từ quy chiếu. (VD: "What does 'they' in paragraph 2 refer to?")
- "inference": Suy luận logic có bằng chứng gián tiếp. (VD: "What can be inferred from paragraph 3?")
- "paragraph_location": Đoạn văn đề cập thông tin. (VD: "Which paragraph mentions...?")
- "true_false": Đúng / Sai / Không đúng. (VD: "According to the passage, which of the following is NOT TRUE?")
- "authors_purpose": Mục đích tác giả nếu phù hợp. (VD: "What is the author's primary purpose in writing this passage?")
* LƯU Ý: Không ép passage phải có tất cả các dạng nếu bài không có evidence tương ứng!

3. TIẾN TRÌNH SƯ PHẠM (PROGRESSION):
Sắp xếp thứ tự câu hỏi theo trình tự nhận thức sư phạm:
READ -> Recognize -> Understand -> Recall -> Connect -> Infer.
(Ví dụ: Main Idea -> Direct Detail -> Vocabulary -> Reference -> Detail/Relationship -> Inference -> Paragraph Location/True-False).

4. QUY TẮC CÂU HỎI & ĐÁP ÁN:
- Mỗi câu gồm đúng 4 lựa chọn (A, B, C, D).
- CHỈ CÓ ĐÚNG MỘT ĐÁP ÁN ĐÚNG.
- Distractors (đáp án nhiễu) phải liên quan đến passage, có vẻ hợp lý nhưng sai lệch chính xác về sự kiện/quan hệ so với bài đọc.
- TUYỆT ĐỐI KHÔNG dùng "All of the above", "None of the above", "I don't know".
- TUYỆT ĐỐI KHÔNG hỏi dựa trên kiến thức ngoài bài đọc.

5. ĐỘ KHÓ (DIFFICULTY):
- "easy": Thông tin xuất hiện trực tiếp trong bài.
- "medium": Cần tìm và kết nối thông tin giữa các câu.
- "hard": Cần suy luận logic hoặc phân tích quan hệ giữa các ý.

6. BẰNG CHỨNG (EVIDENCE) & TỰ KIỂM ĐỊNH (ANSWER VALIDATION):
- Mỗi câu hỏi BẮT BUỘC trích dẫn nguyên văn câu bằng chứng trong bài đọc vào trường "evidence".
- Tự kiểm tra xem câu hỏi có đúng 1 đáp án duy nhất, distractors hợp lý, ngữ pháp chuẩn xác và không gây hiểu lầm. Đánh dấu "isValidated": true.

7. NGÔN NGỮ GIẢI THÍCH (BẮT BUỘC BẰNG TIẾNG VIỆT):
- BẮT BUỘC: Tất cả các trường "explanation" (giải thích tại sao chọn đáp án đó và tại sao các phương án khác sai) PHẢI VIẾT HOÀN TOÀN BẰNG TIẾNG VIỆT tự nhiên, mạch lạc, chuẩn văn phong sư phạm cho học sinh Việt Nam.
- Các trường phân tích bài đọc (mainIdea, keyPoints, importantVocabulary contextualMeaning, authorsToneOrPurpose) cũng diễn đạt bằng TIẾNG VIỆT.

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "status": "success",
  "passageAnalysis": {
    "mainIdea": "Ý chính của bài đọc bằng tiếng Việt",
    "keyPoints": ["Ý 1 bằng tiếng Việt", "Ý 2 bằng tiếng Việt", "Ý 3 bằng tiếng Việt"],
    "paragraphCount": 3,
    "wordCount": 250,
    "readingLevel": "B1 / Intermediate",
    "importantVocabulary": [
      { "word": "sustainable", "contextualMeaning": "có thể duy trì lâu dài, bền vững", "paragraph": 2 }
    ],
    "pronounReferences": [
      { "pronoun": "they", "refersTo": "học sinh đi xe đạp", "paragraph": 1 }
    ],
    "authorsToneOrPurpose": "Cung cấp thông tin khách quan cho người đọc về..."
  },
  "questions": [
    {
      "id": "q1",
      "type": "main_idea",
      "difficulty": "medium",
      "question": "What is the primary topic of the passage?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Đoạn 1 nêu rõ chủ đề chính của bài đọc vì câu mở đầu trực tiếp nhấn mạnh...",
      "evidence": "Câu văn trích dẫn nguyên văn từ bài đọc",
      "paragraph": 1,
      "isValidated": true
    }
  ]
}`;

  // Helper sinh câu hỏi Reading cục bộ (Offline Fallback Engine)
  const generateLocalReadingExercises = (passage: string, requestedCount?: number) => {
    const rawParagraphs = passage.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [passage.trim()];
    const words = passage.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    let targetCount = requestedCount;
    if (!targetCount) {
      if (wordCount < 150) targetCount = 5;
      else if (wordCount <= 350) targetCount = 7;
      else targetCount = 9;
    }

    const firstPara = paragraphs[0] || '';
    const firstSentence = firstPara.split(/[.!?]/).filter(s => s.trim().length > 0)[0]?.trim() || firstPara.slice(0, 80);

    const questions: any[] = [];

    // 1. Main Idea Question
    questions.push({
      id: `rq_${Date.now()}_1`,
      type: 'main_idea',
      difficulty: 'medium',
      question: 'What is the main topic of the passage?',
      options: [
        firstSentence.length > 60 ? firstSentence.slice(0, 60) + '...' : firstSentence,
        'The historical background of modern developments',
        'A comprehensive comparison between two contrasting opinions',
        'Future predictions that have not yet occurred'
      ],
      correctAnswer: 0,
      explanation: 'Đoạn mở đầu giới thiệu trực tiếp và bao quát chủ đề cốt lõi của toàn bộ bài đọc.',
      evidence: firstSentence,
      paragraph: 1,
      isValidated: true
    });

    // 2. Direct Detail Question
    if (paragraphs.length >= 1) {
      const p1Sentences = paragraphs[0].split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 15);
      const targetSent = p1Sentences[1] || p1Sentences[0] || firstSentence;
      questions.push({
        id: `rq_${Date.now()}_2`,
        type: 'detail',
        difficulty: 'easy',
        question: `According to paragraph 1, which of the following is true?`,
        options: [
          targetSent,
          'The exact opposite of what the author stated in the introduction',
          'A situation that applies only to secondary subjects',
          'An event that occurred prior to the recorded timeline'
        ],
        correctAnswer: 0,
        explanation: 'Chi tiết này được tác giả khẳng định và trình bày trực tiếp ngay trong đoạn 1.',
        evidence: targetSent,
        paragraph: 1,
        isValidated: true
      });
    }

    // 3. Vocabulary in context
    const candidates = words.filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 6);
    const targetWord = (candidates[2] || candidates[0] || 'significant').replace(/[^a-zA-Z]/g, '');
    questions.push({
      id: `rq_${Date.now()}_3`,
      type: 'vocabulary',
      difficulty: 'medium',
      question: `The word "${targetWord}" in the passage is closest in meaning to:`,
      options: [
        'important and noteworthy',
        'extremely minor or negligible',
        'completely unpredictable',
        'harmful to progress'
      ],
      correctAnswer: 0,
      explanation: `Trong ngữ cảnh bài đọc này, từ "${targetWord}" mang ý nghĩa là quan trọng, có giá trị và đáng chú ý.`,
      evidence: `Contains the word "${targetWord}" in the passage.`,
      paragraph: 1,
      isValidated: true
    });

    // 4. Reference or Second Detail
    if (paragraphs.length >= 2) {
      const p2Sentences = paragraphs[1].split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 15);
      const targetSent2 = p2Sentences[0] || paragraphs[1].slice(0, 80);
      questions.push({
        id: `rq_${Date.now()}_4`,
        type: 'reference',
        difficulty: 'medium',
        question: 'According to paragraph 2, what does the discussion primarily emphasize?',
        options: [
          targetSent2,
          'A minor exception that rarely takes place in reality',
          'A theoretical idea that lacks supportive facts',
          'An outdated perspective no longer accepted by researchers'
        ],
        correctAnswer: 0,
        explanation: 'Đoạn 2 tập trung nhấn mạnh và phát triển cụ thể khía cạnh quan trọng này.',
        evidence: targetSent2,
        paragraph: 2,
        isValidated: true
      });
    }

    // 5. Paragraph Location
    const targetPNum = Math.min(paragraphs.length, 2);
    questions.push({
      id: `rq_${Date.now()}_5`,
      type: 'paragraph_location',
      difficulty: 'easy',
      question: `In which paragraph does the author discuss the primary explanation or core details?`,
      options: [
        `Paragraph ${targetPNum}`,
        paragraphs.length > 2 ? `Paragraph 3` : `Paragraph 4`,
        `The concluding remarks only`,
        `None of the paragraphs`
      ],
      correctAnswer: 0,
      explanation: `Đoạn ${targetPNum} là nơi tác giả đưa ra thông tin nền tảng và diễn giải chi tiết nhất.`,
      evidence: paragraphs[targetPNum - 1]?.slice(0, 100) || '',
      paragraph: targetPNum,
      isValidated: true
    });

    // 6. Inference Question
    questions.push({
      id: `rq_${Date.now()}_6`,
      type: 'inference',
      difficulty: 'hard',
      question: 'What can be reasonably inferred from the overall passage?',
      options: [
        'The subject matter plays an influential role in its domain',
        'All relevant questions regarding this issue have been permanently resolved',
        'The author expresses strong disapproval of modern practices',
        'The findings are entirely irrelevant to contemporary society'
      ],
      correctAnswer: 0,
      explanation: 'Dựa trên toàn bộ các dữ kiện và luận điểm trong bài đọc, đây là kết luận suy luận logic và hợp lý nhất.',
      evidence: passage.slice(0, 120),
      paragraph: 1,
      isValidated: true
    });

    // 7. True / False / NOT TRUE Question
    if (targetCount >= 7) {
      questions.push({
        id: `rq_${Date.now()}_7`,
        type: 'true_false',
        difficulty: 'medium',
        question: 'According to the passage, which of the following is NOT TRUE?',
        options: [
          'The topic is entirely disregarded and considered obsolete',
          firstSentence.length > 50 ? firstSentence.slice(0, 50) + '...' : firstSentence,
          'Information was systematically documented by the author',
          'Several related aspects are addressed in the text'
        ],
        correctAnswer: 0,
        explanation: 'Phương án này mâu thuẫn trực tiếp với thông tin được tác giả trình bày trong bài, vì vậy đây là nhận định KHÔNG ĐÚNG (NOT TRUE).',
        evidence: firstSentence,
        paragraph: 1,
        isValidated: true
      });
    }

    // 8. Author's Purpose
    if (targetCount >= 8) {
      questions.push({
        id: `rq_${Date.now()}_8`,
        type: 'authors_purpose',
        difficulty: 'medium',
        question: "What is the author's primary purpose in this passage?",
        options: [
          'To inform and explain the key characteristics of the topic',
          'To persuade readers to buy a specific commercial product',
          'To severely criticize opposing research viewpoints',
          'To narrate an imaginary fictional story'
        ],
        correctAnswer: 0,
        explanation: 'Tác giả dùng văn phong nghị luận thuyết minh khách quan nhằm cung cấp thông tin và giải thích bản chất của chủ đề cho người đọc.',
        evidence: passage.slice(0, 100),
        paragraph: 1,
        isValidated: true
      });
    }

    return {
      status: 'success',
      passage,
      passageAnalysis: {
        mainIdea: firstSentence,
        keyPoints: [
          'Giới thiệu bối cảnh & chủ đề cốt lõi trong đoạn mở đầu',
          'Phân tích chi tiết và dẫn chứng cụ thể trong thân bài',
          'Tổng kết ý nghĩa và các khía cạnh liên quan'
        ],
        paragraphCount: paragraphs.length,
        wordCount,
        readingLevel: wordCount > 300 ? 'B2 / Upper-Intermediate' : 'B1 / Intermediate',
        importantVocabulary: [
          { word: targetWord, contextualMeaning: 'quan trọng, đáng chú ý', paragraph: 1 }
        ],
        authorsToneOrPurpose: 'To provide informative, factual context to the reader.'
      },
      questions: questions.slice(0, targetCount)
    };
  };

  // Endpoint: Generate Full Reading Exercise Set
  app.post("/api/generate-reading-exercises", async (req, res) => {
    try {
      const { passage, targetQuestionCount, customApiKey, model, targetDifficulty } = req.body;

      if (!passage || typeof passage !== 'string' || !passage.trim()) {
        return res.status(400).json({
          status: 'error',
          error: 'Vui lòng cung cấp đoạn văn đọc hiểu (Reading Passage) hợp lệ.'
        });
      }

      const trimmedPassage = passage.trim();
      const words = trimmedPassage.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;

      let qCount = targetQuestionCount;
      if (!qCount || typeof qCount !== 'number' || qCount < 3 || qCount > 15) {
        if (wordCount < 150) qCount = 5;
        else if (wordCount <= 350) qCount = 7;
        else qCount = 9;
      }

      const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || '');

      let aiClient: GoogleGenAI | null = null;
      if (apiKey) {
        try {
          aiClient = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: { "User-Agent": "aistudio-build" }
            }
          });
        } catch (e) {
          console.warn("[Reading AI Gen] Failed to initialize GoogleGenAI:", e);
        }
      }

      if (aiClient) {
        const userPrompt = `Đoạn văn bài đọc (Reading Passage):\n"""\n${trimmedPassage}\n"""\n\nYÊU CẦU CỤ THỂ:
- Hãy phân tích kỹ passage (Main idea, key details, vocabulary in context, pronoun references, paragraph breakdown).
- Tự động sinh chính xác ${qCount} câu hỏi Đọc hiểu chất lượng cao.
${targetDifficulty && targetDifficulty !== 'auto' ? `- Mức độ ưu tiên độ khó: ${targetDifficulty}.` : '- Độ khó phân bổ hợp lý (Easy, Medium, Hard).'}
- Sắp xếp câu hỏi theo tiến trình sư phạm (READ -> Recognize -> Understand -> Recall -> Connect -> Infer).
- Mỗi câu gồm 4 options (A, B, C, D) với ĐÚNG 1 đáp án đúng.
- Trích dẫn câu bằng chứng trong bài đọc vào trường "evidence".
- Tự kiểm tra tính chuẩn xác (validation) và trả về JSON thuần túy theo đúng cấu trúc yêu cầu.`;

        const requestedModel = model?.trim() || "gemini-3.1-flash-lite";
        const clientFallbacks = Array.isArray(req.body.fallbackModels) ? req.body.fallbackModels.filter(Boolean) : [];
        const fallbackModels = [
          requestedModel,
          ...clientFallbacks,
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        for (const candModel of fallbackModels) {
          try {
            const resGen = await aiClient.models.generateContent({
              model: candModel,
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              config: {
                systemInstruction: READING_SYSTEM_PROMPT,
                temperature: 0.25,
                maxOutputTokens: 6000,
                responseMimeType: "application/json",
              }
            });

            let rawText = resGen?.text || '';
            rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
            if (rawText) {
              const parsed = JSON.parse(rawText);
              if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                // Ensure IDs and format
                parsed.questions = parsed.questions.map((q: any, i: number) => ({
                  ...q,
                  id: q.id || `rq_${Date.now()}_${i + 1}`,
                  options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : (q.options || ['A', 'B', 'C', 'D']),
                  correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                  evidence: q.evidence || '',
                  isValidated: true
                }));
                return res.json({
                  status: 'success',
                  passage: trimmedPassage,
                  passageAnalysis: parsed.passageAnalysis || {},
                  questions: parsed.questions
                });
              }
            }
          } catch (modelErr) {
            console.warn(`[Reading AI Gen] Model ${candModel} error:`, modelErr);
          }
        }
      }

      // Offline Fallback
      const fallbackResult = generateLocalReadingExercises(trimmedPassage, qCount);
      return res.json(fallbackResult);
    } catch (err: any) {
      console.error("[Reading AI Gen] Internal error:", err);
      return res.status(500).json({
        status: 'error',
        error: 'Đã xảy ra lỗi khi phân tích đoạn văn đọc hiểu. Vui lòng thử lại.'
      });
    }
  });

  // Endpoint: Regenerate Single Reading Question
  app.post("/api/regenerate-reading-question", async (req, res) => {
    try {
      const { passage, targetType, targetDifficulty, existingQuestions = [], customApiKey, model } = req.body;

      if (!passage || typeof passage !== 'string' || !passage.trim()) {
        return res.status(400).json({ status: 'error', error: 'Thiếu nội dung passage.' });
      }

      const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || '');

      let aiClient: GoogleGenAI | null = null;
      if (apiKey) {
        try {
          aiClient = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } }
          });
        } catch (e) {}
      }

      if (aiClient) {
        const existingPrompts = existingQuestions.map((q: any) => `- ${q.question}`).join('\n');
        const userPrompt = `Đoạn văn bài đọc:\n"""\n${passage}\n"""\n\nYÊU CẦU: Hãy tạo DUY NHẤT 1 câu hỏi đọc hiểu mới.
${targetType ? `- Dạng câu hỏi mong muốn: "${targetType}"` : '- Tự chọn dạng câu hỏi phù hợp nhất.'}
${targetDifficulty ? `- Độ khó: "${targetDifficulty}"` : ''}
- KHÔNG TRÙNG với các câu hỏi đã có sau đây:\n${existingPrompts || '(Chưa có câu hỏi nào)'}
- Có đúng 4 lựa chọn (A, B, C, D) với 1 đáp án đúng duy nhất.
- Bắt buộc trích dẫn bằng chứng từ bài đọc vào "evidence".
- Trả về JSON:
{
  "question": {
    "type": "detail",
    "difficulty": "medium",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "...",
    "evidence": "...",
    "paragraph": 1,
    "isValidated": true
  }
}`;

        try {
          const resGen = await aiClient.models.generateContent({
            model: model || "gemini-3.1-flash-lite",
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: READING_SYSTEM_PROMPT,
              temperature: 0.35,
              responseMimeType: "application/json",
            }
          });

          let rawText = resGen?.text || '';
          rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const q = parsed.question || parsed;
            if (q && q.question && Array.isArray(q.options)) {
              return res.json({
                status: 'success',
                question: {
                  ...q,
                  id: `rq_${Date.now()}_single`,
                  isValidated: true
                }
              });
            }
          }
        } catch (e) {
          console.warn("[Regenerate Question] AI error:", e);
        }
      }

      // Offline single question fallback
      const local = generateLocalReadingExercises(passage, 5);
      const pick = local.questions[Math.floor(Math.random() * local.questions.length)];
      return res.json({
        status: 'success',
        question: {
          ...pick,
          id: `rq_${Date.now()}_single`
        }
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Mascot Chat API Endpoint (Multi-Provider: Gemini, OpenAI, Claude, DeepSeek, OpenRouter)
  app.post("/api/mascot-chat", async (req, res) => {
    try {
      const { 
        message, 
        history = [], 
        systemInstruction, 
        customApiKey, 
        quotedMessage,
        mascotId,
        provider = "gemini",
        model,
        baseUrl,
        attachment
      } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Nội dung tin nhắn không được để trống." });
      }

      // Build current user message with quoted message context if present
      let currentPrompt = message.trim();
      if (quotedMessage && quotedMessage.text) {
        const quotedAuthor = quotedMessage.sender === "user" ? "Người dùng" : "Bạn (Linh vật)";
        currentPrompt = `[TRÍCH DẪN ĐANG ĐƯỢC TRẢ LỜI TỪ (${quotedAuthor}): "${quotedMessage.text}"]\n\nPhản hồi / câu hỏi trực tiếp của người dùng:\n${currentPrompt}`;
      }

      let resolvedSystemPrompt = systemInstruction || "Bạn là một trợ lý học tập thông minh, sắc sảo, tự nhiên và thân thiện.";
      if (!resolvedSystemPrompt.includes("HƯỚNG DẪN TRÌNH BÀY")) {
        resolvedSystemPrompt += `\n\n[HƯỚNG DẪN TRÌNH BÀY TRẢ LỜI ĐẸP & DỄ NHÌN]:
- Trò chuyện tự nhiên, linh hoạt và thân thiện theo phong cách của bạn. Trả lời đúng trọng tâm câu hỏi, KHÔNG ép buộc mọi câu trả lời phải chia 1-2-3 hay bắt buộc tạo bài tập.
- Khi cần liệt kê, so sánh hoặc giải thích từ vựng/ngữ pháp:
  + Dùng danh sách gạch đầu dòng (bullet points) hoặc số thứ tự rõ ràng, thoáng mắt.
  + Dùng bảng Markdown GFM (| Cột 1 | Cột 2 |) khi cần so sánh, đối chiếu hoặc lập bảng phân loại để người dùng dễ nhìn nhất.
  + Đặt công thức, cú pháp hoặc code vào khối mã (\`\`\`...\`\`\`) để hiển thị đẹp mắt và dễ sao chép.
- Giữ câu trả lời thoáng đãng, dễ đọc.`;
      }

      // 1. Xử lý Google Gemini Provider
      if (provider === "gemini") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : (process.env.GEMINI_API_KEY || "");

        if (!apiKey) {
          return res.status(400).json({ 
            error: "Vui lòng bấm 'Mô hình' (hoặc 'Thiết lập API & Mô hình') và nhập API Key Google Gemini của bạn để trò chuyện." 
          });
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        const contents: Array<{ role: "user" | "model"; parts: any[] }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-8);
          for (const item of recentHistory) {
            if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
              contents.push({
                role: item.sender === "user" ? "user" : "model",
                parts: [{ text: String(item.text) }],
              });
            }
          }
        }

        const userParts: any[] = [{ text: currentPrompt }];
        if (attachment && attachment.dataUrl) {
          if (attachment.type === "image") {
            const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              userParts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          } else if (attachment.textContent) {
            userParts.push({
              text: `\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`,
            });
          }
        }

        contents.push({
          role: "user",
          parts: userParts,
        });

        let replyText = "";
        let successfulModel = "";
        const requestedModel = model?.trim() || "gemini-3.1-flash-lite";
        const clientFallbacks = Array.isArray(req.body.fallbackModels) ? req.body.fallbackModels.filter(Boolean) : [];

        // Chỉ duyệt đúng model người dùng đã chọn và các model dự phòng do người dùng cấu hình/tạo ra trong danh sách
        const fallbackCandidates = [
          requestedModel,
          ...clientFallbacks,
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        let lastErrorMsg = "";

        for (const candidateModel of fallbackCandidates) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Timeout on ${candidateModel}`)), 12000);
            });

            const callPromise = ai.models.generateContent({
              model: candidateModel,
              contents,
              config: {
                systemInstruction: resolvedSystemPrompt,
                temperature: 0.7,
                maxOutputTokens: 1500,
              },
            });

            const response = await Promise.race([callPromise, timeoutPromise]);
            const text = response?.text || "";
            if (text.trim()) {
              replyText = text.trim();
              successfulModel = candidateModel;
              console.log(`[AI Thành Công] Đã trả lời bằng model: ${candidateModel}`);
              break;
            }
          } catch (err: any) {
            lastErrorMsg = String(err?.message || "");
            console.warn(`[Auto-Fallback] Model ${candidateModel} gặp sự cố, tự động chuyển sang model tiếp theo:`, lastErrorMsg);
            // Nếu lỗi là API KEY không hợp lệ, không cần thử tiếp các model khác vì key đã sai
            if (lastErrorMsg.includes("API_KEY_INVALID") || lastErrorMsg.includes("API key not valid")) {
              return res.status(400).json({
                error: "API Key Gemini không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần Thiết lập API & Mô hình.",
              });
            }
            // Ngược lại (503 UNAVAILABLE, 404, Timeout...) tự động chuyển ngay sang candidate tiếp theo
          }
        }

        if (!replyText.trim()) {
          let errorMsg = lastErrorMsg;
          if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("Timeout")) {
            errorMsg = "Máy chủ AI hiện đang chịu tải cao tạm thời. Bạn vui lòng thử lại sau vài giây hoặc đổi sang mô hình khác nhé.";
          }
          return res.status(500).json({ error: errorMsg || "Không nhận được phản hồi từ AI." });
        }

        return res.json({ reply: replyText, actualModel: successfulModel });
      }

      // 2. Xử lý Anthropic Claude Provider
      if (provider === "anthropic") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
          return res.status(400).json({ 
            error: "Chưa có Anthropic Claude API Key. Vui lòng bấm vào nút chọn mô hình và nhập khóa API của bạn (bắt đầu bằng sk-ant-...)." 
          });
        }

        const claudeMessages: Array<{ role: "user" | "assistant"; content: any }> = [];
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-10);
          for (const item of recentHistory) {
            if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
              claudeMessages.push({
                role: item.sender === "user" ? "user" : "assistant",
                content: String(item.text),
              });
            }
          }
        }

        let claudeUserContent: any = currentPrompt;
        if (attachment && attachment.dataUrl) {
          if (attachment.type === "image") {
            const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              claudeUserContent = [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: match[1],
                    data: match[2],
                  },
                },
                {
                  type: "text",
                  text: currentPrompt,
                },
              ];
            }
          } else if (attachment.textContent) {
            claudeUserContent = `${currentPrompt}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
          }
        }
        claudeMessages.push({ role: "user", content: claudeUserContent });

        const claudeModel = model?.trim() || "claude-opus-4-8";

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: claudeModel,
            system: resolvedSystemPrompt,
            messages: claudeMessages,
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        const rawRespText = await resp.text();
        let data: any = {};
        try {
          data = JSON.parse(rawRespText);
        } catch (parseErr) {
          console.error("Anthropic response is not JSON:", rawRespText.slice(0, 300));
          return res.status(resp.status || 502).json({
            error: `Máy chủ Anthropic trả về lỗi (${resp.status} ${resp.statusText || 'Không hợp lệ'}). Vui lòng kiểm tra lại API Key hoặc đổi sang mô hình khác.`
          });
        }

        if (!resp.ok || data.error) {
          const errText = data.error?.message || "Lỗi kết nối máy chủ Claude";
          return res.status(resp.status || 500).json({ error: `Anthropic Claude: ${errText}` });
        }

        const replyText = data?.content?.[0]?.text || "Không nhận được phản hồi từ Claude";
        return res.json({ reply: replyText });
      }

      // 3. Xử lý OpenAI / DeepSeek / OpenRouter / Custom (Chuẩn OpenAI Chat Completions)
      const isDeepSeek = provider === "deepseek";
      const isOpenRouter = provider === "openrouter";
      
      let defaultUrl = "https://api.openai.com/v1";
      let envKey = process.env.OPENAI_API_KEY;

      if (isDeepSeek) {
        defaultUrl = "https://api.deepseek.com/v1";
        envKey = process.env.DEEPSEEK_API_KEY;
      } else if (isOpenRouter) {
        defaultUrl = "https://openrouter.ai/api/v1";
        envKey = process.env.OPENROUTER_API_KEY;
      }

      const resolvedBaseUrl = (baseUrl && typeof baseUrl === "string" && baseUrl.trim().length > 0)
        ? baseUrl.trim().replace(/\/+$/, "")
        : defaultUrl;

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : envKey;

      if (!apiKey) {
        const providerName = isDeepSeek ? "DeepSeek" : isOpenRouter ? "OpenRouter" : "OpenAI";
        return res.status(400).json({ 
          error: `Chưa có API Key cho ${providerName}. Vui lòng bấm vào nút chọn mô hình và nhập API Key cá nhân của bạn.` 
        });
      }

      const openAiMessages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [
        { role: "system", content: resolvedSystemPrompt }
      ];

      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-10);
        for (const item of recentHistory) {
          if (item && (item.sender === "user" || item.sender === "mascot") && item.text) {
            openAiMessages.push({
              role: item.sender === "user" ? "user" : "assistant",
              content: String(item.text),
            });
          }
        }
      }

      let openAiUserContent: any = currentPrompt;
      if (attachment && attachment.dataUrl) {
        if (attachment.type === "image") {
          openAiUserContent = [
            { type: "text", text: currentPrompt },
            { type: "image_url", image_url: { url: attachment.dataUrl } },
          ];
        } else if (attachment.textContent) {
          openAiUserContent = `${currentPrompt}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
        }
      }
      openAiMessages.push({ role: "user", content: openAiUserContent });

      let defaultTargetModel = "gpt-5.6-sol";
      if (isDeepSeek) defaultTargetModel = "deepseek-flash";
      else if (isOpenRouter) defaultTargetModel = "openai/gpt-5.6-sol";

      const targetModel = model?.trim() || defaultTargetModel;

      const resp = await fetch(`${resolvedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: openAiMessages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const rawRespText = await resp.text();
      let data: any = {};
      try {
        data = JSON.parse(rawRespText);
      } catch (parseErr) {
        console.error("Upstream AI response is not JSON:", rawRespText.slice(0, 300));
        return res.status(resp.status || 502).json({
          error: `Đường dẫn API hoặc máy chủ (${targetModel}) phản hồi không đúng chuẩn JSON (${resp.status} ${resp.statusText || ''}). Vui lòng kiểm tra lại Đường dẫn Base URL và API Key của bạn.`
        });
      }

      if (!resp.ok || data.error) {
        const errText = data.error?.message || (typeof data.error === "string" ? data.error : "Lỗi kết nối API");
        return res.status(resp.status || 500).json({ error: `API (${targetModel}): ${errText}` });
      }

      const replyText = data?.choices?.[0]?.message?.content || "Không có phản hồi từ máy chủ AI";
      return res.json({ reply: replyText });

    } catch (error: any) {
      console.error("Lỗi Mascot Chat:", error);
      let errorMessage = error?.message || "Đã xảy ra sự cố khi trao đổi với trợ lý AI.";
      return res.status(500).json({ error: errorMessage });
    }
  });

  // Test API Key and Model connection endpoint
  app.post("/api/test-ai-connection", async (req, res) => {
    const startTime = Date.now();
    try {
      const { provider = "gemini", model, customApiKey, baseUrl } = req.body;
      const targetModel = (typeof model === "string" && model.trim().length > 0)
        ? model.trim()
        : (
          provider === "gemini" ? "gemini-3.8-flash" :
          provider === "anthropic" ? "claude-3-5-sonnet-20241022" :
          provider === "deepseek" ? "deepseek-chat" :
          "gpt-4o"
        );

      // 1. Google Gemini Provider
      if (provider === "gemini") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : (process.env.GEMINI_API_KEY || "");

        if (!apiKey) {
          return res.status(400).json({
            success: false,
            error: "Chưa cấu hình API Key Google Gemini. Vui lòng nhập API Key (bắt đầu bằng AIzaSy...)."
          });
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        // Test calling the exact requested model with a simple prompt
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [{ role: "user", parts: [{ text: "Trả lời đúng 1 từ tiếng Việt: Sẵn sàng" }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 20,
          }
        });

        const latencyMs = Date.now() - startTime;
        const text = response?.text?.trim() || "Sẵn sàng";
        return res.json({
          success: true,
          provider: "gemini",
          model: targetModel,
          latencyMs,
          reply: text,
          message: `Kết nối thành công! Model "${targetModel}" phản hồi sau ${latencyMs}ms.`
        });
      }

      // 2. Anthropic Claude Provider
      if (provider === "anthropic") {
        const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
          ? customApiKey.trim()
          : (process.env.ANTHROPIC_API_KEY || "");

        if (!apiKey) {
          return res.status(400).json({
            success: false,
            error: "Chưa cấu hình Anthropic API Key (bắt đầu bằng sk-ant-...)."
          });
        }

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: "Reply with 1 word: Ready" }],
            max_tokens: 10,
            temperature: 0.1,
          }),
        });

        const latencyMs = Date.now() - startTime;
        const rawText = await resp.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          return res.status(resp.status || 502).json({
            success: false,
            error: `Máy chủ Anthropic trả về lỗi (${resp.status}): ${rawText.slice(0, 200)}`
          });
        }

        if (!resp.ok || data.error) {
          const errMsg = data.error?.message || `Lỗi từ Anthropic (Mã ${resp.status})`;
          return res.status(resp.status || 400).json({
            success: false,
            error: errMsg
          });
        }

        return res.json({
          success: true,
          provider: "anthropic",
          model: targetModel,
          latencyMs,
          reply: data?.content?.[0]?.text || "Ready",
          message: `Kết nối thành công! Model "${targetModel}" phản hồi sau ${latencyMs}ms.`
        });
      }

      // 3. OpenAI / DeepSeek / OpenRouter / Custom (OpenAI Chat Completions)
      const isDeepSeek = provider === "deepseek";
      const isOpenRouter = provider === "openrouter";
      let defaultUrl = "https://api.openai.com/v1";
      let envKey = process.env.OPENAI_API_KEY;

      if (isDeepSeek) {
        defaultUrl = "https://api.deepseek.com/v1";
        envKey = process.env.DEEPSEEK_API_KEY;
      } else if (isOpenRouter) {
        defaultUrl = "https://openrouter.ai/api/v1";
        envKey = process.env.OPENROUTER_API_KEY;
      }

      const resolvedBaseUrl = (baseUrl && typeof baseUrl === "string" && baseUrl.trim().length > 0)
        ? baseUrl.trim().replace(/\/+$/, "")
        : defaultUrl;

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : envKey;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: `Chưa có API Key cho ${provider.toUpperCase()}. Vui lòng dán khóa API của bạn.`
        });
      }

      const resp = await fetch(`${resolvedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "Reply with 1 word: Ready" }],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const rawRespText = await resp.text();
      let data: any = {};
      try {
        data = JSON.parse(rawRespText);
      } catch {
        return res.status(resp.status || 502).json({
          success: false,
          error: `Máy chủ API trả về phản hồi không hợp lệ (${resp.status}): ${rawRespText.slice(0, 200)}`
        });
      }

      if (!resp.ok || data.error) {
        const errText = data.error?.message || (typeof data.error === "string" ? data.error : `Mã lỗi HTTP ${resp.status}`);
        return res.status(resp.status || 400).json({
          success: false,
          error: `${provider.toUpperCase()} (${targetModel}): ${errText}`
        });
      }

      const replyText = data?.choices?.[0]?.message?.content || "Ready";
      return res.json({
        success: true,
        provider,
        model: targetModel,
        latencyMs,
        reply: replyText,
        message: `Kết nối thành công! Model "${targetModel}" phản hồi sau ${latencyMs}ms.`
      });

    } catch (err: any) {
      console.error("[Test Connection Error]:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Đã xảy ra lỗi khi kiểm tra kết nối API Key và Model."
      });
    }
  });

  // Memrise Exercise Generator AI Backend Module
  app.post("/api/memrise-generate", async (req, res) => {
    try {
      const { vocabList, customApiKey, model } = req.body;

      if (!vocabList || typeof vocabList !== "string" || !vocabList.trim()) {
        return res.json({
          error: "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý."
        });
      }

      const systemInstruction = `Bạn là một AI Backend Module chuyên dụng, có nhiệm vụ chuyển đổi danh sách từ vựng được người dùng cung cấp thành một cấu trúc dữ liệu bài tập (JSON) theo phong cách Memrise hoàn chỉnh.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
1. MỖI DÒNG trong danh sách tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
2. TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.
3. Nếu một dòng có dạng "friendly: thân thiện, cởi mở" hoặc "friendly, thân thiện, cởi mở", thì từ tiếng Anh là "friendly" và toàn bộ nghĩa tiếng Việt là "thân thiện, cởi mở".

CHỈ ĐỊNH NGHIÊM NGẶT VỀ DỮ LIỆU:
1. KHÔNG ĐƯỢC TỰ TẠO SAMPLE DATA. Nếu người dùng nhập danh sách trống hoặc không hợp lệ, hãy trả về JSON: {"error": "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý."}.
2. Chỉ xử lý CHÍNH XÁC những từ vựng có trong danh sách được người dùng cung cấp ở tin nhắn tiếp theo.

NHIỆM VỤ CỦA BẠN:
Với mỗi dòng từ vựng trong danh sách, hãy tạo ra các dạng bài tập theo trình tự logic sư phạm (1 Flashcard + 6 Quiz cho mỗi từ):
- Dạng 0: "flashcard" (Thẻ học từ vựng Active Recall trước khi vào quiz, gồm từ gốc, phiên âm phonetic, nghĩa tiếng Việt meaning, và ví dụ example có bản dịch example_translation).
- Dạng 1: "multiple_choice" (Trắc nghiệm xuôi: Từ -> Nghĩa đúng, 4 options gồm 1 đúng và 3 distractors hợp lý).
- Dạng 2: "multiple_choice" đảo (Trắc nghiệm đảo: Nghĩa -> Chọn từ tiếng Anh đúng, "is_reverse": true, 4 options tiếng Anh).
- Dạng 3: "fill_in_blank" (Điền từ vào câu ví dụ ngữ cảnh có chứa ___). Câu hỏi là 1 câu tiếng Anh tự nhiên chứa "___", hint là bản dịch tiếng Việt của cả câu.
- Dạng 4: "vocab_cloze" (Khuyết ký tự ngẫu nhiên trong từ). Câu hỏi: "Điền từ tiếng Anh có nghĩa: \\"[meaning]\\"". Chuỗi "clozeLetters" gồm các ký tự và dấu gạch dưới "_" cách nhau bởi khoảng trắng, ẩn 35%-60% chữ cái ở các vị trí ngẫu nhiên linh hoạt (đầu, giữa, cuối).
- Dạng 5: "spelling" (Sắp xếp ký tự đảo). Câu hỏi: "Sắp xếp các chữ cái sau thành từ tiếng Anh có nghĩa: \\"[meaning]\\"". Mảng "shuffled_letters" chứa các chữ cái bị xáo trộn. TUYỆT ĐỐI KHÔNG để lộ từ gốc hay các chữ cái trong câu hỏi của bài tập spelling để tránh lộ đáp án.
- Dạng 6: "typing" (Tự gõ từ). Câu hỏi: "Gõ từ tiếng Anh có nghĩa: \\"[meaning]\\"". Cung cấp định nghĩa và bắt người dùng gõ chính xác từ tiếng Anh gốc.

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

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || "");

      if (!apiKey) {
        return res.status(400).json({
          error: "Chưa cấu hình API Key Google Gemini. Vui lòng cấu hình API Key trong hệ thống."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const targetModel = model?.trim() || "gemini-3.8-flash";
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [
          {
            role: "user",
            parts: [{ text: vocabList.trim() }]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      const replyText = response.text?.trim() || "{}";
      let parsed: any = {};
      try {
        parsed = JSON.parse(replyText);
      } catch (e) {
        const cleaned = replyText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        parsed = JSON.parse(cleaned);
      }

      // Chuẩn hóa và sửa clozeLetters nếu số token không khớp số ký tự từ vựng
      if (parsed && Array.isArray(parsed.exercises)) {
        parsed.exercises = parsed.exercises.map((item: any) => {
          const rawWord = (item.word || item.correct_answer || "").trim();
          if (item.type === "vocab_cloze" && rawWord) {
            const chars = rawWord.split("");
            const currentCloze = (item.clozeLetters || item.clozeTemplate || "").trim();
            const tokens = currentCloze ? currentCloze.split(/\s+/) : [];

            if (tokens.length !== chars.length) {
              const letterIndices: number[] = [];
              for (let i = 0; i < chars.length; i++) {
                if (/[a-zA-Z]/.test(chars[i])) {
                  letterIndices.push(i);
                }
              }

              const maskIndices = new Set<number>();
              const numLetters = letterIndices.length;
              if (numLetters <= 3) {
                const countToMask = numLetters === 2 ? 1 : (Math.random() < 0.6 ? 1 : 2);
                const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
                shuffled.slice(0, countToMask).forEach(idx => maskIndices.add(idx));
              } else {
                const targetCount = Math.max(1, Math.min(Math.round(numLetters * (0.4 + Math.random() * 0.25)), numLetters - 1));
                const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
                shuffled.slice(0, targetCount).forEach(idx => maskIndices.add(idx));
              }

              const repaired = chars.map((ch, idx) => maskIndices.has(idx) ? "_" : ch).join(" ");
              item.clozeLetters = repaired;
              item.clozeTemplate = repaired;
            }
          }
          return item;
        });
      }

      return res.json(parsed);
    } catch (err: any) {
      console.error("Memrise generation error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý tạo bài tập Memrise." });
    }
  });

  // AI Tạo Bài Tập Từ Vựng Đơn Lẻ theo danh sách từ (1 Loại bài tập duy nhất)
  // Phân tách hoàn toàn các prompt theo từng exerciseType chuyên biệt
  app.post("/api/single-vocab-generate", async (req, res) => {
    try {
      const { vocabList, exerciseType, difficulty, customApiKey, model } = req.body;

      if (!vocabList || typeof vocabList !== "string" || !vocabList.trim()) {
        return res.json({
          status: "error",
          error: "Danh sách từ vựng trống. Vui lòng cung cấp dữ liệu từ vựng cần xử lý."
        });
      }

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || "");

      if (!apiKey) {
        return res.status(400).json({
          status: "error",
          error: "Chưa cấu hình API Key Google Gemini. Vui lòng cấu hình API Key trong hệ thống."
        });
      }

      const targetType = exerciseType || "vocab_cloze";
      const targetDiff = difficulty || "guided";

      // HỆ THỐNG PROMPTS ĐƯỢC PHÂN TÁCH HOÀN TOÀN RIÊNG BIỆT CHO TỪNG LOẠI BÀI TẬP
      let systemInstruction = "";

      if (targetType === "vocab_cloze") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập dạng "Khuyết ký tự từ vựng (Active Recall Spelling Cloze)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.
- Nếu một dòng có dạng "friendly: thân thiện, cởi mở" hoặc "friendly - thân thiện, dễ gần" hoặc "friendly, thân thiện, cởi mở", thì từ tiếng Anh là "friendly", và toàn bộ phần nghĩa tiếng Việt là "thân thiện, cởi mở".

QUY ĐỊNH CẤU TRÚC CHI TIẾT CHO DẠNG "vocab_cloze":
Với MỖI từ vựng trên 1 dòng, bạn PHẢI tạo ra 1 bài tập có ĐẦY ĐỦ các trường sau:
1. "vocabWord" (và "word"): Từ tiếng Anh mục tiêu viết đúng chính tả (ví dụ: "friendly").
2. "vocabMeaning" (và "hint"): Toàn bộ nghĩa tiếng Việt của từ (ví dụ: "thân thiện, cởi mở").
3. "phonetic": Phiên âm quốc tế IPA chuẩn xác của từ (ví dụ: "/'frend.li/").
4. "clozeLetters" (và "clozeTemplate"): MẪU KHUYẾT CHỮ CÁI CHUẨN XÁC, trong đó các ký tự hiển thị và các dấu gạch dưới "_" BẮT BUỘC CÁCH NHAU BẰNG MỘT KHOẢNG TRẮNG.
   - Luôn giữ lại chữ cái đầu tiên và chữ cái cuối cùng của từ.
   - Ẩn từ 35% đến 50% số chữ cái ở giữa bằng dấu gạch dưới "_".
   - Ví dụ: từ "friendly" (8 chữ cái) -> clozeLetters: "f _ _ e n d l y"
   - Ví dụ: từ "cat" (3 chữ cái) -> clozeLetters: "c _ t"
   - Ví dụ: từ "environment" (11 chữ cái) -> clozeLetters: "e n v _ _ _ n m _ n t"
   - ĐỊNH DẠNG BẮT BUỘC: Mỗi chữ cái và mỗi dấu gạch dưới "_" PHẢI cách nhau bởi 1 khoảng trắng (dấu cách).
5. "question": Đề bài theo cú pháp sư phạm chuẩn xác:
   "Điền từ tiếng Anh có nghĩa: \\"[vocabMeaning]\\""
   (Ví dụ: "Điền từ tiếng Anh có nghĩa: \\"thân thiện, cởi mở\\"")
6. "correctAnswer" (và "correct_answer", "correctText"): Từ tiếng Anh gốc viết thường, chính xác (ví dụ: "friendly").
7. "explanation": Giải thích chi tiết từ loại, nghĩa tiếng Việt và ví dụ ngắn gọn (ví dụ: "friendly (tính từ) = thân thiện, dễ gần.").
8. "type": "vocab_cloze".

CẤU TRÚC JSON ĐẦU RA:
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
      } else if (targetType === "multiple_choice") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Trắc nghiệm từ vựng 4 lựa chọn (Multiple Choice)" từ danh sách từ vựng được cung cấp.

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
7. "correctAnswer" / "correct_answer": Chuỗi nội dung đáp án đúng.
8. "explanation": Giải thích chi tiết tại sao chọn đáp án này.

CẤU TRÚC JSON ĐẦU RA:
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
      } else if (targetType === "flashcard_recall") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo "Thẻ ghi nhớ từ vựng Active Recall (Flashcard)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

QUY ĐỊNH CẤU TRÚC BÀI TẬP:
Với MỖI từ vựng:
1. "word" / "vocabWord": Từ tiếng Anh gốc.
2. "vocabMeaning" / "hint": Nghĩa tiếng Việt chi tiết.
3. "phonetic": Phiên âm IPA chuẩn xác.
4. "question": "Ghi nhớ từ vựng: [word]".
5. "exampleSentence": 1 câu ví dụ tiếng Anh tự nhiên kèm bản dịch tiếng Việt trong ngoặc.
6. "correctAnswer": Từ tiếng Anh gốc.
7. "explanation": Phân tích từ loại và từ đồng nghĩa.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly",
      "explanation": "friendly (tính từ) = thân thiện, cởi mở."
    }
  ]
}`;
      } else if (targetType === "listen_spell") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Nghe phát âm và viết chính tả (Listen & Spell)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly",
      "explanation": "Từ cần gõ chính xác là 'friendly'."
    }
  ]
}`;
      } else if (targetType === "anagram" || targetType === "spelling") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Sắp xếp các chữ cái bị xáo trộn (Anagram / Word Scramble)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly",
      "explanation": "friendly (adj) = thân thiện, cởi mở."
    }
  ]
}`;
      } else if (targetType === "fill_in_blank") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Điền từ vào câu ví dụ ngữ cảnh (Fill in blank)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly",
      "explanation": "'friendly' (tính từ) đứng trước danh từ 'smile' để bổ nghĩa cho nụ cười thân thiện."
    }
  ]
}`;
      } else if (targetType === "typing") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Tự gõ từ vựng (Active Typing Recall)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly",
      "explanation": "friendly (tính từ) = thân thiện, cởi mở."
    }
  ]
}`;
      } else if (targetType === "pronunciation") {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ và Ngữ âm Tiếng Anh hàng đầu.
NHIỆM VỤ: Tạo bài tập "Luyện phát âm (Pronunciation Drill)" từ danh sách từ vựng hoặc câu do người dùng cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG HOẶC 1 CÂU MỤC TIÊU CẦN PHÁT ÂM.
- Nếu dòng là từ đơn (1 từ): Đặt "isSingleWord": true. Học sinh lắng nghe phát âm và phát âm lại, app nghe đúng từ là hoàn thành (100%).
- Nếu dòng là một câu nhiều chữ: Đặt "isSingleWord": false. Học sinh đọc lại cả câu và phải đáp ứng tỷ lệ % khớp (mặc định 70%).

QUY ĐỊNH CẤU TRÚC CHI TIẾT CHO MỖI DÒNG:
1. "word" (và "targetText", "correctText", "vocabWord"): Từ hoặc câu tiếng Anh cần phát âm.
2. "phonetic": Phiên âm IPA chuẩn xác (bắt buộc đối với từ đơn lẻ như /ɪnˈvaɪ.rən.mənt/, đối với câu có thể ghi chú âm trọng điểm hoặc để trống).
3. "vocabMeaning" (và "hint"): Nghĩa tiếng Việt chuẩn, súc tích.
4. "isSingleWord": true nếu là từ đơn, false nếu là câu nhiều chữ.
5. "pronunciationAccuracy": 70 (tỷ lệ % tối thiểu để đạt với câu).
6. "question": Đề bài sư phạm:
   - Nếu từ đơn: "Lắng nghe và phát âm từ: [word]"
   - Nếu câu: "Lắng nghe và phát âm câu: [sentence]"
7. "explanation": Hướng dẫn phát âm thực tế (trọng âm, âm cuối, nuốt âm/nối âm, khẩu hình).
8. "type": "pronunciation".

CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
{
  "status": "success",
  "exerciseType": "pronunciation",
  "items": [
    {
      "id": "pron_1",
      "word": "environment",
      "vocabWord": "environment",
      "vocabMeaning": "môi trường sinh thái",
      "type": "pronunciation",
      "phonetic": "/ɪnˈvaɪ.rən.mənt/",
      "isSingleWord": true,
      "pronunciationAccuracy": 70,
      "question": "Lắng nghe và phát âm từ: environment",
      "correctAnswer": "environment",
      "correct_answer": "environment",
      "correctText": "environment",
      "explanation": "Trọng âm rơi vào âm tiết thứ 2 (vi-ron). Chú ý bật nhẹ âm đuôi /nt/."
    }
  ]
}`;
      } else {
        // Matching & default
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh.
NHIỆM VỤ: Tạo bài tập "Ghép nối từ vựng (Matching)" từ danh sách từ vựng được cung cấp.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
- MỖI DÒNG tương ứng với ĐÚNG 1 TỪ VỰNG TIẾNG ANH MỤC TIÊU.
- TUYỆT ĐỐI KHÔNG xem dấu phẩy (,) là dấu ngăn cách giữa các từ vựng khác nhau.

CẤU TRÚC JSON ĐẦU RA:
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
      "correct_answer": "friendly = thân thiện, cởi mở",
      "explanation": "Ghép đúng các cặp từ vựng với nghĩa tiếng Việt tương ứng."
    }
  ]
}`;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const targetModel = model?.trim() || "gemini-3.8-flash";
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ role: "user", parts: [{ text: vocabList.trim() }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      const replyText = response.text?.trim() || "{}";
      let parsed: any = {};
      try {
        parsed = JSON.parse(replyText);
      } catch (e) {
        const cleaned = replyText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        parsed = JSON.parse(cleaned);
      }

      // Chuẩn hóa và khắc phục triệt để lỗi thiếu dấu gạch dưới "_" do LLM đếm sai số lượng ký tự
      if (parsed && Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((item: any) => {
          const rawWord = (item.vocabWord || item.word || item.correctAnswer || "").trim();
          const isClozeType = item.type === "vocab_cloze" || targetType === "vocab_cloze";
          
          if (isClozeType && rawWord) {
            const chars = rawWord.split("");
            const currentCloze = (item.clozeLetters || item.clozeTemplate || "").trim();
            const tokens = currentCloze ? currentCloze.split(/\s+/) : [];

            // Nếu số lượng token khuyết không khớp chính xác 100% với độ dài từ vựng (ví dụ conservation có 12 chữ mà AI chỉ tạo 11)
            if (tokens.length !== chars.length) {
              const letterIndices: number[] = [];
              for (let i = 0; i < chars.length; i++) {
                if (/[a-zA-Z]/.test(chars[i])) {
                  letterIndices.push(i);
                }
              }

              const maskIndices = new Set<number>();
              const numLetters = letterIndices.length;
              if (numLetters <= 3) {
                const countToMask = numLetters === 2 ? 1 : (Math.random() < 0.6 ? 1 : 2);
                const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
                shuffled.slice(0, countToMask).forEach(idx => maskIndices.add(idx));
              } else {
                const targetCount = Math.max(1, Math.min(Math.round(numLetters * (0.4 + Math.random() * 0.25)), numLetters - 1));
                const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
                shuffled.slice(0, targetCount).forEach(idx => maskIndices.add(idx));
              }

              const repaired = chars.map((ch, idx) => maskIndices.has(idx) ? "_" : ch).join(" ");
              item.clozeLetters = repaired;
              item.clozeTemplate = repaired;
            }
          }
          return item;
        });
      }

      return res.json(parsed);
    } catch (err: any) {
      console.error("Single vocab generation error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý tạo bài tập từ vựng." });
    }
  });

  // AI Phân Tích & Bổ Sung Từ Vựng / Dòng Phát Âm (Pronunciation AI Helper)
  app.post("/api/pronunciation-ai-analyze", async (req, res) => {
    try {
      const { text, mode = "single_word", customApiKey, model } = req.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ status: "error", error: "Văn bản phân tích trống." });
      }

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || "");

      if (!apiKey) {
        return res.status(400).json({
          status: "error",
          error: "Chưa cấu hình API Key. Vui lòng kiểm tra lại thiết lập AI của bạn."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { "User-Agent": "aistudio-build" }
        }
      });

      const effectiveModel = (model && typeof model === "string" && model.trim().length > 0)
        ? model.trim()
        : "gemini-3.1-flash-lite";

      if (mode === "single_word") {
        const prompt = `Bạn là Chuyên gia Ngữ âm Tiếng Anh.
Nhiệm vụ: Phân tích phát âm chi tiết cho từ vựng đơn lẻ: "${text.trim()}".
Trả về DUY NHẤT một JSON hợp lệ với cấu trúc sau:
{
  "word": "${text.trim()}",
  "phonetic": "/phiên âm IPA chuẩn quốc tế/",
  "meaning": "Nghĩa tiếng Việt ngắn gọn, xúc tích",
  "pronunciationTips": "Mẹo phát âm (vị trí trọng âm, khẩu hình môi/lưỡi, âm đuôi hoặc lỗi người Việt hay mắc)",
  "exampleSentence": "Một câu ví dụ tiếng Anh tự nhiên chứa từ này"
}`;

        const response = await ai.models.generateContent({
          model: effectiveModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          }
        });

        const replyText = response.text || "{}";
        const cleaned = replyText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ status: "success", data: parsed });
      } else {
        // mode === 'lines_enrich': Bổ sung IPA & nghĩa cho từng dòng
        const prompt = `Bạn là Chuyên gia Ngữ âm và Sư phạm Tiếng Anh.
Nhiệm vụ: Phân tích danh sách các dòng văn bản phát âm sau (mỗi dòng là 1 từ hoặc 1 câu):
"""
${text.trim()}
"""
QUY TẮC:
- MỖI DÒNG tương ứng với ĐÚNG 1 phần tử trong mảng "items".
- Nếu dòng là từ đơn (1 từ): isSingleWord = true, cung cấp "phonetic" (IPA chuẩn).
- Nếu dòng là câu nhiều chữ: isSingleWord = false, phonetic có thể để trống hoặc ghi âm trọng điểm.
- Dịch "meaning" sang tiếng Việt tự nhiên.
- "pronunciationTips": Mẹo ngắn gọn khi đọc từ/câu này.

Trả về DUY NHẤT JSON hợp lệ:
{
  "status": "success",
  "items": [
    {
      "targetText": "văn bản gốc",
      "phonetic": "/.../",
      "meaning": "nghĩa tiếng Việt",
      "isSingleWord": true,
      "pronunciationTips": "hướng dẫn phát âm"
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: effectiveModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          }
        });

        const replyText = response.text || "{}";
        const cleaned = replyText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ status: "success", items: parsed.items || [] });
      }
    } catch (err: any) {
      console.error("Pronunciation AI analyze error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý AI phân tích phát âm." });
    }
  });

  // AI Tạo Bài Tập Ngữ Pháp & Chuyển Đổi Dạng Tương Đương (Grammar & Sentence Transformation Generator)
  app.post("/api/grammar-generate", async (req, res) => {
    try {
      const { 
        topic, 
        ruleNote, 
        exerciseType, 
        questionCount = 5, 
        difficulty, 
        customApiKey, 
        model, 
        mode = "general", // 'general' | 'transformation'
        rawInput 
      } = req.body;

      const effectiveInput = (rawInput && typeof rawInput === "string" && rawInput.trim().length > 0)
        ? rawInput.trim()
        : (topic && typeof topic === "string" ? topic.trim() : "");

      if (!effectiveInput) {
        return res.json({
          status: "error",
          error: "Vui lòng nhập chủ điểm ngữ pháp hoặc dán nội dung/ví dụ cần tạo bài tập."
        });
      }

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || "");

      if (!apiKey) {
        return res.status(400).json({
          status: "error",
          error: "Chưa cấu hình API Key Google Gemini. Vui lòng cấu hình API Key trong hệ thống."
        });
      }

      const targetType = exerciseType || "mixed";
      const count = Math.min(Math.max(Number(questionCount) || 5, 1), 25);
      const targetDiff = difficulty || "guided";

      // Kiểm tra xem input có phải là dạng bài tập chuyển đổi tương đương hoặc có ví dụ/key từ SGK hay không
      const isTransformationMode = mode === "transformation" || 
        /chuyển|viết lại|biến đổi|tương đương|combine|rewrite|passive|conditional|when.*while|direct.*indirect|reported|unless|so sánh|wish|despite|although/i.test(effectiveInput);

      let systemInstruction = "";

      if (isTransformationMode) {
        systemInstruction = `Bạn là Chuyên gia Sư phạm Ngôn ngữ Tiếng Anh hàng đầu (IELTS 9.0, Giảng viên luyện thi Cambridge & Ngữ pháp Chuyên sâu).
NHIỆM VỤ ĐẶC BIỆT: THIẾT KẾ BÀI TẬP "CHUYỂN ĐỔI DẠNG TƯƠNG ĐƯƠNG / VIẾT LẠI CÂU (SENTENCE TRANSFORMATION & COMBINATION)".

NGUỒN DỮ LIỆU ĐẦU VÀO TỪ NGƯỜI DÙNG:
Người dùng có thể cung cấp:
1. Một yêu cầu ngắn gọn, có thể hơi mơ hồ (ví dụ: "chuyển câu điều kiện 2 sang 3", "chủ động sang bị động", "nối câu bằng when/while", "luyện tập wish", "so sánh hơn sang bằng", "because sang because of", v.v.).
2. HOẶC một đoạn văn bản thô từ Sách giáo khoa / Sách giáo viên / Đề thi chứa chỉ dẫn sư phạm, số trang, các câu đề bài và phần Key đáp án (như: "TASK 2: COMBINE THE TWO SENTENCES USING WHEN OR WHILE WHERE APPROPRIATE... Key: 1. While they were cleaning the streets, it started to rain. / They were cleaning the streets when it started to rain...").

QUY TRÌNH XỬ LÝ THÔNG MINH CỦA AI:
BƯỚC 1 - NHẬN DIỆN VÀ PHÂN TÍCH QUY TẮC CHUYỂN ĐỔI (INFERRED RULE):
- Đọc hiểu ý định của người dùng và bóc tách cấu trúc chuyển đổi ngữ pháp tương đương.
- Tóm tắt công thức chuyển đổi ngắn gọn, rõ ràng (ví dụ: "Công thức When/While: S + was/were V-ing when S + V2/ed <=> While S + was/were V-ing, S + V2/ed").
- Ghi vào trường "inferredRule".

BƯỚC 2 - KHAI THÁC & SÁNG TẠO NỘI DUNG BÀI TẬP:
- Nếu người dùng cung cấp các câu ví dụ hoặc Key sẵn có trong văn bản, hãy TRÍCH XUẤT và chuyển thể các câu đó thành các câu bài tập chuẩn mực.
- Nếu số lượng câu trong văn bản ít hơn số lượng yêu cầu (${count} câu), hãy SÁNG TẠO THÊM các câu mới có độ tương đồng cấu trúc và bám sát ngữ cảnh thực tế tự nhiên để đạt đủ ${count} câu.
- Đảm bảo các câu tiếng Anh mang tính tự nhiên, chuẩn ngữ pháp bản xứ, không gượng gạo.

BƯỚC 3 - TẠO CÁC DẠNG BÀI THEO YÊU CẦU ("${targetType}"):
- Nếu targetType = "sentence_transformation" hoặc targetType = "translation":
  + type: "translation"
  + question: Đưa ra câu gốc (hoặc 2 câu đơn cần kết hợp) và chỉ dẫn viết lại. Ví dụ: "Kết hợp 2 câu sau dùng WHEN hoặc WHILE: 'They were cleaning the streets. It started to rain.' (Gợi ý bắt đầu bằng: While...)" hoặc "Viết lại câu sau sao cho nghĩa không đổi: 'If you don't study hard, you will fail the exam.' (Bắt đầu bằng: Unless...)"
  + correctAnswer: Câu tiếng Anh tương đương hoàn chỉnh. NẾU CÓ NHIỀU CÁCH VIẾT TƯƠNG ĐƯƠNG ĐỀU ĐÚNG, HÃY PHÂN TÁCH BẰNG DẤU GẠCH CHÉO " / " (Ví dụ: "While they were cleaning the streets, it started to rain. / They were cleaning the streets when it started to rain.").
  + hint: Cấu trúc hoặc từ gợi ý mở đầu.
  + explanation: Phân tích vì sao chuyển đổi như vậy, giải thích cấu trúc ngữ pháp tương đương bằng tiếng Việt dễ hiểu.

- Nếu targetType = "multiple_choice":
  + type: "multiple_choice"
  + question: "Chọn câu có nghĩa tương đương và đúng ngữ pháp nhất với câu sau: '[Câu gốc]'"
  + options: Mảng 4 phương án A, B, C, D gồm 1 đáp án viết lại tương đương chính xác và 3 đáp án nhiễu chứa các lỗi ngữ pháp kinh điển (nhầm thì, sai liên từ, sai phân từ 2, đổi sai nghĩa).
  + correctOptionIdx: 0, 1, 2 hoặc 3.
  + correctAnswer: Chuỗi phương án đúng.
  + explanation: Phân tích cặn kẽ tại sao phương án này tương đương đúng và tại sao 3 phương án còn lại sai ngữ pháp/sai nghĩa.

- Nếu targetType = "sentence_builder":
  + type: "sentence_builder"
  + question: "Sắp xếp các từ sau thành câu tương đương với câu: '[Câu gốc]'"
  + scrambledWords: Mảng các từ bị xáo trộn để ghép thành câu tương đương.
  + correctAnswer: Câu hoàn chỉnh đúng chuẩn.
  + explanation: Giải thích trật tự từ và công thức.

- If targetType = "error_correction":
  + type: "error_correction"
  + question: "Tìm và sửa lỗi sai trong câu chuyển đổi sau:"
  + errorSentence: Câu chuyển đổi bị cài 1 lỗi ngữ pháp điển hình về chủ điểm tương đương này.
  + errorPart: Phần từ/cụm từ sai.
  + correction: Phần từ/cụm từ sửa đúng.
  + correctAnswer: correction.
  + explanation: Giải thích lỗi sai và cách khắc phục bằng tiếng Việt.

- If targetType = "fill_in_blank":
  + type: "fill_in_blank"
  + question: "Điền liên từ hoặc dạng đúng của từ vào chỗ trống để hoàn thành câu tương đương: '[Câu gốc]' ➔ '[Câu chuyển đổi có chỗ trống ____]'"
  + correctAnswer: Từ hoặc cụm từ cần điền.
  + hint: Gợi ý nhận biết.
  + explanation: Giải thích quy tắc bằng tiếng Việt.

- If targetType = "mixed" hoặc mặc định:
  + Phân bổ đa dạng các dạng bài trên (ưu tiên nhiều câu viết lại câu tương đương translation, trắc nghiệm tương đương multiple_choice, sắp xếp câu sentence_builder, sửa lỗi sai error_correction, điền liên từ fill_in_blank) để học sinh luyện tập toàn diện từ nhận biết đến tự sản sinh ngôn ngữ.

ĐỊNH DẠNG JSON ĐẦU RA BẮT BUỘC:
{
  "status": "success",
  "topic": "[Tên chủ điểm chuyển đổi ngữ pháp]",
  "inferredRule": "[Công thức / Quy tắc chuyển đổi tương đương tóm tắt]",
  "targetType": "${targetType}",
  "items": [
    {
      "id": "trans_1",
      "topic": "[Tên chủ điểm]",
      "type": "translation | multiple_choice | sentence_builder | error_correction | fill_in_blank",
      "question": "string",
      "originalSentence": "[Câu gốc nếu có]",
      "transformationCue": "[Từ gợi ý nếu có, vd: While / Unless / Had / passive]",
      "hint": "string",
      "correctAnswer": "string (nếu có nhiều cách tương đương, phân tách bằng ' / ')",
      "options": ["string", "string", "string", "string"], // nếu multiple_choice
      "correctOptionIdx": 0, // nếu multiple_choice
      "scrambledWords": ["string"], // nếu sentence_builder
      "errorSentence": "string", // nếu error_correction
      "errorPart": "string", // nếu error_correction
      "correction": "string", // nếu error_correction
      "explanation": "Giải thích chi tiết quy tắc chuyển đổi tương đương bằng tiếng Việt"
    }
  ]
}`;
      } else {
        systemInstruction = `Bạn là chuyên gia sư phạm tiếng Anh hàng đầu, chuyên thiết kế bài tập ngữ pháp theo giáo trình Cambridge/IELTS/TOEFL.
NHIỆM VỤ:
Tạo ra chính xác ${count} câu hỏi bài tập ngữ pháp chất lượng cao chuyên sâu về chủ điểm: "${effectiveInput}".
${ruleNote ? `Ghi chú ngữ pháp bổ sung từ giáo viên: "${ruleNote.trim()}"` : ""}
Dạng bài yêu cầu: "${targetType}"
Độ khó: "${targetDiff}"

HƯỚNG DẪN CÁC DẠNG BÀI:
- Nếu targetType = "sentence_builder":
  + question: "Sắp xếp các từ sau thành câu hoàn chỉnh đúng ngữ pháp"
  + scrambledWords: Mảng các từ bị xáo trộn thứ tự
  + correctAnswer: Câu tiếng Anh chuẩn xác hoàn chỉnh
  + hint: Gợi ý công thức hoặc nghĩa câu
  + explanation: Giải thích chi tiết trật tự từ và công thức ngữ pháp bằng tiếng Việt.
- Nếu targetType = "error_correction":
  + question: "Tìm và sửa lỗi sai ngữ pháp trong câu sau"
  + errorSentence: Câu tiếng Anh chứa duy nhất 1 lỗi sai điển hình về chủ điểm ngữ pháp này
  + errorPart: Từ/cụm từ bị sai
  + correction: Từ/cụm từ sửa đúng
  + correctAnswer: correction
  + hint: Vị trí hoặc dấu hiệu lỗi
  + explanation: Phân tích vì sao sai và tại sao sửa như vậy bằng tiếng Việt.
- Nếu targetType = "multiple_choice":
  + question: Câu tiếng Anh có chỗ trống "____" hoặc yêu cầu chọn phương án đúng
  + options: 4 phương án trắc nghiệm A, B, C, D tập trung vào các bẫy ngữ pháp thường gặp
  + correctOptionIdx: 0, 1, 2 hoặc 3
  + correctAnswer: Phương án đúng
  + hint: Dấu hiệu nhận biết thì, liên từ, hoặc cấu trúc
  + explanation: Giải thích chi tiết từng đáp án vì sao đúng và vì sao 3 phương án còn lại sai bằng tiếng Việt.
- Nếu targetType = "fill_in_blank":
  + question: Câu tiếng Anh có "____ (từ gốc trong ngoặc)"
  + correctAnswer: Dạng đúng của từ sau khi chia theo quy tắc ngữ pháp
  + hint: Dấu hiệu nhận biết
  + explanation: Giải thích quy tắc chia từ bằng tiếng Việt.
- Nếu targetType = "translation":
  + question: Dịch câu tiếng Việt sau sang tiếng Anh hoặc viết lại câu áp dụng cấu trúc ngữ pháp
  + correctAnswer: Câu tiếng Anh chuẩn xác (nếu có nhiều cách đều đúng thì phân tách bằng ' / ')
  + hint: Cấu trúc cần dùng
  + explanation: Phân tích cấu trúc câu tiếng Anh bằng tiếng Việt.
- Nếu targetType = "mixed":
  + Chia đều các câu hỏi theo các dạng trên (sentence_builder, error_correction, multiple_choice, fill_in_blank, translation).

ĐỊNH DẠNG JSON ĐẦU RA:
{
  "status": "success",
  "topic": "${effectiveInput}",
  "inferredRule": "[Tóm tắt công thức ngữ pháp cốt lõi]",
  "targetType": "${targetType}",
  "items": [
    {
      "id": "string",
      "topic": "${effectiveInput}",
      "type": "multiple_choice | sentence_builder | error_correction | fill_in_blank | translation",
      "question": "string",
      "hint": "string",
      "correctAnswer": "string",
      "options": ["string", "string", "string", "string"],
      "correctOptionIdx": 0,
      "scrambledWords": ["string"],
      "errorSentence": "string",
      "errorPart": "string",
      "correction": "string",
      "explanation": "Giải thích chi tiết bằng tiếng Việt"
    }
  ]
}`;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Danh sách model ưu tiên: gemini-3.1-flash-lite cực nhanh, ổn định, tránh bị lỗi 503 High Demand
      const requestedModel = model?.trim();
      const candidateModels = Array.from(new Set([
        requestedModel || "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-flash-latest"
      ])).filter(Boolean);

      let responseText = "";
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          console.log(`[Grammar Generate] Trying model ${m}...`);
          const response = await ai.models.generateContent({
            model: m,
            contents: [{ 
              role: "user", 
              parts: [{ 
                text: `YÊU CẦU SOẠN BÀI TẬP:\n${effectiveInput}\n\n${ruleNote ? `GHI CHÚ / BỔ SUNG: ${ruleNote.trim()}` : ""}\n\nHãy phân tích kỹ nội dung trên và tạo đúng ${count} câu bài tập chất lượng cao theo đúng định dạng JSON.` 
              }] 
            }],
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.2,
            }
          });

          if (response?.text?.trim()) {
            responseText = response.text.trim();
            console.log(`[Grammar Generate] Successfully generated with model ${m}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[Grammar Generate] Model ${m} failed:`, err?.message || err);
          lastError = err;
          // Tiếp tục thử model tiếp theo trong candidateModels
        }
      }

      if (!responseText) {
        throw new Error(lastError?.message || "Không thể nhận phản hồi từ mô hình AI. Vui lòng thử lại sau giây lát.");
      }

      // Trích xuất JSON an toàn bằng thuật toán Balanced Braces
      const parsed = safeExtractJson(responseText);

      return res.json(parsed);
    } catch (err: any) {
      console.error("Grammar generation error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý tạo bài tập ngữ pháp." });
    }
  });

  // AI Trợ lý Soạn bài giảng Thông minh phong cách Gemini in Docs (Help Me Write / Structure Content)
  app.post("/api/lesson-ai-assistant", async (req, res) => {
    try {
      const {
        prompt,
        mode = "full_lecture", // 'full_lecture' | 'single_block' | 'refine'
        lessonTitle,
        topicContext,
        currentContent,
        customApiKey,
        model
      } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.json({
          status: "error",
          error: "Vui lòng nhập yêu cầu nội dung bạn muốn Gemini soạn thảo."
        });
      }

      const apiKey = (customApiKey && typeof customApiKey === "string" && customApiKey.trim().length > 0)
        ? customApiKey.trim()
        : (process.env.GEMINI_API_KEY || "");

      if (!apiKey) {
        return res.status(400).json({
          status: "error",
          error: "Chưa cấu hình API Key Google Gemini. Vui lòng cấu hình API Key trong hệ thống."
        });
      }

      const systemInstruction = `Bạn là Trợ lý AI Soạn bài giảng & Thiết kế học liệu tiếng Anh sư phạm đỉnh cao (tương tự như Gemini in Google Docs "Help me write").
BẠN CÓ NHIỆM VỤ:
Tiếp nhận yêu cầu từ giáo viên và tạo ra nội dung bài học có cấu trúc sư phạm trực quan, sinh động, chuẩn mực.

BẮT BUỘC SỬ DỤNG CHÍNH XÁC CÁC MẪU KHUNG & BẢNG CỦA HỆ THỐNG (CHUẨN HTML & CSS CLASSES):

1. KHUNG CÔNG THỨC CHÍNH (Formula Box - Viền xanh ngọc):
<div class="formula-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">📐 CÔNG THỨC CHÍNH</span>
  </div>
  <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 4px 0 8px 0; text-align: center;">
    [CÔNG THỨC RÕ RÀNG]
  </p>
  <p style="font-size: 13px; opacity: 0.85; text-align: center; margin: 0;">
    [Giải thích các thành phần ký hiệu: S, V, O, modal, ed...]
  </p>
</div>

2. BẢNG PHÂN LOẠI & DẠNG CÂU (Table - Có header xanh ngọc, dòng kẻ rõ ràng):
<h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">[Tiêu đề bảng]</h3>
<table data-block-type="table" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
  <thead>
    <tr style="background-color: rgba(16, 185, 129, 0.15);">
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Thể câu</th>
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Cấu trúc</th>
      <th style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); text-align: left;">Ví dụ minh họa</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #10b981;">Khẳng định (+)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Cấu trúc khẳng định]</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Ví dụ tiếng Anh in đậm từ khóa]</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #f43f5e;">Phủ định (-)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Cấu trúc phủ định]</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Ví dụ tiếng Anh in đậm từ khóa]</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3); font-weight: bold; color: #0284c7;">Nghi vấn (?)</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Cấu trúc nghi vấn]</td>
      <td style="padding: 8px 12px; border: 1px solid rgba(150, 150, 150, 0.3);">[Ví dụ tiếng Anh in đậm từ khóa]</td>
    </tr>
  </tbody>
</table>

3. KHUNG MẸO NHỚ & DẤU HIỆU NHẬN BIẾT (Tip Box - Viền tím):
<div class="tip-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #8b5cf6; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💡 DẤU HIỆU NHẬN BIẾT & MẸO NHỚ</span>
  </div>
  <p style="font-size: 14px; margin: 0 0 8px 0;">[Mở đầu ngắn gọn]:</p>
  <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6;">
    <li><b>[Từ khóa 1]</b>: [Giải thích]</li>
    <li><b>[Từ khóa 2]</b>: [Giải thích]</li>
  </ul>
</div>

4. KHUNG LƯU Ý & NGOẠI LỆ (Caution Box - Viền vàng cam):
<div class="caution-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #f59e0b; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">⚠️ LƯU Ý & NGOẠI LỆ</span>
  </div>
  <p style="font-size: 14px; margin: 0;">
    [Ghi chú bẫy ngữ pháp, lỗi học sinh hay sai hoặc trường hợp bất quy tắc]
  </p>
</div>

5. KHUNG VÍ DỤ MINH HỌA (Example Box - Viền xanh biển):
<div class="example-box" data-block-type="box" style="width: 100%; margin: 12px 0;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="background-color: #0284c7; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">💬 VÍ DỤ MINH HỌA</span>
  </div>
  <p style="font-size: 15px; font-weight: 600; margin: 6px 0 2px 0; color: #0284c7;">
    [Câu tiếng Anh tự nhiên, chuẩn bản ngữ]
  </p>
  <p style="font-size: 13px; margin: 0; opacity: 0.85; font-style: italic;">
    ➔ [Bản dịch tiếng Việt chính xác & phân tích nhanh]
  </p>
</div>

6. DANH SÁCH CHECKLIST TÍCH XANH (Checkmark List):
<ul style="list-style-type: none; padding-left: 4px; margin: 10px 0; font-size: 14px; line-height: 1.7;">
  <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
    <span style="color: #10b981; font-weight: bold;">✓</span>
    <span>[Quy tắc / Điểm cần nhớ 1]</span>
  </li>
  <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
    <span style="color: #10b981; font-weight: bold;">✓</span>
    <span>[Quy tắc / Điểm cần nhớ 2]</span>
  </li>
</ul>

HƯỚNG DẪN THEO CHẾ ĐỘ (MODE):
- Nếu mode = "full_lecture":
  Tạo từ 2 đến 4 slide (trang) hoàn chỉnh phân chia khoa học:
  + Slide 1: Khái niệm, Công thức cốt lõi (Formula box) & Bảng 3 thể (+, -, ?).
  + Slide 2: Dấu hiệu nhận biết (Tip box) & Các mẹo phân biệt.
  + Slide 3: Các trường hợp ngoại lệ (Caution box) & Bộ ví dụ ngữ cảnh (Example boxes).
  Trả về mảng "slides": [{"id": "slide_1", "title": "...", "contentHtml": "..."}].
- Nếu mode = "single_block" hoặc "refine":
  Tạo khối HTML hoàn chỉnh lồng ghép thông minh các khung theo đúng yêu cầu người dùng, trả về trong trường "contentHtml".

ĐỊNH DẠNG JSON ĐẦU RA BẮT BUỘC:
{
  "status": "success",
  "mode": "${mode}",
  "summary": "Tóm tắt ngắn gọn những gì AI đã tạo (1 câu tiếng Việt)",
  "contentHtml": "Chuỗi HTML (khi mode là single_block hoặc refine)",
  "slides": [
    {
      "id": "slide_1",
      "title": "Trang 1: Tiêu đề trang...",
      "contentHtml": "HTML hoàn chỉnh của slide 1"
    }
  ]
}`;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const userContextMessage = `
YÊU CẦU NGƯỜI DÙNG: "${prompt.trim()}"
Chế độ mong muốn: ${mode}
${lessonTitle ? `Bài học hiện tại: "${lessonTitle}"` : ""}
${topicContext ? `Bối cảnh/Tóm tắt kiến thức bài học: "${topicContext}"` : ""}
${currentContent ? `Nội dung đang có trên trang (để tinh chỉnh/viết tiếp):
"""
${currentContent}
"""` : ""}
      `.trim();

      const targetModel = model?.trim() || "gemini-3.1-flash-lite";
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ role: "user", parts: [{ text: userContextMessage }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.3,
        }
      });

      const replyText = response.text?.trim() || "{}";
      const parsed = safeExtractJson(replyText);
      return res.json(parsed);
    } catch (err: any) {
      console.error("Lesson AI Assistant error:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý Trợ lý AI Soạn bài." });
    }
  });

  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
