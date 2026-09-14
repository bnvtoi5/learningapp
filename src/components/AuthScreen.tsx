import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  School,
  GraduationCap
} from 'lucide-react';
import { User, Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';
import { defaultStudentPermissions } from '../utils/storage';

interface AuthScreenProps {
  classrooms?: Classroom[];
  users?: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterUser: (newUser: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  classrooms = [],
  users = [],
  onLoginSuccess,
  onRegisterUser,
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(classrooms?.[0]?.id || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    const found = users.find(u => u.username.toLowerCase() === cleanUser);
    if (!found) {
      setErrorMessage('Tên đăng nhập không tồn tại trên hệ thống.');
      return;
    }

    if (found.password !== cleanPass) {
      setErrorMessage('Mật khẩu không chính xác.');
      return;
    }

    // Login success
    onLoginSuccess(found);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMessage('Tên đăng nhập cần ít nhất 3 ký tự.');
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.username.toLowerCase() === cleanUser);
    if (exists) {
      setErrorMessage(`Tên đăng nhập "${cleanUser}" đã có người sử dụng. Hãy chọn tên khác.`);
      return;
    }

    if (!selectedClassId && classrooms.length > 0) {
      setErrorMessage('Vui lòng chọn một lớp học để tham gia.');
      return;
    }

    // Public registration is strictly for Students awaiting approval
    const newUser: User = {
      id: 'student_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUser,
      password: cleanPass,
      fullName: cleanName,
      role: 'student',
      status: 'pending',
      classroomId: selectedClassId || classrooms?.[0]?.id,
      registeredAt: Date.now(),
      permissions: { ...defaultStudentPermissions },
    };

    onRegisterUser(newUser);

    setSuccessNotice('Đăng ký tài khoản học sinh thành công! Tài khoản đang chờ Giáo viên duyệt vào lớp.');
    setMode('login');
    setPassword('');
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col justify-center items-center px-4 py-8 select-none transition-colors duration-200`}>
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600/90 text-white font-black text-2xl shadow-lg shadow-emerald-600/20">
            ST
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sổ Tay Học Tập</h1>
          <p className={`text-xs ${theme.textMuted} max-w-xs mx-auto`}>
            Hệ thống học tập, phân lớp & luyện tập tối ưu cho di động
          </p>
        </div>

        {/* Tab switch: Login / Register */}
        <div className={`flex rounded-xl p-1 border ${theme.border} ${theme.badgeBg}`}>
          <button
            type="button"
            id="tab-btn-login"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessNotice('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-emerald-600 text-white shadow-sm'
                : `${theme.textMuted} hover:opacity-80`
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            id="tab-btn-register"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessNotice('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-emerald-600 text-white shadow-sm'
                : `${theme.textMuted} hover:opacity-80`
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký học sinh</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successNotice}</span>
          </div>
        )}

        {/* Auth Card */}
        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-sm space-y-5`}>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                  Tên đăng nhập:
                </label>
                <div className="relative">
                  <UserIcon className={`w-4 h-4 absolute left-3 top-3.5 ${theme.textMuted}`} />
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản..."
                    className={`w-full pl-9 pr-3 py-3 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                  Mật khẩu:
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3 top-3.5 ${theme.textMuted}`} />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className={`w-full pl-9 pr-3 py-3 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                  />
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Đăng ký tham gia lớp học dành cho Học sinh</span>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                  Họ và tên của bạn *:
                </label>
                <input
                  id="register-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className={`w-full p-3 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                  Tên đăng nhập (viết liền, không dấu) *:
                </label>
                <input
                  id="register-username"
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="VD: nguyenan"
                  className={`w-full p-3 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme.textMuted} block`}>
                  Mật khẩu *:
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu đăng nhập..."
                  className={`w-full p-3 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                />
              </div>

              {/* Classroom choice */}
              <div className="space-y-1.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <label className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5" />
                  <span>Chọn Lớp học muốn tham gia *:</span>
                </label>
                {classrooms.length === 0 ? (
                  <p className="text-xs text-rose-500">Chưa có lớp học trên hệ thống. Vui lòng liên hệ Giáo viên tạo lớp.</p>
                ) : (
                  <select
                    id="register-select-classroom"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl ${theme.inputBg} text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} [Mã: {c.code}]
                      </option>
                    ))}
                  </select>
                )}
                <p className={`text-[10px] ${theme.textMuted}`}>
                  ℹ️ Sau khi đăng ký, tài khoản sẽ chuyển sang trạng thái chờ Giáo viên phê duyệt vào lớp.
                </p>
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Hoàn tất đăng ký học sinh</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <p className={`text-center text-[11px] ${theme.textMuted}`}>
          Sổ tay học tập và quản lý lớp học trực quan
        </p>
      </div>
    </div>
  );
};
