import { MascotType, ChatMessage, AIProviderType, QuickCommandItem, ChatAttachment } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Tên Bot ngắn gọn, không dấu theo từng Linh Vật
 */
export const MASCOT_HANDLES: Record<MascotType, string> = {
  owl: '@cuhocgia',
  cat: '@meochamchi',
  fox: '@caolanhloi',
  bear: '@gauamap',
  bunny: '@thosieutoc',
  robot: '@robot_ai',
  shiba: '@shibavui',
  penguin: '@canhcut',
};

/**
 * Danh sách Lệnh Nhanh Mặc Định (Toàn trường xài chung, Admin có thể tùy biến)
 */
export const DEFAULT_QUICK_COMMANDS: QuickCommandItem[] = [
  {
    id: 'cmd_tinhcach',
    command: '/tinhcach',
    label: 'Xem tính cách đang dùng',
    description: 'Kiểm tra prompt tính cách & vai trò hiện tại của linh vật và tài khoản',
    iconName: 'Sparkles',
    isSystem: true,
  },
  {
    id: 'cmd_dich',
    command: '/dich',
    label: 'Dịch thuật thông minh',
    description: 'Dịch thoát ý tự nhiên, phân tích collocation & từ mới',
    iconName: 'Languages',
    isSystem: false,
  },
  {
    id: 'cmd_nguphap',
    command: '/nguphap',
    label: 'Phân tích ngữ pháp',
    description: 'Mổ xẻ thành phần câu, nhận diện thì & bẫy ngữ pháp',
    iconName: 'BookOpenCheck',
    isSystem: false,
  },
  {
    id: 'cmd_soisai',
    command: '/soisai',
    label: 'Soi lỗi & giải thích',
    description: 'Chỉ ra lý do sai và mẹo nhớ không bao giờ tái phạm',
    iconName: 'AlertTriangle',
    isSystem: false,
  },
  {
    id: 'cmd_tuvung',
    command: '/tuvung',
    label: 'Tra từ & IPA',
    description: 'Cung cấp từ loại, phiên âm IPA, từ đồng nghĩa và ví dụ',
    iconName: 'Lightbulb',
    isSystem: false,
  },
  {
    id: 'cmd_kmua',
    command: '/kmua',
    label: 'Hỏi đáp kmua bot',
    description: 'Trò chuyện tự do thông minh, sắc sảo và hài hước',
    iconName: 'Sparkles',
    isSystem: false,
  },
  {
    id: 'cmd_clear',
    command: '/clear',
    label: 'Xóa bộ nhớ chat',
    description: 'Làm mới lịch sử để bot phản hồi nhẹ và chuẩn nhất',
    iconName: 'Trash2',
    isSystem: true,
  },
];

const QUICK_COMMANDS_LOCAL_KEY = 'app_system_quick_commands';

/**
 * Lấy danh sách Lệnh Nhanh Hệ Thống (LocalStorage + Firestore)
 */
export async function getSystemQuickCommands(): Promise<QuickCommandItem[]> {
  let commands: QuickCommandItem[] = [...DEFAULT_QUICK_COMMANDS];

  try {
    const raw = localStorage.getItem(QUICK_COMMANDS_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Đảm bảo các lệnh hệ thống như /tinhcach và /clear luôn hiện diện
        const existingCmds = new Set(parsed.map(c => c.command));
        const missingSystemCmds = DEFAULT_QUICK_COMMANDS.filter(d => d.isSystem && !existingCmds.has(d.command));
        commands = [...parsed, ...missingSystemCmds];
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc local quick commands:', e);
  }

  try {
    const docRef = doc(db, 'system_config', 'quick_commands');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cloudData = snap.data() as { items?: QuickCommandItem[] };
      if (Array.isArray(cloudData.items) && cloudData.items.length > 0) {
        const existingCmds = new Set(cloudData.items.map(c => c.command));
        const missingSystemCmds = DEFAULT_QUICK_COMMANDS.filter(d => d.isSystem && !existingCmds.has(d.command));
        commands = [...cloudData.items, ...missingSystemCmds];
        localStorage.setItem(QUICK_COMMANDS_LOCAL_KEY, JSON.stringify(commands));
      }
    }
  } catch (e) {
    // Không chặn nếu offline
  }

  return commands;
}

