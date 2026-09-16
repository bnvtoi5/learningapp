import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, ThemeMode, FontSize, LineSpacing } from '../types';
import { loadSettings, saveSettings, defaultSettings, getCurrentUser } from '../utils/storage';

interface ThemeContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  getThemeClasses: () => {
    bg: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    inputBg: string;
    highlight: string;
    badgeBg: string;
  };
  getTypographyClasses: () => {
    bodyText: string;
    headingText: string;
    questionText: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Listen for account changes (login, switch account, logout)
  useEffect(() => {
    const handleUserChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const user = customEvent.detail;
      const userSettings = loadSettings(user?.id);
      setSettings(userSettings);
    };

    window.addEventListener('app_user_changed', handleUserChanged);
    return () => window.removeEventListener('app_user_changed', handleUserChanged);
  }, []);

  useEffect(() => {
    const activeUserId = getCurrentUser()?.id;
    saveSettings(settings, activeUserId);
    // Add class to body/html if needed
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-oled', 'theme-sepia', 'dark');
    if (settings.theme === 'dark' || settings.theme === 'oled') {
      root.classList.add('dark');
    }
    root.classList.add(`theme-${settings.theme}`);
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      const activeUserId = getCurrentUser()?.id;
      saveSettings(next, activeUserId);
      return next;
    });
  };

  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'oled':
        return {
          bg: 'bg-black text-neutral-200',
          card: 'bg-neutral-950 border border-neutral-800/80',
          border: 'border-neutral-800',
          text: 'text-neutral-100',
          textMuted: 'text-neutral-400',
          accent: 'bg-emerald-600 text-white',
          accentHover: 'hover:bg-emerald-500',
          inputBg: 'bg-neutral-900 border-neutral-700 text-neutral-100',
          highlight: 'bg-neutral-900 text-neutral-200 border-neutral-700',
          badgeBg: 'bg-neutral-900 text-neutral-300',
        };
      case 'sepia':
        return {
          bg: 'bg-[#fcf8ec] text-[#2c2419]',
          card: 'bg-[#f5ede0] border border-[#e4d6c0]',
          border: 'border-[#e4d6c0]',
          text: 'text-[#2b2218]',
          textMuted: 'text-[#6e5d48]',
          accent: 'bg-[#8d5b2c] text-white',
          accentHover: 'hover:bg-[#7a4e25]',
          inputBg: 'bg-[#fffaf0] border-[#d9caa9] text-[#2c2419]',
          highlight: 'bg-[#ece2cf] text-[#2c2419] border-[#d9caa9]',
          badgeBg: 'bg-[#e8ddc9] text-[#4d3d2c]',
        };
      case 'light':
        return {
          bg: 'bg-slate-50 text-slate-800',
          card: 'bg-white border border-slate-200 shadow-sm',
          border: 'border-slate-200',
          text: 'text-slate-900',
          textMuted: 'text-slate-600',
          accent: 'bg-indigo-600 text-white',
          accentHover: 'hover:bg-indigo-500',
          inputBg: 'bg-white border-slate-300 text-slate-900',
          highlight: 'bg-slate-100 text-slate-900 border-slate-300',
          badgeBg: 'bg-slate-100 text-slate-700',
        };
      case 'dark':
      default:
        return {
          bg: 'bg-slate-900 text-slate-100',
          card: 'bg-slate-800/80 border border-slate-700/60',
          border: 'border-slate-700/60',
          text: 'text-slate-100',
          textMuted: 'text-slate-400',
          accent: 'bg-teal-600 text-white',
          accentHover: 'hover:bg-teal-500',
          inputBg: 'bg-slate-900/90 border-slate-700 text-slate-100',
          highlight: 'bg-slate-800 text-slate-200 border-slate-700',
          badgeBg: 'bg-slate-700/70 text-slate-300',
        };
    }
  };

  const getTypographyClasses = () => {
    let bodyText = 'text-base';
    let questionText = 'text-lg';
    let headingText = 'text-xl';

    if (settings.fontSize === 'large') {
      bodyText = 'text-lg';
      questionText = 'text-xl';
      headingText = 'text-2xl';
    } else if (settings.fontSize === 'xlarge') {
      bodyText = 'text-xl';
      questionText = 'text-2xl';
      headingText = 'text-3xl';
    }

    const lh = settings.lineSpacing === 'relaxed' ? 'leading-relaxed' : 'leading-normal';

    return {
      bodyText: `${bodyText} ${lh}`,
      headingText: `${headingText} font-semibold ${lh}`,
      questionText: `${questionText} font-medium ${lh}`,
    };
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, getThemeClasses, getTypographyClasses }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
