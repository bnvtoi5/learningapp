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
import { StudyMascot } from './StudyMascot';
import { MascotSelectorModal } from './MascotSelectorModal';
import { MASCOT_LIST } from '../utils/mascotSprites';

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
  const [showMascotModal, setShowMascotModal] = useState(false);

  const currentMascotId = settings.mascotType || 'owl';
  const mascotInfo = MASCOT_LIST.find(m => m.id === currentMascotId) || MASCOT_LIST[0];

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
        label: 'Admin', 
        icon: ShieldCheck, 
        badge: pendingCount > 0 ? pendingCount : undefined 
      },
      { id: 'manager', label: 'Quản lý', icon: FolderKanban },
      { id: 'builder', label: 'Soạn bài', icon: PlusCircle },
      { 
        id: 'errors', 
        label: 'Sổ lỗi', 
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
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Brand */}
          <div 
            id="brand-header"
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
          >
            {/* Mascot Avatar (Clean circle, no corner emoji badge) */}
            <div 
              id="btn-navbar-mascot-avatar"
              onClick={(e) => {
                e.stopPropagation();
                setShowMascotModal(true);
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-500/60 hover:bg-emerald-500/20 transition-all group-hover:scale-105 active:scale-95 cursor-pointer shadow-sm overflow-hidden"
              title={`Linh vật: ${mascotInfo.name} - Bấm để đổi bạn nhỏ`}
            >
              <StudyMascot size={42} interactivePoke={false} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className={`font-bold text-base sm:text-lg tracking-tight ${theme.text} leading-tight`}>
                  Sổ Tay Học Tập
                </h1>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Admin
                  </span>
                ) : currentClassroom ? (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {currentClassroom.name}
                  </span>
                ) : null}
              </div>
              <p className={`text-[11px] ${theme.textMuted} hidden sm:flex items-center gap-1.5 mt-0.5`}>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{mascotInfo.name}</span>
                <span className="opacity-30">•</span>
                <span className="truncate max-w-[160px]">{currentUser?.fullName || 'Tự học thông minh'}</span>
              </p>
            </div>
          </div>

          {/* Desktop Nav Items - Refined Segmented Control */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-desktop-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all cursor-pointer relative ${
                    isActive 
                      ? `${theme.card} ${theme.text} shadow-sm border ${theme.border}` 
                      : `${theme.textMuted} hover:${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-emerald-500' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold leading-tight shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & User Info */}
          <div className="flex items-center gap-2">
            {/* Theme switch */}
            <button
              id="theme-toggle-btn"
              onClick={cycleTheme}
              title={`Đổi giao diện (Hiện tại: ${settings.theme})`}
              className={`px-3 py-2 rounded-xl border ${theme.border} ${theme.highlight} hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm`}
            >
              {getThemeIcon()}
              <span className="hidden lg:inline capitalize text-xs">
                {settings.theme === 'oled' ? 'OLED' : settings.theme === 'sepia' ? 'Sepia' : settings.theme === 'light' ? 'Sáng' : 'Đêm'}
              </span>
            </button>

            {/* Settings */}
            <button
              id="open-settings-btn"
              onClick={openSettings}
              title="Cài đặt đọc & âm thanh"
              className={`p-2 sm:px-2.5 sm:py-2 rounded-xl border ${theme.border} ${theme.highlight} hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden xl:inline text-xs">Cài đặt</span>
            </button>

            {/* Logout */}
            {currentUser && (
              <button
                id="btn-logout"
                type="button"
                onClick={() => setShowLogoutModal(true)}
                title={`Đăng xuất (${currentUser.fullName})`}
                className={`px-3 py-2 rounded-xl border border-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Thoát</span>
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

      {/* Mascot Selector Modal */}
      <MascotSelectorModal
        isOpen={showMascotModal}
        onClose={() => setShowMascotModal(false)}
      />
    </>
  );
};
