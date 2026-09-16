import React, { useState, useMemo } from 'react';
import { 
  FolderPlus, 
  Plus, 
  Edit3, 
  Trash2, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  BookOpen, 
  Layers, 
  HelpCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  School,
  Sparkles,
  HardDrive,
  Filter,
  Copy,
  MoveRight,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  GripVertical,
  Shuffle,
  Printer,
  X
} from 'lucide-react';
import { 
  Topic, 
  Lesson, 
  Exercise, 
  SkillCategory, 
  Classroom 
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { ExerciseEditModal } from './ExerciseEditModal';
import { TopicEditModal } from './TopicEditModal';
import { LessonEditModal } from './LessonEditModal';
import { ConfirmModal } from './ConfirmModal';
import { LessonLectureModal } from './LessonLectureModal';
import { LessonContentEditorModal } from './LessonContentEditorModal';
import { LessonPrintModal } from './LessonPrintModal';
import { MediaLibraryModal } from './MediaLibraryModal';
import { BulkContentModal, BulkActionType, BulkContentType } from './BulkContentModal';
import { loadClassrooms } from '../utils/storage';
import { ClassroomCascadingFilter } from './ClassroomCascadingFilter';
import { getClassroomsByName } from '../utils/classroomHelpers';

interface ContentManagerProps {
  topics?: Topic[];
  lessons?: Lesson[];
  exercises?: Exercise[];
  classrooms?: Classroom[];
  onNavigateToClassManager?: () => void;
  onStartPractice: (lessonId?: string, isQuick?: boolean, isErrorReview?: boolean, singleExercise?: Exercise) => void;
  onOpenCreateModal: (type: 'topic' | 'lesson' | 'exercise', contextId?: string) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (topicId: string) => void;
  onUpdateLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  // Reorder handlers
  onReorderTopics?: (orderedTopics: Topic[]) => void;
  onReorderLessons?: (orderedLessons: Lesson[]) => void;
  onReorderExercises?: (orderedExercises: Exercise[]) => void;
  // Bulk action handlers
  onBulkDeleteTopics?: (topicIds: string[]) => void;
  onBulkMoveTopics?: (topicIds: string[], targetClassroomId: string) => void;
  onBulkDuplicateTopics?: (topicIds: string[], targetClassroomIds: string[]) => void;
  onBulkDeleteLessons?: (lessonIds: string[]) => void;
  onBulkMoveLessons?: (lessonIds: string[], targetTopicId: string) => void;
  onBulkDuplicateLessons?: (lessonIds: string[], targetTopicIds: string[]) => void;
  onBulkDeleteExercises?: (exerciseIds: string[]) => void;
  onBulkMoveExercises?: (exerciseIds: string[], targetLessonId: string) => void;
  onBulkDuplicateExercises?: (exerciseIds: string[], targetLessonIds: string[]) => void;
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
  classrooms: propClassrooms = [],
  onNavigateToClassManager,
  onStartPractice,
  onOpenCreateModal,
  onUpdateTopic,
  onDeleteTopic,
  onUpdateLesson,
  onDeleteLesson,
  onUpdateExercise,
  onDeleteExercise,
  onReorderTopics,
  onReorderLessons,
  onReorderExercises,
  onBulkDeleteTopics,
  onBulkMoveTopics,
  onBulkDuplicateTopics,
  onBulkDeleteLessons,
  onBulkMoveLessons,
  onBulkDuplicateLessons,
  onBulkDeleteExercises,
  onBulkMoveExercises,
  onBulkDuplicateExercises,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Always ensure fresh classrooms from props or local storage
  const classrooms = (propClassrooms && propClassrooms.length > 0) ? propClassrooms : loadClassrooms();

  // Classroom & Search Filters (2 Tiers)
  const [selectedClassName, setSelectedClassName] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection States
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // Drag and drop states for Topic, Lesson, and Exercise
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);

  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
  const [dragOverExerciseId, setDragOverExerciseId] = useState<string | null>(null);

  // Bulk Action Modal State
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    action: BulkActionType;
    contentType: BulkContentType;
  }>({
    isOpen: false,
    action: 'delete',
    contentType: 'topic',
  });

  // Filter topics by selected 2-tier class and sort by order
  const filteredTopics = useMemo(() => {
    let list = topics;
    if (selectedClassFilter !== 'all') {
      list = topics.filter(t => t.classroomId === selectedClassFilter);
    } else if (selectedClassName !== 'all') {
      const classList = getClassroomsByName(classrooms, selectedClassName);
      const classIdSet = new Set(classList.map(c => c.id));
      list = topics.filter(t => classIdSet.has(t.classroomId));
    }
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [topics, classrooms, selectedClassName, selectedClassFilter]);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Edit & Create Modals
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [lectureModalLesson, setLectureModalLesson] = useState<Lesson | null>(null);
  const [editorModalLesson, setEditorModalLesson] = useState<Lesson | null>(null);
  const [printModalLesson, setPrintModalLesson] = useState<Lesson | null>(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
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

  // Calculate scoped statistics according to current 2-tier filter
  const filteredTopicIds = useMemo(() => new Set(filteredTopics.map(t => t.id)), [filteredTopics]);
  const scopedLessons = useMemo(() => lessons.filter(l => filteredTopicIds.has(l.topicId)), [lessons, filteredTopicIds]);
  const scopedLessonIds = useMemo(() => new Set(scopedLessons.map(l => l.id)), [scopedLessons]);
  const scopedExercises = useMemo(() => exercises.filter(e => scopedLessonIds.has(e.lessonId)), [exercises, scopedLessonIds]);

  const scopedClassCount = useMemo(() => {
    if (selectedClassFilter !== 'all') {
      return 1;
    }
    if (selectedClassName !== 'all') {
      return getClassroomsByName(classrooms, selectedClassName).length;
    }
    return classrooms.length;
  }, [classrooms, selectedClassName, selectedClassFilter]);

  // Current active topic & its lessons, sorted by order
  const activeTopic = filteredTopics.find(t => t.id === selectedTopicId) || filteredTopics[0] || null;
  const currentLessons = useMemo(() => {
    if (!activeTopic) return [];
    return lessons
      .filter(l => l.topicId === activeTopic.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [lessons, activeTopic]);
  
  // Set default active lesson if not set, sorted by order
  const activeLesson = currentLessons.find(l => l.id === selectedLessonId) || currentLessons[0] || null;
  const currentExercises = useMemo(() => {
    if (!activeLesson) return [];
    return exercises
      .filter(e => e.lessonId === activeLesson.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [exercises, activeLesson]);

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

  // Visibility Toggles
  const handleToggleTopicVisibility = (topic: Topic, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateTopic({ ...topic, isHidden: !topic.isHidden });
  };

  const handleToggleLessonVisibility = (lesson: Lesson, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateLesson({ ...lesson, isHidden: !lesson.isHidden });
  };

  const handleToggleExerciseVisibility = (exercise: Exercise, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateExercise({ ...exercise, isHidden: !exercise.isHidden });
  };

  const handleBulkToggleVisibility = (type: 'topic' | 'lesson' | 'exercise', makeHidden: boolean) => {
    if (type === 'topic') {
      selectedTopicIds.forEach(id => {
        const t = topics.find(item => item.id === id);
        if (t) onUpdateTopic({ ...t, isHidden: makeHidden });
      });
      setSelectedTopicIds([]);
    } else if (type === 'lesson') {
      selectedLessonIds.forEach(id => {
        const l = lessons.find(item => item.id === id);
        if (l) onUpdateLesson({ ...l, isHidden: makeHidden });
      });
      setSelectedLessonIds([]);
    } else if (type === 'exercise') {
      selectedExerciseIds.forEach(id => {
        const ex = exercises.find(item => item.id === id);
        if (ex) onUpdateExercise({ ...ex, isHidden: makeHidden });
      });
      setSelectedExerciseIds([]);
    }
  };

  // Reorder Handlers - Topics
  const handleTopicDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTopicId(id);
  };

  const handleTopicDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTopicId(null);
    if (!draggedTopicId || draggedTopicId === targetId || !onReorderTopics) return;
    const items = [...filteredTopics];
    const fromIndex = items.findIndex(t => t.id === draggedTopicId);
    const toIndex = items.findIndex(t => t.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    onReorderTopics(items);
    setDraggedTopicId(null);
  };

  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    if (!onReorderTopics) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filteredTopics.length) return;
    const items = [...filteredTopics];
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    onReorderTopics(items);
  };

  // Reorder Handlers - Lessons
  const handleLessonDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLessonId(id);
  };

  const handleLessonDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverLessonId(null);
    if (!draggedLessonId || draggedLessonId === targetId || !onReorderLessons) return;
    const items = [...currentLessons];
    const fromIndex = items.findIndex(l => l.id === draggedLessonId);
    const toIndex = items.findIndex(l => l.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    onReorderLessons(items);
    setDraggedLessonId(null);
  };

  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    if (!onReorderLessons) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentLessons.length) return;
    const items = [...currentLessons];
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    onReorderLessons(items);
  };

  // Reorder Handlers - Exercises
  const handleExerciseDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedExerciseId(id);
  };

  const handleExerciseDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverExerciseId(null);
    if (!draggedExerciseId || draggedExerciseId === targetId || !onReorderExercises) return;
    const items = [...currentExercises];
    const fromIndex = items.findIndex(ex => ex.id === draggedExerciseId);
    const toIndex = items.findIndex(ex => ex.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    onReorderExercises(items);
    setDraggedExerciseId(null);
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (!onReorderExercises) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentExercises.length) return;
    const items = [...currentExercises];
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    onReorderExercises(items);
  };

  // Bulk Selection Helpers
  const toggleSelectTopic = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTopicIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllTopics = () => {
    if (selectedTopicIds.length === filteredTopics.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(filteredTopics.map(t => t.id));
    }
  };

  const toggleSelectLesson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLessonIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLessons = () => {
    if (selectedLessonIds.length === currentLessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(currentLessons.map(l => l.id));
    }
  };

  const toggleSelectExercise = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExerciseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllExercises = () => {
    if (selectedExerciseIds.length === filteredExercises.length) {
      setSelectedExerciseIds([]);
    } else {
      setSelectedExerciseIds(filteredExercises.map(e => e.id));
    }
  };

  const clearAllSelections = () => {
    setSelectedTopicIds([]);
    setSelectedLessonIds([]);
    setSelectedExerciseIds([]);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Quản lý kho bài & Chỉnh sửa</h2>
          <p className={`text-xs ${theme.textMuted}`}>
            Cấu trúc chuẩn: <strong>Lớp học</strong> → <strong>Chủ đề</strong> → <strong>Bài học</strong> → <strong>Câu hỏi</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {classrooms.length > 0 && (
            <div className="flex items-center gap-2">
              <ClassroomCascadingFilter
                classrooms={classrooms}
                selectedClassName={selectedClassName}
                onSelectClassName={name => {
                  setSelectedClassName(name);
                  setSelectedTopicId(null);
                  setSelectedLessonId(null);
                }}
                selectedClassId={selectedClassFilter}
                onSelectClassId={id => {
                  setSelectedClassFilter(id);
                  setSelectedTopicId(null);
                  setSelectedLessonId(null);
                }}
                showAllOption={true}
                allOptionLabel="Tất cả các lớp"
                size="sm"
              />
            </div>
          )}

          <button
            id="btn-manager-open-media-library"
            onClick={() => setIsMediaLibraryOpen(true)}
            className={`px-3.5 py-2 rounded-xl ${theme.card} border ${theme.border} hover:border-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer`}
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mở kho tư liệu</span>
          </button>

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

      {/* No Classrooms Warning Banner */}
      {classrooms.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <School className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold text-xs sm:text-sm block text-amber-300">
                Hệ thống chưa có Lớp học nào!
              </span>
              <span className={`text-[11px] ${theme.textMuted}`}>
                Quy trình chuẩn: Vui lòng tạo Lớp học trước, sau đó tạo Chủ đề trực thuộc lớp đó.
              </span>
            </div>
          </div>
          {onNavigateToClassManager && (
            <button
              id="btn-manager-goto-create-class"
              onClick={onNavigateToClassManager}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0"
            >
              + Tạo Lớp học ngay
            </button>
          )}
        </div>
      )}

      {/* Summary stats pills (Scaled to Active Filter) */}
      <div className="grid grid-cols-4 gap-2">
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block truncate`}>
            {selectedClassFilter !== 'all' || selectedClassName !== 'all' ? 'Lớp đang lọc' : 'Tổng Lớp học'}
          </span>
          <span className="text-lg font-bold text-teal-400">{scopedClassCount}</span>
        </div>
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Chủ đề</span>
          <span className="text-lg font-bold text-emerald-500">{filteredTopics.length}</span>
        </div>
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Bài học</span>
          <span className="text-lg font-bold text-sky-500">{scopedLessons.length}</span>
        </div>
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Tổng câu hỏi</span>
          <span className="text-lg font-bold text-amber-500">{scopedExercises.length}</span>
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
                <div className="flex items-center gap-2">
                  {filteredTopics.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllTopics}
                      className="text-[11px] text-emerald-500 hover:opacity-80 flex items-center gap-1 cursor-pointer font-semibold"
                      title={selectedTopicIds.length === filteredTopics.length ? 'Bỏ chọn tất cả chủ đề' : 'Chọn tất cả chủ đề'}
                    >
                      {selectedTopicIds.length > 0 && selectedTopicIds.length === filteredTopics.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Square className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </button>
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                    1. Chủ đề ({filteredTopics.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTopicIds.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      Đã chọn {selectedTopicIds.length}
                    </span>
                  )}
                  <button
                    onClick={() => setIsCreatingTopic(true)}
                    className={`p-1 rounded-lg ${theme.highlight} text-xs text-emerald-500 hover:opacity-80 cursor-pointer`}
                    title="Thêm chủ đề"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredTopics.map((topic, topicIdx) => {
                  const isSelected = activeTopic?.id === topic.id;
                  const isChecked = selectedTopicIds.includes(topic.id);
                  const isDragOver = dragOverTopicId === topic.id;
                  const topicLessons = lessons.filter(l => l.topicId === topic.id);
                  const topicClass = classrooms.find(c => c.id === topic.classroomId);
                  return (
                    <div
                      key={topic.id}
                      draggable={true}
                      onDragStart={(e) => handleTopicDragStart(e, topic.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTopicId(topic.id);
                      }}
                      onDragLeave={() => setDragOverTopicId(null)}
                      onDrop={(e) => handleTopicDrop(e, topic.id)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isDragOver ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                      } ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-semibold'
                          : isSelected 
                            ? 'border-emerald-500/60 bg-emerald-500/5 text-emerald-500 font-semibold' 
                            : `${theme.border} ${theme.highlight}`
                      }`}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        const firstL = lessons.find(l => l.topicId === topic.id);
                        setSelectedLessonId(firstL?.id || null);
                      }}
                    >
                      {/* Drag Handle & Checkbox */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <div 
                          className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-400 hover:text-emerald-400"
                          title="Kéo thả để đổi thứ tự chủ đề"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => toggleSelectTopic(topic.id, e)}
                          className="p-1 text-emerald-500 hover:scale-110 transition-transform cursor-pointer shrink-0"
                          title={isChecked ? 'Bỏ chọn chủ đề này' : 'Chọn chủ đề này'}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {topicClass && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-400 font-medium inline-block mb-0.5">
                              {topicClass.name}
                            </span>
                          )}
                          {topic.isHidden && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold inline-flex items-center gap-0.5 mb-0.5">
                              <EyeOff className="w-2.5 h-2.5" /> Ẩn với HS
                            </span>
                          )}
                        </div>
                        <span className={`text-xs block truncate ${topic.isHidden ? 'opacity-65' : ''}`}>
                          <span className="text-[10px] text-neutral-400 mr-1 font-mono">#{topicIdx + 1}</span>
                          {topic.title}
                        </span>
                        <span className={`text-[10px] ${theme.textMuted} block`}>
                          {topic.subject} • {topicLessons.length} bài
                        </span>
                      </div>

                      {/* Reorder Arrows & Actions */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={topicIdx === 0}
                            onClick={() => handleMoveTopic(topicIdx, 'up')}
                            className="p-0.5 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={topicIdx === filteredTopics.length - 1}
                            onClick={() => handleMoveTopic(topicIdx, 'down')}
                            className="p-0.5 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Quick visibility toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTopicVisibility(topic, e)}
                          className={`p-1 rounded ${topic.isHidden ? 'bg-amber-500/20 text-amber-400' : `${theme.highlight} hover:text-emerald-400 text-neutral-400`}`}
                          title={topic.isHidden ? 'Đang ẩn với học sinh (Bấm để hiện)' : 'Đang hiện với học sinh (Bấm để ẩn)'}
                        >
                          {topic.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>

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
                <div className="flex items-center gap-2">
                  {currentLessons.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllLessons}
                      className="text-[11px] text-sky-500 hover:opacity-80 flex items-center gap-1 cursor-pointer font-semibold"
                      title={selectedLessonIds.length === currentLessons.length ? 'Bỏ chọn tất cả bài học' : 'Chọn tất cả bài học'}
                    >
                      {selectedLessonIds.length > 0 && selectedLessonIds.length === currentLessons.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-sky-500" />
                      ) : (
                        <Square className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </button>
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
                    2. Bài học ({currentLessons.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedLessonIds.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold">
                      Đã chọn {selectedLessonIds.length}
                    </span>
                  )}
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
                  {currentLessons.map((lesson, lessonIdx) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isChecked = selectedLessonIds.includes(lesson.id);
                    const isDragOver = dragOverLessonId === lesson.id;
                    const lessonExs = exercises.filter(e => e.lessonId === lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        draggable={true}
                        onDragStart={(e) => handleLessonDragStart(e, lesson.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverLessonId(lesson.id);
                        }}
                        onDragLeave={() => setDragOverLessonId(null)}
                        onDrop={(e) => handleLessonDrop(e, lesson.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isDragOver ? 'ring-2 ring-sky-500 border-sky-500' : ''
                        } ${
                          isChecked
                            ? 'border-sky-500 bg-sky-500/15 text-sky-500 font-semibold'
                            : isSelected 
                              ? 'border-sky-500/60 bg-sky-500/5 text-sky-500 font-semibold' 
                              : `${theme.border} ${theme.highlight}`
                        }`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        {/* Drag Handle & Checkbox */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <div 
                            className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-400 hover:text-sky-400"
                            title="Kéo thả để đổi thứ tự bài học"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => toggleSelectLesson(lesson.id, e)}
                            className="p-1 text-sky-500 hover:scale-110 transition-transform cursor-pointer shrink-0"
                            title={isChecked ? 'Bỏ chọn bài học này' : 'Chọn bài học này'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-sky-500" />
                            ) : (
                              <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                            )}
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {lesson.isHidden && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold inline-flex items-center gap-0.5 mb-0.5">
                                <EyeOff className="w-2.5 h-2.5" /> Ẩn với HS
                              </span>
                            )}
                            {lesson.shuffleExercises && (
                              <span className="text-[9px] p-1 rounded bg-indigo-500/20 text-indigo-400 font-bold inline-flex items-center justify-center mb-0.5" title="Xáo trộn ngẫu nhiên câu hỏi khi phát cho học sinh">
                                <Shuffle className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <span className={`text-xs block truncate ${lesson.isHidden ? 'opacity-65' : ''}`}>
                            <span className="text-[10px] text-neutral-400 mr-1 font-mono">#{lessonIdx + 1}</span>
                            {lesson.title}
                          </span>
                          <span className={`text-[10px] ${theme.textMuted} block`}>
                            {lessonExs.length} câu hỏi
                          </span>
                        </div>

                        {/* Reorder Arrows & Actions */}
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={lessonIdx === 0}
                              onClick={() => handleMoveLesson(lessonIdx, 'up')}
                              className="p-0.5 hover:text-sky-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Di chuyển lên"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={lessonIdx === currentLessons.length - 1}
                              onClick={() => handleMoveLesson(lessonIdx, 'down')}
                              className="p-0.5 hover:text-sky-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Di chuyển xuống"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick visibility toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleLessonVisibility(lesson, e)}
                            className={`p-1 rounded ${lesson.isHidden ? 'bg-amber-500/20 text-amber-400' : `${theme.highlight} hover:text-sky-400 text-neutral-400`}`}
                            title={lesson.isHidden ? 'Đang ẩn với học sinh (Bấm để hiện)' : 'Đang hiện với học sinh (Bấm để ẩn)'}
                          >
                            {lesson.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>

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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-inherit pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold truncate">
                      {activeLesson ? activeLesson.title : 'Chọn bài học'}
                    </h3>
                    {activeLesson && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-500 shrink-0">
                        {currentExercises.length} câu hỏi
                      </span>
                    )}
                  </div>
                </div>

                {activeLesson && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      id="btn-manager-toggle-shuffle"
                      type="button"
                      onClick={() => onUpdateLesson({ ...activeLesson, shuffleExercises: !activeLesson.shuffleExercises })}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        activeLesson.shuffleExercises
                          ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-400 font-bold shadow-xs'
                          : `border-inherit ${theme.badgeBg} text-neutral-400 hover:text-indigo-400`
                      }`}
                      title={activeLesson.shuffleExercises 
                        ? 'Đang bật xáo trộn ngẫu nhiên thứ tự câu hỏi khi phát cho học sinh (Bấm để chuyển về giữ nguyên thứ tự thiết kế)' 
                        : 'Đang giữ nguyên thứ tự câu hỏi như thiết kế (Bấm để bật xáo trộn ngẫu nhiên khi phát cho học sinh)'}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id="btn-manager-view-lecture"
                      type="button"
                      onClick={() => setLectureModalLesson(activeLesson)}
                      className="px-2.5 py-1.5 rounded-xl border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="Xem bài giảng lý thuyết & kiến thức cốt lõi"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">Bài giảng</span>
                    </button>

                    <button
                      id="btn-manager-print-lesson"
                      type="button"
                      onClick={() => setPrintModalLesson(activeLesson)}
                      className="px-2.5 py-1.5 rounded-xl border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="In nội dung bài học ra file PDF (chọn trang tùy thích)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">In PDF</span>
                    </button>

                    <button
                      id="btn-manager-edit-content"
                      type="button"
                      onClick={() => setEditorModalLesson(activeLesson)}
                      className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="Thiết kế nội dung & slide bài học"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">
                        {activeLesson.slides && activeLesson.slides.length > 0 
                          ? 'Sửa nội dung' 
                          : 'Soạn nội dung'}
                      </span>
                    </button>

                    <button
                      id="btn-manager-add-exercise"
                      onClick={() => onOpenCreateModal('exercise', activeLesson.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                      title="Thêm câu hỏi luyện tập mới"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm câu</span>
                    </button>

                    {currentExercises.length > 0 && (
                      <button
                        onClick={() => onStartPractice(activeLesson.id)}
                        className={`px-2.5 py-1.5 rounded-xl border ${theme.border} ${theme.highlight} text-emerald-500 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0`}
                        title="Luyện tập bài này"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Học bài</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Search & Bulk Select in questions */}
              {currentExercises.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAllExercises}
                      className="px-2.5 py-1.5 rounded-xl border border-inherit text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-emerald-500 transition-colors"
                      title={selectedExerciseIds.length === filteredExercises.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả câu trong bài'}
                    >
                      {selectedExerciseIds.length > 0 && selectedExerciseIds.length === filteredExercises.length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 opacity-50" />
                      )}
                      <span>
                        {selectedExerciseIds.length > 0 
                          ? `Đã chọn (${selectedExerciseIds.length}/${filteredExercises.length})` 
                          : 'Chọn tất cả câu'}
                      </span>
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-sm">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${theme.textMuted}`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Tìm câu hỏi, từ vựng hoặc đáp án..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-xl ${theme.inputBg} text-xs`}
                    />
                  </div>
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
                    const isExChecked = selectedExerciseIds.includes(ex.id);
                    const isDragOver = dragOverExerciseId === ex.id;
                    return (
                      <div
                        key={ex.id}
                        draggable={true}
                        onDragStart={(e) => handleExerciseDragStart(e, ex.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverExerciseId(ex.id);
                        }}
                        onDragLeave={() => setDragOverExerciseId(null)}
                        onDrop={(e) => handleExerciseDrop(e, ex.id)}
                        className={`p-4 rounded-xl border transition-all space-y-2 ${
                          isDragOver ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                        } ${
                          isExChecked
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                            : `${theme.border} ${theme.highlight} hover:border-emerald-500/50`
                        }`}
                      >
                        {/* Badges and action buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-400 hover:text-emerald-400"
                              title="Kéo thả để đổi thứ tự câu hỏi"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <button
                              type="button"
                              onClick={(e) => toggleSelectExercise(ex.id, e)}
                              className="p-0.5 text-emerald-500 hover:scale-110 transition-transform cursor-pointer"
                              title={isExChecked ? 'Bỏ chọn câu này' : 'Chọn câu này'}
                            >
                              {isExChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                              )}
                            </button>
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
                            {ex.isHidden && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 inline-flex items-center gap-0.5">
                                <EyeOff className="w-2.5 h-2.5" /> Ẩn với HS
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Reorder Arrows */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveExercise(idx, 'up')}
                                className="p-1 rounded hover:bg-white/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                title="Chuyển câu hỏi lên trên"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentExercises.length - 1}
                                onClick={() => handleMoveExercise(idx, 'down')}
                                className="p-1 rounded hover:bg-white/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                title="Chuyển câu hỏi xuống dưới"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Quick visibility toggle */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleExerciseVisibility(ex, e)}
                              className={`p-1.5 rounded-lg ${ex.isHidden ? 'bg-amber-500/20 text-amber-400' : `${theme.badgeBg} hover:text-emerald-400 text-neutral-400`} cursor-pointer`}
                              title={ex.isHidden ? 'Đang ẩn với học sinh (Bấm để hiện)' : 'Đang hiện với học sinh (Bấm để ẩn)'}
                            >
                              {ex.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

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
                        <div className={`text-xs font-semibold leading-relaxed ${ex.isHidden ? 'opacity-70' : ''}`}>
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

      {/* Floating Bulk Action Bar (Docked at bottom) */}
      {(selectedTopicIds.length > 0 || selectedLessonIds.length > 0 || selectedExerciseIds.length > 0) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-neutral-900/95 text-white dark:bg-neutral-800/95 border border-emerald-500/40 shadow-2xl rounded-2xl p-3 sm:p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-slideUp">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-neutral-950 font-black flex items-center justify-center text-sm shadow-md">
              {selectedTopicIds.length || selectedLessonIds.length || selectedExerciseIds.length}
            </div>
            <div>
              <span className="text-xs font-bold block">
                {selectedTopicIds.length > 0 && `${selectedTopicIds.length} chủ đề đang chọn`}
                {selectedLessonIds.length > 0 && `${selectedLessonIds.length} bài học đang chọn`}
                {selectedExerciseIds.length > 0 && `${selectedExerciseIds.length} câu hỏi đang chọn`}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                Chọn thao tác hàng loạt phía bên phải
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Action Buttons for Selected Topics */}
            {selectedTopicIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('topic', true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ẩn tất cả chủ đề đang chọn với học sinh"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn ({selectedTopicIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('topic', false)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Hiện tất cả chủ đề đang chọn với học sinh"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hiện ({selectedTopicIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'move', contentType: 'topic' })}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>Chuyển Lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'duplicate', contentType: 'topic' })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Nhân bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'delete', contentType: 'topic' })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedTopicIds.length})</span>
                </button>
              </>
            )}

            {/* Action Buttons for Selected Lessons */}
            {selectedLessonIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('lesson', true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ẩn tất cả bài học đang chọn với học sinh"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn ({selectedLessonIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('lesson', false)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Hiện tất cả bài học đang chọn với học sinh"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hiện ({selectedLessonIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'move', contentType: 'lesson' })}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>Chuyển Chủ đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'duplicate', contentType: 'lesson' })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'delete', contentType: 'lesson' })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedLessonIds.length})</span>
                </button>
              </>
            )}

            {/* Action Buttons for Selected Exercises */}
            {selectedExerciseIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('exercise', true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ẩn tất cả câu hỏi đang chọn với học sinh"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn ({selectedExerciseIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleVisibility('exercise', false)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Hiện tất cả câu hỏi đang chọn với học sinh"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hiện ({selectedExerciseIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'move', contentType: 'exercise' })}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>Chuyển Bài học</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'duplicate', contentType: 'exercise' })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, action: 'delete', contentType: 'exercise' })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedExerciseIds.length})</span>
                </button>
              </>
            )}

            {/* Deselect All Button */}
            <button
              type="button"
              onClick={clearAllSelections}
              className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Content Action Modal */}
      <BulkContentModal
        isOpen={bulkModal.isOpen}
        onClose={() => setBulkModal(prev => ({ ...prev, isOpen: false }))}
        actionType={bulkModal.action}
        contentType={bulkModal.contentType}
        selectedIds={
          bulkModal.contentType === 'topic' ? selectedTopicIds :
          bulkModal.contentType === 'lesson' ? selectedLessonIds :
          selectedExerciseIds
        }
        topics={topics}
        lessons={lessons}
        exercises={exercises}
        classrooms={classrooms}
        onConfirmMove={(targetId) => {
          if (bulkModal.contentType === 'topic' && onBulkMoveTopics) {
            onBulkMoveTopics(selectedTopicIds, targetId);
            setSelectedTopicIds([]);
          } else if (bulkModal.contentType === 'lesson' && onBulkMoveLessons) {
            onBulkMoveLessons(selectedLessonIds, targetId);
            setSelectedLessonIds([]);
          } else if (bulkModal.contentType === 'exercise' && onBulkMoveExercises) {
            onBulkMoveExercises(selectedExerciseIds, targetId);
            setSelectedExerciseIds([]);
          }
        }}
        onConfirmDuplicate={(targetIds) => {
          if (bulkModal.contentType === 'topic' && onBulkDuplicateTopics) {
            onBulkDuplicateTopics(selectedTopicIds, targetIds);
            setSelectedTopicIds([]);
          } else if (bulkModal.contentType === 'lesson' && onBulkDuplicateLessons) {
            onBulkDuplicateLessons(selectedLessonIds, targetIds);
            setSelectedLessonIds([]);
          } else if (bulkModal.contentType === 'exercise' && onBulkDuplicateExercises) {
            onBulkDuplicateExercises(selectedExerciseIds, targetIds);
            setSelectedExerciseIds([]);
          }
        }}
        onConfirmDelete={() => {
          if (bulkModal.contentType === 'topic' && onBulkDeleteTopics) {
            onBulkDeleteTopics(selectedTopicIds);
            setSelectedTopicIds([]);
          } else if (bulkModal.contentType === 'lesson' && onBulkDeleteLessons) {
            onBulkDeleteLessons(selectedLessonIds);
            setSelectedLessonIds([]);
          } else if (bulkModal.contentType === 'exercise' && onBulkDeleteExercises) {
            onBulkDeleteExercises(selectedExerciseIds);
            setSelectedExerciseIds([]);
          }
        }}
      />

      {/* Edit & Create Modals */}
      <TopicEditModal
        topic={editingTopic}
        isOpen={!!editingTopic || isCreatingTopic}
        isCreate={isCreatingTopic}
        classrooms={classrooms}
        defaultClassroomId={selectedClassFilter !== 'all' ? selectedClassFilter : undefined}
        onNavigateToClassManager={onNavigateToClassManager}
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

      {/* Lecture Viewer Modal */}
      <LessonLectureModal
        isOpen={!!lectureModalLesson}
        onClose={() => setLectureModalLesson(null)}
        lesson={lectureModalLesson}
        isAdmin={true}
        onEditContent={(lessonToEdit) => {
          setEditorModalLesson(lessonToEdit);
        }}
        onStartPractice={(lessonId) => {
          setLectureModalLesson(null);
          onStartPractice(lessonId);
        }}
      />

      {/* Lesson Content Designer Modal */}
      <LessonContentEditorModal
        isOpen={!!editorModalLesson}
        onClose={() => setEditorModalLesson(null)}
        lesson={editorModalLesson}
        onSave={(updatedLesson) => {
          onUpdateLesson(updatedLesson);
          if (lectureModalLesson?.id === updatedLesson.id) {
            setLectureModalLesson(updatedLesson);
          }
          setEditorModalLesson(null);
        }}
      />

      {/* Lesson Print PDF Modal */}
      <LessonPrintModal
        isOpen={!!printModalLesson}
        onClose={() => setPrintModalLesson(null)}
        lesson={printModalLesson}
        topicTitle={activeTopic?.title}
      />

      {/* Media Library Asset Manager */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
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
