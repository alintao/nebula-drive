import { ref, readonly, computed } from 'vue';

/** 主题元数据 */
export const THEMES = {
  'light-glass': { label: '浅色毛玻璃', icon: '☀️', isGlass: true },
  'dark-glass': { label: '深色毛玻璃', icon: '🌙', isGlass: true },
  minimal: { label: '极简经典', icon: '▢', isGlass: false },
  silver: { label: '银灰', icon: '◈', isGlass: true },
} as const;

export type ThemeKey = keyof typeof THEMES;

const STORAGE_KEY = 'nebula_theme';

function initialTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in THEMES) return saved as ThemeKey;
  } catch {
    /* 忽略 */
  }
  return 'light-glass';
}

// 模块级单例状态（跨组件共享）
const theme = ref<ThemeKey>(initialTheme());

// 应用主题到 <html data-theme>
function apply(t: ThemeKey) {
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* 忽略 */
  }
}

// 初始化时应用一次
apply(theme.value);

export function useTheme() {
  function setTheme(t: ThemeKey) {
    if (t in THEMES) {
      theme.value = t;
      apply(t);
    }
  }

  function cycleTheme() {
    const keys = Object.keys(THEMES) as ThemeKey[];
    const next = keys[(keys.indexOf(theme.value) + 1) % keys.length];
    setTheme(next);
  }

  return {
    theme: readonly(theme),
    themes: THEMES,
    setTheme,
    cycleTheme,
    isGlassTheme: computed(() => THEMES[theme.value].isGlass),
  };
}
