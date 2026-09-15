import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  MoveRight, 
  Trash2, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  FolderPlus,
  BookOpen,
  School,
  Layers
} from 'lucide-react';
import { Topic, Lesson, Exercise, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';

export type BulkActionType = 'move' | 'duplicate' | 'delete';
export type BulkContentType = 'topic' | 'lesson' | 'exercise';

interface BulkContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: BulkActionType;
  contentType: BulkContentType;
  selectedIds: string[];
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  classrooms: Classroom[];
  onConfirmMove: (targetId: string) => void;
  onConfirmDuplicate: (targetIds: string[]) => void;
  onConfirmDelete: () => void;
}

export const BulkContentModal: React.FC<BulkContentModalProps> = ({
  isOpen,
  onClose,
  actionType,
  contentType,
  selectedIds,
  topics,
  lessons,
  exercises,
  classrooms,
  onConfirmMove,
  onConfirmDuplicate,
  onConfirmDelete,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Move state
  const [targetMoveId, setTargetMoveId] = useState<string>('');

  // Duplicate state (multi-target)
  const [targetDuplicateIds, setTargetDuplicateIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Selected items details
  const selectedTopics = topics.filter(t => selectedIds.includes(t.id));
  const selectedLessons = lessons.filter(l => selectedIds.includes(l.id));
  const selectedExercises = exercises.filter(e => selectedIds.includes(e.id));

  // Cascaded count calculations
  let childLessonsCount = 0;
  let childExercisesCount = 0;

  if (contentType === 'topic') {
    const childLessons = lessons.filter(l => selectedIds.includes(l.topicId));
    childLessonsCount = childLessons.length;
    const childLessonIds = new Set(childLessons.map(l => l.id));
    childExercisesCount = exercises.filter(e => childLessonIds.has(e.lessonId)).length;
  } else if (contentType === 'lesson') {
    childExercisesCount = exercises.filter(e => selectedIds.includes(e.lessonId)).length;
  }

  const contentLabel = 
    contentType === 'topic' ? 'chủ đề' : 
    contentType === 'lesson' ? 'bài học' : 'câu hỏi';

  const actionTitle = 
    actionType === 'move' ? `Di chuyển ${selectedIds.length} ${contentLabel}` :
    actionType === 'duplicate' ? `Tạo bản sao ${selectedIds.length} ${contentLabel}` :
    `Xóa ${selectedIds.length} ${contentLabel}`;

  const handleToggleDuplicateTarget = (id: string) => {
    if (targetDuplicateIds.includes(id)) {
      setTargetDuplicateIds(targetDuplicateIds.filter(i => i !== id));
    } else {
      setTargetDuplicateIds([...targetDuplicateIds, id]);
    }
  };

  const handleSelectAllDuplicateTargets = (allIds: string[]) => {
    if (targetDuplicateIds.length === allIds.length) {
      setTargetDuplicateIds([]);
    } else {
      setTargetDuplicateIds([...allIds]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`${theme.card} w-full max-w-lg rounded-2xl border ${theme.border} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-inherit flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              actionType === 'move' ? 'bg-sky-500/10 text-sky-500' :
              actionType === 'duplicate' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-rose-500/10 text-rose-500'
            }`}>
              {actionType === 'move' && <MoveRight className="w-4 h-4" />}
              {actionType === 'duplicate' && <Copy className="w-4 h-4" />}
              {actionType === 'delete' && <Trash2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">{actionTitle}</h3>
              <p className={`text-xs ${theme.textMuted}`}>
                {contentType === 'topic' && 'Áp dụng cho các chủ đề và toàn bộ bài học, câu hỏi bên trong'}
                {contentType === 'lesson' && 'Áp dụng cho các bài học và toàn bộ câu hỏi bên trong'}
                {contentType === 'exercise' && 'Áp dụng cho các câu bài tập đã chọn'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:${theme.highlight} ${theme.textMuted} cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Selected Items Summary Pill */}
          <div className={`p-3 rounded-xl ${theme.badgeBg} border border-inherit space-y-1.5`}>
            <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-500">
              Danh sách {contentLabel} đã chọn ({selectedIds.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {contentType === 'topic' && selectedTopics.map(t => (
                <span key={t.id} className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-medium">
                  {t.title}
                </span>
              ))}
              {contentType === 'lesson' && selectedLessons.map(l => (
                <span key={l.id} className="text-xs px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-500 font-medium">
                  {l.title}
                </span>
              ))}
              {contentType === 'exercise' && selectedExercises.map((e, idx) => (
                <span key={e.id} className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-medium truncate max-w-[200px]">
                  #{idx + 1}: {e.question}
                </span>
              ))}
            </div>
          </div>

          {/* 1. DI CHUYỂN (MOVE) */}
          {actionType === 'move' && (
            <div className="space-y-3">
              {contentType === 'topic' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block">
                    Chọn Mã / Tên Lớp học đích cần chuyển đến:
                  </label>
                  <select
                    value={targetMoveId}
                    onChange={e => setTargetMoveId(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-sky-500 font-medium`}
                  >
                    <option value="">-- Chọn lớp học đích --</option>
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.description || 'Lớp học'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {contentType === 'lesson' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block">
                    Chọn Chủ đề đích cần chuyển đến:
                  </label>
                  <select
                    value={targetMoveId}
                    onChange={e => setTargetMoveId(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-sky-500 font-medium`}
                  >
                    <option value="">-- Chọn chủ đề đích --</option>
                    {topics.map(t => {
                      const cl = classrooms.find(c => c.id === t.classroomId);
                      return (
                        <option key={t.id} value={t.id}>
                          {cl ? `[${cl.name}] ` : ''}{t.title} ({t.subject})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {contentType === 'exercise' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block">
                    Chọn Bài học đích cần chuyển đến:
                  </label>
                  <select
                    value={targetMoveId}
                    onChange={e => setTargetMoveId(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl ${theme.inputBg} border ${theme.border} focus:outline-none focus:border-sky-500 font-medium`}
                  >
                    <option value="">-- Chọn bài học đích --</option>
                    {lessons.map(l => {
                      const tp = topics.find(t => t.id === l.topicId);
                      const cl = tp ? classrooms.find(c => c.id === tp.classroomId) : null;
                      return (
                        <option key={l.id} value={l.id}>
                          {cl ? `[${cl.name}] ` : ''}{tp ? `${tp.title} → ` : ''}{l.title}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <p className={`text-[11px] ${theme.textMuted}`}>
                ℹ️ Di chuyển sẽ đổi mã thuộc tính cha mà không xóa hay làm mất tiến độ học sinh.
              </p>
            </div>
          )}

          {/* 2. TẠO BẢN SAO (DUPLICATE) */}
          {actionType === 'duplicate' && (
            <div className="space-y-3">
              {contentType === 'topic' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block">
                      Chọn các Lớp học đích để nhân bản chủ đề sang:
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSelectAllDuplicateTargets(classrooms.map(c => c.id))}
                      className="text-[11px] text-emerald-500 hover:underline font-semibold"
                    >
                      {targetDuplicateIds.length === classrooms.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả lớp'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {classrooms.map(c => {
                      const isChecked = targetDuplicateIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleDuplicateTarget(c.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' 
                              : `${theme.border} ${theme.highlight}`
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 text-xs">
                            <span className="font-bold">{c.name}</span>
                            <span className={`text-[10px] ${theme.textMuted} ml-1.5`}>
                              Mã: {c.code}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {contentType === 'lesson' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block">
                      Chọn các Chủ đề đích để sao chép bài học sang:
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSelectAllDuplicateTargets(topics.map(t => t.id))}
                      className="text-[11px] text-emerald-500 hover:underline font-semibold"
                    >
                      {targetDuplicateIds.length === topics.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả chủ đề'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {topics.map(t => {
                      const isChecked = targetDuplicateIds.includes(t.id);
                      const cl = classrooms.find(c => c.id === t.classroomId);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleToggleDuplicateTarget(t.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' 
                              : `${theme.border} ${theme.highlight}`
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 text-xs">
                            {cl && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-400 font-medium inline-block mr-1">
                                {cl.name}
                              </span>
                            )}
                            <span className="font-bold">{t.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {contentType === 'exercise' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block">
                      Chọn các Bài học đích để sao chép câu hỏi sang:
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSelectAllDuplicateTargets(lessons.map(l => l.id))}
                      className="text-[11px] text-emerald-500 hover:underline font-semibold"
                    >
                      {targetDuplicateIds.length === lessons.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả bài'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {lessons.map(l => {
                      const isChecked = targetDuplicateIds.includes(l.id);
                      const tp = topics.find(t => t.id === l.topicId);
                      const cl = tp ? classrooms.find(c => c.id === tp.classroomId) : null;
                      return (
                        <div
                          key={l.id}
                          onClick={() => handleToggleDuplicateTarget(l.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' 
                              : `${theme.border} ${theme.highlight}`
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 text-xs truncate">
                            {cl && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-400 font-medium inline-block mr-1">
                                {cl.name}
                              </span>
                            )}
                            <span className="font-bold">{l.title}</span>
                            {tp && <span className={`text-[10px] ${theme.textMuted} ml-1`}>({tp.title})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className={`text-[11px] ${theme.textMuted}`}>
                ✨ Quá trình sao chép sẽ tạo mới toàn bộ bài giảng và câu hỏi con đi kèm với ID độc lập.
              </p>
            </div>
          )}

          {/* 3. XÓA HÀNG LOẠT (DELETE) */}
          {actionType === 'delete' && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Cảnh báo xóa vĩnh viễn dữ liệu</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-200">
                Bạn đang chuẩn bị xóa <strong>{selectedIds.length} {contentLabel}</strong>.
              </p>
              {contentType === 'topic' && (
                <ul className="text-[11px] list-disc list-inside space-y-1 text-rose-200/90 font-medium">
                  <li>Toàn bộ <strong>{childLessonsCount} bài học</strong> thuộc các chủ đề này sẽ bị xóa.</li>
                  <li>Toàn bộ <strong>{childExercisesCount} câu bài tập</strong> và sổ lỗi học sinh liên quan sẽ bị xóa.</li>
                </ul>
              )}
              {contentType === 'lesson' && (
                <ul className="text-[11px] list-disc list-inside space-y-1 text-rose-200/90 font-medium">
                  <li>Toàn bộ <strong>{childExercisesCount} câu bài tập</strong> thuộc các bài học này sẽ bị xóa.</li>
                </ul>
              )}
              <p className="text-[11px] font-semibold text-rose-300">
                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-inherit flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border ${theme.border} text-xs font-semibold hover:${theme.highlight} cursor-pointer`}
          >
            Hủy bỏ
          </button>

          {actionType === 'move' && (
            <button
              type="button"
              disabled={!targetMoveId}
              onClick={() => {
                if (targetMoveId) {
                  onConfirmMove(targetMoveId);
                  onClose();
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <MoveRight className="w-3.5 h-3.5" />
              <span>Xác nhận di chuyển</span>
            </button>
          )}

          {actionType === 'duplicate' && (
            <button
              type="button"
              disabled={targetDuplicateIds.length === 0}
              onClick={() => {
                if (targetDuplicateIds.length > 0) {
                  onConfirmDuplicate(targetDuplicateIds);
                  onClose();
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Tạo bản sao ({targetDuplicateIds.length} đích)</span>
            </button>
          )}

          {actionType === 'delete' && (
            <button
              type="button"
              onClick={() => {
                onConfirmDelete();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xác nhận xóa vĩnh viễn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
