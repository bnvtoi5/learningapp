import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  RotateCcw, 
  Sparkles, 
  CornerDownLeft, 
  Reply, 
  Bot, 
  Trash2, 
  Languages, 
  BookOpenCheck, 
  AlertTriangle, 
  Lightbulb, 
  Check, 
  ChevronDown,
  ExternalLink,
  Sliders,
  Zap,
  Brain,
  Flame,
  HelpCircle,
  FileText,
  CheckCircle,
  Square,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  ZoomIn
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage, MascotType, User, AIProviderType, QuickCommandItem, ChatAttachment } from '../types';
import { 
  MASCOT_HANDLES, 
  sendMascotChatMessage, 
  DEFAULT_QUICK_COMMANDS, 
  getSystemQuickCommands,
  getActiveMascotPrompt
} from '../utils/mascotAI';
import { MASCOT_LIST } from '../utils/mascotSprites';
import { StudyMascot } from './StudyMascot';
import { soundManager } from '../utils/audio';
import { OpenCodeModelPicker } from './OpenCodeModelPicker';
import { getModelInfo } from '../utils/aiProviders';
import { QUICK_COMMAND_ICONS } from './AdminQuickCommandsManager';
import { ConfirmModal } from './ConfirmModal';
import { ChatMessageRenderer } from './ChatMessageRenderer';

interface MascotChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mascotId: MascotType;
  currentUser?: User | null;
  onOpenSettings?: () => void;
}

