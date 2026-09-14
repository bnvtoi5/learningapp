import React, { useState } from 'react';
import { 
  FolderPlus, 
  Plus, 
  Edit3, 
  Trash2, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Layers, 
  HelpCircle,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  SkillCategory 
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { ExerciseEditModal } from './ExerciseEditModal';
import { TopicEditModal } from './TopicEditModal';
import { LessonEditModal } from './LessonEditModal';
import { ConfirmModal } from './ConfirmModal';

interface ContentManagerProps {
  topics?: Topic[];
  lessons?: Lesson[];
  exercises?: Exercise[];
  onStartPractice: (lessonId?: string, isQuick?: boolean, isErrorReview?: boolean, singleExercise?: Exercise) => void;
  onOpenCreateModal: (type: 'topic' | 'lesson' | 'exercise', contextId?: string) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (topicId: string) => void;
  onUpdateLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
}

const TYPE_NAMES: Record<string, string> = {
  vocab_cloze: 'Khuyết ký tự (Recall)',
  flashcard_recall: 'Lật thẻ ghi nhớ',
  listen_spell: 'Nghe & gõ từ (Dictation)',
  anagram: 'Xếp chữ cái (Anagram)',
  collocation: 'Ghép cụm từ',
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền từ',
  sentence_builder: 'Sắp xếp câu',
  matching: 'Nối cặp',
  error_correction: 'Sửa lỗi sai',
  translation: 'Dịch câu',
  speaking: 'Luyện nói',
  writing: 'Luyện viết',
  reading: 'Đọc hiểu',
  listening: 'Luyện nghe',
  mixed_practice: 'Tổng hợp',
};

export const ContentManager: React.FC<ContentManagerProps> = ({
  topics = [],
  lessons = [],
  exercises = [],
  onStartPractice,
  onOpenCreateModal,
  onUpdateTopic,
  onDeleteTopic,
  onUpdateLesson,
  onDeleteLesson,
  onUpdateExercise,
  onDeleteExercise,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(topics?.[0]?.id || null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Edit & Create Modals
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
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

  // Current active topic & its lessons
  const activeTopic = topics.find(t => t.id === selectedTopicId) || topics?.[0] || null;
  const currentLessons = activeTopic ? lessons.filter(l => l.topicId === activeTopic.id) : [];
  
  // Set default active lesson if not set
  const activeLesson = currentLessons.find(l => l.id === selectedLessonId) || currentLessons?.[0] || null;
  const currentExercises = activeLesson ? exercises.filter(e => e.lessonId === activeLesson.id) : [];

  // Filtered exercises by search
  const filteredExercises = currentExercises.filter(ex => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ex.question.toLowerCase().includes(q) ||
      (ex.vocabWord && ex.vocabWord.toLowerCase().includes(q)) ||
      (ex.vocabMeaning && ex.vocabMeaning.toLowerCase().includes(q)) ||
      (ex.correctText && ex.correctText.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Quản lý kho bài & Chỉnh sửa</h2>
          <p className={`text-xs ${theme.textMuted}`}>
            Xem toàn bộ cấu trúc Chủ đề → Bài học → Câu hỏi; Sửa, xóa và thêm bài tập trực tiếp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-manager-create-topic"
            onClick={() => setIsCreatingTopic(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Tạo chủ đề mới</span>
          </button>
        </div>
      </div>

      {/* Summary stats pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Chủ đề</span>
          <span className="text-lg font-bold text-emerald-500">{topics.length}</span>
        </div>
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Bài học</span>
          <span className="text-lg font-bold text-sky-500">{lessons.length}</span>
        </div>
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Tổng câu hỏi</span>
          <span className="text-lg font-bold text-amber-500">{exercises.length}</span>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className={`${theme.card} p-8 rounded-2xl text-center border ${theme.border} space-y-3`}>
          <BookOpen className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
          <h3 className="text-base font-bold">Kho bài đang trống</h3>
          <p className={`text-xs ${theme.textMuted} max-w-sm mx-auto`}>
            Bạn chưa tạo chủ đề nào. Hãy bấm nút bên dưới để tạo chủ đề và bài học đầu tiên.
          </p>
          <button
            id="btn-manager-first-topic"
            onClick={() => setIsCreatingTopic(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo chủ đề đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Topics & Lessons Hierarchy */}
          <div className="space-y-4">
            {/* Topic Selector */}
            <div className={`${theme.card} p-4 rounded-2xl border ${theme.border} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  1. Chủ đề ({topics.length})
                </span>
                <button
                  onClick={() => setIsCreatingTopic(true)}
                  className={`p-1 rounded-lg ${theme.highlight} text-xs text-emerald-500 hover:opacity-80 cursor-pointer`}
                  title="Thêm chủ đề"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {topics.map(topic => {
                  const isSelected = activeTopic?.id === topic.id;
                  const topicLessons = lessons.filter(l => l.topicId === topic.id);
                  return (
                    <div
                      key={topic.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold' 
                          : `${theme.border} ${theme.highlight}`
                      }`}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        const firstL = lessons.find(l => l.topicId === topic.id);
                        setSelectedLessonId(firstL?.id || null);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs block truncate">{topic.title}</span>
                        <span className={`text-[10px] ${theme.textMuted} block`}>
                          {topic.subject} • {topicLessons.length} bài
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingTopic(topic)}
                          className={`p-1 rounded ${theme.highlight} hover:text-sky-500`}
                          title="Sửa chủ đề"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Xóa chủ đề',
                              message: `Bạn có chắc muốn xóa chủ đề "${topic.title}" cùng toàn bộ bài học và câu hỏi bên trong?`,
                              onConfirm: () => onDeleteTopic(topic.id),
                            });
                          }}
                          className={`p-1 rounded ${theme.highlight} hover:text-rose-500 cursor-pointer`}
                          title="Xóa chủ đề"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lesson Selector */}
            <div className={`${theme.card} p-4 rounded-2xl border ${theme.border} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
                  2. Bài học ({currentLessons.length})
                </span>
                {activeTopic && (
                  <button
                    onClick={() => setIsCreatingLesson(true)}
                    className={`p-1 rounded-lg ${theme.highlight} text-xs text-sky-500 hover:opacity-80 flex items-center gap-1 cursor-pointer`}
                    title="Thêm bài học"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Thêm bài</span>
                  </button>
                )}
              </div>

              {currentLessons.length === 0 ? (
                <div className="text-center py-4">
                  <p className={`text-xs ${theme.textMuted} mb-2`}>Chủ đề này chưa có bài học.</p>
                  {activeTopic && (
                    <button
                      onClick={() => setIsCreatingLesson(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tạo bài học ngay</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {currentLessons.map(lesson => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const lessonExs = exercises.filter(e => e.lessonId === lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected 
                            ? 'border-sky-500 bg-sky-500/10 text-sky-500 font-semibold' 
                            : `${theme.border} ${theme.highlight}`
                        }`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs block truncate">{lesson.title}</span>
                          <span className={`text-[10px] ${theme.textMuted} block`}>
                            {lessonExs.length} câu hỏi
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingLesson(lesson)}
                            className={`p-1 rounded ${theme.highlight} hover:text-sky-500`}
                            title="Sửa bài học"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Xóa bài học',
                                message: `Xác nhận xóa bài học "${lesson.title}" và toàn bộ bài tập trong đó?`,
                                onConfirm: () => onDeleteLesson(lesson.id),
                              });
                            }}
                            className={`p-1 rounded ${theme.highlight} hover:text-rose-500 cursor-pointer`}
                            title="Xóa bài học"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2 & 3: Exercises in Active Lesson */}
          <div className="md:col-span-2 space-y-4">
            <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} space-y-4`}>
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-inherit pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      {activeLesson ? activeLesson.title : 'Chọn bài học'}
                    </h3>
                    {activeLesson && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-500">
                        {currentExercises.length} câu hỏi
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                    {activeLesson?.description || 'Chọn một bài học ở cột bên trái để quản lý câu hỏi'}
                  </p>
                </div>

                {activeLesson && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="btn-manager-add-exercise"
                      onClick={() => onOpenCreateModal('exercise', activeLesson.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm câu hỏi</span>
                    </button>

                    {currentExercises.length > 0 && (
                      <button
                        onClick={() => onStartPractice(activeLesson.id)}
                        className={`px-3 py-1.5 rounded-xl border ${theme.border} ${theme.highlight} text-emerald-500 text-xs font-semibold flex items-center gap-1.5`}
                        title="Luyện tập bài này"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Học bài này</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Search in questions */}
              {currentExercises.length > 0 && (
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-3 ${theme.textMuted}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm câu hỏi, từ vựng hoặc đáp án..."
                    className={`w-full pl-8 pr-3 py-2 rounded-xl ${theme.inputBg} text-xs`}
                  />
                </div>
              )}

              {/* Exercise Items List */}
              {!activeLesson ? (
                <div className="text-center py-8">
                  <p className={`text-xs ${theme.textMuted}`}>Vui lòng chọn bài học ở cột bên trái.</p>
                </div>
              ) : currentExercises.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <HelpCircle className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
                  <p className="text-xs font-semibold">Bài học này chưa có câu hỏi nào</p>
                  <p className={`text-[11px] ${theme.textMuted} max-w-xs mx-auto`}>
                    Tạo câu hỏi từ vựng, trắc nghiệm, nối cặp, sắp xếp câu... để học sinh bắt đầu ôn luyện.
                  </p>
                  <button
                    onClick={() => onOpenCreateModal('exercise', activeLesson.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm câu hỏi đầu tiên</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredExercises.map((ex, idx) => {
                    const typeLabel = TYPE_NAMES[ex.type] || ex.type;
                    return (
                      <div
                        key={ex.id}
                        className={`p-4 rounded-xl border ${theme.border} ${theme.highlight} hover:border-emerald-500/50 transition-all space-y-2`}
                      >
                        {/* Badges and action buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-emerald-500">
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                              {typeLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-500 capitalize">
                              {ex.skill}
                            </span>
                            <span className="text-[10px] opacity-70">
                              {ex.difficulty}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              id={`btn-test-exercise-${ex.id}`}
                              onClick={() => onStartPractice(undefined, false, false, ex)}
                              className={`p-1.5 rounded-lg ${theme.badgeBg} text-emerald-500 hover:opacity-80 flex items-center gap-1 text-[11px] font-medium`}
                              title="Kiểm thử câu này ngay"
                            >
                              <Play className="w-3 h-3" />
                              <span className="hidden sm:inline">Luyện thử</span>
                            </button>
                            <button
                              id={`btn-edit-exercise-${ex.id}`}
                              onClick={() => setEditingExercise(ex)}
                              className={`p-1.5 rounded-lg ${theme.badgeBg} hover:text-sky-500`}
                              title="Chỉnh sửa câu hỏi"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-exercise-${ex.id}`}
                              type="button"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Xóa câu hỏi',
                                  message: `Bạn có chắc muốn xóa câu hỏi: "${ex.question}"?`,
                                  onConfirm: () => onDeleteExercise(ex.id),
                                });
                              }}
                              className={`p-1.5 rounded-lg ${theme.badgeBg} hover:text-rose-500 cursor-pointer`}
                              title="Xóa câu hỏi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question title */}
                        <div className="text-xs font-semibold leading-relaxed">
                          {ex.question}
                        </div>

                        {/* Vocabulary info if present */}
                        {ex.vocabWord && (
                          <div className="text-[11px] flex items-center gap-2 text-emerald-500 font-medium">
                            <span>Từ mục tiêu: <strong>{ex.vocabWord}</strong></span>
                            {ex.phonetic && <span className="font-mono">{ex.phonetic}</span>}
                            {ex.vocabMeaning && <span>({ex.vocabMeaning})</span>}
                          </div>
                        )}

                        {/* Options preview if multiple choice */}
                        {ex.options && ex.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            {ex.options.map((opt, oIdx) => {
                              const isCorrect = ex.correctOptions?.includes(oIdx);
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-1.5 rounded-lg border text-[11px] truncate ${
                                    isCorrect 
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold' 
                                      : `${theme.border}`
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Correct text preview */}
                        {ex.correctText && !ex.options?.length && (
                          <div className={`text-[11px] ${theme.textMuted} flex items-center gap-1`}>
                            <span className="font-semibold text-emerald-500">Đáp án:</span>
                            <span className="font-mono">{ex.correctText}</span>
                          </div>
                        )}

                        {/* Explanation */}
                        {ex.explanation && (
                          <p className={`text-[10px] ${theme.textMuted} italic`}>
                            💡 {ex.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit & Create Modals */}
      <TopicEditModal
        topic={editingTopic}
        isOpen={!!editingTopic || isCreatingTopic}
        isCreate={isCreatingTopic}
        onClose={() => {
          setEditingTopic(null);
          setIsCreatingTopic(false);
        }}
        onSave={(savedTopic) => {
          onUpdateTopic(savedTopic);
          setSelectedTopicId(savedTopic.id);
          setIsCreatingTopic(false);
          setEditingTopic(null);
        }}
      />

      <LessonEditModal
        lesson={editingLesson}
        isOpen={!!editingLesson || isCreatingLesson}
        isCreate={isCreatingLesson}
        targetTopicId={activeTopic?.id || ''}
        existingLessonsCount={currentLessons.length}
        onClose={() => {
          setEditingLesson(null);
          setIsCreatingLesson(false);
        }}
        onSave={(savedLesson) => {
          onUpdateLesson(savedLesson);
          setSelectedLessonId(savedLesson.id);
          setIsCreatingLesson(false);
          setEditingLesson(null);
        }}
      />

      <ExerciseEditModal
        exercise={editingExercise}
        isOpen={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        onSave={onUpdateExercise}
      />

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
    </div>
  );
};
