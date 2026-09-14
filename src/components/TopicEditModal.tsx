import React, { useState, useEffect } from 'react';
import { X, Save, BookOpen } from 'lucide-react';
import { Topic, SkillCategory } from '../types';
import { useTheme } from '../context/ThemeContext';

interface TopicEditModalProps {
  topic: Topic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: Topic) => void;
  isCreate?: boolean;
}

export const TopicEditModal: React.FC<TopicEditModalProps> = ({
  topic,
  isOpen,
  onClose,
  onSave,
  isCreate = false,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Tiếng Anh');
  const [primarySkill, setPrimarySkill] = useState<SkillCategory>('vocabulary');

  useEffect(() => {
    if (!isOpen) return;
    if (topic && !isCreate) {
      setTitle(topic.title);
      setDescription(topic.description || '');
      setSubject(topic.subject || 'Tiếng Anh');
      setPrimarySkill(topic.primarySkill || 'vocabulary');
    } else {
      setTitle('');
      setDescription('');
      setSubject('Tiếng Anh');
      setPrimarySkill('vocabulary');
    }
  }, [topic, isOpen, isCreate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: topic && !isCreate ? topic.id : ('topic_' + Date.now()),
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim() || 'Tiếng Anh',
      primarySkill,
      createdAt: topic && !isCreate ? topic.createdAt : Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-md ${theme.card} rounded-2xl shadow-2xl border ${theme.border} overflow-hidden`}>
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">{isCreate ? 'Tạo chủ đề mới' : 'Chỉnh sửa chủ đề'}</h3>
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
              Tên chủ đề *:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Môn học:
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Kỹ năng trọng tâm:
              </label>
              <select
                value={primarySkill}
                onChange={e => setPrimarySkill(e.target.value as SkillCategory)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs capitalize`}
              >
                <option value="vocabulary">Từ vựng</option>
                <option value="grammar">Ngữ pháp</option>
                <option value="reading">Đọc hiểu</option>
                <option value="listening">Luyện nghe</option>
                <option value="speaking">Luyện nói</option>
                <option value="writing">Luyện viết</option>
                <option value="mixed">Tổng hợp</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Mô tả ngắn:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs`}
            />
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
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
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
