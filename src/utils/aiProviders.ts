import { AIProviderType } from '../types';

export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  description: string;
  badge?: string;
  tagColor?: string;
  isPopular?: boolean;
}

export interface AIProviderMeta {
  id: AIProviderType;
  name: string;
  brandName: string;
  iconType: 'sparkles' | 'bot' | 'brain' | 'zap' | 'globe';
  color: string;
  badgeBg: string;
  defaultModel: string;
  keyPlaceholder: string;
  keyPrefixHint: string;
  docsUrl: string;
  docsName: string;
  defaultBaseUrl?: string;
  models: AIModelInfo[];
}

export const AI_PROVIDERS: Record<AIProviderType, AIProviderMeta> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    brandName: 'Gemini',
    iconType: 'sparkles',
    color: 'text-sky-500',
    badgeBg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    defaultModel: 'gemini-3.8-flash',
    keyPlaceholder: 'AIzaSy...',
    keyPrefixHint: 'Bắt đầu bằng AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsName: 'Google AI Studio',
    models: [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'gemini',
        description: 'Thế hệ 3.8 Flash mới nhất, phân tích ngôn ngữ tự nhiên, tốc độ cao.',
        badge: '⚡ Khuyên dùng',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        isPopular: true,
      },
      {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest',
        provider: 'gemini',
        description: 'Bản phát hành ổn định toàn cầu, hạn chế tối đa nghẽn tải vào giờ cao điểm.',
        badge: '🛡️ Ổn định',
        tagColor: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
        isPopular: true,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        provider: 'gemini',
        description: 'Mô hình siêu nhẹ, phản hồi tức thì với độ trễ thấp nhất, không bị nghẽn.',
        badge: '💨 Siêu tốc',
        tagColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
        isPopular: true,
      },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        provider: 'gemini',
        description: 'Tư duy chuyên sâu, giải bài toán khó và phân tích văn bản phức tạp.',
        badge: '🧠 Tư duy sâu',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    brandName: 'ChatGPT',
    iconType: 'bot',
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    defaultModel: 'gpt-5.6-sol',
    keyPlaceholder: 'sk-proj-...',
    keyPrefixHint: 'Bắt đầu bằng sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsName: 'OpenAI Platform',
    models: [
      {
        id: 'gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        provider: 'openai',
        description: 'Mô hình thế hệ Sol đỉnh cao, tư duy đa nhiệm và ngôn ngữ tiếng Anh chuẩn xác.',
        badge: '🧠 Cao cấp',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        isPopular: true,
      },
      {
        id: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        provider: 'openai',
        description: 'Phiên bản cân bằng vững chắc giữa năng lực phân tích và tốc độ phản hồi.',
        badge: '⚖️ Cân bằng',
        tagColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        isPopular: true,
      },
      {
        id: 'gpt-5.6-luna',
        name: 'GPT-5.6 Luna',
        provider: 'openai',
        description: 'Tốc độ phản xạ tức thì, tương tác hội thoại mượt mà cho học sinh.',
        badge: '⚡ Nhanh',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      },
      {
        id: 'gpt-5.6-sol-pro',
        name: 'GPT-5.6 Sol Pro',
        provider: 'openai',
        description: 'Khả năng suy luận chuỗi logic (Reasoning) chuyên sâu cho các bài thi hóc búa.',
        badge: '🔥 Reasoning',
        tagColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    brandName: 'Claude',
    iconType: 'brain',
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    defaultModel: 'claude-opus-4-8',
    keyPlaceholder: 'sk-ant-api...',
    keyPrefixHint: 'Bắt đầu bằng sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsName: 'Anthropic Console',
    models: [
      {
        id: 'claude-opus-4-8',
        name: 'Claude Opus 4.8',
        provider: 'anthropic',
        description: 'Trí tuệ ngôn ngữ cao cấp nhất từ Anthropic, diễn đạt tự nhiên như người bản xứ.',
        badge: '🧠 Cao cấp',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        isPopular: true,
      },
      {
        id: 'claude-mythos-5',
        name: 'Claude Mythos 5',
        provider: 'anthropic',
        description: 'Mô hình suy luận chuyên sâu thế hệ Mythos với khả năng mổ xẻ logic phức tạp.',
        badge: '🔥 Reasoning',
        tagColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        isPopular: true,
      },
      {
        id: 'claude-fable-5',
        name: 'Claude Fable 5',
        provider: 'anthropic',
        description: 'Phiên bản cân bằng linh hoạt, phù hợp giải thích bài tập và hội thoại thường nhật.',
        badge: '⚖️ Cân bằng',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek AI',
    brandName: 'DeepSeek',
    iconType: 'zap',
    color: 'text-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    defaultModel: 'deepseek-flash',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    keyPlaceholder: 'sk-...',
    keyPrefixHint: 'Bắt đầu bằng sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    docsName: 'DeepSeek Open Platform',
    models: [
      {
        id: 'deepseek-flash',
        name: 'DeepSeek V4.1 Flash',
        provider: 'deepseek',
        description: 'Thế hệ V4.1 Flash siêu tốc, phản hồi mượt mà với chi phí tối ưu.',
        badge: '⚡ Khuyên dùng',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        isPopular: true,
      },
      {
        id: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        provider: 'deepseek',
        description: 'Mô hình V4 Pro năng lực tư duy cao cấp, giải thích bài học sâu sắc và cặn kẽ.',
        badge: '🧠 Cao cấp',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        isPopular: true,
      },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Hub',
    brandName: 'OpenRouter',
    iconType: 'globe',
    color: 'text-violet-500',
    badgeBg: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    defaultModel: 'openai/gpt-5.6-sol',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
    keyPrefixHint: 'Khóa OpenRouter API',
    docsUrl: 'https://openrouter.ai/keys',
    docsName: 'OpenRouter.ai',
    models: [
      {
        id: 'openai/gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        provider: 'openrouter',
        description: 'Định tuyến đến mô hình GPT-5.6 Sol qua OpenRouter.',
        badge: '🧠 Cao cấp',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        isPopular: true,
      },
      {
        id: 'anthropic/claude-opus-4-8',
        name: 'Claude Opus 4.8',
        provider: 'openrouter',
        description: 'Định tuyến đến mô hình Claude Opus 4.8 đỉnh cao.',
        badge: '🧠 Cao cấp',
        tagColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        isPopular: true,
      },
      {
        id: 'google/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'openrouter',
        description: 'Định tuyến đến mô hình Gemini 3.8 Flash tốc độ cao.',
        badge: '⚡ Khuyên dùng',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        isPopular: true,
      },
      {
        id: 'deepseek/deepseek-flash',
        name: 'DeepSeek V4.1 Flash',
        provider: 'openrouter',
        description: 'Định tuyến đến mô hình DeepSeek V4.1 Flash.',
        badge: '⚡ Nhanh',
        tagColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Tùy chỉnh (Custom API)',
    brandName: 'Custom API',
    iconType: 'globe',
    color: 'text-teal-500',
    badgeBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-... hoặc token máy chủ',
    keyPrefixHint: 'API Key máy chủ tương thích OpenAI',
    docsUrl: 'https://platform.openai.com',
    docsName: 'Tùy chỉnh / OpenAI Compatible',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat (V3)',
        provider: 'custom',
        description: 'Mô hình đa năng mạnh mẽ, tối ưu hội thoại và ngữ pháp.',
        badge: '⚡ Khuyên dùng',
        tagColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        isPopular: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'custom',
        description: 'Mô hình siêu nhanh, chi phí thấp của OpenAI.',
        badge: '⚡ Nhanh',
        tagColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        isPopular: true,
      },
      {
        id: 'llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'custom',
        description: 'Mô hình mã nguồn mở thế hệ mới nhất của Meta.',
        badge: '🦙 Meta Llama',
        tagColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      },
      {
        id: 'qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        provider: 'custom',
        description: 'Mô hình tư duy đa ngôn ngữ và suy luận logic xuất sắc.',
        badge: '🌐 Đa ngôn ngữ',
        tagColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      },
    ],
  },
};

export const PROVIDER_LIST: AIProviderMeta[] = Object.values(AI_PROVIDERS);

/**
 * Lấy metadata của model theo modelId hoặc trả về model mặc định
 */
export function getModelInfo(providerId: AIProviderType, modelId?: string): AIModelInfo {
  const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;
  const found = provider.models.find(m => m.id === modelId);
  if (found) return found;

  if (modelId && modelId.trim()) {
    return {
      id: modelId,
      name: modelId,
      provider: providerId,
      description: `Mô hình tùy chỉnh: ${modelId} (${provider.name})`,
      badge: 'Tùy chỉnh',
    };
  }

  return provider.models[0];
}

export const AI_PROVIDERS_LIST = Object.values(AI_PROVIDERS);
