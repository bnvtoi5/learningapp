import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Calendar, 
  Copy, 
  Check, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  School, 
  UserCheck, 
  Sparkles, 
  Info,
  XCircle
} from 'lucide-react';
import { User, ErrorLog, Classroom, DailyPendingErrorReport } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ClassroomCascadingFilter } from './ClassroomCascadingFilter';
import { getClassroomsByName } from '../utils/classroomHelpers';
import { 
  getVietnamTime, 
  getVietnamCutoffTimestamp, 
  isVietnamCutoffPassed, 
  fetchPendingErrorReportsFromCloud, 
  computePendingReports,
  getVietnamDateString
} from '../utils/dailyPendingErrors';

interface DailyCutoffManagerProps {
  users: User[];
  errors: ErrorLog[];
  classrooms: Classroom[];
  onResolveError?: (errorId: string) => void;
  onResetErrorProgress?: (errorId: string) => void;
}

export const DailyCutoffManager: React.FC<DailyCutoffManagerProps> = ({
  users,
  errors,
  classrooms,
  onResolveError,
  onResetErrorProgress,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Cloud & local pending reports
  const [cloudReports, setCloudReports] = useState<DailyPendingErrorReport[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());

  // Current Vietnam Time ticker
  const [nowVn, setNowVn] = useState(getVietnamTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowVn(getVietnamTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch from Firestore on mount
  const loadCloudReports = async () => {
    setIsLoadingCloud(true);
    try {
      const reports = await fetchPendingErrorReportsFromCloud();
      setCloudReports(reports);
    } catch (err) {
      console.warn('Error loading cloud reports:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    loadCloudReports();
  }, []);

  // Calculate Yesterday and Today Vietnam dates
  const todayVnDateStr = nowVn.dateStr;
  const yesterdayVnDate = new Date(nowVn.timestamp - 24 * 60 * 60 * 1000);
  const yesterdayVnDateStr = getVietnamDateString(yesterdayVnDate.getTime());

  // Filters
  const [selectedPresetDate, setSelectedPresetDate] = useState<'yesterday' | 'today' | '7days' | 'all' | 'custom'>('yesterday');
  const [customDate, setCustomDate] = useState<string>(yesterdayVnDateStr);
  const [selectedClassName, setSelectedClassName] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Classroom cascading active IDs
  const activeClassIdSet = useMemo(() => {
    if (selectedClassId !== 'all') {
      return new Set([selectedClassId]);
    }
    if (selectedClassName !== 'all') {
      const classList = getClassroomsByName(classrooms, selectedClassName);
      return new Set(classList.map(c => c.id));
    }
    return null;
  }, [classrooms, selectedClassName, selectedClassId]);

  // Compute live local reports & merge with cloud reports
  const allMergedReports = useMemo(() => {
    const computed = computePendingReports(users, errors, classrooms);
    const map = new Map<string, DailyPendingErrorReport>();

    // Put cloud reports first
    cloudReports.forEach(r => map.set(r.id, r));

    // Overlay real-time computed reports from current state
    computed.forEach(r => map.set(r.id, r));

    return Array.from(map.values()).sort((a, b) => 
      b.dateStr.localeCompare(a.dateStr) || b.unresolvedCount - a.unresolvedCount
    );
  }, [cloudReports, users, errors, classrooms]);

  // Filter reports according to selected date preset and classroom
  const filteredReports = useMemo(() => {
    const sevenDaysAgoMs = nowVn.timestamp - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoDateStr = getVietnamDateString(sevenDaysAgoMs);

    return allMergedReports.filter(report => {
      // Date filter
      if (selectedPresetDate === 'yesterday') {
        if (report.dateStr !== yesterdayVnDateStr) return false;
      } else if (selectedPresetDate === 'today') {
        if (report.dateStr !== todayVnDateStr) return false;
      } else if (selectedPresetDate === '7days') {
        if (report.dateStr < sevenDaysAgoDateStr) return false;
      } else if (selectedPresetDate === 'custom') {
        if (report.dateStr !== customDate) return false;
      }

      // Classroom filter
      if (activeClassIdSet) {
        if (!report.classroomId || !activeClassIdSet.has(report.classroomId)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (report.studentName || '').toLowerCase().includes(q);
        const matchUsername = (report.username || '').toLowerCase().includes(q);
        if (!matchName && !matchUsername) return false;
      }

      return true;
    });
  }, [allMergedReports, selectedPresetDate, customDate, yesterdayVnDateStr, todayVnDateStr, activeClassIdSet, searchQuery]);

  // Summary Metrics
  const totalPendingStudents = filteredReports.length;
  const totalPendingErrors = filteredReports.reduce((sum, r) => sum + r.unresolvedCount, 0);

  // Toggle student expanded
  const toggleStudentExpand = (id: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy Reminder to Clipboard
  const handleCopyReminder = () => {
    if (filteredReports.length === 0) return;

    let targetDateLabel = '';
    if (selectedPresetDate === 'yesterday') targetDateLabel = `Hôm qua (${yesterdayVnDateStr})`;
    else if (selectedPresetDate === 'today') targetDateLabel = `Hôm nay (${todayVnDateStr})`;
    else if (selectedPresetDate === 'custom') targetDateLabel = `Ngày ${customDate}`;
    else targetDateLabel = `Các ngày gần đây`;

    const classNameLabel = selectedClassId !== 'all' 
      ? (classrooms.find(c => c.id === selectedClassId)?.name || 'Lớp đã chọn')
      : selectedClassName !== 'all' ? selectedClassName : 'Toàn trường';

    const lines = [
      `📢 [THÔNG BÁO CHỐT SỔ LỖI SAI - MỐC 23H59 (VIỆT NAM)]`,
      `⏱️ Mốc thời gian: Sau 23h59 ngày ${targetDateLabel}`,
      `🏫 Lớp: ${classNameLabel}`,
      `----------------------------------------`,
      `⚠️ Danh sách ${filteredReports.length} học sinh chưa hoàn thành sửa bài:`,
    ];

    filteredReports.forEach((r, idx) => {
      const cls = classrooms.find(c => c.id === r.classroomId)?.name || 'Chưa xếp lớp';
      lines.push(`${idx + 1}. ${r.studentName} (@${r.username}) - ${cls}: Còn ${r.unresolvedCount} câu chưa sửa`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`👉 Các em hãy đăng nhập vào hệ thống và vào mục "Sổ Lỗi Sai" để sửa hết các câu trên trước buổi học tiếp theo!`);

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  // Remaining time to today's 23:59 VN cutoff
  const todayCutoffMs = getVietnamCutoffTimestamp(todayVnDateStr);
  const msUntilTodayCutoff = todayCutoffMs - nowVn.timestamp;
  const isPastTodayCutoff = msUntilTodayCutoff <= 0;

  const hoursLeft = Math.max(0, Math.floor(msUntilTodayCutoff / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msUntilTodayCutoff % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <div className="space-y-4">
      {/* Real-time Vietnam Time & Cutoff Status Banner */}
      <div className={`p-4 rounded-2xl ${theme.card} border ${theme.border} shadow-sm space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Chốt Sổ Lỗi Học Sinh (Mốc 23h59 Giờ Việt Nam)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/20">
                  UTC+7 VN
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                Đồng hồ hệ thống VN: <strong className="font-mono text-emerald-400">{nowVn.timeStr}</strong> • Ngày: <strong className="font-mono">{nowVn.dateStr}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={loadCloudReports}
              disabled={isLoadingCloud}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme.inputBg} border ${theme.border} hover:bg-white/10 flex items-center gap-1.5 transition-all cursor-pointer`}
              title="Lấy dữ liệu chốt sổ mới nhất từ Cloud Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloud ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isLoadingCloud ? 'Đang tải...' : 'Làm mới Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Countdown / Status Callout */}
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          isPastTodayCutoff 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
        }`}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            {isPastTodayCutoff ? (
              <p>
                <strong>Đã qua mốc 23h59 hôm nay!</strong> Danh sách nợ bài đã được chốt tự động. Học sinh chưa sửa xong bài sẽ hiển thị dưới danh sách này.
              </p>
            ) : (
              <p>
                <strong>Đang trong ngày học:</strong> Còn <strong>{hoursLeft} giờ {minutesLeft} phút</strong> nữa mới đến mốc 23h59 hôm nay. Học sinh sửa hết lỗi trước 23h59 sẽ <strong>không bị đẩy bản ghi nợ nào về Cloud (tiết kiệm 100% quota)</strong>!
              </p>
            )}
            <p className="text-[11px] opacity-80">
              💡 Học sinh chỉ bị ghi nợ khi qua mốc 23h59 mà vẫn còn câu chưa hoàn thành. Nếu sau đó học sinh làm xong hết, bản ghi nợ sẽ tự động được gỡ bỏ.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Học sinh chưa hoàn thành</span>
          <span className="text-xl font-bold text-rose-500">{totalPendingStudents} bạn</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Tổng số câu chưa sửa</span>
          <span className="text-xl font-bold text-amber-500">{totalPendingErrors} câu</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Mốc chốt giờ</span>
          <span className="text-xl font-bold text-sky-400">23:59 VN</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Đồng bộ Cloud Firestore</span>
          <span className="text-xl font-bold text-emerald-400">Tối ưu 100%</span>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className={`${theme.card} p-3.5 rounded-xl border ${theme.border} space-y-3`}>
        {/* Date Presets */}
        <div>
          <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1.5`}>
            Chọn ngày kiểm tra chốt sổ:
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPresetDate('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedPresetDate === 'yesterday'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : `${theme.inputBg} ${theme.border} ${theme.textMuted} hover:text-white`
              }`}
            >
              📅 Hôm qua ({yesterdayVnDateStr})
            </button>

            <button
              type="button"
              onClick={() => setSelectedPresetDate('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedPresetDate === 'today'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : `${theme.inputBg} ${theme.border} ${theme.textMuted} hover:text-white`
              }`}
            >
              📅 Hôm nay ({todayVnDateStr})
            </button>

            <button
              type="button"
              onClick={() => setSelectedPresetDate('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedPresetDate === '7days'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : `${theme.inputBg} ${theme.border} ${theme.textMuted} hover:text-white`
              }`}
            >
              📅 7 ngày gần nhất
            </button>

            <button
              type="button"
              onClick={() => setSelectedPresetDate('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedPresetDate === 'all'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : `${theme.inputBg} ${theme.border} ${theme.textMuted} hover:text-white`
              }`}
            >
              📅 Tất cả các ngày
            </button>

            <div className="flex items-center gap-1 ml-auto">
              <input
                type="date"
                value={customDate}
                onChange={e => {
                  setCustomDate(e.target.value);
                  setSelectedPresetDate('custom');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${theme.inputBg} border ${theme.border}`}
                title="Chọn ngày cụ thể"
              />
            </div>
          </div>
        </div>

        {/* Classroom & Search filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="flex-1">
            <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1`}>
              Lọc theo Lớp học:
            </label>
            <ClassroomCascadingFilter
              classrooms={classrooms}
              selectedClassName={selectedClassName}
              onSelectClassName={setSelectedClassName}
              selectedClassId={selectedClassId}
              onSelectClassId={setSelectedClassId}
              showAllOption={true}
              allOptionLabel="Tất cả các lớp"
              size="sm"
            />
          </div>

          <div className="flex-1">
            <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1`}>
              Tìm kiếm học sinh:
            </label>
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nhập tên hoặc username học sinh..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs ${theme.inputBg} border ${theme.border}`}
              />
            </div>
          </div>
        </div>

        {/* Copy / Export Button */}
        {filteredReports.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className={`text-xs ${theme.textMuted}`}>
              Tìm thấy <strong className="text-rose-400">{filteredReports.length}</strong> học sinh chưa hoàn thành ({totalPendingErrors} câu lỗi).
            </span>
            <button
              type="button"
              onClick={handleCopyReminder}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {copiedNotification ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNotification ? 'Đã sao chép vào Clipboard!' : 'Sao chép nhắc nhở (Zalo / Lớp)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Pending Students List or Zero State */}
      {filteredReports.length === 0 ? (
        <div className={`p-8 rounded-2xl ${theme.card} border ${theme.border} text-center space-y-3`}>
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-emerald-400">
            Tuyệt vời! Không có học sinh nào nợ sổ lỗi
          </h4>
          <p className={`text-xs ${theme.textMuted} max-w-md mx-auto leading-relaxed`}>
            Tất cả học sinh trong phạm vi kiểm tra đã <strong>sửa xong 100% câu làm sai trước mốc 23h59</strong>, hoặc đã làm đúng toàn bộ bài tập. Không có dữ liệu lỗi thừa nào bị gửi lên Cloud.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const isExpanded = expandedStudentIds.has(report.id);
            const classroomObj = classrooms.find(c => c.id === report.classroomId);

            return (
              <div 
                key={report.id}
                className={`rounded-2xl ${theme.card} border ${theme.border} overflow-hidden shadow-sm transition-all`}
              >
                {/* Student Summary Row */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {report.studentName ? report.studentName.charAt(0).toUpperCase() : 'H'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold">{report.studentName}</h4>
                        <span className={`text-[11px] font-mono ${theme.textMuted}`}>@{report.username}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">
                          <School className="w-3 h-3 text-sky-400" />
                          <span>{classroomObj?.name || 'Chưa xếp lớp'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-amber-400">
                          <Calendar className="w-3 h-3" />
                          <span>Ngày ghi nhận: {report.dateStr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge & Accordion Toggle */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Chưa sửa: {report.unresolvedCount} câu</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleStudentExpand(report.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${theme.inputBg} border ${theme.border} hover:bg-white/10 flex items-center gap-1 cursor-pointer transition-all`}
                    >
                      <span>{isExpanded ? 'Ẩn câu hỏi' : 'Xem câu hỏi'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Questions Detail */}
                {isExpanded && (
                  <div className="p-3.5 border-t border-white/5 bg-black/5 dark:bg-black/20 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className={theme.textMuted}>Chi tiết {report.unresolvedErrors.length} câu học sinh chưa sửa xong:</span>
                      <span className="text-[11px] text-rose-400 font-mono">Quá hạn chốt 23h59</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {report.unresolvedErrors.map((errItem, idx) => (
                        <div 
                          key={errItem.id || idx}
                          className={`p-3 rounded-xl ${theme.card} border ${theme.border} text-xs space-y-1.5`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-amber-400">
                              Câu {idx + 1}:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] uppercase font-bold text-sky-400">
                                {errItem.skill}
                              </span>
                              <span className="text-[11px] text-rose-400 font-semibold">
                                Sai {errItem.failedCount} lần
                              </span>
                            </div>
                          </div>

                          <p className="font-medium text-sm leading-snug">
                            {errItem.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                            {errItem.userAnswer && (
                              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                                <span className="font-bold block text-[10px] text-rose-400 uppercase">Học sinh trả lời:</span>
                                <span>{errItem.userAnswer}</span>
                              </div>
                            )}
                            {errItem.correctAnswer && (
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                <span className="font-bold block text-[10px] text-emerald-400 uppercase">Đáp án đúng:</span>
                                <span>{errItem.correctAnswer}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
