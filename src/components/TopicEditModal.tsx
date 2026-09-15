import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, BookOpen, AlertCircle, School, Layers } from 'lucide-react';
import { Topic, SkillCategory, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';
import { loadClassrooms } from '../utils/storage';
import { getDistinctClassNames, getClassroomsByName } from '../utils/classroomHelpers';

interface TopicEditModalProps {
  topic: Topic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: Topic) => void;
  isCreate?: boolean;
  classrooms?: Classroom[];
  defaultClassroomId?: string;
  onNavigateToClassManager?: () => void;
}

export const TopicEditModal: React.FC<TopicEditModalProps> = ({
  topic,
  isOpen,
  onClose,
  onSave,
  isCreate = false,
  classrooms: propClassrooms,
  defaultClassroomId,
  onNavigateToClassManager,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Always ensure fresh classrooms from prop or local storage
  const classrooms = (propClassrooms && propClassrooms.length > 0) ? propClassrooms : loadClassrooms();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Tiếng Anh');
  const [primarySkill, setPrimarySkill] = useState<SkillCategory>('vocabulary');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const distinctNames = useMemo(() => getDistinctClassNames(classrooms), [classrooms]);

  useEffect(() => {
    if (!isOpen) return;
    const available = (propClassrooms && propClassrooms.length > 0) ? propClassrooms : loadClassrooms();
    const fallbackClass = available.find(c => c.id === defaultClassroomId) || available[0];
    
    if (topic && !isCreate) {
      setTitle(topic.title);
      setDescription(topic.description || '');
      setSubject(topic.subject || 'Tiếng Anh');
      setPrimarySkill(topic.primarySkill || 'vocabulary');
      const currentClass = available.find(c => c.id === topic.classroomId) || fallbackClass;
      if (currentClass) {
        setSelectedClassName(currentClass.name);
        setSelectedClassId(currentClass.id);
      }
    } else {
      setTitle('');
      setDescription('');
      setSubject('Tiếng Anh');
      setPrimarySkill('vocabulary');
      if (fallbackClass) {
        setSelectedClassName(fallbackClass.name);
        setSelectedClassId(fallbackClass.id);
      }
    }
  }, [topic, isOpen, isCreate, defaultClassroomId, propClassrooms]);

  const availableCodesForSelectedName = useMemo(() => {
    if (!selectedClassName) return classrooms;
    return getClassroomsByName(classrooms, selectedClassName);
  }, [classrooms, selectedClassName]);

  // When selectedClassName changes, ensure selectedClassId is within available codes
  const handleClassNameChange = (name: string) => {
    setSelectedClassName(name);
    const codes = getClassroomsByName(classrooms, name);
    if (codes.length > 0) {
      setSelectedClassId(codes[0].id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!selectedClassId) {
      alert('Vui lòng chọn Lớp học & Mã lớp cho chủ đề này!');
      return;
    }

    onSave({
      id: topic && !isCreate ? topic.id : ('topic_' + Date.now()),
      classroomId: selectedClassId,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim() || 'Tiếng Anh',
      primarySkill,
      createdAt: topic && !isCreate ? topic.createdAt : Date.now(),
    });
    onClose();
  };

  const hasClassrooms = classrooms.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-md ${theme.card} rounded-2xl shadow-2xl border ${theme.border} overflow-hidden`}>
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">{isCreate ? 'Tạo chủ đề mới' : 'Chỉnh sửa chủ đề'}</h3>
          </div>
          <button
            id="btn-close-topic-modal"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.highlight} hover:opacity-80`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {!hasClassrooms ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Chưa có Lớp học nào trong hệ thống!</span>
              </div>
              <p className="text-[11px]">
                Quy trình chuẩn là: <strong>Tạo Lớp</strong> → <strong>Tạo Chủ đề</strong> → <strong>Tạo Bài học</strong> → <strong>Tạo Câu hỏi</strong>.
              </p>
              {onNavigateToClassManager && (
                <button
                  type="button"
                  id="btn-goto-create-class-from-topic"
                  onClick={() => {
                    onClose();
                    onNavigateToClassManager();
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
                >
                  Đến tab Quản lý Lớp học để tạo lớp ngay
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                <School className="w-4 h-4 shrink-0" />
                <span>Chọn Lớp & Mã lớp gán chủ đề (2 Tầng) *:</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[11px] font-semibold ${theme.textMuted} block mb-0.5`}>
                    1. Tên Lớp (Khối):
                  </label>
                  <select
                    value={selectedClassName}
                    onChange={e => handleClassNameChange(e.target.value)}
                    className={`w-full p-2 rounded-lg ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
                  >
                    {distinctNames.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-semibold ${theme.textMuted} block mb-0.5`}>
                    2. Mã lớp cụ thể *:
                  </label>
                  <select
                    id="select-topic-classroom"
                    required
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className={`w-full p-2 rounded-lg ${theme.inputBg} text-xs font-bold text-sky-400 border ${theme.border}`}
                  >
                    {availableCodesForSelectedName.map(c => (
                      <option key={c.id} value={c.id}>
                        Mã: {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <span className={`text-[10px] ${theme.textMuted} block`}>
                Chủ đề sẽ chỉ hiển thị cho học sinh thuộc mã lớp này.
              </span>
            </div>
          )}

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Tên chủ đề *:
            </label>
            <input
              id="input-topic-title"
              type="text"
              required
              placeholder="VD: Thì Quá khứ đơn và Hiện tại hoàn thành"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-sm font-semibold border ${theme.border}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Môn học:
              </label>
              <input
                id="input-topic-subject"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                Kỹ năng trọng tâm:
              </label>
              <select
                id="select-topic-skill"
                value={primarySkill}
                onChange={e => setPrimarySkill(e.target.value as SkillCategory)}
                className={`w-full p-2 rounded-xl ${theme.inputBg} text-xs capitalize border ${theme.border}`}
              >
                <option value="vocabulary">Từ vựng</option>
                <option value="grammar">Ngữ pháp</option>
                <option value="reading">Đọc hiểu</option>
                <option value="listening">Luyện nghe</option>
                <option value="speaking">Luyện nói</option>
                <option value="writing">Luyện viết</option>
                <option value="mixed">Tổng hợp (Mixed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
              Mô tả ngắn:
            </label>
            <textarea
              id="input-topic-desc"
              rows={2}
              placeholder="Mô tả mục tiêu của chủ đề bài học..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              id="btn-cancel-topic"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border ${theme.border} text-xs font-medium`}
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-save-topic"
              disabled={!hasClassrooms}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5"
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
