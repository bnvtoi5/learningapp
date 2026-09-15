import React, { useState, useEffect } from 'react';
import { X, Save, Layers } from 'lucide-react';
import { Lesson } from '../types';
import { useTheme } from '../context/ThemeContext';

interface LessonEditModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: Lesson) => void;
  isCreate?: boolean;
  targetTopicId?: string;
  existingLessonsCount?: number;
}

export const LessonEditModal: React.FC<LessonEditModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onSave,
  isCreate = false,
  targetTopicId,
  existingLessonsCount = 0,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [knowledgeSummary, setKnowledgeSummary] = useState('');
  const [isHidden, setIsHidden] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (lesson && !isCreate) {
      setTitle(lesson.title);
      setDescription(lesson.description || '');
      setKnowledgeSummary(lesson.knowledgeSummary || '');
      setIsHidden(!!lesson.isHidden);
    } else {
      setTitle('');
      setDescription('');
      setKnowledgeSummary('');
      setIsHidden(false);
    }
  }, [lesson, isOpen, isCreate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(lesson && !isCreate ? lesson : {}),
      id: lesson && !isCreate ? lesson.id : ('lesson_' + Date.now()),
      topicId: lesson && !isCreate ? lesson.topicId : (targetTopicId || ''),
      title: title.trim(),
      description: description.trim(),
      knowledgeSummary: knowledgeSummary.trim() || undefined,
      order: lesson && !isCreate ? lesson.order : (existingLessonsCount + 1),
      slides: lesson && !isCreate ? lesson.slides : undefined,
      isHidden,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-md ${theme.card} rounded-2xl shadow-2xl border ${theme.border} overflow-hidden`}>
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-500" />
            <h3 className="font-bold text-sm">{isCreate ? 'Tạo bài học mới' : 'Chỉnh sửa bài học'}</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.highlight} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tên bài học *:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Mô tả mục tiêu:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tóm tắt kiến thức cốt lõi (Pha Learn):
            </label>
            <textarea
              rows={3}
              value={knowledgeSummary}
              onChange={e => setKnowledgeSummary(e.target.value)}
              placeholder="Quy tắc ngữ pháp hoặc ghi chú trọng tâm..."
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
          </div>

          {/* Visibility Setting: Hide from students */}
          <div className={`p-3 rounded-xl border ${isHidden ? 'border-amber-500/30 bg-amber-500/5' : 'border-neutral-500/20 bg-neutral-500/5'} flex items-center justify-between`}>
            <div>
              <span className="text-xs font-semibold block">
                {isHidden ? 'Đang ẩn bài học với học sinh' : 'Hiển thị bài học với học sinh'}
              </span>
              <span className={`text-[11px] ${theme.textMuted}`}>
                {isHidden ? 'Chỉ giáo viên thấy bài học này, học sinh sẽ không thấy' : 'Học sinh trong lớp có thể nhìn thấy bài học này'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHidden}
                onChange={e => setIsHidden(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border ${theme.border} text-xs font-medium`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
