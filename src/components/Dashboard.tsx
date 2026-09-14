import React from 'react';
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
  Lock
} from 'lucide-react';
import { Topic, Lesson, Exercise, ErrorLog, UserStats, User, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  pendingStudentsCount = 0,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions;
  const studentClass = classrooms.find(c => c.id === currentUser?.classroomId);

  const totalQuestions = exercises.length;
  const activeErrors = errors.filter(e => !e.resolved);
  const accuracyRate = stats.totalCompleted > 0 
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
                Hãy vào trung tâm quản trị để duyệt và phân quyền cho học sinh.
              </span>
            </div>
          </div>
          <button
            id="btn-goto-admin-approval"
            onClick={() => onNavigateTab('admin')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm flex items-center justify-center gap-1 shrink-0"
          >
            <span>Duyệt học sinh ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Welcome & Primary Actions */}
      <div className={`${theme.card} p-5 rounded-2xl border ${theme.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Chuỗi {stats.streakDays} ngày
              </span>
              {studentClass && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <School className="w-3 h-3" />
                  {studentClass.name}
                </span>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Quản trị viên
                </span>
              )}
            </div>
            
            <h2 className={`${typo.headingText} tracking-tight`}>
              Xin chào, {currentUser?.fullName || 'bạn'}!
            </h2>
            <p className={`text-sm ${theme.textMuted} mt-0.5`}>
              {topics.length === 0 
                ? 'Hệ thống chưa có bài học nào. Giáo viên có thể soạn bài hoặc quản lý kho.'
                : `Hôm nay đã hoàn thành ${stats.totalCompleted} câu hỏi. Độ chính xác ${accuracyRate}%.`}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 pt-2 sm:pt-0">
            {canPractice && lastActiveLesson && (
              <button
                id="btn-resume-lesson"
                onClick={() => onStartPractice(lastActiveLesson.id)}
                className={`col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-transform active:scale-[0.98]`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Học tiếp</span>
              </button>
            )}

            {canPractice ? (
              <button
                id="btn-quick-practice"
                disabled={exercises.length === 0}
                onClick={() => onStartPractice(undefined, true)}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${theme.border} ${theme.highlight} transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
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

            {canAccessErrors && (
              <button
                id="btn-review-errors"
                disabled={activeErrors.length === 0}
                onClick={() => onStartPractice(undefined, false, true)}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${theme.border} ${theme.highlight} transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Ôn lỗi ({activeErrors.length})</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="btn-create-exercise"
                onClick={() => onNavigateTab('builder')}
                className={`col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-dashed border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/5 transition-colors`}
              >
                <Plus className="w-4 h-4" />
                <span>Soạn bài mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats - 3 Minimal Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
          <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Đã làm</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            {stats.totalCompleted}
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Tổng lượt trả lời</div>
        </div>

        <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
          <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
            <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            <span>Chính xác</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-500">
            {accuracyRate}%
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>{stats.totalCorrect} câu đúng</div>
        </div>

        <div className={`${theme.card} p-3.5 rounded-xl text-center border ${theme.border}`}>
          <div className={`text-xs ${theme.textMuted} mb-1 flex items-center justify-center gap-1`}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cần sửa</span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${activeErrors.length > 0 ? 'text-rose-500' : ''}`}>
            {activeErrors.length}
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Lỗi chưa sửa</div>
        </div>
      </div>

      {/* Topics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>{studentClass ? `Chủ đề bài học - ${studentClass.name}` : 'Chủ đề bài học'}</span>
          </h3>
          <button
            id="btn-view-all-topics"
            onClick={() => onNavigateTab('topics')}
            className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topics.length === 0 ? (
          <div className={`${theme.card} p-8 rounded-2xl text-center border-dashed border-2 ${theme.border} space-y-2`}>
            <BookOpen className={`w-8 h-8 ${theme.textMuted} mx-auto opacity-70`} />
            <div className="text-sm font-semibold">Chưa có bài học nào</div>
            <p className={`text-xs ${theme.textMuted}`}>
              {isAdmin 
                ? 'Bạn có thể vào mục "Soạn bài" hoặc "Quản lý kho" để tạo bài học đầu tiên.' 
                : 'Giáo viên chưa đăng tải bài học cho lớp này.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.slice(0, 4).map(topic => {
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      {topic.subject}
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
  );
};
