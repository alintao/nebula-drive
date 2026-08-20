import { useState } from 'react';
import { Icon } from './Icons.jsx';
import { menu } from '../data/mockData.js';

/**
 * 左侧侧边栏：玻璃面板 + 可折叠开关。
 * collapsed 时收窄为纯图标栏。
 */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState('my-drive');

  return (
    <aside
      className={`glass flex flex-col rounded-3xl transition-all duration-300 ease-glass ${
        collapsed ? 'w-[76px]' : 'w-[248px]'
      }`}
    >
      {/* 品牌 + 折叠开关 */}
      <div
        className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="glass-accent grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white">
          <Icon name="cloud" className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">玻璃网盘</p>
            <p className="truncate text-[11px] text-ink-soft">Glass Drive</p>
          </div>
        )}
        {/* 折叠开关 */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          className={`glass-btn ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl text-ink-soft hover:text-ink ${
            collapsed ? 'mt-3' : ''
          }`}
        >
          <Icon
            name="chevronLeft"
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* 菜单 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {menu.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              title={collapsed ? item.label : undefined}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                  isActive
                    ? 'bg-accent-soft text-ink shadow-glass-inset'
                    : 'text-ink-soft hover:bg-glass hover:text-ink'
                }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${
                  isActive ? 'text-accent' : 'text-ink-soft group-hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 底部：设置 + 用户 */}
      <div className="border-t border-white/20 px-3 py-3">
        <button
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-all hover:bg-glass hover:text-ink ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center">
            <Icon name="settings" className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && <span>设置</span>}
        </button>
        <div
          className={`mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 grid place-items-center text-xs font-bold text-white">
            A
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-[11px] text-ink-soft">admin@nebula.io</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
