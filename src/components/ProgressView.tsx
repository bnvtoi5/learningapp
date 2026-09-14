import React from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  Flame, 
  BookOpen, 
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { UserStats, SkillCategory, MasteryStatus, Exercise, ErrorLog } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ProgressViewProps {
  stats: UserStats;
  exercises: Exercise[];
  errors: ErrorLog[];
  onStartSkillPractice: (skill: SkillCategory) => void;
}

const SKILLS_META: { key: SkillCategory; label: string; desc: string; icon: string }[] = [
  { key: 'vocabulary', label: 'Từ vựng (Vocabulary)', desc: 'Nhận biết, ngữ cảnh, collocations, tự sử dụng', icon: '📚' },
  { key: 'grammar', label: 'Ngữ pháp (Grammar)', desc: 'Chia thì, sửa lỗi, biến đổi câu, ngữ cảnh thực tế', icon: '📐' },
  { key: 'reading', label: 'Đọc hiểu (Reading)', desc: 'Scanning keyword, vùng thông tin, đọc ý chính', icon: '📖' },
  { key: 'listening', label: 'Nghe (Listening)', desc: '3 bước: dự đoán → nghe hiểu → transcript', icon: '🎧' },
  { key: 'speaking', label: 'Luyện nói (Speaking)', desc: 'Đọc to, dịch nói, phản xạ từ khóa & tình huống', icon: '🎙️' },
  { key: 'writing', label: 'Kỹ năng viết (Writing)', desc: 'Viết câu, đoạn văn theo tiêu chí ngữ pháp', icon: '✍️' },
];

export const ProgressView: React.FC<ProgressViewProps> = ({
  stats,
  exercises,
  errors,
  onStartSkillPractice,
}) => {
  const { getThemeClasses, getTypographyClasses } = useTheme();
  const theme = getThemeClasses();
  const typo = getTypographyClasses();

  const activeErrors = errors.filter(e => !e.resolved);

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
      {/* Title */}
      <div>
        <h2 className={`${typo.headingText} tracking-tight`}>
          Báo cáo tiến độ học tập
        </h2>
        <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
          Đánh giá năng lực theo 6 kỹ năng cốt lõi: Chưa học → Đang học → Đã đạt → Cần ôn lại
        </p>
      </div>

      {/* Main Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${theme.card} p-4 rounded-xl text-center`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 font-semibold mb-1">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>Chuỗi ngày</span>
          </div>
          <div className="text-2xl font-bold">{stats.streakDays} ngày</div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Duy trì đều đặn</div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-500 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã hoàn thành</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalCompleted}</div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>{stats.totalCorrect} câu đúng</div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-teal-500 font-semibold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Độ chính xác</span>
          </div>
          <div className="text-2xl font-bold text-emerald-500">{overallAccuracy}%</div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Tỷ lệ đạt chuẩn</div>
        </div>

        <div className={`${theme.card} p-4 rounded-xl text-center`}>
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-semibold mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>Lỗi sai tồn đọng</span>
          </div>
          <div className={`text-2xl font-bold ${activeErrors.length > 0 ? 'text-rose-500' : ''}`}>
            {activeErrors.length}
          </div>
          <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>Cần ôn luyện</div>
        </div>
      </div>

      {/* 6 Core Skills Breakdown Matrix */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-500" />
          <span>Chi tiết 6 kỹ năng trọng tâm</span>
        </h3>

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
                className={`${theme.card} p-4 rounded-xl space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <h4 className="text-sm font-semibold">{item.label}</h4>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className={`text-xs ${theme.textMuted} line-clamp-1 mb-3`}>
                    {item.desc}
                  </p>

                  {/* Mini Progress Bar */}
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
                        className="h-full bg-emerald-500 rounded-full"
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
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600/90 hover:bg-emerald-600 text-white disabled:opacity-40 flex items-center gap-1"
                  >
                    <span>Luyện tập</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
