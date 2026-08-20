import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * 主题元数据：key -> { label, icon, isGlass }
 * isGlass 用于 UI 上标注该主题是否为毛玻璃主题。
 */
export const THEMES = {
  'light-glass': { label: '浅色毛玻璃', short: 'Light Glass', icon: '☀️', isGlass: true },
  'dark-glass': { label: '深色毛玻璃', short: 'Dark Glass', icon: '🌙', isGlass: true },
  minimal: { label: '极简经典', short: 'Minimal', icon: '▢', isGlass: false },
  silver: { label: '银灰', short: 'Silver', icon: '◈', isGlass: true },
};

const STORAGE_KEY = 'glass-drive-theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved && THEMES[saved] ? saved : 'light-glass';
  });

  // 将当前主题应用到 <html data-theme>，驱动 CSS 变量切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t) => {
    if (THEMES[t]) setThemeState(t);
  }, []);

  // 循环切换（用于太阳/月亮按钮）
  const cycleTheme = useCallback(() => {
    const keys = Object.keys(THEMES);
    setThemeState((cur) => keys[(keys.indexOf(cur) + 1) % keys.length]);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themes: THEMES, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
