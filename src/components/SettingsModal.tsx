import React, { useState, useEffect } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Coffee, 
  Type, 
  Volume2, 
  Smartphone, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  ShieldCheck,
  RotateCcw,
  Cloud,
  CloudUpload,
  RefreshCw,
  Globe,
  Sparkles,
  Play,
  Square,
  Mic,
  VolumeX,
  Info,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, FontSize, LineSpacing, VoiceGenderPreference, User, MascotType } from '../types';
import { exportAllData, importData, clearAllDatabase, syncDatabaseWithCloud, loadUsers, loadClassrooms, loadTopics, loadLessons, loadExercises, loadErrors, loadMediaAssets } from '../utils/storage';
import { syncAllToCloud } from '../lib/firebase';
import { speakText, getAvailableSpeechVoices } from '../utils/audio';
import { ConfirmModal } from './ConfirmModal';
import { MASCOT_LIST } from '../utils/mascotSprites';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReload: () => void;
  currentUser?: User | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataReload,
  currentUser,
}) => {
  const { settings, updateSettings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const isAdmin = currentUser?.role === 'admin';

  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Cloud sync states
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  // Voice testing state
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showAdvancedVoices, setShowAdvancedVoices] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = getAvailableSpeechVoices();
      setAvailableVoices(v.filter(item => item.lang.toLowerCase().startsWith('en')));
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleTestVoice = (genderOverride?: VoiceGenderPreference, speedOverride?: number, voiceUriOverride?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (isPlayingTestVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingTestVoice(false);
      return;
    }

    setIsPlayingTestVoice(true);
    const testText = "Hello! Practice English listening and speaking every day for great results.";
    const targetGender = genderOverride !== undefined ? genderOverride : (settings.voiceGender || 'female');
    const targetSpeed = speedOverride !== undefined ? speedOverride : (settings.voiceSpeed || 0.9);

    speakText(testText, {
      voiceGender: targetGender,
      rate: targetSpeed,
      voiceURI: voiceUriOverride !== undefined ? voiceUriOverride : settings.selectedVoiceURI,
      onEnd: () => setIsPlayingTestVoice(false),
      onError: () => setIsPlayingTestVoice(false),
    });
  };

  if (!isOpen) return null;

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    setCloudMessage(null);
    try {
      const res = await syncDatabaseWithCloud(() => {
        onDataReload();
      });
      setCloudMessage(res.message);
    } catch (e: any) {
      setCloudMessage('Lỗi đồng bộ: ' + (e.message || 'Không thể kết nối'));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePushAllToCloud = async () => {
    setIsSyncingCloud(true);
    setCloudMessage(null);
    try {
      const success = await syncAllToCloud({
        users: loadUsers(),
        classrooms: loadClassrooms(),
        topics: loadTopics(),
        lessons: loadLessons(),
        exercises: loadExercises(),
        errors: loadErrors(),
        media: loadMediaAssets(),
      });
      if (success) {
        setCloudMessage('Đã đẩy toàn bộ dữ liệu hiện tại lên Cloud Firebase thành công!');
      } else {
        setCloudMessage('Đẩy dữ liệu thất bại, vui lòng kiểm tra kết nối mạng.');
      }
    } catch (e: any) {
      setCloudMessage('Lỗi: ' + (e.message || 'Thao tác thất bại'));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleExport = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so-tay-hoc-tap-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Vui lòng dán nội dung file JSON vào ô bên dưới.');
      return;
    }
    const result = importData(importJsonText);
    if (result.success) {
      setImportStatus('Nhập dữ liệu thành công!');
      onDataReload();
      setTimeout(() => {
        setImportStatus(null);
        setShowImportBox(false);
        setImportJsonText('');
      }, 1500);
    } else {
      setImportError(result.message);
    }
  };

  const handleClearAll = async () => {
    setIsSyncingCloud(true);
    try {
      await clearAllDatabase(true);
      onDataReload();
      onClose();
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-lg ${theme.card} rounded-2xl shadow-2xl border ${theme.border} max-h-[90vh] flex flex-col overflow-hidden`}>
        {/* Modal Header */}
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-base">Cài đặt hiển thị & trải nghiệm</h3>
          </div>
          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.highlight} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* 1. Theme / Chế độ đọc ban đêm */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
              Chế độ hiển thị & Đọc ban đêm
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'dark', label: 'Tối Dịu Mắt', desc: 'Xám xanh dịu nhẹ', icon: Moon },
                { id: 'oled', label: 'Đen OLED', desc: 'Đen tuyệt đối tiết kiệm pin', icon: Moon },
                { id: 'sepia', label: 'Giấy Ấm (Sepia)', desc: 'Chống mỏi mắt ban đêm', icon: Coffee },
                { id: 'light', label: 'Sáng Tinh Giản', desc: 'Độ tương phản cao', icon: Sun },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = settings.theme === item.id;
                return (
                  <button
                    key={item.id}
                    id={`btn-setting-theme-${item.id}`}
                    onClick={() => updateSettings({ theme: item.id as ThemeMode })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold' 
                        : `${theme.border} ${theme.highlight}`
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs block">{item.label}</span>
                      <span className={`text-[10px] ${theme.textMuted} block`}>{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Cỡ chữ đọc sách trên điện thoại */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
              Cỡ chữ đọc (Tối ưu màn hình điện thoại)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Vừa (16px)' },
                { id: 'large', label: 'Lớn (18px)' },
                { id: 'xlarge', label: 'Rất Lớn (20px)' },
              ].map(item => (
                <button
                  key={item.id}
                  id={`btn-setting-font-${item.id}`}
                  onClick={() => updateSettings({ fontSize: item.id as FontSize })}
                  className={`py-2 px-3 rounded-xl border text-center text-xs transition-all ${
                    settings.fontSize === item.id 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold' 
                      : `${theme.border} ${theme.highlight}`
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Giãn cách dòng */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
              Giãn cách dòng đọc bài
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'normal', label: 'Tiêu chuẩn (1.5)' },
                { id: 'relaxed', label: 'Thoải mái (1.75)' },
              ].map(item => (
                <button
                  key={item.id}
                  id={`btn-setting-spacing-${item.id}`}
                  onClick={() => updateSettings({ lineSpacing: item.id as LineSpacing })}
                  className={`py-2 px-3 rounded-xl border text-center text-xs transition-all ${
                    settings.lineSpacing === item.id 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold' 
                      : `${theme.border} ${theme.highlight}`
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3.5. Linh vật đồng hành học tập (Mascot) */}
          <div className="space-y-3 pt-1 border-t border-inherit">
            <div className="flex items-center justify-between">
              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
                  Linh vật đồng hành (Mascot)
                </label>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  Chọn người bạn đồng hành dõi theo và động viên bạn học tập
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ mascotFloatingEnabled: settings.mascotFloatingEnabled !== false ? false : true })}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  settings.mascotFloatingEnabled !== false 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' 
                    : `${theme.border} ${theme.textMuted}`
                }`}
              >
                {settings.mascotFloatingEnabled !== false ? '✓ Đang bật nổi' : 'Đã ẩn linh vật nổi'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MASCOT_LIST.map(m => {
                const isSelected = (settings.mascotType || 'owl') === m.id;
                return (
                  <button
                    key={m.id}
                    id={`btn-setting-mascot-${m.id}`}
                    type="button"
                    onClick={() => updateSettings({ mascotType: m.id as MascotType })}
                    className={`p-2.5 rounded-xl border text-left flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold ring-1 ring-emerald-500/40 shadow-sm'
                        : `${theme.border} ${theme.highlight} hover:border-neutral-500/40`
                    }`}
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{m.emoji}</span>
                    <span className="text-xs font-semibold truncate max-w-full">{m.name}</span>
                    <span className={`text-[10px] ${theme.textMuted} truncate max-w-full text-center mt-0.5`}>{m.title}</span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Âm thanh & Phát âm giọng đọc */}
          <div className="space-y-3 pt-1 border-t border-inherit">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
                Giọng đọc phát âm (Text-to-Speech)
              </label>
              <button
                id="btn-test-voice-preview"
                type="button"
                onClick={() => handleTestVoice()}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isPlayingTestVoice ? (
                  <>
                    <Square className="w-3 h-3 fill-current text-white animate-pulse" />
                    <span>Đang đọc mẫu...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>🔊 Nghe thử giọng</span>
                  </>
                )}
              </button>
            </div>

            {/* Voice Gender & Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${theme.textMuted} block`}>
                  Kiểu giọng đọc ưa thích:
                </span>
                {availableVoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAdvancedVoices(!showAdvancedVoices)}
                    className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{showAdvancedVoices ? 'Ẩn danh sách giọng cụ thể' : `Chọn gói giọng chi tiết (${availableVoices.length} giọng)`}</span>
                  </button>
                )}
              </div>

              {/* Advanced Voice Selection Dropdown */}
              {showAdvancedVoices && availableVoices.length > 0 && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 animate-fadeIn">
                  <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    Danh sách tất cả các giọng tiếng Anh phát hiện được trên máy của bạn:
                  </label>
                  <select
                    value={settings.selectedVoiceURI || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateSettings({ selectedVoiceURI: val || undefined });
                      if (val) {
                        handleTestVoice(undefined, undefined, val);
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-emerald-500`}
                  >
                    <option value="">-- Tự động tối ưu hóa theo Preset (Khuyên dùng) --</option>
                    {availableVoices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}) {v.localService ? '⚡ Offline' : '🌐 Online Natural'} {v.default ? '★ Mặc định' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-400">
                    * Mẹo: Các giọng có chữ "Natural", "Neural", "Google", "Siri" hoặc "Online" thường phát âm rất truyền cảm và tự nhiên.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'female' as VoiceGenderPreference,
                    label: '👩 Giọng Nữ Tự Nhiên (US Female)',
                    desc: 'Dễ nghe, mượt mà và phổ biến nhất hiện nay (Jenny / Samantha)',
                    badge: 'Hot / Khuyên dùng',
                  },
                  {
                    id: 'male' as VoiceGenderPreference,
                    label: '👨 Giọng Nam Trầm Ấm (US Male)',
                    desc: 'Trầm ấm, phát âm rõ từng âm tiết tiếng Anh - Mỹ (Guy / Ryan)',
                    badge: 'Phổ biến',
                  },
                  {
                    id: 'uk_female' as VoiceGenderPreference,
                    label: '🇬🇧 Giọng Nữ Anh - Anh (UK Female)',
                    desc: 'Phát âm chuẩn ngữ điệu British thanh lịch (Sonia / Libby)',
                    badge: 'British',
                  },
                  {
                    id: 'uk_male' as VoiceGenderPreference,
                    label: '🇬🇧 Giọng Nam Anh - Anh (UK Male)',
                    desc: 'Giọng chuẩn phong cách Anh - Anh (Oliver / George)',
                    badge: 'British',
                  },
                  {
                    id: 'auto' as VoiceGenderPreference,
                    label: '🌟 Mặc định của Thiết bị (Auto Fallback)',
                    desc: 'Sử dụng bộ tổng hợp giọng gốc của điện thoại / máy tính (100% ổn định)',
                    badge: 'Mặc định',
                  },
                ].map(item => {
                  const isSelected = (settings.voiceGender || 'female') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`voice-opt-${item.id}`}
                      onClick={() => {
                        updateSettings({ voiceGender: item.id });
                        // Quick test upon selection
                        handleTestVoice(item.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold ring-1 ring-emerald-500/30'
                          : `${theme.border} ${theme.highlight} hover:border-emerald-500/40`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold">{item.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-tight ${isSelected ? 'text-emerald-300/80' : theme.textMuted}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Speed */}
            <div className="space-y-1.5 pt-1">
              <span className={`text-[11px] font-medium ${theme.textMuted} block`}>
                Tốc độ phát âm:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { speed: 0.8, label: '0.8x (Chậm)' },
                  { speed: 0.9, label: '0.9x (Chuẩn)' },
                  { speed: 1.0, label: '1.0x (Tự nhiên)' },
                  { speed: 1.15, label: '1.15x (Nhanh)' },
                ].map(item => {
                  const isSelected = (settings.voiceSpeed ?? 0.9) === item.speed;
                  return (
                    <button
                      key={item.speed}
                      type="button"
                      id={`voice-speed-${item.speed}`}
                      onClick={() => {
                        updateSettings({ voiceSpeed: item.speed });
                        handleTestVoice(undefined, item.speed);
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                          : `${theme.border} ${theme.highlight}`
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fallback & Device Safety Notice */}
            <div className={`p-2.5 rounded-xl border ${theme.border} bg-sky-500/5 text-sky-400/90 text-[11px] flex items-start gap-2 leading-relaxed`}>
              <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              <div>
                <strong className="text-sky-300 block">Cơ chế bảo vệ Fallback đa tầng:</strong>
                Hệ thống luôn ưu tiên gói giọng tự nhiên chuẩn nhất. Nếu điện thoại của bạn không có sẵn gói giọng phụ, ứng dụng sẽ tự động chuyển tiếp an toàn sang giọng mặc định của thiết bị, đảm bảo không bao giờ bị gián đoạn hay mất âm thanh.
              </div>
            </div>

            {/* Sound & Haptic switches */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2 rounded-xl border border-inherit cursor-pointer">
                <span className="text-xs font-medium">Âm thanh phản hồi khi trả lời (Web Audio)</span>
                <input
                  id="toggle-sound-effects"
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={e => updateSettings({ soundEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl border border-inherit cursor-pointer">
                <span className="text-xs font-medium">Rung phản hồi nhẹ trên điện thoại (Haptic)</span>
                <input
                  id="toggle-haptic"
                  type="checkbox"
                  checked={settings.hapticEnabled}
                  onChange={e => updateSettings({ hapticEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl border border-inherit cursor-pointer">
                <span className="text-xs font-medium">Tự động phát âm câu hỏi tiếng Anh khi mở bài tập</span>
                <input
                  id="toggle-auto-speak"
                  type="checkbox"
                  checked={settings.autoSpeak}
                  onChange={e => updateSettings({ autoSpeak: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Dành riêng cho Quản trị viên (Admin): Đồng bộ Cloud, Backup JSON & Xóa Database */}
          {isAdmin && (
            <>
              {/* 5. Cloud Database (Firebase Firestore) & Deploy Vercel */}
              <div className="space-y-3 pt-2 border-t border-inherit">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
                    Cơ sở dữ liệu Đám Mây (Firebase Cloud)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đã kết nối
                  </span>
                </div>

                <p className={`text-[11px] ${theme.textMuted} leading-relaxed`}>
                  Dữ liệu được lưu trữ trực tiếp trên Google Firebase Firestore. Khi bạn tạo bài giảng hoặc học sinh làm bài tập qua link Vercel, dữ liệu sẽ tự động đồng bộ ngay lập tức.
                </p>

                {cloudMessage && (
                  <div className="p-2.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {cloudMessage}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-sync-cloud-now"
                    type="button"
                    onClick={handleSyncCloud}
                    disabled={isSyncingCloud}
                    className={`py-2 px-3 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-80 disabled:opacity-50 cursor-pointer`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCloud ? 'Đang đồng bộ...' : 'Đồng bộ từ Cloud'}</span>
                  </button>

                  <button
                    id="btn-push-all-to-cloud"
                    type="button"
                    onClick={handlePushAllToCloud}
                    disabled={isSyncingCloud}
                    className={`py-2 px-3 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-80 disabled:opacity-50 cursor-pointer`}
                  >
                    <CloudUpload className="w-3.5 h-3.5 text-sky-500" />
                    <span>Đẩy lên Cloud DB</span>
                  </button>
                </div>

                <button
                  id="btn-toggle-deploy-guide"
                  type="button"
                  onClick={() => setShowDeployGuide(!showDeployGuide)}
                  className={`w-full py-1.5 px-3 rounded-xl border ${theme.border} text-[11px] font-medium text-center flex items-center justify-center gap-1.5 hover:opacity-80 text-amber-500 cursor-pointer`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{showDeployGuide ? 'Ẩn hướng dẫn Deploy Vercel / GitHub' : 'Xem hướng dẫn Deploy Vercel / GitHub Miễn Phí'}</span>
                </button>

                {showDeployGuide && (
                  <div className={`p-3 rounded-xl border ${theme.border} ${theme.highlight} text-xs space-y-2 leading-relaxed`}>
                    <div className="font-bold text-emerald-500 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> 3 Bước Deploy lên GitHub & Vercel (100% Free):
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-left">
                      <li><strong>Tải mã nguồn về:</strong> Nhấn nút Export/Download ZIP hoặc Push lên repository GitHub cá nhân của bạn.</li>
                      <li><strong>Kết nối Vercel:</strong> Truy cập <a href="https://vercel.com" target="_blank" rel="noreferrer" className="underline text-sky-400">vercel.com</a>, chọn <em>Add New Project</em> và chọn repository GitHub vừa tạo.</li>
                      <li><strong>Deploy:</strong> Nhấn <em>Deploy</em>. Vercel tự động build và cấp link miễn phí dạng <code className="font-mono bg-black/20 px-1 py-0.5 rounded">https://app-cua-ban.vercel.app</code>. Gửi link này cho học sinh là học sinh truy cập và đồng bộ bài học trên Cloud ngay!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* 6. Dữ liệu: Backup / Restore JSON */}
              <div className="space-y-2 pt-1 border-t border-inherit">
                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
                  Sao lưu & Khôi phục dữ liệu (JSON)
                </label>
                <p className={`text-[11px] ${theme.textMuted} leading-relaxed`}>
                  Bạn tự tạo dữ liệu, hãy xuất file JSON để lưu về máy tính hoặc chuyển sang điện thoại mà không lo mất dữ liệu.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    id="btn-export-json"
                    onClick={handleExport}
                    className={`flex-1 py-2 px-3 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-80`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Xuất file JSON</span>
                  </button>

                  <button
                    id="btn-toggle-import-box"
                    onClick={() => setShowImportBox(!showImportBox)}
                    className={`flex-1 py-2 px-3 rounded-xl border ${theme.border} ${theme.highlight} text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-80`}
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-500" />
                    <span>Nhập file JSON</span>
                  </button>
                </div>

                {showImportBox && (
                  <div className="p-3 rounded-xl border border-inherit space-y-2">
                    <textarea
                      id="input-import-json-text"
                      rows={4}
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      placeholder="Dán nội dung JSON sao lưu vào đây..."
                      className={`w-full p-2 rounded-lg ${theme.inputBg} text-xs font-mono`}
                    />
                    <div className="flex items-center justify-between">
                      {importStatus && (
                        <span className="text-[11px] text-emerald-500 font-medium">
                          {importStatus}
                        </span>
                      )}
                      {importError && (
                        <span className="text-[11px] text-rose-500 font-medium">
                          {importError}
                        </span>
                      )}
                      <button
                        id="btn-confirm-import-json"
                        onClick={handleImport}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                      >
                        Xác nhận nạp dữ liệu
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Xóa trắng dữ liệu */}
              <div className="pt-2 border-t border-inherit">
                <button
                  id="btn-clear-all-data"
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa toàn bộ dữ liệu & đặt lại ban đầu</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Clear Database Dialog */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Xóa trắng toàn bộ dữ liệu"
        message="CẢNH BÁO: Hành động này sẽ xóa toàn bộ chủ đề, bài tập, lớp học và tiến độ đã lưu trên thiết bị này. Dữ liệu sẽ trở về trạng thái mới tinh ban đầu. Bạn có chắc chắn không?"
        confirmText="Xóa trắng hoàn toàn"
        cancelText="Hủy"
        isDanger={true}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
