import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import FileGrid from './FileGrid.jsx';
import FileList from './FileList.jsx';
import { files } from '../data/mockData.js';

/**
 * 主布局：经典三栏（左侧菜单 / 顶部栏 / 中间内容区）。
 * 背景使用大面积柔和渐变；侧边栏与顶栏为磨砂玻璃。
 */
export default function Layout() {
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const title = '全部文件';

  return (
    <div className="relative min-h-screen">
      {/* 背景渐变（固定，铺满） */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: 'var(--bg)' }}
        aria-hidden="true"
      />
      {/* 背景柔光装饰（增强玻璃质感） */}
      <div
        className="fixed -top-40 -right-20 -z-10 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--accent)' }}
        aria-hidden="true"
      />
      <div
        className="fixed -bottom-40 -left-20 -z-10 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'color-mix(in srgb, var(--accent) 50%, #ffffff)' }}
        aria-hidden="true"
      />

      {/* 三栏主体 */}
      <div className="flex min-h-screen gap-4 p-4">
        {/* 左侧菜单 */}
        <Sidebar />

        {/* 右侧：顶栏 + 内容 */}
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar view={view} setView={setView} title={title} />

          {/* 内容区 */}
          <section className="flex-1 animate-fade-in">
            {view === 'grid' ? (
              <FileGrid files={files} />
            ) : (
              <FileList files={files} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
