import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Key, 
  Sliders, 
  Bot, 
  Brain, 
  Zap, 
  Globe, 
  Search, 
  ChevronRight,
  Info,
  RotateCcw,
  MessageSquare,
  Copy,
  Edit3,
  Plus,
  Trash2
} from 'lucide-react';
import { AIProviderType, MascotType, CustomAIModel } from '../types';
import { AI_PROVIDERS, PROVIDER_LIST, getModelInfo } from '../utils/aiProviders';
import { DEFAULT_MASCOT_PROMPTS, MASCOT_HANDLES } from '../utils/mascotAI';
import { MASCOT_LIST } from '../utils/mascotSprites';
import { useTheme } from '../context/ThemeContext';

interface OpenCodeModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvider: AIProviderType;
  currentModel: string;
  savedApiKey?: string;
  savedBaseUrl?: string;
  providerApiKeys?: Partial<Record<AIProviderType, string>>;
  providerBaseUrls?: Partial<Record<AIProviderType, string>>;
  customProviderModels?: Partial<Record<AIProviderType, CustomAIModel[]>>;
  mascotCustomPrompts?: Partial<Record<MascotType, string>>;
  currentMascotId?: MascotType;
  onSelectModel: (
    provider: AIProviderType, 
    modelId: string, 
    customApiKey?: string, 
    customBaseUrl?: string,
    updatedProviderApiKeys?: Partial<Record<AIProviderType, string>>,
    updatedProviderBaseUrls?: Partial<Record<AIProviderType, string>>,
    updatedMascotPrompts?: Partial<Record<MascotType, string>>,
    updatedCustomModels?: Partial<Record<AIProviderType, CustomAIModel[]>>
  ) => void;
}

