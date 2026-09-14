import React from 'react';
import { AlertTriangle, Info, Check, X, LogOut, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  iconType?: 'danger' | 'warning' | 'info' | 'logout';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  isDanger = false,
  iconType = 'danger',
  onConfirm,
  onCancel,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'logout':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1">
            <LogOut className="w-6 h-6" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-1">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-sm ${theme.card} border ${theme.border} p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center">
          {renderIcon()}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <p className={`text-xs ${theme.textMuted} leading-relaxed`}>{message}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className={`w-full py-2.5 rounded-xl border ${theme.border} ${theme.badgeBg} text-xs font-semibold hover:opacity-80 active:scale-98 transition-all`}
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-98 transition-all ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
