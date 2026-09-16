import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  School, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  BookOpen, 
  Lock, 
  Unlock, 
  Search, 
  Save, 
  Eye, 
  HelpCircle,
  FileText,
  AlertTriangle,
  BarChart2,
  Filter,
  Layers,
  ChevronRight,
  FolderPlus,
  Sparkles
} from 'lucide-react';
import { User, Classroom, Topic, StudentPermissions, UserStatus, ErrorLog } from '../types';
import { useTheme } from '../context/ThemeContext';
import { defaultStudentPermissions } from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';
import { AdminErrorManager } from './AdminErrorManager';
import { ClassroomCascadingFilter } from './ClassroomCascadingFilter';
import { AdminQuickCommandsManager } from './AdminQuickCommandsManager';
import { 
  getDistinctClassNames, 
  getClassroomsByName, 
  groupClassroomsByName, 
  isClassCodeDuplicate 
} from '../utils/classroomHelpers';

interface AdminPortalProps {
  users?: User[];
  classrooms?: Classroom[];
  topics?: Topic[];
  errors?: ErrorLog[];
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onCreateClassroom: (classroom: Classroom) => void;
  onUpdateClassroom: (classroom: Classroom) => void;
  onDeleteClassroom: (classroomId: string) => void;
  onUpdateTopic: (topic: Topic) => void;
  onUpdateErrorPenalty?: (errorId: string, penaltyCount: number) => void;
  onResetErrorProgress?: (errorId: string) => void;
  onResolveError?: (errorId: string) => void;
  onDeleteError?: (errorId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  users = [],
  classrooms = [],
  topics = [],
  errors = [],
  onUpdateUser,
  onDeleteUser,
  onCreateClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
  onUpdateTopic,
  onUpdateErrorPenalty,
  onResetErrorProgress,
  onResolveError,
  onDeleteError,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [activeTab, setActiveTab] = useState<'pending' | 'students' | 'classes' | 'ai_bot'>('pending');

  // Search & 2-tier filter states for Students tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassName, setFilterClassName] = useState<string>('all');
  const [filterClassId, setFilterClassId] = useState<string>('all');

  // Classroom form states
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [formError, setFormError] = useState('');

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

  // Distinct class names for quick selection in create form
  const distinctNames = useMemo(() => getDistinctClassNames(classrooms), [classrooms]);

  // Group classrooms by Tên Lớp
  const groupedClassrooms = useMemo(() => groupClassroomsByName(classrooms), [classrooms]);

  // Count pending students
  const pendingStudents = users.filter(u => u.role === 'student' && u.status === 'pending');
  const activeStudents = users.filter(u => u.role === 'student' && u.status !== 'pending');

  // Handle Approve
  const handleApproveStudent = (student: User, targetClassId?: string) => {
    const updated: User = {
      ...student,
      status: 'approved',
      classroomId: targetClassId || student.classroomId || classrooms?.[0]?.id,
      approvedAt: Date.now(),
      permissions: student.permissions || { ...defaultStudentPermissions },
    };
    onUpdateUser(updated);
  };

  // Handle Reject
  const handleRejectStudent = (student: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Từ chối học sinh',
      message: `Bạn có chắc muốn từ chối yêu cầu của học sinh "${student.fullName}"?`,
      confirmText: 'Từ chối',
      isDanger: true,
      onConfirm: () => onUpdateUser({ ...student, status: 'rejected' }),
    });
  };

  // Handle Toggle Permission
  const handleTogglePermission = (student: User, permKey: keyof StudentPermissions) => {
    const currentPerms = student.permissions || { ...defaultStudentPermissions };
    const nextPerms: StudentPermissions = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey],
    };
    onUpdateUser({
      ...student,
      permissions: nextPerms,
    });
  };

  // Handle Change Student Classroom
  const handleChangeClassroom = (student: User, newClassId: string) => {
    onUpdateUser({
      ...student,
      classroomId: newClassId,
    });
  };

  // Handle Toggle Block / Active
  const handleToggleBlock = (student: User) => {
    const newStatus: UserStatus = student.status === 'blocked' ? 'approved' : 'blocked';
    onUpdateUser({ ...student, status: newStatus });
  };

  // Handle Save Classroom (Tên lớp được trùng, Mã lớp không được trùng)
  const handleSaveClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = newClassName.trim();
    const cleanCode = newClassCode.trim().toUpperCase();
    const cleanDesc = newClassDesc.trim();

    if (!cleanName) {
      setFormError('Vui lòng nhập hoặc chọn Tên Lớp (ví dụ: Lớp 9).');
      return;
    }

    if (!cleanCode) {
      setFormError('Vui lòng nhập Mã Lớp (ví dụ: 9A1, 9A2).');
      return;
    }

    // Check duplicate code across other classrooms
    if (isClassCodeDuplicate(classrooms, cleanCode, editingClassId || undefined)) {
      setFormError(`Mã lớp "${cleanCode}" đã tồn tại trên hệ thống. Tên lớp có thể trùng nhau nhưng Mã lớp phải là duy nhất.`);
      return;
    }

    if (editingClassId) {
      const existing = classrooms.find(c => c.id === editingClassId);
      if (existing) {
        onUpdateClassroom({
          ...existing,
          name: cleanName,
          code: cleanCode,
          description: cleanDesc,
        });
      }
      setEditingClassId(null);
    } else {
      const newClass: Classroom = {
        id: 'class_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: cleanName,
        code: cleanCode,
        description: cleanDesc,
        createdAt: Date.now(),
      };
      onCreateClassroom(newClass);
    }

    setNewClassName('');
    setNewClassCode('');
    setNewClassDesc('');
    setIsCreatingClass(false);
  };

  // Open Create modal prefilled with specific class name
  const handleOpenCreateWithClassName = (className?: string) => {
    setEditingClassId(null);
    setNewClassName(className || '');
    setNewClassCode('');
    setNewClassDesc('');
    setFormError('');
    setIsCreatingClass(true);
  };

  // Filter active students using 2 tiers
  const filteredStudents = activeStudents.filter(s => {
    const matchQuery = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       s.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchQuery) return false;

    if (filterClassId !== 'all') {
      return s.classroomId === filterClassId;
    }

    if (filterClassName !== 'all') {
      const studentClass = classrooms.find(c => c.id === s.classroomId);
      return studentClass && studentClass.name.trim().toLowerCase() === filterClassName.trim().toLowerCase();
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-bold tracking-tight">Trung tâm Quản trị Lớp & Học Sinh</h2>
          </div>
          <p className={`text-xs ${theme.textMuted} mt-0.5`}>
            Quản lý phân tầng 2 lớp học (Tên lớp & Mã lớp), phê duyệt và phân quyền học sinh.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
            <School className="w-3.5 h-3.5" />
            <span>{distinctNames.length} Tên Lớp ({classrooms.length} Mã)</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{activeStudents.length} Học sinh</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-inherit gap-1 overflow-x-auto pb-1">
        {[
          { 
            id: 'pending', 
            label: '1. Chờ phê duyệt', 
            icon: Clock, 
            badge: pendingStudents.length > 0 ? pendingStudents.length : undefined 
          },
          { 
            id: 'students', 
            label: '2. Danh sách Học sinh & Quyền hạn', 
            icon: Users 
          },
          { 
            id: 'classes', 
            label: '3. Quản lý Lớp & Mã lớp (2 Tầng)', 
            icon: School 
          },
          { 
            id: 'ai_bot', 
            label: '4. Menu Lệnh Nhanh Chatbot', 
            icon: Sparkles 
          },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 relative ${
                isSelected 
                  ? 'border-emerald-500 text-emerald-500' 
                  : `border-transparent ${theme.textMuted} hover:opacity-80`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PENDING APPROVALS */}
      {/* ========================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <span>Yêu cầu đăng ký vào lớp chờ duyệt</span>
              <span className="text-xs font-normal opacity-70">({pendingStudents.length} học sinh)</span>
            </h3>
            {pendingStudents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Duyệt tất cả học sinh',
                    message: `Bạn có muốn duyệt tất cả ${pendingStudents.length} học sinh đang chờ vào lớp ngay không?`,
                    confirmText: 'Duyệt tất cả',
                    isDanger: false,
                    onConfirm: () => pendingStudents.forEach(s => handleApproveStudent(s)),
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duyệt tất cả</span>
              </button>
            )}
          </div>

          {pendingStudents.length === 0 ? (
            <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} text-center space-y-2`}>
              <UserCheck className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <div className="text-sm font-bold">Không có học sinh nào đang chờ duyệt</div>
              <p className={`text-xs ${theme.textMuted} max-w-sm mx-auto`}>
                Khi học sinh mới đăng ký tài khoản và chọn lớp / mã lớp, yêu cầu sẽ hiển thị tại đây để bạn phê duyệt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingStudents.map(student => {
                const targetClass = classrooms.find(c => c.id === student.classroomId);
                return (
                  <div 
                    key={student.id} 
                    className={`${theme.card} p-4 rounded-2xl border ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{student.fullName}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${theme.badgeBg}`}>
                          @{student.username}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <School className="w-3 h-3" />
                          <span>Lớp: {targetClass ? `${targetClass.name} (Mã: ${targetClass.code})` : 'Chưa gán lớp'}</span>
                        </span>
                        <span className={theme.textMuted}>
                          Đăng ký lúc: {new Date(student.registeredAt).toLocaleDateString('vi-VN')} {new Date(student.registeredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Class selector if admin wants to change before approving */}
                      <select
                        value={student.classroomId || classrooms?.[0]?.id || ''}
                        onChange={e => handleChangeClassroom(student, e.target.value)}
                        className={`p-2 rounded-xl ${theme.inputBg} text-xs font-medium border ${theme.border}`}
                      >
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} [Mã: {c.code}]
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleApproveStudent(student)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Duyệt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectStudent(student)}
                        className={`p-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1`}
                        title="Từ chối yêu cầu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STUDENTS & PERMISSIONS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* 2-Tier Filter & Search Bar */}
          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-3 ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên hoặc username..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
              />
            </div>

            <div className="shrink-0">
              <ClassroomCascadingFilter
                classrooms={classrooms}
                selectedClassName={filterClassName}
                onSelectClassName={setFilterClassName}
                selectedClassId={filterClassId}
                onSelectClassId={setFilterClassId}
                showAllOption={true}
                allNameLabel="Tất cả Tên Lớp"
                allCodeLabel="Tất cả Mã Lớp"
                size="sm"
              />
            </div>
          </div>

          {/* Guide Banner for Admin */}
          <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-1">
            <div className="font-bold text-sky-500 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Quản lý quyền hạn học sinh ("Học sinh được thấy gì & làm gì"):</span>
            </div>
            <p className={`${theme.textMuted} text-[11px] leading-relaxed`}>
              Bạn có thể bật/tắt quyền xem lý thuyết, quyền làm bài tập, xem giải thích chi tiết, hoặc quyền truy cập sổ lỗi đối với từng học sinh bằng các nút bật/tắt bên dưới.
            </p>
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} text-center space-y-2`}>
              <Users className={`w-8 h-8 ${theme.textMuted} mx-auto opacity-70`} />
              <div className="text-sm font-bold">Không tìm thấy học sinh nào phù hợp</div>
              <p className={`text-xs ${theme.textMuted}`}>Hãy thử tìm kiếm với từ khóa khác hoặc đổi bộ lọc lớp.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map(student => {
                const studentClass = classrooms.find(c => c.id === student.classroomId);
                const perms = student.permissions || { ...defaultStudentPermissions };
                const isBlocked = student.status === 'blocked';

                return (
                  <div
                    key={student.id}
                    className={`${theme.card} p-4 rounded-2xl border ${
                      isBlocked ? 'border-rose-500/40 bg-rose-500/5' : theme.border
                    } space-y-3 shadow-sm`}
                  >
                    {/* Student Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-inherit pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{student.fullName}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${theme.badgeBg}`}>
                            @{student.username}
                          </span>
                          {isBlocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-500">
                              Đang bị khóa
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className={`text-[11px] ${theme.textMuted}`}>Lớp & Mã:</span>
                          <select
                            value={student.classroomId || ''}
                            onChange={e => handleChangeClassroom(student, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg ${theme.inputBg} text-xs font-semibold text-emerald-500 border ${theme.border}`}
                          >
                            {classrooms.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} — Mã: {c.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* User Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(student)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isBlocked
                              ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                              : 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          {isBlocked ? 'Mở khóa' : 'Tạm khóa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Xóa học sinh',
                              message: `Bạn có chắc muốn xóa vĩnh viễn học sinh "${student.fullName}"?`,
                              confirmText: 'Xóa vĩnh viễn',
                              isDanger: true,
                              onConfirm: () => onDeleteUser(student.id),
                            });
                          }}
                          className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Permission Switches Grid */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold ${theme.textMuted} block`}>
                        Phân quyền thao tác của học sinh:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                        {[
                          { 
                            key: 'canViewTheory' as const, 
                            label: 'Lý thuyết', 
                            desc: 'Xem bài giảng',
                            icon: BookOpen 
                          },
                          { 
                            key: 'canPractice' as const, 
                            label: 'Làm bài tập', 
                            desc: 'Luyện câu hỏi',
                            icon: HelpCircle 
                          },
                          { 
                            key: 'canViewExplanations' as const, 
                            label: 'Xem giải thích', 
                            desc: 'Lời giải chi tiết',
                            icon: FileText 
                          },
                          { 
                            key: 'canAccessErrorNotebook' as const, 
                            label: 'Sổ lỗi sai', 
                            desc: 'Vào xem sổ lỗi',
                            icon: AlertTriangle 
                          },
                          { 
                            key: 'canViewProgress' as const, 
                            label: 'Xem tiến độ', 
                            desc: 'Biểu đồ kỹ năng',
                            icon: BarChart2 
                          },
                          { 
                            key: 'canMarkErrorResolved' as const, 
                            label: 'Đánh dấu đã hiểu', 
                            desc: 'Tự gỡ lỗi sổ lỗi',
                            icon: Check 
                          },
                          { 
                            key: 'canDeleteErrorLog' as const, 
                            label: 'Xóa câu sổ lỗi', 
                            desc: 'Tự xóa lỗi phạt',
                            icon: Trash2 
                          },
                        ].map(item => {
                          const isAllowed = perms[item.key] ?? (
                            item.key === 'canMarkErrorResolved' || item.key === 'canDeleteErrorLog' ? false : true
                          );
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleTogglePermission(student, item.key)}
                              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                isAllowed
                                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-500'
                                  : 'border-inherit bg-inherit opacity-50 text-neutral-400'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <Icon className="w-3.5 h-3.5" />
                                <span className={`text-[10px] font-bold px-1 rounded ${
                                  isAllowed ? 'bg-emerald-500 text-white' : 'bg-neutral-500/20 text-neutral-400'
                                }`}>
                                  {isAllowed ? 'BẬT' : 'TẮT'}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-bold truncate">{item.label}</div>
                                <div className="text-[9px] opacity-70 truncate">{item.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CLASSROOMS MANAGEMENT (2 TIERS) */}
      {/* ========================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-500" />
                <span>Quản lý Lớp học 2 Tầng ({distinctNames.length} Tên Lớp, {classrooms.length} Mã Lớp)</span>
              </h3>
              <p className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                Tầng 1 là Tên Lớp (được đặt trùng, VD: "Lớp 9"), Tầng 2 là Mã Lớp cụ thể (duy nhất, VD: "9a1", "9a2").
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateWithClassName()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lớp / Mã lớp mới</span>
            </button>
          </div>

          {/* Form: Create or Edit Classroom */}
          {isCreatingClass && (
            <form onSubmit={handleSaveClassroom} className={`${theme.card} p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 space-y-3.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <School className="w-4 h-4" />
                  <span>{editingClassId ? 'Chỉnh sửa thông tin Mã Lớp' : 'Thêm Lớp học / Mã lớp mới'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingClass(false)}
                  className={`text-xs ${theme.textMuted} hover:underline`}
                >
                  Hủy bỏ
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tầng 1: Tên Lớp (được trùng) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${theme.textMuted}`}>
                      1. Tên Lớp / Khối lớp (Được trùng) *:
                    </label>
                    {distinctNames.length > 0 && (
                      <span className="text-[10px] text-emerald-500 font-medium">Gõ mới hoặc chọn sẵn</span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      placeholder="VD: Lớp 9, Lớp 8, Luyện Thi..."
                      className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-semibold border ${theme.border}`}
                    />
                    
                    {distinctNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center pt-0.5">
                        <span className={`text-[10px] ${theme.textMuted}`}>Tên có sẵn:</span>
                        {distinctNames.map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setNewClassName(name)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              newClassName === name
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : `${theme.badgeBg} border-inherit hover:opacity-80`
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tầng 2: Mã Lớp (Bắt buộc duy nhất) */}
                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                    2. Mã Lớp cụ thể (BẮT BUỘC DUY NHẤT) *:
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value.toUpperCase())}
                    placeholder="VD: 9A1, 9A2, 9_CHUYEN..."
                    className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-mono font-bold text-sky-400 border ${theme.border}`}
                  />
                  <p className={`text-[10px] ${theme.textMuted}`}>
                    Mã định danh phân biệt giữa các lớp cùng tên (VD: 9A1 và 9A2 đều thuộc "Lớp 9").
                  </p>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${theme.textMuted} block mb-1`}>
                  Mô tả mục tiêu của mã lớp này:
                </label>
                <input
                  type="text"
                  value={newClassDesc}
                  onChange={e => setNewClassDesc(e.target.value)}
                  placeholder="VD: Dành cho học sinh chuyên Anh, học sinh bổ trợ..."
                  className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs border ${theme.border}`}
                />
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingClass(false)}
                  className={`px-3 py-2 rounded-xl border ${theme.border} text-xs font-medium`}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingClassId ? 'Lưu thay đổi' : 'Tạo lớp & Mã lớp'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2-Tier Grouped Classrooms Display */}
          {classrooms.length === 0 ? (
            <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} text-center space-y-3`}>
              <School className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <div className="text-sm font-bold">Chưa có Lớp học nào trên hệ thống</div>
              <p className={`text-xs ${theme.textMuted} max-w-sm mx-auto`}>
                Hãy tạo tên lớp (VD: Lớp 9) và các mã lớp (VD: 9A1, 9A2) để bắt đầu phân lớp và soạn bài!
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateWithClassName()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo lớp học đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.entries(groupedClassrooms) as [string, Classroom[]][]).map(([className, classList]) => {
                const totalStudentsInGroup = users.filter(u => 
                  u.role === 'student' && classList.some(c => c.id === u.classroomId)
                ).length;
                const totalTopicsInGroup = topics.filter(t => 
                  classList.some(c => c.id === t.classroomId)
                ).length;

                return (
                  <div
                    key={className}
                    className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden shadow-sm`}
                  >
                    {/* Tầng 1: Header Nhóm Tên Lớp */}
                    <div className="p-4 bg-emerald-500/5 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black text-sm">
                          <School className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base tracking-tight text-emerald-500">{className}</h4>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {classList.length} Mã lớp
                            </span>
                          </div>
                          <p className={`text-xs ${theme.textMuted}`}>
                            Tổng: {totalStudentsInGroup} học sinh • {totalTopicsInGroup} chủ đề bài học
                          </p>
                        </div>
                      </div>

                      {/* Add quick code to this class name */}
                      <button
                        type="button"
                        onClick={() => handleOpenCreateWithClassName(className)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm mã lớp cho {className}</span>
                      </button>
                    </div>

                    {/* Tầng 2: Danh sách các Mã Lớp con */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {classList.map(c => {
                        const studentsInCode = users.filter(u => u.classroomId === c.id && u.role === 'student');
                        const approvedCount = studentsInCode.filter(u => u.status === 'approved').length;
                        const pendingCount = studentsInCode.filter(u => u.status === 'pending').length;
                        const topicsInCode = topics.filter(t => t.classroomId === c.id);

                        return (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-xl border ${theme.border} ${theme.badgeBg} flex flex-col justify-between gap-2.5 transition-all hover:border-emerald-500/40`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                    Mã: {c.code}
                                  </span>
                                  <span className="text-xs font-bold">{c.name}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingClassId(c.id);
                                      setNewClassName(c.name);
                                      setNewClassCode(c.code);
                                      setNewClassDesc(c.description || '');
                                      setFormError('');
                                      setIsCreatingClass(true);
                                    }}
                                    className={`p-1.5 rounded-lg border ${theme.border} hover:opacity-80`}
                                    title="Sửa mã lớp"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: 'Xóa mã lớp học',
                                        message: `Bạn có chắc muốn xóa mã lớp "${c.code}" thuộc "${c.name}"?`,
                                        confirmText: 'Xóa mã lớp',
                                        isDanger: true,
                                        onConfirm: () => onDeleteClassroom(c.id),
                                      });
                                    }}
                                    className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                    title="Xóa mã lớp"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className={`text-xs ${theme.textMuted} line-clamp-1`}>
                                {c.description || 'Chưa có mô tả mục tiêu.'}
                              </p>
                            </div>

                            {/* Stats info */}
                            <div className="flex items-center justify-between pt-1 border-t border-inherit/40 text-[11px]">
                              <span className="font-semibold text-emerald-400">
                                {approvedCount} HS đã duyệt {pendingCount > 0 && <span className="text-amber-400">({pendingCount} chờ)</span>}
                              </span>
                              <span className={theme.textMuted}>
                                {topicsInCode.length} chủ đề
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Quản lý Menu Lệnh Nhanh Chatbot (dùng chung toàn trường) */}
      {activeTab === 'ai_bot' && (
        <AdminQuickCommandsManager />
      )}

      {/* Confirm Action Dialog */}
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
