import { useState } from 'react';
import { Icon } from './Icons.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * 顶部导航栏：玻璃面板。
 * 含搜索框、视图切换（网格/列表）、主题切换（太阳/月亮 + 四主题快选）、上传按钮。
 */
export default function Topbar({ view, setView, title }) {
  const { theme, themes, setTheme, cycleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isGlassTheme = themes[theme].isGlass;

  return (
    <header className="glass relative flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
      {/* 标题 */}
      <div className="mr-1">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        <p className="hidden text-[11px] text-ink-soft sm:block">我的云盘 / 全部文件</p>
      </div>

      {/* 搜索框 */}
      <div className="glass hidden h-10 w-64 items-center gap-2 rounded-2xl px-3 md:flex">
        <Icon name="search" className="h-4 w-4 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文件…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* 视图切换：网格 / 列表 */}
        <div className="glass flex h-10 items-center rounded-2xl p-1">
          <button
            onClick={() => setView('grid')}
            title="网格视图"
            className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
              view === 'grid' ? 'bg-accent-soft text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Icon name="grid" className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            title="列表视图"
            className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
              view === 'list' ? 'bg-accent-soft text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Icon name="list" className="h-4 w-4" />
          </button>
        </div>

        {/* 主题切换：太阳/月亮（循环） + 四主题快选 */}
        <div className="relative">
          <button
            onClick={cycleTheme}
            title={`当前主题：${themes[theme].label}（点击切换）`}
            className="glass-btn grid h-10 w-10 place-items-center rounded-2xl text-ink"
          >
            <Icon name={isGlassTheme ? 'moon' : 'sun'} className="h-5 w-5" />
          </button>
          {/* 快选面板 */}
          {showThemePicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemePicker(false)} />
              <div className="glass absolute right-0 top-12 z-20 w-44 rounded-2xl p-2 animate-scale-in">
                {Object.entries(themes).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTheme(key);
                      setShowThemePicker(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
                      theme === key
                        ? 'bg-accent-soft text-ink'
                        : 'text-ink-soft hover:bg-glass hover:text-ink'
                    }`}
                  >
                    <span className="text-base">{meta.icon}</span>
                    <span className="flex-1 text-left">{meta.label}</span>
                    {theme === key && <span className="text-accent">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 上传按钮 */}
        <button className="glass-accent hidden h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-white sm:flex">
          <Icon name="upload" className="h-4 w-4" />
          <span>上传</span>
        </button>

        {/* 用户头像 */}
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-fuchsia-400 grid place-items-center text-sm font-bold text-white">
          A
        </div>
      </div>

      {/* 移动端搜索 */}
      <div className="glass flex h-10 w-full items-center gap-2 rounded-2xl px-3 md:hidden">
        <Icon name="search" className="h-4 w-4 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文件…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
      </div>
    </header>
  );
}