/**
 * Admin lưu danh sách Lệnh Nhanh dùng chung toàn trường
 */
export async function saveSystemQuickCommands(commands: QuickCommandItem[]): Promise<void> {
  try {
    localStorage.setItem(QUICK_COMMANDS_LOCAL_KEY, JSON.stringify(commands));
  } catch (e) {
    console.warn('Lỗi lưu local quick commands:', e);
  }

  try {
    const docRef = doc(db, 'system_config', 'quick_commands');
    await setDoc(docRef, { items: commands, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn('Không thể đồng bộ Firestore quick commands:', e);
  }
}

/**
 * Prompt tính cách mặc định chuẩn chỉ, sinh động cho từng Linh Vật
 */
export const DEFAULT_MASCOT_PROMPTS: Record<MascotType, string> = {
  fox: `Bạn là Cáo Lanh Lợi (@caolanhloi) - một trợ lý học tập sắc sảo, hóm hỉnh và cực kỳ thông minh mang phong cách kmua-bot.
- Giọng điệu & Xưng hô: Xưng "Cáo" hoặc "tớ", gọi người học là "bạn" hoặc "học bá". Tự nhiên như bạn thân siêu giỏi tiếng Anh. Tuyệt đối KHÔNG dùng văn mẫu rập khuôn kiểu "Tôi là AI...".
- Phong cách dạy học: Đi thẳng vào mấu chốt, phân tích sắc lẹm các bẫy đề thi tiếng Anh (những chỗ học sinh hay bị lừa ở mạo từ, đảo ngữ, chia thì hoặc giới từ). Có khiếu hài hước tinh tế, thi thoảng trêu vui khi người học chọn đáp án ngây ngô nhưng giải thích thì chuẩn không cần chỉnh.
- Định dạng giải thích: Tinh gọn, thực chiến, nêu rõ [Bẫy đề] -> [Bản chất ngữ pháp] -> [Mẹo nhớ 1 lần là thuộc].`,

  owl: `Bạn là Bác Cú Học Giả (@cuhocgia) - biểu tượng của trí tuệ uyên bác, đọc rộng hiểu nhiều và sư phạm mẫu mực.
- Giọng điệu & Xưng hô: Xưng "Bác Cú" hoặc "tớ", gọi người học là "bạn" hoặc "trò". Giọng điệu điềm đạm, ấm áp, sâu sắc và khích lệ tinh thần học thuật.
- Phong cách dạy học: Giải thích cặn kẽ gốc rễ của ngôn ngữ. Làm rõ từ nguyên (etymology), phân tích cấu tạo từ (tiền tố - prefix, gốc từ - root, hậu tố - suffix), so sánh sắc thái tinh tế giữa các từ đồng nghĩa (synonyms & collocations).
- Định dạng giải thích: Trình bày bài học có cấu trúc chuẩn mực, mạch lạc, dùng các đề mục rõ ràng và ví dụ ngữ cảnh học thuật cao cấp.`,

  cat: `Bạn là Mèo Chăm Chỉ (@meochamchi) - trợ lý học tập cần mẫn, tỉ mỉ và cực kỳ đáng yêu.
- Giọng điệu & Xưng hô: Xưng "Mèo" hoặc "tớ", dùng biểu cảm mèo dễ thương (meow~, 🐾, nya~). Ngọt ngào, ân cần nhưng rất nghiêm túc trong việc soi chi tiết.
- Phong cách dạy học: Chuyên gia "soi kính lúp" từng dấu câu, mạo từ (a/an/the), cách chia động từ số ít/số nhiều, các dạng quá khứ phân từ và phát âm đuôi -s/-es/-ed.
- Định dạng giải thích: Nhắc nhở tỉ mỉ từng lỗi nhỏ, khen ngợi ngay khi bạn học có tiến bộ, hướng dẫn viết câu chuẩn chỉnh từng li từng tí.`,

  bunny: `Bạn là Thỏ Siêu Tốc (@thosieutoc) - chuyên gia phản xạ nhanh và cao thủ luyện đề thi trắc nghiệm.
- Giọng điệu & Xưng hô: Xưng "Thỏ" hoặc "tớ". Năng động, tốc độ, dứt khoát và tràn đầy năng lượng tươi mới.
- Phong cách dạy học: Đưa ra các bí kíp giải đề trong 5 giây! Tập trung vào dấu hiệu nhận biết thì qua từ chỉ thời gian (sign words), kỹ thuật loại trừ 3 đáp án nhiễu, mẹo nhận diện từ loại (danh/động/tính/trạng) qua đuôi từ mà không cần dịch hết câu.
- Định dạng giải thích: Nhanh gọn lẹ, gạch đầu dòng dứt khoát: [Dấu hiệu nhìn là thấy] -> [Bấm nút chọn đáp án] -> [Giải thích siêu tốc].`,

  bear: `Bạn là Chú Gấu Ấm Áp (@gauamap) - người bạn hiền hòa, kiên nhẫn vô tận và là chỗ dựa vững chắc cho mọi học sinh.
- Giọng điệu & Xưng hô: Xưng "Gấu" hoặc "tớ", nói năng dịu dàng, ấm áp, kiên trì và tràn đầy sự thấu hiểu.
- Phong cách dạy học: Thích hợp nhất cho các bạn học sinh mất gốc hoặc tự ti về tiếng Anh. Gấu giải thích từng bước một (step-by-step) thật chậm rãi, sử dụng các hình ảnh ví dụ đời thường quen thuộc, không bao giờ phán xét khi học sinh làm sai.
- Định dạng giải thích: "Đừng lo nhé, để Gấu nắm tay bạn đi qua câu này từng bước một!" -> [Bước 1: Nhìn chủ ngữ] -> [Bước 2: Chọn thì] -> [Bước 3: Hoàn tất].`,

  robot: `Bạn là Robot AI Tri Thức (@robot_ai) - cỗ máy phân tích ngôn ngữ thế hệ mới với tư duy logic toán học.
- Giọng điệu & Xưng hô: Xưng "Robot AI" hoặc "tớ". Khách quan, trung thực, chính xác tuyệt đối, không rườm rà.
- Phong cách dạy học: Quy mọi kiến thức tiếng Anh về dạng công thức toán học và sơ đồ thuật toán logic trực quan. Phân tích chức năng ngữ pháp như một hệ thống vi mạch hoàn chỉnh.
- Định dạng giải thích: Trình bày dạng bảng / công thức:
  + Công thức: [Subject] + [Verb] + [Object]
  + Quy tắc logic: Nếu A xảy ra thì B biến đổi...
  + Bảng đối chiếu Đúng vs Sai trực quan.`,

  shiba: `Bạn là Cún Shiba Vui Vẻ (@shibavui) - bạn đồng hành siêu nhiệt huyết, hài hước và lạc quan nhất trần đời!
- Giọng điệu & Xưng hô: Xưng "Shiba" hoặc "tớ", thi thoảng có tiếng reo vui (woof!, gâu gâu~, wag tail). Luôn tràn đầy nụ cười và năng lượng tích cực.
- Phong cách dạy học: Biến những cấu trúc ngữ pháp khô khan thành những câu chuyện vui nhộn, những mẩu đối thoại hài hước dễ nhớ. Luôn vỗ tay khen ngợi thật to mỗi khi bạn học hoàn thành một câu.
- Định dạng giải thích: Tươi vui, gần gũi, truyền cảm hứng học tập mạnh mẽ và xua tan áp lực thi cử.`,

  penguin: `Bạn là Cánh Cụt Hiếu Học (@canhcut) - trợ lý tò mò, ham khám phá và là bậc thầy phương pháp gợi mở Socratic.
- Giọng điệu & Xưng hô: Xưng "Cánh Cụt" hoặc "tớ". Lễ phép, thông minh, tò mò và giàu tính kích thích tư duy.
- Phong cách dạy học: Thay vì cho ngay đáp án dọn sẵn, Cánh Cụt sẽ khéo léo đặt ra 1-2 câu hỏi gợi ý thông minh để người học tự tư duy, tự chắp nối dữ kiện và vỡ òa khi tự mình tìm ra đáp án đúng.
- Định dạng giải thích: "Đố bạn biết từ này đứng sau động từ to be thì cần từ loại gì nhỉ?" -> Dẫn dắt từng nấc thang tư duy cho đến khi bạn tự giải được.`
};

/**
 * Lấy System Prompt cụ thể cho Mascot: Ưu tiên Custom Prompt của User, nếu không có thì lấy Mặc Định
 */
export function getActiveMascotPrompt(
  mascotId: MascotType, 
  userCustomPrompt?: string
): string {
  if (userCustomPrompt && userCustomPrompt.trim().length > 0) {
    return userCustomPrompt.trim();
  }
  return DEFAULT_MASCOT_PROMPTS[mascotId] || DEFAULT_MASCOT_PROMPTS.fox;
}

/**
 * Trực tiếp gọi Google Gemini từ client-side khi ở môi trường mobile/shared không có backend proxy
 */
async function callDirectGemini(params: {
  apiKey: string;
  model: string;
  fallbackModels?: string[];
  systemInstruction: string;
  message: string;
  history: ChatMessage[];
  attachment?: ChatAttachment;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, fallbackModels = [], systemInstruction, message, history, attachment, signal } = params;

  const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-8);
    for (const item of recent) {
      if (item && (item.sender === 'user' || item.sender === 'mascot') && item.text) {
        contents.push({
          role: item.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(item.text) }],
        });
      }
    }
  }

  const userParts: any[] = [{ text: message }];
  if (attachment && attachment.dataUrl) {
    if (attachment.type === 'image') {
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
    role: 'user',
    parts: userParts,
  });

  const candidates = [
    model,
    ...fallbackModels,
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = '';

  for (const candidateModel of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Phản hồi máy chủ không hợp lệ (${res.status})`);
      }

      if (!res.ok || data.error) {
        const msg = data.error?.message || `Lỗi API (${res.status})`;
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          throw new Error('API Key Google Gemini không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần chọn Mô hình.');
        }
        lastError = msg;
        continue;
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) throw err;
      lastError = err.message || String(err);
      if (lastError.includes('API Key Google Gemini không chính xác')) {
        throw err;
      }
    }
  }

  if (lastError.includes('503') || lastError.includes('high demand') || lastError.includes('UNAVAILABLE')) {
    throw new Error('Máy chủ Google AI hiện đang chịu tải cao. Bạn vui lòng thử lại sau vài giây nhé.');
  }
  throw new Error(lastError || 'Không nhận được câu trả lời từ Gemini.');
}

/**
 * Trực tiếp gọi OpenAI / DeepSeek / OpenRouter / Custom từ client-side
 */
async function callDirectOpenAICompatible(params: {
  apiKey: string;
  baseUrl?: string;
  provider: AIProviderType;
  model: string;
  systemInstruction: string;
  message: string;
  history: ChatMessage[];
  attachment?: ChatAttachment;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, baseUrl, provider, model, systemInstruction, message, history, attachment, signal } = params;

  let defaultUrl = 'https://api.openai.com/v1';
  if (provider === 'deepseek') defaultUrl = 'https://api.deepseek.com/v1';
  else if (provider === 'openrouter') defaultUrl = 'https://openrouter.ai/api/v1';

  const resolvedBaseUrl = (baseUrl && baseUrl.trim().length > 0)
    ? baseUrl.trim().replace(/\/+$/, '')
    : defaultUrl;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = [
    { role: 'system', content: systemInstruction }
  ];

  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-10);
    for (const item of recent) {
      if (item && (item.sender === 'user' || item.sender === 'mascot') && item.text) {
        messages.push({
          role: item.sender === 'user' ? 'user' : 'assistant',
          content: String(item.text),
        });
      }
    }
  }

  let userContent: any = message;
  if (attachment && attachment.dataUrl) {
    if (attachment.type === 'image') {
      userContent = [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: attachment.dataUrl } },
      ];
    } else if (attachment.textContent) {
      userContent = `${message}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
    }
  }

  messages.push({ role: 'user', content: userContent });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI Study Assistant';
  }

  const res = await fetch(`${resolvedBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  const rawText = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Máy chủ (${provider}) trả về phản hồi không hợp lệ (${res.status}). Vui lòng kiểm tra lại Đường dẫn Base URL hoặc API Key.`);
  }

  if (!res.ok || data.error) {
    const errText = data.error?.message || (typeof data.error === 'string' ? data.error : `Lỗi API (${res.status})`);
    throw new Error(`${provider.toUpperCase()} (${model}): ${errText}`);
  }

  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('Không nhận được nội dung trả lời từ mô hình AI.');
  }

  return reply;
}

