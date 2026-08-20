import { Icon, FileGlyph } from './Icons.jsx';
import { KIND_META, fmtSize } from '../data/mockData.js';

/**
 * 网格卡片：毛玻璃背景 + 悬浮放大微动画（.glass-card:hover）。
 */
export default function FileCard({ file }) {
  const meta = KIND_META[file.kind];
  const isFolder = file.kind === 'folder';
  const sizeLabel = isFolder
    ? `${file.items} 项`
    : fmtSize(file.size);

  return (
    <div className="glass-card group relative flex flex-col rounded-3xl p-4">
      {/* 图标区 */}
      <div className="mb-3 flex items-center justify-center py-2">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
          style={{
            color: meta.color,
            background: `color-mix(in srgb, ${meta.color} 18%, transparent)`,
          }}
        >
          <FileGlyph kind={file.kind} className="h-8 w-8" />
        </div>
      </div>

      {/* 文件名 */}
      <p className="truncate text-center text-sm font-medium" title={file.name}>
        {file.name}
      </p>
      <p className="mt-0.5 text-center text-[11px] text-ink-soft">
        {meta.label} · {sizeLabel}
      </p>

      {/* 悬浮操作 */}
      <div className="mt-3 flex items-center justify-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          className="glass-btn grid h-8 w-8 place-items-center rounded-xl text-ink-soft hover:text-ink"
          title="下载"
        >
          <Icon name="download" className="h-4 w-4" />
        </button>
        <button
          className="glass-btn grid h-8 w-8 place-items-center rounded-xl text-ink-soft hover:text-ink"
          title="分享"
        >
          <Icon name="share" className="h-4 w-4" />
        </button>
        <button
          className="glass-btn grid h-8 w-8 place-items-center rounded-xl text-ink-soft hover:text-ink"
          title="更多"
        >
          <Icon name="more" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