export const MascotChatDrawer: React.FC<MascotChatDrawerProps> = ({
  isOpen,
  onClose,
  mascotId,
  currentUser,
  onOpenSettings,
}) => {
  const { settings, updateSettings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [activeProvider, setActiveProvider] = useState<AIProviderType>(settings.aiProviderType || 'gemini');
  const [activeModel, setActiveModel] = useState<string>(settings.aiModel || 'gemini-3.1-flash-lite');
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  // Sync if settings change externally
  useEffect(() => {
    if (settings.aiProviderType) setActiveProvider(settings.aiProviderType);
    if (settings.aiModel) setActiveModel(settings.aiModel);
  }, [settings.aiProviderType, settings.aiModel]);

  const currentModelInfo = getModelInfo(activeProvider, activeModel);
  const mascotInfo = MASCOT_LIST.find(m => m.id === mascotId) || MASCOT_LIST[0];
  const mascotHandle = MASCOT_HANDLES[mascotId] || '@cuhocgia';

  // Lịch sử tin nhắn riêng biệt cho từng tài khoản và từng linh vật
  const currentUserId = currentUser?.id || 'guest';
  const chatStorageKey = `mascot_chat_${currentUserId}_${mascotId}`;

  const loadSavedMessages = (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem(`mascot_chat_${currentUserId}_${mascotId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return [
      {
        id: 'msg_welcome',
        sender: 'mascot',
        text: `Chào ${currentUser?.fullName || 'bạn'}! Tớ là **${mascotInfo.name}** (${mascotHandle}). Bạn có thể hỏi tớ bất cứ điều gì về bài học, từ vựng, ngữ pháp hoặc gõ \`/\` để dùng các phím tắt nhanh nhé! ✨`,
        timestamp: Date.now(),
      }
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(loadSavedMessages);

  // Khi đổi tài khoản hoặc đổi mascot, tự động tải đúng lịch sử của tài khoản đó
  useEffect(() => {
    setMessages(loadSavedMessages());
    setReplyingTo(null);
    setErrorMsg(null);
  }, [currentUserId, mascotId]);

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Trích dẫn / Reply tin nhắn
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Đính kèm hình ảnh hoặc tệp tài liệu
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nhận diện giọng nói thành chữ (Speech to text)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Danh sách lệnh nhanh hệ thống (Admin quản lý, toàn trường xài chung)
  const [systemCommands, setSystemCommands] = useState<QuickCommandItem[]>(DEFAULT_QUICK_COMMANDS);
  const [showCommandsMenu, setShowCommandsMenu] = useState(false);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Dọn dẹp micro khi unmount hoặc đóng drawer
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Xử lý bật/tắt nhận diện giọng nói tiếng Việt
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Trình duyệt chưa hỗ trợ Web Speech API. Bạn hãy dùng Google Chrome, Cốc Cốc hoặc Edge để sử dụng mic nói nhé!');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputVal(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Ứng dụng chưa được cấp quyền micro. Bạn hãy cho phép micro trên trình duyệt để nói nhé.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Xử lý đính kèm tệp/ảnh
  const processSelectedFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Tệp tải lên vượt quá giới hạn 10MB. Vui lòng chọn tệp nhỏ hơn nhé!');
      return;
    }

    const isImage = file.type.startsWith('image/');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPendingAttachment({
          name: file.name,
          type: 'image',
          mimeType: file.type || 'image/jpeg',
          dataUrl,
          size: file.size,
        });
        soundManager.playClick();
      };
      reader.readAsDataURL(file);
    } else {
      const isTextFile = file.type.startsWith('text/') || 
                         /\.(txt|md|csv|json|js|ts|py|html|css|xml|sql)$/i.test(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        const textContent = typeof content === 'string' ? content.slice(0, 15000) : '';
        setPendingAttachment({
          name: file.name,
          type: 'file',
          mimeType: file.type || 'application/octet-stream',
          dataUrl: '',
          size: file.size,
          textContent,
        });
        soundManager.playClick();
      };

      if (isTextFile) {
        reader.readAsText(file);
      } else {
        const binaryReader = new FileReader();
        binaryReader.onload = (binEvent) => {
          setPendingAttachment({
            name: file.name,
            type: 'file',
            mimeType: file.type || 'application/octet-stream',
            dataUrl: (binEvent.target?.result as string) || '',
            size: file.size,
            textContent: `[Tệp tài liệu: ${file.name} (${Math.round(file.size / 1024)} KB)]`,
          });
          soundManager.playClick();
        };
        binaryReader.readAsDataURL(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        processSelectedFile(file);
      }
    }
  };

  // Cuộn mượt và làm nổi bật tin nhắn gốc khi nhấn vào trích dẫn reply
  const scrollToMessage = (targetMsgId: string) => {
    const el = document.getElementById(`chat-msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetMsgId);
      setTimeout(() => {
        setHighlightedMessageId(curr => (curr === targetMsgId ? null : curr));
      }, 1800);
    }
  };

  // Dừng bot trả lời khi người dùng bấm Stop
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Tải danh sách Lệnh Nhanh Hệ Thống khi mở drawer
  useEffect(() => {
    if (isOpen) {
      getSystemQuickCommands().then(cmds => {
        if (Array.isArray(cmds) && cmds.length > 0) {
          setSystemCommands(cmds);
        }
      });
    }
  }, [isOpen]);

  // Tự động lưu chat vào storage riêng của tài khoản hiện tại
  useEffect(() => {
    try {
      localStorage.setItem(`mascot_chat_${currentUserId}_${mascotId}`, JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentUserId, mascotId]);

  // Focus input khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Xử lý khi gõ vào ô nhập liệu (bật menu lệnh / khi bắt đầu bằng /)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (val.startsWith('/') && !val.includes(' ')) {
      setShowCommandsMenu(true);
      setActiveCommandIndex(0);
    } else {
      setShowCommandsMenu(false);
    }
  };

  // Filter commands matching current input
  const filteredCommands = systemCommands.filter(c => {
    if (!inputVal.startsWith('/')) return true;
    const query = inputVal.toLowerCase();
    return c.command.toLowerCase().startsWith(query) || c.label.toLowerCase().includes(query.slice(1));
  });

  const handleShowPersonalityInfo = () => {
    if (settings.soundEnabled) {
      soundManager.playCorrect();
    }
    const userPromptOverride = settings.mascotCustomPrompts?.[mascotId];
    const hasCustomPrompt = Boolean(userPromptOverride && userPromptOverride.trim().length > 0);
    const activePromptText = getActiveMascotPrompt(mascotId, userPromptOverride);
    const accountLabel = currentUser?.fullName || 'Khách (Guest)';
    const emailLabel = currentUser?.email ? ` (${currentUser.email})` : '';

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: '/tinhcach',
      timestamp: Date.now(),
    };

    const infoMsg: ChatMessage = {
      id: 'msg_personality_' + (Date.now() + 1),
      sender: 'mascot',
      text: `🎭 **Hồ Sơ Tính Cách & Cấu Hình Đang Áp Dụng Cho Linh Vật**

• **Linh vật**: **${mascotInfo.name}** (\`${mascotHandle}\`)
• **Tài khoản**: **${accountLabel}**${emailLabel}
• **Trạng thái**: ${hasCustomPrompt ? '🟢 **Đang dùng Tính cách TÙY BIẾN của tài khoản này**' : '🔵 **Đang dùng Tính cách MẶC ĐỊNH chuẩn của hệ thống**'}
• **Mô hình AI đang kết nối**: \`${activeProvider.toUpperCase()}\` (${activeModel})

---
📝 **Chi tiết System Instruction (Prompt) gửi tới AI:**
\`\`\`text
${activePromptText}
\`\`\`

*(💡 **Mẹo**: Bạn có thể vào phần **Cài đặt cá nhân** để tùy chỉnh tính cách cho từng linh vật riêng biệt cho tài khoản này bất cứ lúc nào).*`,
      timestamp: Date.now() + 1,
    };

    setMessages(prev => [...prev, userMsg, infoMsg]);
  };

  const handleSelectCommand = (cmd: QuickCommandItem) => {
    if (cmd.command === '/clear') {
      setShowClearConfirmModal(true);
      setInputVal('');
      setShowCommandsMenu(false);
      return;
    }
    if (cmd.command === '/tinhcach') {
      handleShowPersonalityInfo();
      setInputVal('');
      setShowCommandsMenu(false);
      return;
    }
    setInputVal(`${cmd.command} `);
    setShowCommandsMenu(false);
    inputRef.current?.focus();
  };

  // Xóa / Làm mới chat (chỉ xóa riêng của tài khoản và mascot này)
  const handleClearChat = () => {
    const freshMessages: ChatMessage[] = [
      {
        id: 'msg_' + Date.now(),
        sender: 'mascot',
        text: `🧹 Đã làm mới bộ nhớ trò chuyện! Tớ là **${mascotInfo.name}** (${mascotHandle}), sẵn sàng cho câu hỏi mới của bạn rồi đây!`,
        timestamp: Date.now(),
      }
    ];
    setMessages(freshMessages);
    setReplyingTo(null);
    setErrorMsg(null);
    try {
      localStorage.removeItem(`mascot_chat_${currentUserId}_${mascotId}`);
    } catch (e) {
      // ignore
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async (textOverride?: string) => {
    const rawText = (textOverride !== undefined ? textOverride : inputVal).trim();
    const currentAttachment = pendingAttachment;

    if ((!rawText && !currentAttachment) || isLoading) return;

    // Kiểm tra nếu là lệnh /clear -> Mở modal xác nhận
    if (rawText.toLowerCase() === '/clear') {
      setShowClearConfirmModal(true);
      setInputVal('');
      setPendingAttachment(null);
      return;
    }

    // Kiểm tra nếu là lệnh /tinhcach hoặc /personality
    if (
      rawText.toLowerCase() === '/tinhcach' || 
      rawText.toLowerCase() === '/personality' || 
      rawText.toLowerCase() === '/prompt'
    ) {
      handleShowPersonalityInfo();
      setInputVal('');
      setPendingAttachment(null);
      return;
    }

    const textToSend = rawText || (
      currentAttachment?.type === 'image' 
        ? 'Hãy quan sát và phân tích bức ảnh này giúp tôi nhé!' 
        : `Hãy đọc và giải thích nội dung tệp "${currentAttachment?.name}" giúp tôi nhé!`
    );

    if (settings.soundEnabled) {
      soundManager.playMascotPoke();
    }

    const newUserMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
      quotedMessage: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender,
        text: replyingTo.text,
      } : undefined,
      attachment: currentAttachment || undefined,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputVal('');
    setPendingAttachment(null);
    const targetReply = replyingTo;
    setReplyingTo(null);
    setShowCommandsMenu(false);
    setIsLoading(true);
    setErrorMsg(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const activeKey = settings.providerApiKeys?.[activeProvider] 
        || settings.customApiKey 
        || (activeProvider === 'gemini' ? settings.customGeminiApiKey : undefined);
      const activeBaseUrl = settings.providerBaseUrls?.[activeProvider] || settings.customBaseUrl;

      // Ưu tiên tính cách của riêng user đó, nếu không có sẽ tự động lấy tính cách chuẩn mặc định của mascot
      const userPromptOverride = settings.mascotCustomPrompts?.[mascotId];
      const customFallbackModels = (settings.customProviderModels?.[activeProvider] || []).map(m => m.id);

      const reply = await sendMascotChatMessage({
        message: textToSend,
        history: messages,
        mascotId,
        provider: activeProvider,
        model: activeModel,
        fallbackModels: customFallbackModels,
        baseUrl: activeBaseUrl,
        customApiKey: settings.aiProvider === 'custom' ? activeKey : (activeKey || undefined),
        userPromptOverride,
        quotedMessage: targetReply ? {
          id: targetReply.id,
          sender: targetReply.sender,
          text: targetReply.text,
        } : undefined,
        studentName: currentUser?.fullName,
        signal: controller.signal,
        attachment: currentAttachment || undefined,
      });

      const newMascotMsg: ChatMessage = {
        id: 'msg_m_' + Date.now(),
        sender: 'mascot',
        text: reply,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, newMascotMsg]);
      if (settings.soundEnabled) {
        soundManager.playCorrect();
      }
    } catch (err: any) {
      // Nếu người dùng chủ động bấm Stop hoặc request bị abort, không hiển thị lỗi
      if (err.name === 'AbortError' || err.message?.includes('aborted') || controller.signal.aborted) {
        return;
      }

      let errorText = err.message || 'Không thể kết nối đến AI';
      try {
        if (errorText.includes('{') && errorText.includes('}')) {
          const startIdx = errorText.indexOf('{');
          const endIdx = errorText.lastIndexOf('}') + 1;
          const parsed = JSON.parse(errorText.substring(startIdx, endIdx));
          if (parsed.error?.message) {
            errorText = parsed.error.message;
          }
        }
      } catch (_) {}

      if (errorText.includes('503') || errorText.includes('high demand') || errorText.includes('UNAVAILABLE')) {
        errorText = 'Máy chủ AI hiện đang chịu tải cao tạm thời. Bạn vui lòng thử lại sau vài giây nhé.';
      } else if (errorText.includes('Unexpected token') || errorText.includes('not valid JSON') || errorText.includes('The page c')) {
        errorText = 'Không thể kết nối đến máy chủ AI (Mạng hoặc cấu hình chưa sẵn sàng). Vui lòng bấm biểu tượng "Mô hình" để nhập API Key cá nhân (Google Gemini, OpenAI, DeepSeek...) và thử lại nhé.';
      }

      setErrorMsg(errorText);
      const isCustomKeyHint = errorText.includes('API Key') || errorText.includes('Mô hình');
      const errorMsgItem: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'mascot',
        text: `⚠️ **Thông báo**: ${errorText}${!isCustomKeyHint ? '\n\n*Gợi ý: Vui lòng bấm vào nút biểu tượng "Mô hình" ở góc trên khung chat để kiểm tra hoặc nhập API Key cá nhân của bạn nhé!*' : ''}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsgItem]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Bàn phím: Enter để gửi (Shift+Enter để xuống dòng)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandsMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCommandIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectCommand(filteredCommands[activeCommandIndex] || filteredCommands[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandsMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Long-press trên thiết bị cảm ứng để Reply tin nhắn
  const handleTouchStart = (msg: ChatMessage) => {
    longPressTimerRef.current = setTimeout(() => {
      setReplyingTo(msg);
      inputRef.current?.focus();
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      
      {/* Chat Container Card */}
      <div 
        className={`w-full sm:max-w-lg h-[85vh] sm:h-[620px] max-h-[92vh] ${theme.card} border ${theme.border} rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className={`px-4 py-3 border-b ${theme.border} flex items-center justify-between gap-2 shrink-0 ${theme.highlight}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mascot Avatar */}
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              <StudyMascot size={38} interactivePoke={false} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`font-bold text-sm sm:text-base leading-tight truncate ${theme.text}`}>
                  {mascotInfo.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {mascotHandle}
                </span>
                <button
                  type="button"
                  onClick={() => setIsModelPickerOpen(true)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.textMuted} hover:text-emerald-500 border ${theme.border} cursor-pointer transition-colors`}
                  title="Nhấn để đổi mô hình AI"
                >
                  {currentModelInfo.name}
                </button>
              </div>
              <p className={`text-[11px] ${theme.textMuted} flex items-center gap-1 truncate`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isLoading ? 'Đang suy nghĩ câu trả lời...' : 'Trực tuyến • Sẵn sàng hỗ trợ'}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsModelPickerOpen(true)}
              title="Thiết lập API & Mô hình cá nhân"
              className="p-2 rounded-xl text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Mô hình</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              title="Xóa lịch sử trò chuyện của tài khoản này"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng cửa sổ chat"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isHighlighted = highlightedMessageId === msg.id;

            return (
              <div
                id={`chat-msg-${msg.id}`}
                key={msg.id}
                onTouchStart={() => handleTouchStart(msg)}
                onTouchEnd={handleTouchEnd}
                className={`flex flex-col group relative transition-all duration-300 ${isUser ? 'items-end' : 'items-start'} ${
                  isHighlighted ? 'scale-[1.02] ring-2 ring-emerald-500 rounded-2xl bg-emerald-500/15 p-1' : ''
                }`}
              >
                {/* Desktop Reply Button on hover */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(msg);
                    inputRef.current?.focus();
                  }}
                  title="Trả lời câu này"
                  className={`hidden group-hover:flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-500 p-1 mb-0.5 cursor-pointer transition-opacity ${
                    isUser ? 'mr-1' : 'ml-1'
                  }`}
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Trả lời</span>
                </button>

                {/* Bubble Container */}
                <div
                  className={`rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm shadow-xs select-text transition-all ${
                    isUser
                      ? 'max-w-[85%] sm:max-w-[80%] bg-emerald-600 text-white rounded-br-xs'
                      : `w-full max-w-[94%] sm:max-w-[90%] border ${theme.border} ${theme.highlight} ${theme.text} rounded-bl-xs`
                  }`}
                >
                  {/* Quoted Message - Click để nhảy tới tin nhắn gốc */}
                  {msg.quotedMessage && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(msg.quotedMessage!.id);
                      }}
                      title="Nhấn để nhảy tới tin nhắn gốc"
                      className={`mb-2 p-2 rounded-xl text-xs border-l-3 select-none cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] ${
                        isUser
                          ? 'bg-black/20 border-white/70 text-white/95 hover:bg-black/30'
                          : 'bg-black/5 dark:bg-white/5 border-emerald-500 text-neutral-400 dark:text-neutral-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      <div className="font-bold text-[10px] uppercase opacity-85 flex items-center justify-between gap-1 mb-0.5">
                        <span>{msg.quotedMessage.sender === 'user' ? 'Bạn' : mascotHandle}</span>
                        <span className="text-[9px] lowercase font-normal opacity-70">nhấn để tới gốc ↗</span>
                      </div>
                      <p className="truncate line-clamp-2 italic">
                        "{msg.quotedMessage.text}"
                      </p>
                    </div>
                  )}

                  {/* Attachment in Message */}
                  {msg.attachment && (
                    <div className="mb-2">
                      {msg.attachment.type === 'image' ? (
                        <div 
                          onClick={() => setPreviewImageModal(msg.attachment!.dataUrl)}
                          className="group/img relative rounded-xl overflow-hidden border border-black/15 dark:border-white/15 cursor-pointer max-w-[240px] sm:max-w-xs shadow-xs"
                          title="Nhấn để xem ảnh phóng to"
                        >
                          <img 
                            src={msg.attachment.dataUrl} 
                            alt={msg.attachment.name || 'Ảnh đính kèm'} 
                            className="w-full max-h-48 sm:max-h-56 object-cover hover:scale-105 transition-transform duration-200" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium backdrop-blur-xs">
                            <ZoomIn className="w-4 h-4" />
                            <span>Phóng to ảnh</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                          isUser 
                            ? 'bg-black/20 border-white/25 text-white' 
                            : 'bg-black/5 dark:bg-white/5 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                        }`}>
                          <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{msg.attachment.name}</p>
                            <p className="text-[10px] opacity-75">
                              {msg.attachment.size ? `${Math.round(msg.attachment.size / 1024)} KB • ` : ''}
                              Tệp đính kèm
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content with Rich Markdown, GFM Tables & Interactive Code Blocks */}
                  <div className="w-full">
                    <ChatMessageRenderer content={msg.text} isUser={isUser} />
                  </div>

                  {/* Timestamp & Bot label */}
                  <div className={`mt-1 text-[10px] flex items-center justify-end gap-1 select-none opacity-60 ${
                    isUser ? 'text-white' : theme.textMuted
                  }`}>
                    {!isUser && <span className="font-semibold text-emerald-500">{mascotHandle}</span>}
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-2 animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs animate-bounce">
                {mascotInfo.emoji}
              </div>
              <div className={`p-2.5 sm:p-3 rounded-2xl rounded-bl-xs border ${theme.border} ${theme.highlight} text-xs flex items-center gap-2 shadow-xs`}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
                <span className={theme.textMuted}>{mascotInfo.name} đang suy nghĩ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Quick Command Popup Menu */}
        {showCommandsMenu && filteredCommands.length > 0 && (
          <div className={`absolute bottom-[75px] left-3 right-3 sm:left-4 sm:right-4 z-20 ${theme.card} border ${theme.border} rounded-2xl shadow-2xl p-1.5 max-h-56 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150`}>
            <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} flex items-center justify-between`}>
              <span>Menu Lệnh Phím Tắt Hệ Thống</span>
              <span>Dùng ↑ ↓ & Enter</span>
            </div>
            {filteredCommands.map((cmd, idx) => {
              const Icon = (cmd.iconName && QUICK_COMMAND_ICONS[cmd.iconName]) || Sparkles;
              const isSelected = idx === activeCommandIndex;
              return (
                <div
                  key={cmd.id || cmd.command}
                  onClick={() => handleSelectCommand(cmd)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium' : `${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs font-mono text-emerald-500">{cmd.command}</span>
                      <span className="text-xs ml-1.5 opacity-90 truncate">— {cmd.label}</span>
                      <p className={`text-[11px] ${theme.textMuted} truncate`}>{cmd.description}</p>
                    </div>
                  </div>
                  {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Replying Banner */}
        {replyingTo && (
          <div className={`px-3 py-1.5 border-t ${theme.border} bg-emerald-500/10 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-1 duration-100`}>
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs truncate">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Trả lời {replyingTo.sender === 'user' ? 'Bạn' : mascotHandle}:
                </span>{' '}
                <span className={`italic opacity-80 ${theme.text}`}>"{replyingTo.text}"</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-neutral-400 hover:text-neutral-200 p-1 cursor-pointer shrink-0"
              title="Hủy trích dẫn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Attachment Preview */}
        {pendingAttachment && (
          <div className="px-3 pt-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 overflow-hidden">
                {pendingAttachment.type === 'image' ? (
                  <img 
                    src={pendingAttachment.dataUrl} 
                    alt="Preview" 
                    className="w-10 h-10 rounded-lg object-cover border border-emerald-500/40" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="truncate">
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[180px] sm:max-w-xs">
                    {pendingAttachment.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {pendingAttachment.size ? `${Math.round(pendingAttachment.size / 1024)} KB • ` : ''}
                    {pendingAttachment.type === 'image' ? 'Ảnh đính kèm' : 'Tệp tài liệu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="p-1 rounded-lg hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Gỡ đính kèm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input & Commands Bar */}
        <div className={`p-2.5 sm:p-3 border-t ${theme.border} ${theme.bg} shrink-0`}>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx"
            className="hidden"
          />

          <div className="flex items-end gap-1.5 sm:gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95 ${
                pendingAttachment 
                  ? 'text-emerald-500 border-emerald-500/50 bg-emerald-500/15 ring-2 ring-emerald-500/20' 
                  : `border ${theme.border} ${theme.card} text-neutral-400 hover:text-emerald-500 hover:border-emerald-500/40`
              }`}
              title="Đính kèm hình ảnh hoặc tệp hỏi bài (hoặc dán ảnh Ctrl+V)"
            >
              <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Microphone Button (Speech to text) */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/30 animate-pulse ring-2 ring-rose-500/40'
                  : `border ${theme.border} ${theme.card} text-neutral-400 hover:text-emerald-500 hover:border-emerald-500/40`
              }`}
              title={isListening ? 'Đang nghe... Bấm để dừng mic' : 'Nói để chuyển thành chữ (Speech to text tiếng Việt)'}
            >
              {isListening ? <MicOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </button>

            {/* Textarea */}
            <div className="flex-1 relative flex items-center">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputVal}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  isListening 
                    ? 'Đang lắng nghe bạn nói...' 
                    : `Nhắn tin cho ${mascotInfo.name}...`
                }
                className={`w-full min-h-[40px] sm:min-h-[44px] max-h-28 resize-none py-2.5 sm:py-3 px-3 sm:px-3.5 rounded-2xl border ${
                  isListening ? 'border-rose-500/60 ring-2 ring-rose-500/20' : `${theme.border} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`
                } ${theme.card} ${theme.text} text-xs sm:text-sm focus:outline-hidden leading-tight transition-all`}
              />
              {isListening && (
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-md pointer-events-none animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Đang nghe...</span>
                </div>
              )}
            </div>

            {/* Send or Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGenerating}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center"
                title="Dừng bot trả lời"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!inputVal.trim() && !pendingAttachment}
                onClick={() => handleSendMessage()}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white cursor-pointer active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center"
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* OpenCode Model & Personality Picker Modal */}
      <OpenCodeModelPicker
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        currentProvider={activeProvider}
        currentModel={activeModel}
        savedApiKey={settings.customApiKey || settings.customGeminiApiKey || ''}
        savedBaseUrl={settings.customBaseUrl || ''}
        providerApiKeys={settings.providerApiKeys || {}}
        providerBaseUrls={settings.providerBaseUrls || {}}
        customProviderModels={settings.customProviderModels || {}}
        mascotCustomPrompts={settings.mascotCustomPrompts || {}}
        currentMascotId={mascotId}
        onSelectModel={(
          provider, 
          modelId, 
          customApiKey, 
          customBaseUrl, 
          updatedProviderApiKeys, 
          updatedProviderBaseUrls, 
          updatedMascotPrompts,
          updatedCustomModels,
          selectedMascotId
        ) => {
          setActiveProvider(provider);
          setActiveModel(modelId);
          updateSettings({
            aiProvider: 'custom',
            aiProviderType: provider,
            aiModel: modelId,
            customApiKey: customApiKey || '',
            customGeminiApiKey: provider === 'gemini' ? (customApiKey || '') : undefined,
            ...(customBaseUrl !== undefined ? { customBaseUrl } : {}),
            ...(updatedProviderApiKeys ? { providerApiKeys: updatedProviderApiKeys } : {}),
            ...(updatedProviderBaseUrls ? { providerBaseUrls: updatedProviderBaseUrls } : {}),
            ...(updatedMascotPrompts ? { mascotCustomPrompts: updatedMascotPrompts } : {}),
            ...(updatedCustomModels ? { customProviderModels: updatedCustomModels } : {}),
            ...(selectedMascotId ? { mascotType: selectedMascotId } : {}),
          });
        }}
      />

      {/* Confirm Clear Chat History Modal */}
      <ConfirmModal
        isOpen={showClearConfirmModal}
        title="Xóa Lịch Sử Trò Chuyện?"
        message={`Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với linh vật ${mascotInfo.name} không? Toàn bộ tin nhắn với linh vật này của tài khoản sẽ được làm mới hoàn toàn.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isDanger={true}
        iconType="danger"
        onConfirm={handleClearChat}
        onCancel={() => setShowClearConfirmModal(false)}
      />

      {/* Lightbox Preview Modal for Images */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Đóng ảnh phóng to"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageModal} 
              alt="Chi tiết ảnh" 
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
