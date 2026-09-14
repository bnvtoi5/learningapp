import React, { useState } from 'react';
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
  Globe
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, FontSize, LineSpacing } from '../types';
import { exportAllData, importData, clearAllDatabase, syncDatabaseWithCloud, loadUsers, loadClassrooms, loadTopics, loadLessons, loadExercises, loadErrors, loadMediaAssets } from '../utils/storage';
import { syncAllToCloud } from '../lib/firebase';
import { ConfirmModal } from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReload: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataReload,
}) => {
  const { settings, updateSettings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Cloud sync states
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [showDeployGuide, setShowDeployGuide] = useState(false);

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

  const handleClearAll = () => {
    clearAllDatabase(true);
    onDataReload();
    onClose();
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

          {/* 4. Âm thanh & Phản hồi */}
          <div className="space-y-3 pt-1 border-t border-inherit">
            <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider block`}>
              Âm thanh & Rung
            </label>
            <div className="space-y-2">
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
                <span className="text-xs font-medium">Tự động phát âm câu hỏi tiếng Anh (TTS)</span>
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
