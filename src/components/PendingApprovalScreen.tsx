import React from 'react';
import { 
  Clock, 
  School, 
  RotateCw, 
  LogOut, 
  AlertCircle
} from 'lucide-react';
import { User, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PendingApprovalScreenProps {
  user: User;
  classrooms: Classroom[];
  onRefreshUserStatus: () => void;
  onLogout: () => void;
  onSwitchToAdminToApprove?: (studentId: string) => void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  user,
  classrooms,
  onRefreshUserStatus,
  onLogout,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const userClassroom = classrooms.find(c => c.id === user.classroomId);

  const isRejected = user.status === 'rejected';
  const isBlocked = user.status === 'blocked';

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col justify-center items-center px-4 py-8 select-none transition-colors duration-200`}>
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Card */}
        <div className={`${theme.card} p-6 sm:p-8 rounded-3xl border ${theme.border} shadow-lg space-y-6 text-center`}>
          
          {/* Animated Status Icon */}
          <div className="flex justify-center">
            {isRejected || isBlocked ? (
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse">
                <Clock className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
              isRejected || isBlocked 
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}>
              {isRejected 
                ? 'Yêu cầu bị từ chối' 
                : isBlocked 
                ? 'Tài khoản bị khóa' 
                : 'Đang chờ giáo viên phê duyệt'}
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Xin chào, {user.fullName}!
            </h2>
            <p className={`text-xs ${theme.textMuted} leading-relaxed max-w-sm mx-auto`}>
              {isRejected ? (
                'Rất tiếc, yêu cầu tham gia lớp học của bạn đã bị từ chối. Vui lòng liên hệ giáo viên để được hỗ trợ.'
              ) : isBlocked ? (
                'Tài khoản của bạn đã bị khóa tạm thời. Vui lòng liên hệ quản trị viên.'
              ) : (
                'Tài khoản học sinh của bạn đang ở trạng thái chờ Giáo viên phê duyệt vào lớp học. Vui lòng thông báo cho Giáo viên để được kích hoạt tài khoản.'
              )}
            </p>
          </div>

          {/* Classroom Info Pill */}
          {userClassroom && (
            <div className={`p-3.5 rounded-2xl ${theme.badgeBg} border ${theme.border} flex items-center justify-center gap-2 text-xs`}>
              <School className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-left">
                <div className="font-bold">{userClassroom.name}</div>
                <div className={`text-[10px] ${theme.textMuted}`}>Mã lớp: {userClassroom.code}</div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            {!isRejected && !isBlocked && (
              <button
                id="btn-refresh-status"
                onClick={onRefreshUserStatus}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <RotateCw className="w-4 h-4" />
                <span>Kiểm tra trạng thái duyệt ngay</span>
              </button>
            )}

            <button
              id="btn-pending-logout"
              onClick={onLogout}
              className={`w-full py-3 rounded-xl border ${theme.border} text-xs font-semibold ${theme.textMuted} hover:opacity-80 flex items-center justify-center gap-1.5 transition-opacity active:scale-98`}
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
