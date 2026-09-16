import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Save, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Languages, 
  BookOpenCheck, 
  AlertTriangle, 
  Lightbulb, 
  Zap, 
  Brain, 
  Flame, 
  HelpCircle, 
  FileText, 
  CheckCircle,
  Info,
  Sliders,
  Eye,
  MessageSquare
} from 'lucide-react';
import { QuickCommandItem } from '../types';
import { 
  DEFAULT_QUICK_COMMANDS, 
  getSystemQuickCommands, 
  saveSystemQuickCommands 
} from '../utils/mascotAI';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';

// Icon mapping helper
export const QUICK_COMMAND_ICONS: Record<string, React.ElementType> = {
  Languages,
  BookOpenCheck,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Trash2,
  Zap,
  Brain,
  Flame,
  HelpCircle,
  FileText,
  CheckCircle,
  Sliders,
  Eye,
  MessageSquare,
};

export const AdminQuickCommandsManager: React.FC = () => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [commands, setCommands] = useState<QuickCommandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modal / Form state for Add/Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCommand, setFormCommand] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconName, setFormIconName] = useState('Sparkles');
  const [formPromptTemplate, setFormPromptTemplate] = useState('');
  const [formError, setFormError] = useState('');

  // Confirm delete dialog
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load commands on mount
  useEffect(() => {
    let isMounted = true;
    getSystemQuickCommands().then(cmds => {
      if (isMounted) {
        setCommands(cmds);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormCommand('/');
    setFormLabel('');
    setFormDescription('');
    setFormIconName('Sparkles');
    setFormPromptTemplate('');
    setFormError('');
    setIsEditing(true);
  };

  const openEditModal = (cmd: QuickCommandItem) => {
    setEditingId(cmd.id);
    setFormCommand(cmd.command);
    setFormLabel(cmd.label);
    setFormDescription(cmd.description);
    setFormIconName(cmd.iconName || 'Sparkles');
    setFormPromptTemplate(cmd.promptTemplate || '');
    setFormError('');
    setIsEditing(true);
  };

  const handleSaveForm = () => {
    let cleanCmd = formCommand.trim().toLowerCase();
    if (!cleanCmd.startsWith('/')) {
      cleanCmd = '/' + cleanCmd;
    }

    if (cleanCmd.length < 2 || cleanCmd.includes(' ')) {
      setFormError('Lệnh gọi phải bắt đầu bằng ký tự "/" và không chứa khoảng trắng (VD: /dich, /nguphap)');
      return;
    }

    if (!formLabel.trim()) {
      setFormError('Vui lòng nhập tên hiển thị của lệnh');
      return;
    }

    if (!formDescription.trim()) {
      setFormError('Vui lòng nhập mô tả chức năng của lệnh');
      return;
    }

    // Check duplicate command
    const duplicate = commands.find(c => c.command.toLowerCase() === cleanCmd && c.id !== editingId);
    if (duplicate) {
      setFormError(`Lệnh "${cleanCmd}" đã tồn tại. Vui lòng chọn tên lệnh khác.`);
      return;
    }

    if (editingId) {
      setCommands(prev => prev.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            command: cleanCmd,
            label: formLabel.trim(),
            description: formDescription.trim(),
            iconName: formIconName,
            promptTemplate: formPromptTemplate.trim() || undefined,
          };
        }
        return c;
      }));
    } else {
      const newCmd: QuickCommandItem = {
        id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        command: cleanCmd,
        label: formLabel.trim(),
        description: formDescription.trim(),
        iconName: formIconName,
        promptTemplate: formPromptTemplate.trim() || undefined,
        isSystem: false,
      };
      setCommands(prev => [...prev, newCmd]);
    }

    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    setCommands(prev => prev.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= commands.length) return;

    const copy = [...commands];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setCommands(copy);
  };

  const handleResetToDefault = () => {
    setCommands([...DEFAULT_QUICK_COMMANDS]);
    setSaveStatus('Đã khôi phục danh sách lệnh mặc định. Đừng quên bấm "Lưu Thay Đổi" để áp dụng cho toàn trường!');
  };

  const handleSaveToCloud = async () => {
    setIsLoading(true);
    try {
      await saveSystemQuickCommands(commands);
      setSaveStatus('✅ Đã lưu và đồng bộ danh sách Lệnh Nhanh toàn trường thành công!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (e: any) {
      setSaveStatus('❌ Lỗi lưu dữ liệu: ' + (e?.message || 'Vui lòng thử lại'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-4 rounded-2xl ${theme.card} border ${theme.border} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${theme.text}`}>Quản Lý Menu Lệnh Nhanh Toàn Trường</h2>
              <p className="text-xs text-neutral-400">
                Tùy chỉnh các phím tắt nhanh dạng Telegram (<code className="text-emerald-500 font-mono font-bold">/</code>) trong khung chat Mascot. Toàn bộ học sinh đều sử dụng chung danh sách này.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border ${theme.border} hover:opacity-80 flex items-center gap-1.5 transition-all cursor-pointer`}
              title="Khôi phục danh sách gốc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mẫu</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm lệnh mới</span>
            </button>
          </div>
        </div>

        {saveStatus && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Commands List & Live Chat Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Commands List (7 cols) */}
        <div className={`lg:col-span-7 p-4 rounded-2xl ${theme.card} border ${theme.border} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} flex items-center gap-1.5`}>
              <span>Danh sách Lệnh Hiện Tại</span>
              <span className="text-[11px] font-normal lowercase opacity-70">({commands.length} lệnh)</span>
            </h3>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleSaveToCloud}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi toàn trường</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {commands.map((cmd, idx) => {
              const IconComp = (cmd.iconName && QUICK_COMMAND_ICONS[cmd.iconName]) || Sparkles;
              return (
                <div
                  key={cmd.id}
                  className={`p-3 rounded-xl border ${theme.border} ${theme.inputBg} flex items-center justify-between gap-3 group hover:border-emerald-500/40 transition-all`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {cmd.command}
                        </span>
                        <span className={`text-xs font-bold truncate ${theme.text}`}>
                          {cmd.label}
                        </span>
                        {cmd.isSystem && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                            Hệ thống
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {cmd.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === commands.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(cmd)}
                      className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 cursor-pointer ml-1"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(cmd.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      title="Xóa lệnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Preview in Chatbot (5 cols) */}
        <div className={`lg:col-span-5 p-4 rounded-2xl ${theme.card} border ${theme.border} space-y-3`}>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
              Xem trước Menu Lệnh trong Chat
            </h3>
          </div>
          <p className="text-[11px] text-neutral-400">
            Khi học sinh gõ ký tự <code className="text-emerald-500 font-mono font-bold">/</code> vào ô chat, menu này sẽ tự động bung lên ngay phía trên ô nhập liệu:
          </p>

          {/* Mock Telegram Menu */}
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-xl space-y-1 font-sans">
            <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-1">
              <span>Menu Lệnh Phím Tắt</span>
              <span className="text-emerald-500 font-mono font-normal">{commands.length} Lệnh</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {commands.map(cmd => {
                const IconComp = (cmd.iconName && QUICK_COMMAND_ICONS[cmd.iconName]) || Sparkles;
                return (
                  <div
                    key={cmd.id}
                    className="p-2 rounded-xl bg-neutral-800/40 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 flex items-center gap-2.5 transition-all cursor-default"
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {cmd.command}
                        </span>
                        <span className="text-xs text-neutral-200 font-medium truncate">
                          — {cmd.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {cmd.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mock input box */}
            <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center gap-2">
              <div className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-emerald-500 text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span>/</span>
                <span className="w-1.5 h-3.5 bg-emerald-400 animate-pulse inline-block"></span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">Gõ / để gọi menu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Command */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl ${theme.card} border ${theme.border} p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95`}>
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className={`text-sm font-bold ${theme.text}`}>
                {editingId ? 'Chỉnh Sửa Lệnh Nhanh' : 'Thêm Lệnh Nhanh Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-bold block mb-1 ${theme.text}`}>
                  Lệnh gọi (bắt đầu bằng /)
                </label>
                <input
                  type="text"
                  value={formCommand}
                  onChange={e => setFormCommand(e.target.value)}
                  placeholder="/vidu"
                  className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} font-mono font-bold text-emerald-500 focus:outline-hidden focus:border-emerald-500`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${theme.text}`}>
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="VD: Luyện đề trắc nghiệm"
                  className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-hidden focus:border-emerald-500`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${theme.text}`}>
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="VD: Đưa ra câu hỏi phản xạ nhanh theo chủ đề"
                  className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-hidden focus:border-emerald-500`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1.5 ${theme.text}`}>
                  Biểu tượng (Icon)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.keys(QUICK_COMMAND_ICONS).map(iconKey => {
                    const Icon = QUICK_COMMAND_ICONS[iconKey];
                    const isSelected = formIconName === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setFormIconName(iconKey)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : `${theme.inputBg} border-inherit text-neutral-400 hover:text-neutral-200`
                        }`}
                        title={iconKey}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border ${theme.border} hover:opacity-80 cursor-pointer`}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <ConfirmModal
          isOpen={true}
          title="Xóa Lệnh Nhanh"
          message="Bạn có chắc chắn muốn xóa lệnh này khỏi Menu Lệnh Nhanh của toàn trường?"
          confirmText="Xác nhận xóa"
          isDanger={true}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};
