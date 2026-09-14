import React, { useState } from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  Flame, 
  BookOpen, 
  TrendingUp,
  RotateCcw,
  School,
  Users,
  Filter,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  UserStats, 
  SkillCategory, 
  MasteryStatus, 
  Exercise, 
  ErrorLog, 
  User, 
  Classroom,
  ExerciseType
} from '../types';
import { useTheme } from '../context/ThemeContext';

interface ProgressViewProps {
  stats: UserStats;
  exercises: Exercise[];
  errors: ErrorLog[];
  onStartSkillPractice: (skill: SkillCategory) => void;
  currentUser?: User | null;
  classrooms?: Classroom[];
  users?: User[];
  onNavigateToErrors?: () => void;
}

const SKILLS_META: { key: SkillCategory; label: string; desc: string; icon: string }[] = [
  { key: 'vocabulary', label: 'Từ vựng (Vocabulary)', desc: 'Nhận biết, ngữ cảnh, collocations, tự sử dụng', icon: '📚' },
  { key: 'grammar', label: 'Ngữ pháp (Grammar)', desc: 'Chia thì, sửa lỗi, biến đổi câu, ngữ cảnh thực tế', icon: '📐' },
  { key: 'reading', label: 'Đọc hiểu (Reading)', desc: 'Scanning keyword, vùng thông tin, đọc ý chính', icon: '📖' },
  { key: 'listening', label: 'Nghe (Listening)', desc: '3 bước: dự đoán → nghe hiểu → transcript', icon: '🎧' },
  { key: 'speaking', label: 'Luyện nói (Speaking)', desc: 'Đọc to, dịch nói, phản xạ từ khóa & tình huống', icon: '🎙️' },
  { key: 'writing', label: 'Kỹ năng viết (Writing)', desc: 'Viết câu, đoạn văn theo tiêu chí ngữ pháp', icon: '✍️' },
  { key: 'mixed', label: 'Tổng hợp (Mixed Practice)', desc: 'Kết hợp đa kỹ năng, phản xạ tình huống thực tế & phân loại hỗn hợp', icon: '⚡' },
];

const QUESTION_TYPES_META: { type: ExerciseType; label: string; icon: string }[] = [
  { type: 'mixed_practice', label: 'Tổng hợp tình huống (Mixed Practice)', icon: '⚡' },
  { type: 'multiple_choice', label: 'Trắc nghiệm chọn đáp án', icon: '🔘' },
  { type: 'fill_blank', label: 'Điền từ vào chỗ trống', icon: '✏️' },
  { type: 'error_correction', label: 'Tìm và sửa lỗi sai', icon: '🔍' },
  { type: 'matching', label: 'Nối cặp từ vựng / cụm câu', icon: '🔗' },
  { type: 'vocab_cloze', label: 'Active Recall khuyết chữ cái', icon: '💡' },
  { type: 'reading', label: 'Bài đọc hiểu ngữ cảnh', icon: '📖' },
  { type: 'speaking', label: 'Luyện nói phản xạ', icon: '🎙️' },
];

