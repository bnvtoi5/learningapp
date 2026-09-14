import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Zap, 
  AlertCircle, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp, 
  Flame, 
  Clock, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  School,
  Lock,
  Users,
  BarChart2,
  Filter
} from 'lucide-react';
import { Topic, Lesson, Exercise, ErrorLog, UserStats, User, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getClassroomOverviewStats } from '../utils/storage';

interface DashboardProps {
  topics: Topic[];
  lessons: Lesson[];
  exercises: Exercise[];
  errors: ErrorLog[];
  stats: UserStats;
  lastActiveLesson: Lesson | null;
  onStartPractice: (lessonId?: string, isQuick?: boolean, isErrorReview?: boolean) => void;
  onNavigateTab: (tab: string) => void;
  onSelectTopic: (topicId: string) => void;
  currentUser?: User | null;
  classrooms?: Classroom[];
  users?: User[];
  pendingStudentsCount?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  topics,
  lessons,
  exercises,
  errors,
  stats,
  lastActiveLesson,
  onStartPractice,
  onNavigateTab,
  onSelectTopic,
  currentUser,
  classrooms = [],
  users = [],
  pendingStudentsCount = 0,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions;

  // For Admin: Selection filter for Classroom
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (classrooms.length > 0) {
      return classrooms[0].id;
    }
    return '';
  });

  // Keep selectedClassId in sync if classrooms list changes
  useEffect(() => {
    if (classrooms.length > 0) {
      if (!selectedClassId || !classrooms.some(c => c.id === selectedClassId)) {
        setSelectedClassId(classrooms[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [classrooms, selectedClassId]);

  // Selected class data for Admin
  const selectedClass = classrooms.find(c => c.id === selectedClassId);
  const classOverview = selectedClassId 
    ? getClassroomOverviewStats(selectedClassId, users, topics, lessons, exercises, errors)
    : null;

  // Filtered topics for Admin (strictly belongs to selected class)
  const adminClassTopics = selectedClassId 
    ? topics.filter(t => t.classroomId === selectedClassId)
    : [];

  // Data for Student (HS) - Strictly scoped to student's own class and stats
  const studentClass = classrooms.find(c => c.id === currentUser?.classroomId);
  const studentTopics = topics.filter(t => currentUser?.classroomId && t.classroomId === currentUser.classroomId);
  const studentLessons = lessons.filter(l => studentTopics.some(t => t.id === l.topicId));
  const studentExercises = exercises.filter(e => studentLessons.some(l => l.id === e.lessonId));
  const studentExerciseIds = new Set(studentExercises.map(e => e.id));

  // Filter out any errors from past classes if student was promoted or moved
  const studentErrors = errors.filter(e => 
    !e.resolved && (
      e.userId === currentUser?.id || 
      (e.studentName && (
        e.studentName.toLowerCase() === currentUser?.fullName.toLowerCase() || 
        e.studentName.toLowerCase() === currentUser?.username.toLowerCase()
      ))
    ) && (
      e.classroomId ? e.classroomId === currentUser?.classroomId : studentExerciseIds.has(e.exerciseId)
    )
  );

  const isValidStudentLastLesson = lastActiveLesson && studentLessons.some(l => l.id === lastActiveLesson.id);

  const studentAccuracyRate = stats.totalCompleted > 0 
    ? Math.round((stats.totalCorrect / stats.totalCompleted) * 100) 
    : 0;

  const canPractice = isAdmin || (perms?.canPractice !== false);
  const canAccessErrors = isAdmin || (perms?.canAccessErrorNotebook !== false);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Admin Quick Notification Banner for Pending Approvals */}
      {isAdmin && pendingStudentsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Có {pendingStudentsCount} học sinh đang chờ bạn phê duyệt vào lớp!
              </span>
              <span className={`text-[11px] ${theme.textMuted}`}>
                Hãy vào trung tâm quản trị để duyệt và xếp lớp cho học sinh.
              </span>
            </div>
          </div>
          <button
            id="btn-goto-admin-approval"
            onClick={() => onNavigateTab('admin')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm flex items-center justify-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Duyệt học sinh ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADMIN VIEW: MANDATORY CLASSROOM FILTER & CLASSROOM-SCOPED DASHBOARD */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-5">
          {/* Welcome Header */}
          <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Quản trị viên
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <School className="w-3.5 h-3.5" />
                    {classrooms.length} Lớp học
                  </span>
                </div>
                
                <h2 className={`${typo.headingText} tracking-tight`}>
                  Xin chào Thầy/Cô, {currentUser?.fullName || 'Quản trị viên'}!
                </h2>
                <p className={`text-sm ${theme.textMuted} mt-0.5`}>
                  Chọn lớp học dưới đây để theo dõi thống kê làm bài và danh sách chủ đề của lớp.
                </p>
              </div>

              {/* Quick Actions for Admin */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-admin-manage-classes"
                  onClick={() => onNavigateTab('admin')}
                  className={`px-3.5 py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border ${theme.border} ${theme.highlight} transition-transform active:scale-[0.98] cursor-pointer`}
                >
                  <School className="w-4 h-4 text-emerald-500" />
                  <span>Quản lý lớp</span>
                </button>

                <button
                  id="btn-admin-create-topic"
                  onClick={() => onNavigateTab('builder')}
                  className="px-3.5 py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Soạn bài mới</span>
                </button>
              </div>
            </div>
          </div>

          {/* ADMIN CLASSROOM SELECTOR FILTER */}
          <div className={`${theme.card} p-4 rounded-2xl border-2 border-emerald-500/30 shadow-sm space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <span>Bộ lọc Lớp học</span>
                    <span className="text-[11px] font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                      Bắt buộc chọn lớp
                    </span>
                  </h3>
                  <p className={`text-[11px] ${theme.textMuted}`}>
                    Xem dữ liệu chủ đề & kết quả thống kê riêng biệt cho từng lớp
                  </p>
                </div>
              </div>

              {classrooms.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="admin-class-select" className={`text-xs font-semibold ${theme.textMuted}`}>
                    Chọn lớp:
                  </label>
                  <select
                    id="admin-class-select"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl ${theme.inputBg} border ${theme.border} text-xs font-semibold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer`}
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quick Pills for Classroom Selection */}
            {classrooms.length === 0 ? (
              <div className={`p-4 rounded-xl border border-dashed ${theme.border} text-center space-y-2`}>
                <p className={`text-xs ${theme.textMuted}`}>
                  Hệ thống chưa có lớp học nào. Vui lòng tạo lớp học đầu tiên trong mục Quản trị.
                </p>
                <button
                  id="btn-create-first-class"
                  onClick={() => onNavigateTab('admin')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo lớp học ngay</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                {classrooms.map(c => {
                  const isSelected = c.id === selectedClassId;
                  const countStudents = users.filter(u => u.role === 'student' && u.classroomId === c.id).length;
                  const countTopics = topics.filter(t => t.classroomId === c.id).length;

                  return (
                    <button
                      key={c.id}
                      id={`btn-select-class-${c.id}`}
                      onClick={() => setSelectedClassId(c.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-500/40' 
                          : `${theme.card} border ${theme.border} ${theme.textMuted} hover:text-emerald-500 hover:border-emerald-500/40`
                      }`}
                    >
                      <School className="w-3.5 h-3.5" />
                      <span>{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-neutral-500/10'
                      }`}>
                        {countStudents} HS • {countTopics} chủ đề
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CLASSROOM SPECIFIC STATISTICS */}
          {selectedClass && classOverview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-emerald-500" />
                    <span>Thống kê lớp: {selectedClass.name}</span>
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500">
                    Mã lớp: {selectedClass.code}
                  </span>
                </div>

                <button
                  id="btn-goto-progress-class"
                  onClick={() => onNavigateTab('progress')}
                  className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Báo cáo phân tích</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Stat Cards for this Classroom */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
                  <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                    <span>Học sinh</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-sky-500">
                    {classOverview.totalStudents}
                  </div>
                  <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Học sinh trong lớp</div>
                </div>

                <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
                  <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Đã làm</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight">
                    {classOverview.totalCompleted}
                  </div>
                  <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Tổng lượt trả lời</div>
                </div>

                <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
                  <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                    <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                    <span>Chính xác</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500">
                    {classOverview.accuracyRate}%
                  </div>
                  <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>{classOverview.totalCorrect} câu đúng</div>
                </div>

                <div 
                  className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border} cursor-pointer hover:border-rose-500/40 transition-colors`}
                  onClick={() => onNavigateTab('errors')}
                  title="Nhấp để vào sổ lỗi học sinh"
                >
                  <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Lỗi đang phạt</span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-bold tracking-tight ${classOverview.activeErrorsCount > 0 ? 'text-rose-500' : ''}`}>
                    {classOverview.activeErrorsCount}
                  </div>
                  <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Lỗi chưa hoàn thành</div>
                </div>
              </div>

              {/* TOPICS OF THIS CLASSROOM */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span>Chủ đề bài học - {selectedClass.name}</span>
                  </h3>
                  <button
                    id="btn-admin-view-all-topics-class"
                    onClick={() => onNavigateTab('topics')}
                    className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem tất cả chủ đề</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {adminClassTopics.length === 0 ? (
                  <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2 ${theme.border} space-y-3`}>
                    <BookOpen className={`w-8 h-8 ${theme.textMuted} mx-auto opacity-70`} />
                    <div>
                      <h4 className="text-sm font-semibold">Chưa có chủ đề nào cho lớp {selectedClass.name}</h4>
                      <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                        Hãy tạo chủ đề mới và gán vào lớp này để học sinh bắt đầu học tập.
                      </p>
                    </div>
                    <button
                      id="btn-create-topic-for-class"
                      onClick={() => onNavigateTab('builder')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Soạn chủ đề cho lớp này</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adminClassTopics.map(topic => {
                      const topicLessons = lessons.filter(l => l.topicId === topic.id);
                      const topicExercises = exercises.filter(e => topicLessons.some(l => l.id === e.lessonId));

                      return (
                        <div
                          key={topic.id}
                          id={`dashboard-topic-${topic.id}`}
                          onClick={() => {
                            onSelectTopic(topic.id);
                            onNavigateTab('topics');
                          }}
                          className={`${theme.card} p-4 rounded-xl hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between border ${theme.border}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                {topic.subject} • {topic.primarySkill}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-1">{topic.title}</h4>
                            <p className={`text-[11px] ${theme.textMuted}`}>
                              {topicLessons.length} bài • {topicExercises.length} câu hỏi
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${theme.textMuted}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STUDENT (HS) VIEW: STRICTLY SCOPED TO OWN CLASSROOM & OWN STATS */}
      {/* ========================================================================= */}
      {!isAdmin && (
        <div className="space-y-6">
          {/* Welcome & Student Overview */}
          <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Chuỗi {stats.streakDays} ngày
                  </span>
                  {studentClass ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <School className="w-3 h-3" />
                      Lớp: {studentClass.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                      Chưa xếp lớp
                    </span>
                  )}
                </div>
                
                <h2 className={`${typo.headingText} tracking-tight`}>
                  Xin chào, {currentUser?.fullName || 'bạn'}!
                </h2>
                <p className={`text-sm ${theme.textMuted} mt-0.5`}>
                  {studentClass 
                    ? `Hôm nay bạn đã hoàn thành ${stats.totalCompleted} câu hỏi với độ chính xác ${studentAccuracyRate}%.`
                    : 'Tài khoản của bạn đang chờ xếp lớp để nhận chủ đề bài học.'}
                </p>
              </div>

              {/* Student Quick Action Buttons */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 pt-2 sm:pt-0">
                {canPractice && isValidStudentLastLesson && lastActiveLesson && (
                  <button
                    id="btn-resume-lesson"
                    onClick={() => onStartPractice(lastActiveLesson.id)}
                    className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Học tiếp</span>
                  </button>
                )}

                {canPractice ? (
                  <button
                    id="btn-quick-practice"
                    disabled={studentExercises.length === 0}
                    onClick={() => onStartPractice(undefined, true)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${theme.border} ${theme.highlight} transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Luyện nhanh</span>
                  </button>
                ) : (
                  <div className={`px-4 py-2.5 rounded-xl text-xs font-medium border ${theme.border} ${theme.badgeBg} flex items-center gap-1.5 opacity-70`}>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa luyện tập</span>
                  </div>
                )}

                {canAccessErrors ? (
                  <button
                    id="btn-review-errors"
                    disabled={studentErrors.length === 0}
                    onClick={() => onStartPractice(undefined, false, true)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${theme.border} ${theme.highlight} transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Ôn lỗi ({studentErrors.length})</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Student Notice if Not Assigned to a Classroom */}
          {!studentClass && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center gap-3">
              <School className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Bạn chưa được phân bổ vào lớp học!</span>
                <span>Vui lòng liên hệ Thầy/Cô quản trị để được thêm vào lớp học và mở các chủ đề bài giảng.</span>
              </div>
            </div>
          )}

          {/* Student Personal Overview Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
              <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Đã làm</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">
                {stats.totalCompleted}
              </div>
              <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Lượt câu đã trả lời</div>
            </div>

            <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
              <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                <span>Chính xác</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500">
                {studentAccuracyRate}%
              </div>
              <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>{stats.totalCorrect} câu đúng</div>
            </div>

            <div 
              className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border} cursor-pointer hover:border-rose-500/40 transition-colors`}
              onClick={() => onNavigateTab('errors')}
              title="Xem sổ lỗi sai của bạn"
            >
              <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Cần sửa</span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold tracking-tight ${studentErrors.length > 0 ? 'text-rose-500' : ''}`}>
                {studentErrors.length}
              </div>
              <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Lỗi chưa sửa xong</div>
            </div>
          </div>

          {/* Student Topics Section (Only from student's classroom) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>{studentClass ? `Chủ đề bài học - ${studentClass.name}` : 'Chủ đề bài học'}</span>
              </h3>
              {studentTopics.length > 0 && (
                <button
                  id="btn-student-view-all-topics"
                  onClick={() => onNavigateTab('topics')}
                  className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem tất cả</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {studentTopics.length === 0 ? (
              <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2 ${theme.border} space-y-2`}>
                <BookOpen className={`w-8 h-8 ${theme.textMuted} mx-auto opacity-70`} />
                <div className="text-sm font-semibold">Chưa có bài học nào cho lớp của bạn</div>
                <p className={`text-xs ${theme.textMuted}`}>
                  {studentClass 
                    ? `Thầy/Cô chưa đăng tải chủ đề bài học cho ${studentClass.name}. Vui lòng quay lại sau!` 
                    : 'Bạn cần được phân vào một lớp học để xem các bài học tương ứng.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studentTopics.slice(0, 6).map(topic => {
                  const topicLessons = lessons.filter(l => l.topicId === topic.id);
                  const topicExercises = exercises.filter(e => topicLessons.some(l => l.id === e.lessonId));

                  return (
                    <div
                      key={topic.id}
                      id={`student-topic-${topic.id}`}
                      onClick={() => {
                        onSelectTopic(topic.id);
                        onNavigateTab('topics');
                      }}
                      className={`${theme.card} p-4 rounded-xl hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between border ${theme.border}`}
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                          {topic.subject} • {topic.primarySkill}
                        </span>
                        <h4 className="font-semibold text-sm line-clamp-1">{topic.title}</h4>
                        <p className={`text-[11px] ${theme.textMuted}`}>
                          {topicLessons.length} bài • {topicExercises.length} câu hỏi
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${theme.textMuted}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
