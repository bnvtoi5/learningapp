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
        commands = parsed;
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
        commands = cloudData.items;
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
 * Gửi tin nhắn đến server /api/mascot-chat: Hoàn toàn sử dụng cài đặt & API của từng tài khoản người dùng
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
    model, 
    fallbackModels,
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi kết nối máy chủ AI');
  }

  return data.reply;
}