export const OpenCodeModelPicker: React.FC<OpenCodeModelPickerProps> = ({
  isOpen,
  onClose,
  currentProvider,
  currentModel,
  savedApiKey = '',
  savedBaseUrl = '',
  providerApiKeys = {},
  providerBaseUrls = {},
  customProviderModels = {},
  mascotCustomPrompts = {},
  currentMascotId = 'fox',
  onSelectModel,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Active top tab: 'models' | 'personalities'
  const [activeTab, setActiveTab] = useState<'models' | 'personalities'>('models');

  // Model selection state
  const [activeProvider, setActiveProvider] = useState<AIProviderType>(currentProvider || 'gemini');
  const [selectedModelId, setSelectedModelId] = useState<string>(currentModel || AI_PROVIDERS.gemini.defaultModel);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isManualTyping, setIsManualTyping] = useState<boolean>(false);
  
  // Custom Saved Models by Provider
  const [customModelsByProvider, setCustomModelsByProvider] = useState<Partial<Record<AIProviderType, CustomAIModel[]>>>(() => ({
    ...customProviderModels
  }));
  const [isAddingModel, setIsAddingModel] = useState<boolean>(false);
  const [newModelIdInput, setNewModelIdInput] = useState<string>('');
  const [newModelNameInput, setNewModelNameInput] = useState<string>('');
  const [newModelDescInput, setNewModelDescInput] = useState<string>('');
  const [newModelBadgeInput, setNewModelBadgeInput] = useState<string>('');

  // Per-provider keys & URLs
  const [keysByProvider, setKeysByProvider] = useState<Partial<Record<AIProviderType, string>>>(() => {
    const initial = { ...providerApiKeys };
    if (savedApiKey && !initial[currentProvider]) {
      initial[currentProvider] = savedApiKey;
    }
    return initial;
  });

  const [urlsByProvider, setUrlsByProvider] = useState<Partial<Record<AIProviderType, string>>>(() => {
    const initial = { ...providerBaseUrls };
    if (savedBaseUrl && !initial[currentProvider]) {
      initial[currentProvider] = savedBaseUrl;
    }
    return initial;
  });

  const [apiKeyInput, setApiKeyInput] = useState<string>(
    providerApiKeys[currentProvider] || savedApiKey || ''
  );
  const [baseUrlInput, setBaseUrlInput] = useState<string>(
    providerBaseUrls[currentProvider] || savedBaseUrl || ''
  );

  // Personality editing state
  const [selectedMascot, setSelectedMascot] = useState<MascotType>(currentMascotId);
  const [customPrompts, setCustomPrompts] = useState<Partial<Record<MascotType, string>>>(() => ({
    ...mascotCustomPrompts
  }));
  const [personalityDraft, setPersonalityDraft] = useState<string>(
    mascotCustomPrompts[currentMascotId] || ''
  );
  const [showDefaultPromptPreview, setShowDefaultPromptPreview] = useState<boolean>(false);

  // Only sync state when modal transitions from closed to open
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setActiveProvider(currentProvider || 'gemini');
      setSelectedModelId(currentModel || AI_PROVIDERS.gemini.defaultModel);
      setApiKeyInput(providerApiKeys[currentProvider] || savedApiKey || '');
      setBaseUrlInput(providerBaseUrls[currentProvider] || savedBaseUrl || '');
      setCustomModelsByProvider(customProviderModels || {});
      setSelectedMascot(currentMascotId);
      setPersonalityDraft(mascotCustomPrompts[currentMascotId] || '');
      setCustomPrompts({ ...mascotCustomPrompts });
      setIsAddingModel(false);

      // Check if current model is outside default list
      const providerMeta = AI_PROVIDERS[currentProvider];
      const customList = (customProviderModels && customProviderModels[currentProvider]) || [];
      const isKnown = (providerMeta && providerMeta.models.some(m => m.id === currentModel)) || customList.some(m => m.id === currentModel);
      if (!isKnown && currentModel) {
        setIsManualTyping(true);
        setCustomModelInput(currentModel);
      } else {
        setIsManualTyping(false);
        setCustomModelInput('');
      }
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  // Handle provider switch
  const handleSwitchProvider = (providerId: AIProviderType) => {
    setActiveProvider(providerId);
    const existingKey = keysByProvider[providerId] || '';
    const existingUrl = urlsByProvider[providerId] || '';
    setApiKeyInput(existingKey);
    setBaseUrlInput(existingUrl);
    setIsAddingModel(false);

    const defaultMod = AI_PROVIDERS[providerId]?.defaultModel || AI_PROVIDERS.gemini.defaultModel;
    setSelectedModelId(defaultMod);
    setCustomModelInput('');
    setIsManualTyping(false);
  };

  const handleKeyChange = (val: string) => {
    setApiKeyInput(val);
    setKeysByProvider(prev => ({ ...prev, [activeProvider]: val }));
  };

  const handleUrlChange = (val: string) => {
    setBaseUrlInput(val);
    setUrlsByProvider(prev => ({ ...prev, [activeProvider]: val }));
  };

  // Add custom model permanently
  const handleSaveNewCustomModel = () => {
    const trimmedId = newModelIdInput.trim();
    if (!trimmedId) return;

    const newModel: CustomAIModel = {
      id: trimmedId,
      name: newModelNameInput.trim() || trimmedId,
      provider: activeProvider,
      description: newModelDescInput.trim() || 'Mô hình tùy chỉnh đã lưu',
      badge: newModelBadgeInput.trim() || 'Tùy Chỉnh',
      createdAt: Date.now(),
    };

    setCustomModelsByProvider(prev => {
      const currentList = prev[activeProvider] || [];
      // Replace if already exists with same id, else append
      const filtered = currentList.filter(m => m.id !== trimmedId);
      return {
        ...prev,
        [activeProvider]: [...filtered, newModel],
      };
    });

    setSelectedModelId(trimmedId);
    setIsManualTyping(false);
    setCustomModelInput('');
    // Reset form
    setNewModelIdInput('');
    setNewModelNameInput('');
    setNewModelDescInput('');
    setNewModelBadgeInput('');
    setIsAddingModel(false);
  };

  // Delete a custom model from the saved list
  const handleDeleteCustomModel = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomModelsByProvider(prev => {
      const currentList = prev[activeProvider] || [];
      const updated = currentList.filter(m => m.id !== modelId);
      return {
        ...prev,
        [activeProvider]: updated,
      };
    });

    if (selectedModelId === modelId) {
      setSelectedModelId(activeProviderMeta.defaultModel);
    }
  };

  // Switch Mascot for personality editing
  const handleSelectMascotForPersonality = (mascotId: MascotType) => {
    // Save current draft before switching
    setCustomPrompts(prev => ({
      ...prev,
      [selectedMascot]: personalityDraft.trim() || undefined,
    }));

    setSelectedMascot(mascotId);
    setPersonalityDraft(customPrompts[mascotId] || '');
    setShowDefaultPromptPreview(false);
  };

  const handleResetCurrentMascotPersonality = () => {
    setPersonalityDraft('');
    setCustomPrompts(prev => {
      const copy = { ...prev };
      delete copy[selectedMascot];
      return copy;
    });
  };

  const handleCopyDefaultPromptToDraft = () => {
    const defaultText = DEFAULT_MASCOT_PROMPTS[selectedMascot] || '';
    setPersonalityDraft(defaultText);
  };

  if (!isOpen) return null;

  const activeProviderMeta = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;
  const currentProviderCustomModels = customModelsByProvider[activeProvider] || [];

  // Render provider icon
  const renderProviderIcon = (type: string, className = 'w-4 h-4') => {
    switch (type) {
      case 'sparkles':
        return <Sparkles className={className} />;
      case 'bot':
        return <Bot className={className} />;
      case 'brain':
        return <Brain className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'globe':
      default:
        return <Globe className={className} />;
    }
  };

  const handleApply = () => {
    const finalModel = isManualTyping && customModelInput.trim() 
      ? customModelInput.trim() 
      : selectedModelId;
    const finalKey = apiKeyInput.trim() || undefined;
    const finalUrl = baseUrlInput.trim() || undefined;
    const updatedKeys = { ...keysByProvider, [activeProvider]: apiKeyInput.trim() };
    const updatedUrls = { ...urlsByProvider, [activeProvider]: baseUrlInput.trim() };

    // Finalize custom prompts
    const updatedPrompts: Partial<Record<MascotType, string>> = {
      ...customPrompts,
    };
    if (personalityDraft.trim().length > 0) {
      updatedPrompts[selectedMascot] = personalityDraft.trim();
    } else {
      delete updatedPrompts[selectedMascot];
    }

    onSelectModel(
      activeProvider,
      finalModel,
      finalKey,
      finalUrl,
      updatedKeys,
      updatedUrls,
      updatedPrompts,
      customModelsByProvider
    );
    onClose();
  };

  const currentMascotObj = MASCOT_LIST.find(m => m.id === selectedMascot) || MASCOT_LIST[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className={`w-full sm:max-w-xl max-h-[92vh] ${theme.card} border ${theme.border} ${theme.text} rounded-3xl shadow-2xl flex flex-col overflow-hidden`}>
        
        {/* Header with 2 Primary Tabs */}
        <div className={`p-4 border-b ${theme.border} ${theme.highlight} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-sm sm:text-base font-bold ${theme.text}`}>
                  Thiết Lập API & Tính Cách Cá Nhân
                </h2>
                <p className={`text-[11px] ${theme.textMuted}`}>
                  Lưu riêng cho tài khoản của bạn • Hoàn toàn độc lập & bảo mật
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full border ${theme.border} flex items-center justify-center ${theme.textMuted} hover:${theme.text} cursor-pointer transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher: Models vs Personalities */}
          <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl ${theme.card} border ${theme.border}`}>
            <button
              type="button"
              onClick={() => setActiveTab('models')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'models'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : `${theme.textMuted} hover:${theme.text}`
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>1. Mô Hình AI & Khóa API</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('personalities')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'personalities'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : `${theme.textMuted} hover:${theme.text}`
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>2. Tính Cách Linh Vật (@bot)</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: MODELS & API KEYS */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              
              {/* Provider Selector Tabs */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>
                  Chọn Nhà Cung Cấp AI
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDER_LIST.map(p => {
                    const isSelected = activeProvider === p.id;
                    const hasKey = !!keysByProvider[p.id];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSwitchProvider(p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                            : `${theme.border} ${theme.highlight} ${theme.text} hover:opacity-80`
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {renderProviderIcon(p.iconType, 'w-4 h-4 shrink-0 text-emerald-500')}
                          <span className="text-xs truncate">{p.name}</span>
                        </div>
                        {hasKey && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Đã có API Key" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Models List for Selected Provider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                    Mục Tiêu Đề Xuất Cho {activeProviderMeta.brandName}
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsManualTyping(!isManualTyping)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isManualTyping ? 'Chọn từ danh sách' : 'Tự gõ model bằng tay'}</span>
                  </button>
                </div>

                {isManualTyping ? (
                  <div className={`p-3.5 rounded-xl border ${theme.border} ${theme.highlight} space-y-2`}>
                    <label className={`text-xs font-bold block ${theme.text}`}>
                      Nhập mã định danh Model ID
                    </label>
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={e => setCustomModelInput(e.target.value)}
                      placeholder={activeProviderMeta.defaultModel}
                      className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} ${theme.text} font-mono focus:outline-hidden focus:border-emerald-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500`}
                    />
                    <p className={`text-[11px] ${theme.textMuted}`}>
                      Ví dụ: <code>gemini-3.8-flash</code>, <code>claude-opus-4-8</code>, <code>deepseek-chat</code>...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                      {/* Default Built-in Models */}
                      {activeProviderMeta.models.map(m => {
                        const isSelected = selectedModelId === m.id && !isManualTyping;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedModelId(m.id);
                              setIsManualTyping(false);
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                : `${theme.border} ${theme.highlight} hover:opacity-80`
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : theme.text}`}>
                                  {m.name}
                                </span>
                                <p className={`text-[11px] ${theme.textMuted} mt-0.5 line-clamp-1`}>
                                  {m.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {m.badge && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                    {m.badge}
                                  </span>
                                )}
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-500 ml-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Custom Saved Models added by user */}
                      {currentProviderCustomModels.map(m => {
                        const isSelected = selectedModelId === m.id && !isManualTyping;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedModelId(m.id);
                              setIsManualTyping(false);
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all relative group ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                : `${theme.border} ${theme.highlight} hover:opacity-80`
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 pr-6">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : theme.text}`}>
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] font-mono opacity-60">
                                    ({m.id})
                                  </span>
                                </div>
                                <p className={`text-[11px] ${theme.textMuted} mt-0.5 line-clamp-1`}>
                                  {m.description || 'Mô hình tùy chỉnh đã lưu'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                                  {m.badge || 'Tùy Chỉnh'}
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-500 ml-1" />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomModel(m.id, e)}
                                  className="p-1 rounded-lg hover:bg-rose-500/15 text-neutral-400 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                                  title="Xóa model này khỏi danh sách đã lưu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Model Form Toggle & Inputs */}
                    {isAddingModel ? (
                      <div className={`p-3 rounded-2xl border border-emerald-500/30 ${theme.highlight} space-y-2.5 animate-in fade-in duration-150`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm model mới vào danh sách {activeProviderMeta.brandName}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingModel(false)}
                            className={`text-[11px] ${theme.textMuted} hover:${theme.text} cursor-pointer`}
                          >
                            Đóng
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className={`text-[11px] font-semibold block mb-1 ${theme.text}`}>
                              Mã Model ID <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newModelIdInput}
                              onChange={e => setNewModelIdInput(e.target.value)}
                              placeholder={
                                activeProvider === 'custom'
                                  ? "VD: deepseek-chat, mistral-large, llama-3.3-70b..."
                                  : activeProvider === 'openrouter'
                                  ? "VD: anthropic/claude-3.5-sonnet, openai/gpt-4o..."
                                  : "VD: gemini-1.5-pro, claude-3-5-sonnet..."
                              }
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg ${theme.inputBg} border ${theme.border} ${theme.text} font-mono focus:outline-hidden focus:border-emerald-500`}
                            />
                          </div>

                          <div>
                            <label className={`text-[11px] font-semibold block mb-1 ${theme.text}`}>
                              Tên hiển thị (Tùy chọn)
                            </label>
                            <input
                              type="text"
                              value={newModelNameInput}
                              onChange={e => setNewModelNameInput(e.target.value)}
                              placeholder="VD: Gemini 1.5 Pro, Claude Sonnet..."
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg ${theme.inputBg} border ${theme.border} ${theme.text} focus:outline-hidden focus:border-emerald-500`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <label className={`text-[11px] font-semibold block mb-1 ${theme.text}`}>
                              Mô tả ngắn (Tùy chọn)
                            </label>
                            <input
                              type="text"
                              value={newModelDescInput}
                              onChange={e => setNewModelDescInput(e.target.value)}
                              placeholder="VD: Mô hình chuyên phân tích câu khó..."
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg ${theme.inputBg} border ${theme.border} ${theme.text} focus:outline-hidden focus:border-emerald-500`}
                            />
                          </div>

                          <div>
                            <label className={`text-[11px] font-semibold block mb-1 ${theme.text}`}>
                              Huy hiệu / Badge
                            </label>
                            <input
                              type="text"
                              value={newModelBadgeInput}
                              onChange={e => setNewModelBadgeInput(e.target.value)}
                              placeholder="VD: Mới, Pro, VIP..."
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg ${theme.inputBg} border ${theme.border} ${theme.text} focus:outline-hidden focus:border-emerald-500`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingModel(false)}
                            className={`px-3 py-1 text-xs rounded-lg border ${theme.border} ${theme.text} hover:opacity-80 cursor-pointer`}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewCustomModel}
                            disabled={!newModelIdInput.trim()}
                            className="px-3.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lưu vào danh sách</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingModel(true);
                          setNewModelIdInput('');
                          setNewModelNameInput('');
                          setNewModelDescInput('');
                          setNewModelBadgeInput('');
                        }}
                        className={`w-full p-2.5 rounded-xl border border-dashed border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm model tùy chọn vào danh sách {activeProviderMeta.brandName}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* API Key & Base URL Settings for this Provider */}
              <div className={`p-3.5 rounded-xl border ${theme.border} ${theme.highlight} space-y-3`}>
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${theme.text}`}>
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    <span>API Key của {activeProviderMeta.name}</span>
                  </label>
                  {activeProviderMeta.docsUrl && (
                    <a
                      href={activeProviderMeta.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Lấy key miễn phí</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => handleKeyChange(e.target.value)}
                  placeholder={`Dán ${activeProviderMeta.name} API Key của bạn vào đây (${activeProviderMeta.keyPrefixHint})...`}
                  className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} ${theme.text} font-mono focus:outline-hidden focus:border-emerald-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500`}
                />

                {(activeProvider === 'openrouter' || activeProvider === 'custom') && (
                  <div className="space-y-1 pt-1">
                    <label className={`text-xs font-bold block ${theme.text}`}>
                      Custom Base URL
                    </label>
                    <input
                      type="text"
                      value={baseUrlInput}
                      onChange={e => handleUrlChange(e.target.value)}
                      placeholder={activeProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://your-api-endpoint.com/v1'}
                      className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} ${theme.text} font-mono focus:outline-hidden focus:border-emerald-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500`}
                    />
                  </div>
                )}

                <div className={`text-[10px] ${theme.textMuted} flex items-center gap-1.5`}>
                  <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Khóa API được lưu riêng cho tài khoản của bạn, không ảnh hưởng đến người dùng khác.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONALITY SETTINGS */}
          {activeTab === 'personalities' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                <strong>Tùy Biến Tính Cách Cho Từng Linh Vật:</strong> Bạn có thể điều chỉnh cách xưng hô, giọng điệu và phong cách giải bài của từng chú mascot theo sở thích riêng. Nếu để trống, linh vật sẽ tự động dùng tính cách chuẩn mực mặc định.
              </div>

              {/* Mascot Selector Tabs */}
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${theme.textMuted}`}>
                  Chọn Linh Vật Để Điều Chỉnh
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MASCOT_LIST.map(m => {
                    const isSelected = selectedMascot === m.id;
                    const hasCustom = !!customPrompts[m.id];
                    const handle = MASCOT_HANDLES[m.id];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMascotForPersonality(m.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                            : `${theme.border} ${theme.highlight} ${theme.text} hover:opacity-80`
                        }`}
                      >
                        <span className="text-base">{m.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate font-semibold">{m.name}</p>
                          <p className={`text-[10px] ${theme.textMuted} font-mono truncate`}>{handle}</p>
                        </div>
                        {hasCustom && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Có tính cách tùy biến" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personality Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{currentMascotObj.emoji}</span>
                    <label className={`text-xs font-bold ${theme.text}`}>
                      Chỉ dẫn tính cách ({currentMascotObj.name} - {MASCOT_HANDLES[selectedMascot]})
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDefaultPromptToDraft}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      title="Lấy nội dung tính cách mặc định để chỉnh sửa"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Chép mẫu mặc định</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetCurrentMascotPersonality}
                      className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      title="Xóa trắng để dùng tính cách gốc"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Dùng mặc định</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={personalityDraft}
                  onChange={e => setPersonalityDraft(e.target.value)}
                  placeholder={`(Để trống để sử dụng tính cách mặc định chuẩn học thuật của ${currentMascotObj.name}).\n\nVí dụ tùy biến:\n- Xưng hô "Cáo ca ca" hoặc "tớ", gọi người học là "học trò cưng".\n- Luôn đưa ra lời giải thích chi tiết, ngắn gọn, có ví dụ câu tiếng Anh thực tế.`}
                  className={`w-full p-3 text-xs rounded-xl ${theme.inputBg} border ${theme.border} ${theme.text} focus:outline-hidden focus:border-emerald-500 leading-relaxed font-sans placeholder:text-neutral-400 dark:placeholder:text-neutral-500`}
                />

                <div className={`flex items-center justify-between text-[11px] ${theme.textMuted}`}>
                  <span>
                    Trạng thái: {personalityDraft.trim() ? (
                      <strong className="text-amber-500">Đang dùng tính cách tùy biến riêng</strong>
                    ) : (
                      <strong className="text-emerald-600 dark:text-emerald-400">Đang dùng tính cách mặc định chuẩn của mascot</strong>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowDefaultPromptPreview(!showDefaultPromptPreview)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-semibold"
                  >
                    {showDefaultPromptPreview ? 'Ẩn tính cách mặc định' : 'Xem tính cách mặc định'}
                  </button>
                </div>

                {showDefaultPromptPreview && (
                  <div className={`p-3 rounded-xl ${theme.highlight} border ${theme.border} text-[11px] ${theme.text} whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto`}>
                    {DEFAULT_MASCOT_PROMPTS[selectedMascot]}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={`p-3.5 border-t ${theme.border} flex items-center justify-between ${theme.highlight}`}>
          <div className={`text-[11px] ${theme.textMuted}`}>
            {activeTab === 'models' ? (
              <span>Model: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{isManualTyping ? customModelInput || selectedModelId : selectedModelId}</strong></span>
            ) : (
              <span>Linh vật: <strong className="text-emerald-600 dark:text-emerald-400">{currentMascotObj.name}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-xl border ${theme.border} text-xs font-semibold ${theme.text} hover:opacity-80 cursor-pointer`}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Thiết Lập Cá Nhân</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
