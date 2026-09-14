import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  ChevronRight, 
  Play, 
  Trash2, 
  Edit3, 
  Search, 
  Sparkles, 
  Layers, 
  Info,
  CheckCircle,
  HelpCircle,
  Clock,
  Flame,
  Lock,
  School,
  FileText
} from 'lucide-react';
import { Topic, Lesson, Exercise, SkillCategory, User, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import { TopicEditModal } from './TopicEditModal';

interface TopicListProps {
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string | null) => void;
  onStartPractice: (lessonId?: string) => void;
  onOpenCreateModal: (type: 'topic' | 'lesson' | 'exercise', contextId?: string) => void;
  onSaveTopic?: (topic: Topic) => void;
  onDeleteTopic: (topicId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  currentUser?: User | null;
  classrooms?: Classroom[];
}

const LESSON_STAGES = [
  { id: 'learn', name: '1. Học kiến thức', desc: 'Lý thuyết cốt lõi & ví dụ mẫu' },
  { id: 'recognize', name: '2. Nhận biết', desc: 'Nhận diện & phân biệt' },
  { id: 'practice', name: '3. Luyện có hướng dẫn', desc: 'Có gợi ý, scaffolding' },
  { id: 'use', name: '4. Tự sử dụng', desc: 'Sản xuất câu, vận dụng' },
  { id: 'challenge', name: '5. Thử thách', desc: 'Tổng hợp, bẫy tư duy' },
  { id: 'review', name: '6. Ôn tập', desc: 'Spaced repetition kiến thức cũ' },
];

export const TopicList: React.FC<TopicListProps> = ({
  topics = [],
  lessons = [],
  exercises = [],
  selectedTopicId,
  onSelectTopic,
  onStartPractice,
  onOpenCreateModal,
  onDeleteTopic,
  onDeleteLesson,
  currentUser,
  classrooms = [],
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLessonDetail, setActiveLessonDetail] = useState<Lesson | null>(null);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions;

  const handleOpenCreateTopic = () => {
    if (onSaveTopic) {
      setIsCreateTopicOpen(true);
    } else {
      onOpenCreateModal('topic');
    }
  };

  // Filter topics for students based on their classroom
  const availableTopics = topics.filter(t => {
    if (isAdmin) return true; // Admin sees all
    // If student has a classroom, show topics assigned to that classroom OR general topics
    if (currentUser?.classroomId) {
      return !t.classroomId || t.classroomId === currentUser.classroomId;
    }
    return !t.classroomId;
  });

  const filteredTopics = availableTopics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTopic = availableTopics.find(t => t.id === selectedTopicId) || null;
  const currentLessons = currentTopic 
    ? lessons.filter(l => l.topicId === currentTopic.id).sort((a, b) => a.order - b.order)
    : [];

  const studentClass = classrooms.find(c => c.id === currentUser?.classroomId);

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Search and Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`${typo.headingText} tracking-tight`}>
              Khóa học & Chủ đề
            </h2>
            {!isAdmin && studentClass && (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Lớp: {studentClass.name}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm ${theme.textMuted} mt-0.5`}>
            {isAdmin 
              ? 'Quản lý cấu trúc bài học và nội dung đào tạo cho các lớp' 
              : 'Nội dung học tập được phân bổ riêng cho lớp học của bạn'}
          </p>
        </div>

        {/* Action buttons (Admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              id="btn-create-topic-header"
              onClick={handleOpenCreateTopic}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo chủ đề mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`w-4 h-4 absolute left-3 top-3 ${theme.textMuted}`} />
        <input
          id="search-topics-input"
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm chủ đề, môn học..."
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
        />
      </div>

      {/* Breadcrumb if a topic is selected */}
      {currentTopic && (
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => onSelectTopic(null)}
            className={`font-medium ${theme.textMuted} hover:underline`}
          >
            Tất cả chủ đề
          </button>
          <ChevronRight className={`w-3.5 h-3.5 ${theme.textMuted}`} />
          <span className="font-semibold text-emerald-500 truncate">{currentTopic.title}</span>
        </div>
      )}

      {/* Grid of Topics */}
      {!currentTopic && (
        <div>
          {filteredTopics.length === 0 ? (
            <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2 ${theme.border} space-y-3`}>
              <BookOpen className={`w-8 h-8 ${theme.textMuted} mx-auto opacity-70`} />
              <div>
                <h3 className="text-sm font-semibold">Chưa có chủ đề nào phù hợp</h3>
                <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                  {isAdmin 
                    ? 'Bạn có thể bấm "Tạo chủ đề mới" để bắt đầu thiết kế bài học.' 
                    : 'Giáo viên chưa phân bổ chủ đề cho lớp học này. Vui lòng quay lại sau!'}
                </p>
              </div>
              {isAdmin && (
                <button
                  id="btn-create-topic-empty"
                  onClick={handleOpenCreateTopic}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo chủ đề đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTopics.map(topic => {
                const topicLessons = lessons.filter(l => l.topicId === topic.id);
                const topicExercises = exercises.filter(e => topicLessons.some(l => l.id === e.lessonId));
                const topicClass = classrooms.find(c => c.id === topic.classroomId);

                return (
                  <div
                    key={topic.id}
                    id={`topic-item-${topic.id}`}
                    className={`${theme.card} p-4 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between group border ${theme.border}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                            {topic.subject} • {topic.primarySkill}
                          </span>
                          {topicClass && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500">
                              {topicClass.code}
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              id={`btn-delete-topic-${topic.id}`}
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Xóa chủ đề',
                                  message: `Bạn có chắc muốn xóa chủ đề "${topic.title}" cùng toàn bộ bài học bên trong?`,
                                  onConfirm: () => onDeleteTopic(topic.id),
                                });
                              }}
                              title="Xóa chủ đề"
                              className="p-1 text-rose-400 hover:text-rose-500 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 
                        onClick={() => onSelectTopic(topic.id)}
                        className="text-base font-semibold cursor-pointer group-hover:text-emerald-500 transition-colors"
                      >
                        {topic.title}
                      </h3>
                      <p className={`text-xs ${theme.textMuted} mt-1 line-clamp-2`}>
                        {topic.description || 'Chưa có mô tả chi tiết'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between">
                      <span className={`text-xs ${theme.textMuted}`}>
                        {topicLessons.length} bài học • {topicExercises.length} câu hỏi
                      </span>
                      <button
                        id={`btn-open-topic-${topic.id}`}
                        onClick={() => onSelectTopic(topic.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                      >
                        <span>Mở bài học</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Topic Lessons View */}
      {currentTopic && (
        <div className="space-y-4">
          {/* Topic header banner */}
          <div className={`${theme.card} p-4 rounded-xl border-l-4 border-l-emerald-500 border ${theme.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
                  {currentTopic.subject} • {currentTopic.primarySkill}
                </span>
                <h3 className="text-lg font-bold mt-0.5">{currentTopic.title}</h3>
                <p className={`text-xs ${theme.textMuted} mt-1`}>
                  {currentTopic.description || 'Chưa có ghi chú'}
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-add-lesson-to-topic"
                    onClick={() => onOpenCreateModal('lesson', currentTopic.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo bài học mới</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lessons List */}
          {currentLessons.length === 0 ? (
            <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2 ${theme.border}`}>
              <p className={`text-sm ${theme.textMuted} mb-3`}>
                Chủ đề này chưa có bài học nào.
              </p>
              {isAdmin && (
                <button
                  id="btn-create-first-lesson"
                  onClick={() => onOpenCreateModal('lesson', currentTopic.id)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo bài học đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentLessons.map((lesson, idx) => {
                const lessonExercises = exercises.filter(e => e.lessonId === lesson.id);
                const canPractice = isAdmin || (perms?.canPractice !== false);
                const canViewTheory = isAdmin || (perms?.canViewTheory !== false);

                return (
                  <div
                    key={lesson.id}
                    id={`lesson-card-${lesson.id}`}
                    className={`${theme.card} p-4 rounded-xl space-y-3 border ${theme.border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="text-base font-semibold">{lesson.title}</h4>
                        </div>
                        <p className={`text-xs ${theme.textMuted}`}>
                          {lesson.description || 'Chưa có tóm tắt bài học'}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-delete-lesson-${lesson.id}`}
                            type="button"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Xóa bài học',
                                message: `Bạn có chắc muốn xóa bài học "${lesson.title}" và các câu hỏi trong bài?`,
                                onConfirm: () => onDeleteLesson(lesson.id),
                              });
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-500 rounded cursor-pointer"
                            title="Xóa bài học"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Knowledge Summary Teaser (Respects canViewTheory) */}
                    {lesson.knowledgeSummary && (
                      canViewTheory ? (
                        <div className={`p-3 rounded-lg ${theme.highlight} text-xs leading-relaxed`}>
                          <span className="font-semibold text-emerald-500 block mb-1">
                            📌 Kiến thức cốt lõi:
                          </span>
                          <p className="whitespace-pre-line">{lesson.knowledgeSummary}</p>
                        </div>
                      ) : (
                        <div className={`p-2.5 rounded-lg border ${theme.border} ${theme.badgeBg} text-[11px] text-amber-500/90 flex items-center gap-2`}>
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Giáo viên tạm thời khóa phần xem lý thuyết trước khi làm bài.</span>
                        </div>
                      )
                    )}

                    {/* 6 Stages indicators */}
                    <div className="pt-1">
                      <div className="text-[11px] font-medium text-emerald-500 mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Cấu trúc 6 pha học tập:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px]">
                        {LESSON_STAGES.map(stage => (
                          <div 
                            key={stage.id}
                            className={`p-1.5 rounded text-center border ${theme.border} ${theme.badgeBg}`}
                          >
                            <span className="font-medium block truncate">{stage.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-inherit flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-xs ${theme.textMuted}`}>
                        {lessonExercises.length} câu hỏi luyện tập
                      </span>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            id={`btn-add-exercise-to-lesson-${lesson.id}`}
                            onClick={() => onOpenCreateModal('exercise', lesson.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${theme.border} hover:${theme.highlight} flex items-center gap-1`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm câu hỏi</span>
                          </button>
                        )}

                        {canPractice ? (
                          <button
                            id={`btn-start-practice-lesson-${lesson.id}`}
                            disabled={lessonExercises.length === 0}
                            onClick={() => onStartPractice(lesson.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Luyện bài này</span>
                          </button>
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            <span>Giáo viên tạm khóa luyện tập</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm Action Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Xóa bỏ"
        cancelText="Hủy"
        isDanger={true}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Quick Create Topic Modal */}
      <TopicEditModal
        topic={null}
        isOpen={isCreateTopicOpen}
        isCreate={true}
        onClose={() => setIsCreateTopicOpen(false)}
        onSave={(newTopic) => {
          if (onSaveTopic) {
            onSaveTopic(newTopic);
            onSelectTopic(newTopic.id);
          }
          setIsCreateTopicOpen(false);
        }}
      />
    </div>
  );
};
