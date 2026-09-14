import React, { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  FolderKanban, 
  AlertTriangle, 
  BarChart2, 
  PlusCircle, 
  Moon, 
  Sun, 
  SlidersHorizontal,
  Coffee,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode, User, Classroom } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSettings: () => void;
  errorCount: number;
  currentUser: User | null;
  currentClassroom?: Classroom | null;
  pendingCount?: number;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openSettings,
  errorCount,
  currentUser,
  currentClassroom,
  pendingCount = 0,
  onLogout,
}) => {
  const { settings, updateSettings, getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'oled', 'sepia', 'light'];
    const nextIdx = (modes.indexOf(settings.theme) + 1) % modes.length;
    updateSettings({ theme: modes[nextIdx] });
  };

  const getThemeIcon = () => {
    switch (settings.theme) {
      case 'oled':
        return <Moon className="w-4 h-4 text-neutral-400" />;
      case 'sepia':
        return <Coffee className="w-4 h-4 text-amber-700" />;
      case 'light':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'dark':
      default:
        return <Moon className="w-4 h-4 text-teal-400" />;
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions;

  // Build dynamic navigation items based on role and student permissions
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'topics', label: 'Bài học', icon: BookOpen },
  ];

  if (isAdmin) {
    navItems.push(
      { 
        id: 'admin', 
        label: 'Admin Lớp & HS', 
        icon: ShieldCheck, 
        badge: pendingCount > 0 ? pendingCount : undefined 
      },
      { id: 'manager', label: 'Quản lý kho', icon: FolderKanban },
      { id: 'builder', label: 'Soạn bài', icon: PlusCircle },
      { 
        id: 'errors', 
        label: 'Sổ lỗi & Phạt', 
        icon: AlertTriangle, 
        badge: errorCount > 0 ? errorCount : undefined 
      },
      { id: 'progress', label: 'Tiến độ', icon: BarChart2 }
    );
  } else {
    // Student items (strictly respect permissions)
    if (perms?.canAccessErrorNotebook !== false) {
      navItems.push({ id: 'errors', label: 'Sổ lỗi', icon: AlertTriangle, badge: errorCount > 0 ? errorCount : undefined });
    }
    if (perms?.canViewProgress !== false) {
      navItems.push({ id: 'progress', label: 'Tiến độ', icon: BarChart2 });
    }
  }

  return (
    <>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 border-b ${theme.card} backdrop-blur-md`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          
          {/* Brand */}
          <div 
            id="brand-header"
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600/90 text-white flex items-center justify-center font-bold text-base shadow-sm">
              ST
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-base leading-tight tracking-tight">Sổ Tay Học Tập</h1>
                {isAdmin ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Admin
                  </span>
                ) : currentClassroom ? (
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    {currentClassroom.name}
                  </span>
                ) : null}
              </div>
              <p className={`text-[11px] ${theme.textMuted} hidden sm:block truncate max-w-[200px]`}>
                {currentUser?.fullName || 'Tự học di động'}
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-desktop-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all relative ${
                    isActive 
                      ? `${theme.highlight} font-semibold shadow-sm` 
                      : `${theme.textMuted} hover:${theme.text}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-rose-500 text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & User Info */}
          <div className="flex items-center gap-1.5">
            {/* Theme switch */}
            <button
              id="theme-toggle-btn"
              onClick={cycleTheme}
              title={`Đổi giao diện (Hiện tại: ${settings.theme})`}
              className={`p-2 rounded-lg border ${theme.border} ${theme.badgeBg} hover:opacity-80 transition-opacity flex items-center gap-1.5 text-xs font-medium`}
            >
              {getThemeIcon()}
              <span className="hidden lg:inline capitalize text-[11px]">
                {settings.theme === 'oled' ? 'OLED' : settings.theme === 'sepia' ? 'Sepia' : settings.theme === 'light' ? 'Sáng' : 'Đêm'}
              </span>
            </button>

            {/* Settings */}
            <button
              id="open-settings-btn"
              onClick={openSettings}
              title="Cài đặt đọc & âm thanh"
              className={`p-2 rounded-lg border ${theme.border} ${theme.badgeBg} hover:opacity-80 transition-opacity`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Logout */}
            {currentUser && (
              <button
                id="btn-logout"
                type="button"
                onClick={() => setShowLogoutModal(true)}
                title={`Đăng xuất (${currentUser.fullName})`}
                className={`p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Thoát</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Fixed & Thumb Optimized */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${theme.card} backdrop-blur-lg pb-safe`}>
        <div 
          className="grid h-15 items-center px-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-mobile-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 relative touch-manipulation transition-colors ${
                  isActive ? 'text-emerald-500 font-semibold' : theme.textMuted
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 px-1 text-[9px] min-w-[14px] text-center rounded-full bg-rose-500 text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?"
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        isDanger={true}
        iconType="logout"
        onConfirm={onLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};
