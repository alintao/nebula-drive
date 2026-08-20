import { Icon, FileGlyph } from './Icons.jsx';
import { KIND_META, fmtSize } from '../data/mockData.js';

/**
 * 列表视图：玻璃表格。行悬浮高亮。
 */
export default function FileList({ files }) {
  return (
    <div className="glass overflow-hidden rounded-3xl">
      {/* 表头 */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 border-b border-white/20 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        <span>名称</span>
        <span className="hidden sm:block">类型</span>
        <span className="hidden sm:block">大小</span>
        <span className="text-right">修改时间</span>
      </div>

      {/* 行 */}
      {files.map((file) => {
        const meta = KIND_META[file.kind];
        const isFolder = file.kind === 'folder';
        return (
          <div
            key={file.id}
            className="group grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-2 border-b border-white/10 px-5 py-3 transition-colors last:border-b-0 hover:bg-glass"
          >
            {/* 名称 + 图标 */}
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{
                  color: meta.color,
                  background: `color-mix(in srgb, ${meta.color} 18%, transparent)`,
                }}
              >
                <FileGlyph kind={file.kind} className="h-5 w-5" />
              </span>
              <span className="truncate text-sm font-medium">{file.name}</span>
            </div>

            <span className="hidden truncate text-sm text-ink-soft sm:block">
              {meta.label}
            </span>

            <span className="hidden truncate text-sm text-ink-soft sm:block">
              {isFolder ? `${file.items} 项` : fmtSize(file.size)}
            </span>

            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-ink-soft">{file.modified}</span>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="glass-btn grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:text-ink"
                  title="下载"
                >
                  <Icon name="download" className="h-3.5 w-3.5" />
                </button>
                <button
                  className="glass-btn grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:text-ink"
                  title="更多"
                >
                  <Icon name="more" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
