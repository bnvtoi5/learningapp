import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle, 
  Trash2, 
  Filter, 
  BookOpen, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ErrorLog, SkillCategory, User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';

interface ErrorReviewProps {
  errors: ErrorLog[];
  onStartReviewSession: (exerciseIds?: string[]) => void;
  onResolveError: (errorId: string) => void;
  onDeleteError: (errorId: string) => void;
  currentUser?: User | null;
  onNavigateToAdminErrors?: () => void;
}

export const ErrorReview: React.FC<ErrorReviewProps> = ({
  errors,
  onStartReviewSession,
  onResolveError,
  onDeleteError,
  currentUser,
  onNavigateToAdminErrors,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [errorToDelete, setErrorToDelete] = useState<ErrorLog | null>(null);

  const userErrors = currentUser?.role === 'student'
    ? errors.filter(e => e.userId === currentUser.id || (e.studentName && (e.studentName === currentUser.fullName || e.studentName === currentUser.username)))
    : errors;
  const activeErrors = userErrors.filter(e => showResolved ? true : !e.resolved);
  const filteredErrors = activeErrors.filter(e => {
    if (filterSkill === 'all') return true;
    return e.skill === filterSkill;
  });

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header and Quick Review Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
              Sổ Tay Phân Tích Lỗi Sai
            </span>
          </div>
          <h2 className={`${typo.headingText} tracking-tight`}>
            Ôn tập & Khắc phục lỗi sai
          </h2>
          <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
            Hệ thống tự động ghi lại mỗi câu bạn làm sai, phân loại ngữ pháp và theo dõi số lần lặp lại.
          </p>
        </div>

        {filteredErrors.length > 0 && (
          <button
            id="btn-start-all-errors-review"
            onClick={() => onStartReviewSession(filteredErrors.map(e => e.exerciseId))}
            className="px-4 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ôn tất cả ({filteredErrors.length} câu)</span>
          </button>
        )}
      </div>

      {/* Admin Notice Banner */}
      {currentUser?.role === 'admin' && onNavigateToAdminErrors && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Dành cho Giáo viên / Quản trị viên:</strong> Bạn có thể xem danh sách học sinh theo lớp, tỷ lệ làm lại và cài đặt số lần làm đúng bắt buộc (hình phạt) tại mục Quản trị.
            </span>
          </div>
          <button
            id="btn-switch-to-admin-error-manager"
            onClick={onNavigateToAdminErrors}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold whitespace-nowrap text-xs shadow-sm"
          >
            Mở Quản lý Sổ Lỗi & Phạt →
          </button>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className={`${theme.card} p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs`}>
        <div className="flex items-center gap-2">
          <Filter className={`w-3.5 h-3.5 ${theme.textMuted}`} />
          <span className="font-semibold">Lọc theo kỹ năng:</span>
          <select
            id="filter-errors-skill"
            value={filterSkill}
            onChange={e => setFilterSkill(e.target.value)}
            className={`p-1.5 rounded-lg ${theme.inputBg} text-xs font-medium`}
          >
            <option value="all">Tất cả kỹ năng ({activeErrors.length})</option>
            <option value="mixed">⚡ Tổng hợp (Mixed Practice)</option>
            <option value="grammar">Ngữ pháp (Grammar)</option>
            <option value="vocabulary">Từ vựng (Vocabulary)</option>
            <option value="reading">Đọc hiểu (Reading)</option>
            <option value="listening">Nghe (Listening)</option>
            <option value="speaking">Nói (Speaking)</option>
            <option value="writing">Viết (Writing)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="checkbox-show-resolved-errors"
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-0"
          />
          <span className={theme.textMuted}>Hiển thị cả câu đã khắc phục</span>
        </label>
      </div>

      {/* Errors List */}
      {filteredErrors.length === 0 ? (
        <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2`}>
          <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {errors.length === 0 ? 'Chưa có lỗi sai nào được ghi nhận' : 'Không có lỗi sai nào trong bộ lọc này'}
          </h3>
          <p className={`text-xs ${theme.textMuted} max-w-sm mx-auto`}>
            {errors.length === 0 
              ? 'Khi bạn làm bài tập và trả lời chưa chính xác, hệ thống sẽ tự động lưu vào đây để bạn ôn luyện lại.'
              : 'Bạn đã khắc phục hết các lỗi thuộc nhóm này hoặc không có câu nào vi phạm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map(err => (
            <div
              key={err.id}
              id={`error-card-${err.id}`}
              className={`${theme.card} p-4 rounded-xl border-l-4 ${
                err.resolved ? 'border-l-emerald-500 opacity-75' : 'border-l-rose-500'
              } space-y-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                      🏷️ {err.errorType || 'Lỗi chung'}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                      {err.skill}
                    </span>
                    <span className={`text-xs ${theme.textMuted}`}>
                      Đã sai <strong className="text-rose-400">{err.failedCount}</strong> lần
                    </span>
                    {err.resolved && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        ✓ ĐÃ KHẮC PHỤC
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold pt-1 leading-snug">
                    {err.question}
                  </h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!err.resolved && (
                    <button
                      id={`btn-mark-resolved-${err.id}`}
                      onClick={() => onResolveError(err.id)}
                      title="Đánh dấu đã hiểu / Khắc phục xong"
                      className="p-1.5 text-emerald-400 hover:text-emerald-500 rounded hover:bg-emerald-500/10"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    id={`btn-delete-error-${err.id}`}
                    type="button"
                    onClick={() => setErrorToDelete(err)}
                    title="Xóa khỏi sổ lỗi"
                    className="p-1.5 text-rose-400 hover:text-rose-500 rounded hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Answers comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-300">
                  <span className="font-semibold block text-[10px] uppercase text-rose-400">Bạn đã chọn/viết:</span>
                  <p className="line-through">{err.userAnswer || 'Chưa trả lời'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-300">
                  <span className="font-semibold block text-[10px] uppercase text-emerald-400">Đáp án chuẩn xác:</span>
                  <p className="font-medium">{err.correctAnswer}</p>
                </div>
              </div>

              {/* Explanation */}
              {err.explanation && (
                <div className={`p-2.5 rounded-lg ${theme.highlight} text-xs leading-relaxed`}>
                  <span className="font-semibold text-amber-400 block mb-0.5">📌 Bản chất lỗi & kiến thức:</span>
                  <p className={`${theme.textMuted} whitespace-pre-line`}>{err.explanation}</p>
                </div>
              )}

              {/* Penalty & Retry Progress */}
              <div className={`p-2.5 rounded-lg ${theme.badgeBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border ${theme.border}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-sky-400">
                    Đã thử lại: <strong>{err.retryAttempts || 0} lượt</strong>
                  </span>
                  <span className="text-neutral-500">•</span>
                  <span className="font-semibold text-amber-400">
                    Tiến độ hoàn thành: <strong>{err.currentSuccessCount || 0} / {err.requiredSuccessCount || 2} lần đúng</strong>
                  </span>
                </div>

                {!err.resolved && (
                  <span className="text-[11px] text-rose-400 font-medium">
                    (Cần đúng thêm {Math.max(1, (err.requiredSuccessCount || 2) - (err.currentSuccessCount || 0))} lần nữa)
                  </span>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-1">
                <button
                  id={`btn-retry-single-err-${err.id}`}
                  onClick={() => onStartReviewSession([err.exerciseId])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Luyện lại câu này</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Error Dialog */}
      <ConfirmModal
        isOpen={!!errorToDelete}
        title="Xóa câu sai khỏi sổ lỗi"
        message="Bạn có chắc muốn xóa câu hỏi này khỏi sổ lỗi không? Câu hỏi này sẽ không xuất hiện trong các bài ôn tập lỗi sai nữa."
        confirmText="Xóa câu này"
        cancelText="Hủy"
        isDanger={true}
        onConfirm={() => {
          if (errorToDelete) {
            onDeleteError(errorToDelete.id);
            setErrorToDelete(null);
          }
        }}
        onCancel={() => setErrorToDelete(null)}
      />
    </div>
  );
};