/**
 * Trực tiếp gọi Anthropic Claude từ client-side
 */
async function callDirectClaude(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  message: string;
  history: ChatMessage[];
  attachment?: ChatAttachment;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, systemInstruction, message, history, attachment, signal } = params;

  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: any }> = [];
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-10);
    for (const item of recent) {
      if (item && (item.sender === 'user' || item.sender === 'mascot') && item.text) {
        claudeMessages.push({
          role: item.sender === 'user' ? 'user' : 'assistant',
          content: String(item.text),
        });
      }
    }
  }

  let claudeUserContent: any = message;
  if (attachment && attachment.dataUrl) {
    if (attachment.type === 'image') {
      const match = String(attachment.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        claudeUserContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[2],
            },
          },
          {
            type: 'text',
            text: message,
          },
        ];
      }
    } else if (attachment.textContent) {
      claudeUserContent = `${message}\n\n[Nội dung tệp đính kèm "${attachment.name || 'tệp'}"]:\n${attachment.textContent}`;
    }
  }

  claudeMessages.push({ role: 'user', content: claudeUserContent });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    signal,
    body: JSON.stringify({
      model: model || 'claude-opus-4-8',
      system: systemInstruction,
      messages: claudeMessages,
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  const rawText = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Claude API trả về phản hồi không hợp lệ (${res.status}).`);
  }

  if (!res.ok || data.error) {
    const errText = data.error?.message || `Lỗi API (${res.status})`;
    throw new Error(`Claude: ${errText}`);
  }

  return data.content?.[0]?.text || 'Không có phản hồi từ Claude';
}

/**
 * Gửi tin nhắn đến server /api/mascot-chat và tự động Fallback gọi trực tiếp an toàn từ Client trên mọi thiết bị
 */
export async function sendMascotChatMessage(params: {
  message: string;
  history: ChatMessage[];
  mascotId: MascotType;
  customApiKey?: string;
  provider?: AIProviderType;
  model?: string;
  fallbackModels?: string[];
  baseUrl?: string;
  userPromptOverride?: string;
  quotedMessage?: {
    id: string;
    sender: 'user' | 'mascot';
    text: string;
  };
  studentName?: string;
  signal?: AbortSignal;
  attachment?: ChatAttachment;
}): Promise<string> {
  const { 
    message, 
    history, 
    mascotId, 
    customApiKey, 
    provider = 'gemini', 
    model = 'gemini-3.8-flash', 
    fallbackModels = [],
    baseUrl,
    userPromptOverride,
    quotedMessage, 
    studentName,
    signal,
    attachment
  } = params;

  // Lấy prompt tính cách: Của tài khoản hiện tại hoặc mặc định chuẩn
  let basePrompt = getActiveMascotPrompt(mascotId, userPromptOverride);

  if (studentName) {
    basePrompt += `\n\nNgười đang trò chuyện với bạn là học sinh tên là: "${studentName}". Hãy xưng hô tự nhiên, thân thiết.`;
  }

  // Chuẩn bị tin nhắn hiện tại có kèm ngữ cảnh quote
  let currentPrompt = message.trim();
  if (quotedMessage && quotedMessage.text) {
    const quotedAuthor = quotedMessage.sender === 'user' ? 'Người dùng' : 'Bạn (Linh vật)';
    currentPrompt = `[TRÍCH DẪN ĐANG ĐƯỢC TRẢ LỜI TỪ (${quotedAuthor}): "${quotedMessage.text}"]\n\nPhản hồi / câu hỏi trực tiếp của người dùng:\n${currentPrompt}`;
  }

  let serverCallFailed = false;
  let serverErrorMessage = '';

  // 1. Thử gửi qua Server Proxy /api/mascot-chat trước
  try {
    const response = await fetch('/api/mascot-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        message,
        history,
        mascotId,
        systemInstruction: basePrompt,
        customApiKey: customApiKey?.trim() || undefined,
        quotedMessage,
        provider,
        model,
        fallbackModels,
        baseUrl: baseUrl?.trim() || undefined,
        attachment,
      }),
    });

    const rawText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Phản hồi không phải JSON (VD: 404 HTML "The page cannot be found" trên điện thoại hoặc môi trường tĩnh)
      serverCallFailed = true;
      serverErrorMessage = `Máy chủ cục bộ không khả dụng (${response.status})`;
    }

    if (data) {
      if (response.ok && data.reply) {
        return data.reply;
      }
      if (data.error) {
        // Nếu server báo lỗi API KEY hoặc lỗi cụ thể
        if (data.error.includes('Vui lòng bấm') || data.error.includes('không hợp lệ')) {
          throw new Error(data.error);
        }
        serverErrorMessage = data.error;
        serverCallFailed = true;
      }
    }
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError' || signal?.aborted) {
      throw fetchErr;
    }
    // Nếu lỗi là do key không hợp lệ được ném ở trên, rethrow luôn
    if (fetchErr.message?.includes('API Key') || fetchErr.message?.includes('Vui lòng')) {
      throw fetchErr;
    }
    serverCallFailed = true;
    serverErrorMessage = fetchErr.message || 'Không thể kết nối đến server proxy';
  }

  // 2. Tự động Fallback: Gọi trực tiếp từ Client nếu máy chủ backend proxy không phản hồi JSON (VD: Trên điện thoại / máy khác)
  const activeKey = customApiKey?.trim();

  if (provider === 'gemini') {
    if (activeKey) {
      return await callDirectGemini({
        apiKey: activeKey,
        model,
        fallbackModels,
        systemInstruction: basePrompt,
        message: currentPrompt,
        history,
        attachment,
        signal,
      });
    } else {
      throw new Error(
        'Không thể kết nối máy chủ AI tự động trên thiết bị này. Vui lòng bấm vào biểu tượng "Mô hình" (ở góc trên khung chat) và nhập API Key cá nhân của bạn (Google Gemini / OpenAI / DeepSeek / Claude / OpenRouter) để trò chuyện trực tiếp nhé!'
      );
    }
  }

  if (provider === 'anthropic') {
    if (activeKey) {
      return await callDirectClaude({
        apiKey: activeKey,
        model,
        systemInstruction: basePrompt,
        message: currentPrompt,
        history,
        attachment,
        signal,
      });
    } else {
      throw new Error('Chưa có Anthropic Claude API Key. Vui lòng bấm vào nút "Mô hình" ở góc trên khung chat để nhập API Key của bạn (sk-ant-...).');
    }
  }

  // OpenAI / DeepSeek / OpenRouter / Custom
  if (activeKey) {
    return await callDirectOpenAICompatible({
      apiKey: activeKey,
      baseUrl,
      provider,
      model,
      systemInstruction: basePrompt,
      message: currentPrompt,
      history,
      attachment,
      signal,
    });
  }

  const providerName = provider === 'deepseek' ? 'DeepSeek' : provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
  throw new Error(`Chưa có API Key cho ${providerName}. Vui lòng bấm vào nút "Mô hình" ở góc trên khung chat để nhập API Key cá nhân của bạn nhé!`);
}
