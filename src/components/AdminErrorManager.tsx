import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Search, 
  Filter, 
  Users, 
  School, 
  Trash2, 
  Award, 
  Settings2, 
  ChevronRight,
  Sparkles,
  HelpCircle,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Check,
  ListChecks,
  X
} from 'lucide-react';
import { ErrorLog, User, Classroom, SkillCategory } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';
import { ClassroomCascadingFilter } from './ClassroomCascadingFilter';
import { getClassroomsByName } from '../utils/classroomHelpers';
import { DailyCutoffManager } from './DailyCutoffManager';
import { computePendingReports } from '../utils/dailyPendingErrors';

interface AdminErrorManagerProps {
  errors: ErrorLog[];
  users: User[];
  classrooms: Classroom[];
  onUpdateErrorPenalty: (errorId: string, penaltyCount: number) => void;
  onResetErrorProgress: (errorId: string) => void;
  onResolveError: (errorId: string) => void;
  onDeleteError: (errorId: string) => void;
  onBulkDeleteErrors?: (errorIds: string[]) => void;
  onBulkResetErrors?: (errorIds: string[]) => void;
}

export const AdminErrorManager: React.FC<AdminErrorManagerProps> = ({
  errors,
  users,
  classrooms,
  onUpdateErrorPenalty,
  onResetErrorProgress,
  onResolveError,
  onDeleteError,
  onBulkDeleteErrors,
  onBulkResetErrors,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Filters (2-tier classroom)
  const [selectedClassName, setSelectedClassName] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [activeViewMode, setActiveViewMode] = useState<'cutoff' | 'detail'>('cutoff');

  // Compute live pending students count past 23:59 VN cutoff
  const livePendingReports = useMemo(() => {
    return computePendingReports(users, errors, classrooms);
  }, [users, errors, classrooms]);
  const livePendingCount = livePendingReports.length;

  // Confirmation modal
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Helper to resolve student and classroom for any error
  const getErrorStudentAndClass = (err: ErrorLog) => {
    const student = users.find(u => 
      (err.userId && u.id === err.userId) || 
      (err.studentName && (u.fullName.toLowerCase() === err.studentName.toLowerCase() || u.username.toLowerCase() === err.studentName.toLowerCase()))
    );
    const errClassId = err.classroomId || student?.classroomId || '';
    return { student, errClassId };
  };

  // Get matching classroom IDs for current filter
  const activeClassIdSet = useMemo(() => {
    if (selectedClassId !== 'all') {
      return new Set([selectedClassId]);
    }
    if (selectedClassName !== 'all') {
      const classList = getClassroomsByName(classrooms, selectedClassName);
      return new Set(classList.map(c => c.id));
    }
    return null; // all
  }, [classrooms, selectedClassName, selectedClassId]);

  // Filter students based on selected 2-tier class
  const filteredStudents = users.filter(u => {
    if (u.role !== 'student') return false;
    if (activeClassIdSet && (!u.classroomId || !activeClassIdSet.has(u.classroomId))) return false;
    return true;
  });

  // Filter error logs
  const filteredErrors = errors.filter(err => {
    const { student, errClassId } = getErrorStudentAndClass(err);

    // Classroom filter (2 tiers)
    if (activeClassIdSet) {
      if (!errClassId || !activeClassIdSet.has(errClassId)) return false;
    }

    // Student filter
    if (selectedStudentId !== 'all') {
      const matchId = err.userId === selectedStudentId;
      const matchStudentObj = student && student.id === selectedStudentId;
      if (!matchId && !matchStudentObj) return false;
    }

    // Status filter
    if (statusFilter === 'unresolved' && err.resolved) return false;
    if (statusFilter === 'resolved' && !err.resolved) return false;

    // Skill filter
    if (skillFilter !== 'all' && err.skill !== skillFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchQuestion = (err.question || '').toLowerCase().includes(q);
      const matchName = (err.studentName || student?.fullName || '').toLowerCase().includes(q);
      const matchUsername = (student?.username || '').toLowerCase().includes(q);
      const matchType = (err.errorType || '').toLowerCase().includes(q);
      if (!matchQuestion && !matchName && !matchUsername && !matchType) return false;
    }

    return true;
  });

  // Calculate statistics (scoped by classroom & student if selected)
  const scopedErrors = errors.filter(err => {
    const { student, errClassId } = getErrorStudentAndClass(err);
    if (selectedClassId !== 'all' && errClassId !== selectedClassId) return false;
    if (selectedStudentId !== 'all' && err.userId !== selectedStudentId && student?.id !== selectedStudentId) return false;
    return true;
  });

  const totalErrors = scopedErrors.length;
  const unresolvedCount = scopedErrors.filter(e => !e.resolved).length;
  const resolvedCount = scopedErrors.filter(e => e.resolved).length;
  const totalRetries = scopedErrors.reduce((acc, e) => acc + (e.retryAttempts || 0), 0);

  // Batch / Bulk Selection State
  const [selectedErrorIds, setSelectedErrorIds] = useState<string[]>([]);

  // Selection helpers
  const isAllVisibleSelected = filteredErrors.length > 0 && filteredErrors.every(e => selectedErrorIds.includes(e.id));
  const isSomeVisibleSelected = filteredErrors.some(e => selectedErrorIds.includes(e.id));

  const toggleSelect = (id: string) => {
    setSelectedErrorIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredErrors.map(e => e.id);
    if (isAllVisibleSelected) {
      setSelectedErrorIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedErrorIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectResolvedVisible = () => {
    const resolvedIds = filteredErrors.filter(e => e.resolved).map(e => e.id);
    setSelectedErrorIds(resolvedIds);
  };

  const handleClearSelection = () => {
    setSelectedErrorIds([]);
  };

  // Filter selected errors for completed items only
  const selectedResolvedIds = errors
    .filter(e => selectedErrorIds.includes(e.id) && e.resolved)
    .map(e => e.id);
  const selectedResolvedCount = selectedResolvedIds.length;
  const selectedUnresolvedCount = selectedErrorIds.length - selectedResolvedCount;

  // Bulk Delete: Can apply to any selected items
  const handleTriggerBulkDelete = () => {
    if (selectedErrorIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa hàng loạt lỗi sai',
      message: `Bạn có chắc muốn xóa ${selectedErrorIds.length} bản ghi lỗi đã chọn khỏi hệ thống? Thao tác này không thể khôi phục.`,
      confirmText: `Xóa ${selectedErrorIds.length} bản ghi`,
      isDanger: true,
      onConfirm: () => {
        if (onBulkDeleteErrors) {
          onBulkDeleteErrors(selectedErrorIds);
        } else {
          selectedErrorIds.forEach(id => onDeleteError(id));
        }
        setSelectedErrorIds([]);
      },
    });
  };

  // Bulk Penalty Redo from Scratch: Strictly applies to resolved items only!
  const handleTriggerBulkReset = () => {
    if (selectedResolvedCount === 0) return;

    const extraNote = selectedUnresolvedCount > 0 
      ? ` (Lưu ý: Có ${selectedUnresolvedCount} câu đang phạt chưa hoàn thành sẽ được giữ nguyên, chỉ phạt lại ${selectedResolvedCount} câu đã hoàn thành để tránh lỗi hệ thống).` 
      : '';

    setConfirmDialog({
      isOpen: true,
      title: 'Phạt làm lại từ đầu (Hàng loạt)',
      message: `Bạn muốn đặt lại tiến độ của ${selectedResolvedCount} câu lỗi ĐÃ HOÀN THÀNH về 0 để bắt học sinh làm lại từ đầu?${extraNote}`,
      confirmText: `Phạt làm lại (${selectedResolvedCount} câu)`,
      isDanger: false,
      onConfirm: () => {
        if (onBulkResetErrors) {
          onBulkResetErrors(selectedResolvedIds);
        } else {
          selectedResolvedIds.forEach(id => onResetErrorProgress(id));
        }
        // Deselect the ones that were reset
        setSelectedErrorIds(prev => prev.filter(id => !selectedResolvedIds.includes(id)));
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex p-1.5 rounded-2xl bg-black/10 dark:bg-white/5 border border-white/10 gap-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveViewMode('cutoff')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'cutoff'
              ? 'bg-rose-600 text-white shadow-sm'
              : `${theme.textMuted} hover:text-white`
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Chốt sổ lỗi 23:59 (Sau 1 ngày)</span>
          {livePendingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/20 font-bold">
              {livePendingCount} nợ bài
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveViewMode('detail')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeViewMode === 'detail'
              ? 'bg-amber-500 text-white shadow-sm'
              : `${theme.textMuted} hover:text-white`
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Chi tiết sổ lỗi & Mức phạt</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/20">
            {unresolvedCount} lỗi
          </span>
        </button>
      </div>

      {activeViewMode === 'cutoff' ? (
        <DailyCutoffManager
          users={users}
          errors={errors}
          classrooms={classrooms}
          onResolveError={onResolveError}
          onResetErrorProgress={onResetErrorProgress}
        />
      ) : (
        <>
          {/* Top Banner / Concept Explainer */}
          <div className={`p-4 rounded-2xl ${theme.card} border ${theme.border} space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold tracking-tight">
                  Giám Sát Sổ Lỗi Học Sinh & Cơ Chế Phạt Làm Lại
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold">
                {unresolvedCount} lỗi đang phạt
              </span>
            </div>
            <p className={`text-xs ${theme.textMuted}`}>
              Theo dõi chi tiết số lượt học sinh đã thử lại, tình trạng hoàn thành câu lỗi sai, và trực tiếp điều chỉnh 
              <strong> mức phạt (số lần làm đúng bắt buộc)</strong> cho từng câu hỏi để rèn luyện tính cẩn thận.
            </p>
          </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className={`text-[11px] ${theme.textMuted} block`}>Tổng số lỗi sai</span>
          <span className="text-xl font-bold">{totalErrors}</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className="text-[11px] text-rose-400 block font-semibold">Đang bị phạt ôn lại</span>
          <span className="text-xl font-bold text-rose-500">{unresolvedCount}</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className="text-[11px] text-emerald-400 block font-semibold">Đã sửa lỗi xong</span>
          <span className="text-xl font-bold text-emerald-500">{resolvedCount}</span>
        </div>
        <div className={`${theme.card} p-3 rounded-xl border ${theme.border} text-center`}>
          <span className="text-[11px] text-sky-400 block font-semibold">Tổng lượt thử lại</span>
          <span className="text-xl font-bold text-sky-400">{totalRetries} lượt</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`${theme.card} p-3.5 rounded-xl border ${theme.border} space-y-3`}>
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Class Filter (2 Tiers) */}
          <div className="flex-1">
            <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1`}>
              Lọc theo Lớp học (2 Tầng):
            </label>
            <ClassroomCascadingFilter
              classrooms={classrooms}
              selectedClassName={selectedClassName}
              onSelectClassName={name => {
                setSelectedClassName(name);
                setSelectedStudentId('all');
              }}
              selectedClassId={selectedClassId}
              onSelectClassId={id => {
                setSelectedClassId(id);
                setSelectedStudentId('all');
              }}
              showAllOption={true}
              allOptionLabel="Tất cả các lớp"
              size="sm"
            />
          </div>

          {/* Student Filter */}
          <div className="flex-1">
            <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1`}>
              Lọc theo Học sinh:
            </label>
            <select
              id="filter-error-student"
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold ${theme.inputBg} border ${theme.border}`}
            >
              <option value="all">Tất cả học sinh</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  👤 {s.fullName} (@{s.username})
                </option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div className="flex-1">
            <label className={`text-[11px] font-bold ${theme.textMuted} block mb-1`}>
              Phân loại Kỹ năng:
            </label>
            <select
              id="filter-error-skill"
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold ${theme.inputBg} border ${theme.border}`}
            >
              <option value="all">Tất cả kỹ năng</option>
              <option value="mixed">⚡ Tổng hợp (Mixed Practice)</option>
              <option value="grammar">📐 Ngữ pháp (Grammar)</option>
              <option value="vocabulary">📚 Từ vựng (Vocabulary)</option>
              <option value="reading">📖 Đọc hiểu (Reading)</option>
              <option value="listening">🎧 Nghe (Listening)</option>
              <option value="speaking">🎙️ Luyện nói (Speaking)</option>
              <option value="writing">✍️ Viết (Writing)</option>
            </select>
          </div>
        </div>

        {/* Search & Status Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 border-t border-inherit">
          {/* Status Buttons */}
          <div className="flex items-center gap-1 w-full sm:w-auto">
            {[
              { id: 'all', label: `Tất cả (${errors.length})` },
              { id: 'unresolved', label: `Đang phạt (${unresolvedCount})` },
              { id: 'resolved', label: `Đã hoàn thành (${resolvedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white'
                    : `${theme.badgeBg} ${theme.textMuted} hover:opacity-80`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hs, câu hỏi, lỗi..."
              className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs ${theme.inputBg} border ${theme.border}`}
            />
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar & Floating Actions */}
      {filteredErrors.length > 0 && (
        <div className="space-y-2">
          {/* Quick Selection Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${theme.border} ${
                  isAllVisibleSelected ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : `${theme.card} ${theme.textMuted}`
                } flex items-center gap-1.5 cursor-pointer hover:border-emerald-500 transition-colors`}
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {isAllVisibleSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredErrors.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSelectResolvedVisible}
                className={`text-xs font-medium px-2 py-1.5 rounded-lg border ${theme.border} ${theme.card} text-sky-400 hover:border-sky-500 cursor-pointer transition-colors`}
              >
                Chỉ chọn đã hoàn thành ({filteredErrors.filter(e => e.resolved).length})
              </button>
            </div>

            {selectedErrorIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy chọn ({selectedErrorIds.length})</span>
              </button>
            )}
          </div>

          {/* Prominent Bulk Action Bar when items are selected */}
          {selectedErrorIds.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-100 flex items-center gap-2">
                    <span>Đã chọn: {selectedErrorIds.length} câu lỗi</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                    <span className="text-emerald-400 font-semibold">{selectedResolvedCount} đã hoàn thành</span>
                    <span>•</span>
                    <span className="text-rose-400 font-semibold">{selectedUnresolvedCount} đang phạt</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Bulk Reset / Re-penalize (Only for completed items) */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleTriggerBulkReset}
                    disabled={selectedResolvedCount === 0}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      selectedResolvedCount > 0
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md cursor-pointer active:scale-95'
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50'
                    }`}
                    title={
                      selectedResolvedCount === 0
                        ? 'Chỉ áp dụng cho câu đã hoàn thành. Trong các mục bạn chọn chưa có câu nào hoàn thành.'
                        : `Phạt làm lại từ đầu ${selectedResolvedCount} câu đã hoàn thành`
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Phạt làm lại từ đầu ({selectedResolvedCount} câu đã xong)</span>
                  </button>
                  {selectedResolvedCount === 0 && (
                    <div className="hidden group-hover:block absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-56 p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-[10px] text-amber-300 text-center shadow-lg z-20">
                      ⚠️ Phạt làm lại chỉ áp dụng cho câu đã hoàn thành. Không thể áp dụng cho câu đang phạt.
                    </div>
                  )}
                </div>

                {/* 2. Bulk Delete (Can delete all selected) */}
                <button
                  type="button"
                  onClick={handleTriggerBulkDelete}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                  title="Xóa vĩnh viễn các bản ghi lỗi đã chọn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedErrorIds.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Cards List */}
      {filteredErrors.length === 0 ? (
        <div className={`${theme.card} p-8 rounded-2xl border-dashed border text-center space-y-2`}>
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
          <h4 className="text-sm font-bold">Không có lỗi sai nào phù hợp</h4>
          <p className={`text-xs ${theme.textMuted}`}>
            Tất cả học sinh trong bộ lọc hiện đã hoàn thành các câu hỏi hoặc chưa có lỗi sai mới.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((err, idx) => {
            const { student, errClassId } = getErrorStudentAndClass(err);
            const classroom = classrooms.find(c => c.id === errClassId);
            const penaltyTarget = err.requiredSuccessCount || 2;
            const currentSuccess = err.currentSuccessCount || 0;
            const progressPercent = Math.min(100, Math.round((currentSuccess / penaltyTarget) * 100));
            const isSelected = selectedErrorIds.includes(err.id);

            return (
              <div
                key={err.id}
                id={`admin-error-card-${err.id}`}
                className={`${theme.card} p-4 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
                    : err.resolved 
                      ? 'border-emerald-500/20' 
                      : 'border-rose-500/30'
                } shadow-sm space-y-3`}
              >
                {/* Header: Checkbox, Student Name, Class, Skill, Status */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(err.id)}
                      className="p-1 rounded-md hover:bg-neutral-500/10 cursor-pointer text-emerald-400 transition-colors"
                      title={isSelected ? 'Bỏ chọn lỗi này' : 'Chọn lỗi này để thao tác hàng loạt'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-400" />
                      )}
                    </button>
                    <span className="w-6 h-6 rounded-full bg-neutral-500/10 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-400">
                          👤 {err.studentName || student?.fullName || 'Học sinh'}
                        </span>
                        {classroom && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-400 font-medium">
                            {classroom.name} ({classroom.code})
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] ${theme.textMuted}`}>
                        Sai lúc: {new Date(err.lastFailedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Skill tag */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      err.skill === 'mixed' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-neutral-500/10 text-neutral-300'
                    }`}>
                      {err.skill === 'mixed' ? '⚡ Mixed' : err.skill}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                      err.resolved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {err.resolved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Đã hoàn thành lỗi</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Đang phạt làm lại</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Question & Mistake Details */}
                <div className={`p-3 rounded-xl ${theme.inputBg} border ${theme.border} space-y-2 text-xs`}>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} block`}>
                      Câu hỏi / Bài tập:
                    </span>
                    <p className="font-semibold text-sm mt-0.5">{err.question}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-inherit">
                    <div>
                      <span className="text-[10px] text-rose-400 font-semibold block">
                        ❌ Câu trả lời sai của học sinh:
                      </span>
                      <p className="font-mono text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded mt-0.5">
                        {err.userAnswer || '(Trống hoặc chưa chọn)'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-400 font-semibold block">
                        ✅ Đáp án chuẩn xác:
                      </span>
                      <p className="font-mono text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded mt-0.5">
                        {err.correctAnswer}
                      </p>
                    </div>
                  </div>

                  {err.explanation && (
                    <div className="pt-1 border-t border-inherit">
                      <span className={`text-[10px] font-semibold ${theme.textMuted} block`}>
                        💡 Giải thích quy tắc:
                      </span>
                      <p className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                        {err.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* ADMIN RETRY METRICS & PENALTY CONTROLS */}
                <div className={`p-3 rounded-xl ${theme.badgeBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${theme.border}`}>
                  {/* Retry Stats */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold">
                        Lượt thử lại: <strong className="text-sky-400 font-mono">{err.retryAttempts || 0} lượt</strong>
                      </span>
                      <span className="text-neutral-500">•</span>
                      <span className="font-semibold">
                        Tổng số lần làm sai: <strong className="text-rose-400 font-mono">{err.failedCount || 1} lần</strong>
                      </span>
                    </div>

                    {/* Penalty Progress */}
                    <div className="flex items-center gap-2">
                      <div className="w-36 h-2 rounded-full overflow-hidden bg-neutral-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            err.resolved ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold font-mono">
                        {currentSuccess} / {penaltyTarget} lần đúng
                      </span>
                    </div>
                  </div>

                  {/* Penalty Count Setter */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-neutral-800/80 px-2 py-1 rounded-lg border border-neutral-700">
                      <span className="text-[11px] text-neutral-400 font-medium">Mức phạt (số lần đúng):</span>
                      <button
                        type="button"
                        onClick={() => onUpdateErrorPenalty(err.id, Math.max(1, penaltyTarget - 1))}
                        disabled={penaltyTarget <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-xs font-bold disabled:opacity-30 cursor-pointer"
                        title="Giảm số lần đúng yêu cầu"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs text-amber-400 px-1">
                        {penaltyTarget}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateErrorPenalty(err.id, Math.min(10, penaltyTarget + 1))}
                        disabled={penaltyTarget >= 10}
                        className="w-5 h-5 rounded flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-xs font-bold disabled:opacity-30 cursor-pointer"
                        title="Tăng số lần đúng yêu cầu (tăng phạt)"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-inherit">
                  {/* Reset Streak Button (Punishment reset to 0) */}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Đặt lại tiến độ làm đúng',
                        message: `Bạn muốn đặt lại tiến độ làm đúng của học sinh ${err.studentName || ''} về 0/${penaltyTarget} để bắt buộc làm lại từ đầu?`,
                        confirmText: 'Đặt lại về 0',
                        isDanger: false,
                        onConfirm: () => onResetErrorProgress(err.id),
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 cursor-pointer"
                    title="Bắt học sinh làm lại đủ số lần từ đầu"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Phạt làm lại từ đầu</span>
                  </button>

                  {/* Mark as Resolved */}
                  {!err.resolved && (
                    <button
                      type="button"
                      onClick={() => onResolveError(err.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Duyệt đã hoàn thành</span>
                    </button>
                  )}

                  {/* Delete Record */}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Xóa câu lỗi khỏi sổ',
                        message: 'Bạn có chắc muốn xóa bản ghi lỗi này khỏi hệ thống?',
                        confirmText: 'Xóa bản ghi',
                        isDanger: true,
                        onConfirm: () => onDeleteError(err.id),
                      });
                    }}
                    className="p-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    title="Xóa bản ghi lỗi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Xác nhận'}
        cancelText="Hủy"
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