export const ProgressView: React.FC<ProgressViewProps> = ({
  stats,
  exercises,
  errors,
  onStartSkillPractice,
  currentUser,
  classrooms = [],
  users = [],
  onNavigateToErrors,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const isAdmin = currentUser?.role === 'admin';

  // For Admin: classroom selection filter is MANDATORY before showing class stats
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return classrooms.length > 0 ? classrooms[0].id : '';
  });

  const selectedClass = classrooms.find(c => c.id === selectedClassId);
  const classStudents = users.filter(u => u.role === 'student' && u.classroomId === selectedClassId);
  const classErrors = errors.filter(e => {
    const student = users.find(u => 
      (e.userId && u.id === e.userId) || 
      (e.studentName && (u.fullName.toLowerCase() === e.studentName.toLowerCase() || u.username.toLowerCase() === e.studentName.toLowerCase()))
    );
    const errClassId = e.classroomId || student?.classroomId;
    return errClassId === selectedClassId;
  });

  // Student specific errors
  const userErrors = isAdmin 
    ? (selectedClassId ? classErrors : errors)
    : errors.filter(e => e.userId === currentUser?.id || (currentUser && e.studentName && (e.studentName.toLowerCase() === currentUser.fullName.toLowerCase() || e.studentName.toLowerCase() === currentUser.username.toLowerCase())));
  const activeErrors = userErrors.filter(e => !e.resolved);
  const resolvedErrors = userErrors.filter(e => e.resolved);

  const getSkillStatus = (skillKey: SkillCategory): { status: MasteryStatus; label: string; color: string } => {
    const prof = stats.skillProficiency[skillKey] || { completed: 0, correct: 0 };
    const skillErrors = activeErrors.filter(e => e.skill === skillKey);

    if (prof.completed === 0) {
      return { status: 'not_started', label: 'Chưa học', color: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20' };
    }
    if (skillErrors.length > 0) {
      return { status: 'needs_review', label: 'Cần ôn lại', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    }
    const rate = prof.completed > 0 ? (prof.correct / prof.completed) * 100 : 0;
    if (rate >= 80 && prof.completed >= 3) {
      return { status: 'mastered', label: 'Đã đạt', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
    return { status: 'learning', label: 'Đang học', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  };

  const overallAccuracy = stats.totalCompleted > 0 
    ? Math.round((stats.totalCorrect / stats.totalCompleted) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
            <BarChart2 className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
            {isAdmin ? 'Trung Tâm Phân Tích & Thống Kê Tiến Độ' : 'Báo Cáo Tiến Độ Cá Nhân'}
          </span>
        </div>
        <h2 className={`${typo.headingText} tracking-tight`}>
          {isAdmin ? 'Báo cáo tiến độ học tập theo Lớp' : 'Tiến độ học tập & Làm chủ kỹ năng'}
        </h2>
        <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
          {isAdmin 
            ? 'Chọn lớp học phía dưới để xem chi tiết kết quả làm bài, phân loại kỹ năng (bao gồm Mixed) và tình trạng lỗi sai.'
            : 'Đánh giá năng lực theo 7 kỹ năng cốt lõi (Bao gồm Tổng hợp Mixed Practice) và phân loại dạng câu hỏi.'}
        </p>
      </div>

      {/* ADMIN CLASSROOM SELECTOR FILTER (MANDATORY REQUIREMENT) */}
      {isAdmin && (
        <div className={`${theme.card} p-4 rounded-2xl border-2 border-emerald-500/30 shadow-sm space-y-3`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <label htmlFor="admin-classroom-select" className="text-xs font-bold uppercase tracking-wider text-emerald-500 block">
                  Bộ Lọc Lớp Học Bắt Buộc
                </label>
                <span className="text-sm font-semibold">Chọn lớp để thống kê tiến độ:</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                id="admin-classroom-select"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${theme.inputBg} border ${theme.border} focus:ring-2 focus:ring-emerald-500`}
              >
                {classrooms.length === 0 ? (
                  <option value="">Chưa có lớp học nào</option>
                ) : (
                  classrooms.map(c => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name} ({c.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedClass && (
            <div className="pt-2 border-t border-inherit flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={theme.textMuted}>
                {selectedClass.description || 'Không có mô tả'} • Mã lớp: <strong className="text-emerald-400">{selectedClass.code}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                Sĩ số: {classStudents.length} học sinh
              </span>
            </div>
          )}
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${theme.card} p-4 rounded-xl text-center border ${theme.border}`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 font-semibold mb-1">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>{isAdmin ? 'Học sinh' : 'Chuỗi ngày'}</span>
          </div>
          <div className="text-2xl font-bold">
            {isAdmin ? classStudents.length : `${stats.streakDays} ngày`}
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
            {isAdmin ? `Trong lớp ${selectedClass?.code || ''}` : 'Duy trì liên tục'}
          </div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center border ${theme.border}`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-500 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã hoàn thành</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalCompleted}</div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>{stats.totalCorrect} câu đúng</div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center border ${theme.border}`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-teal-500 font-semibold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Độ chính xác</span>
          </div>
          <div className="text-2xl font-bold text-emerald-500">{overallAccuracy}%</div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Tỷ lệ đạt chuẩn</div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center border ${theme.border}`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-semibold mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>Lỗi sai tồn đọng</span>
          </div>
          <div className={`text-2xl font-bold ${activeErrors.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {activeErrors.length}
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
            {resolvedErrors.length} câu đã khắc phục
          </div>
        </div>
      </div>

      {/* ADMIN CLASS STUDENT ROSTER (Only when Admin is viewing) */}
      {isAdmin && selectedClass && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Danh sách học sinh lớp {selectedClass.name}</span>
            </h3>
            {onNavigateToErrors && (
              <button
                id="btn-nav-to-admin-errors"
                onClick={onNavigateToErrors}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <span>Xem Sổ lỗi học sinh ({classErrors.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {classStudents.length === 0 ? (
            <div className={`${theme.card} p-6 rounded-xl text-center border-dashed border`}>
              <p className={`text-xs ${theme.textMuted}`}>Lớp học này chưa có học sinh nào đăng ký.</p>
            </div>
          ) : (
            <div className={`${theme.card} rounded-xl overflow-hidden border ${theme.border}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className={`border-b ${theme.border} ${theme.highlight} font-semibold`}>
                    <tr>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3">Tài khoản</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-center">Lỗi tồn đọng</th>
                      <th className="p-3 text-center">Đã sửa lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {classStudents.map(student => {
                      const sErrors = errors.filter(e => 
                        e.userId === student.id || 
                        (e.studentName && (e.studentName.toLowerCase() === student.fullName.toLowerCase() || e.studentName.toLowerCase() === student.username.toLowerCase()))
                      );
                      const sActive = sErrors.filter(e => !e.resolved).length;
                      const sResolved = sErrors.filter(e => e.resolved).length;

                      return (
                        <tr key={student.id} className="hover:bg-neutral-500/5">
                          <td className="p-3 font-semibold">
                            {student.fullName}
                          </td>
                          <td className={`p-3 ${theme.textMuted}`}>
                            @{student.username}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              student.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {student.status === 'approved' ? 'Đã duyệt' : student.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${sActive > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {sActive}
                            </span>
                          </td>
                          <td className="p-3 text-center font-medium text-emerald-500">
                            {sResolved}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7 SKILLS MATRIX (INCLUDING MIXED PRACTICE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Phân tích 7 Kỹ năng cốt lõi (Bao gồm Tổng hợp Mixed)</span>
          </h3>
          <span className={`text-xs ${theme.textMuted}`}>
            {exercises.filter(e => e.skill === 'mixed').length} câu Mixed trong kho
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SKILLS_META.map(item => {
            const prof = stats.skillProficiency[item.key] || { completed: 0, correct: 0 };
            const statusInfo = getSkillStatus(item.key);
            const accuracy = prof.completed > 0 ? Math.round((prof.correct / prof.completed) * 100) : 0;
            const skillExercises = exercises.filter(e => e.skill === item.key);

            return (
              <div
                key={item.key}
                id={`skill-card-${item.key}`}
                className={`${theme.card} p-4 rounded-xl space-y-3 flex flex-col justify-between border ${theme.border} ${
                  item.key === 'mixed' ? 'ring-1 ring-amber-500/40' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold">{item.label}</h4>
                          {item.key === 'mixed' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500">
                              MỚI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className={`text-xs ${theme.textMuted} line-clamp-2 mb-3`}>
                    {item.desc}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={theme.textMuted}>
                        {prof.completed} lượt làm • {skillExercises.length} câu trong kho
                      </span>
                      <span className="font-semibold text-emerald-500">
                        {accuracy}% đúng
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme.highlight}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.key === 'mixed' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-inherit flex items-center justify-between">
                  <span className={`text-[11px] ${theme.textMuted}`}>
                    {prof.correct} đúng / {prof.completed} tổng
                  </span>
                  <button
                    id={`btn-practice-skill-${item.key}`}
                    disabled={skillExercises.length === 0}
                    onClick={() => onStartSkillPractice(item.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40 flex items-center gap-1 cursor-pointer ${
                      item.key === 'mixed' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Luyện {item.key === 'mixed' ? 'Mixed' : 'kỹ năng'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUESTION TYPE CLASSIFICATION MATRIX */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-500" />
          <span>Phân bố dạng câu hỏi trong kho kiến thức</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUESTION_TYPES_META.map(q => {
            const count = exercises.filter(e => e.type === q.type).length;
            return (
              <div
                key={q.type}
                className={`${theme.card} p-3 rounded-xl border ${theme.border} flex flex-col justify-between`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{q.icon}</span>
                  <span className="text-xs font-semibold leading-tight line-clamp-2">{q.label}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-inherit">
                  <span className={`text-[11px] ${theme.textMuted}`}>Số lượng</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-500/10 text-emerald-400">
                    {count} câu
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
