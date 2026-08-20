/**
 * 内联 SVG 图标集（零依赖）。
 * 用法：<Icon name="grid" className="w-5 h-5" />
 */
const PATHS = {
  // 顶部工具栏
  sun: 'M12 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M12 2.5v2 M12 15v2 M4.2 7.5h2 M17.8 7.5h2 M5.6 4.6l1.4 1.4 M17 17l1.4 1.4 M17 10l1.4-1.4 M5.6 14.4 4.2 15.8',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 10h13M8 14h13M8 18h13M4 6h.01M4 10h.01M4 14h.01M4 18h.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M16.5 16.5 21 21',
  chevronLeft: 'M15 5 8 12l7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  menu: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M5 20a7 7 0 0 1 14 0',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12M8 11l4 4 4-4M4 21h16',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 3v12M9 8l3-3 3 3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  upload: 'M12 15V3M8 7l4-4 4 4M4 21h16',
  // 侧边栏菜单
  cloud: 'M7 18a4 4 0 0 0 4 4h6a4 4 0 0 0 1-7.8A6 6 0 0 0 7 13a4 4 0 0 0 0 5Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8v4l3 2',
  image: 'M4 5h16v14H4zM4 15l4-3 3 2 5-4 4 3M9 9h.01',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
  audio: 'M9 18V6l10-2v12M9 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 16h6',
  share2: 'M8 11a4 4 0 1 0-1 3M20 9a4 4 0 1 0-3 4M8 11a4 4 0 0 0 4 4M15 15a4 4 0 0 1-3 4',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h6l1-13',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M12 2.5v2M12 20v2M4.5 12h-2M21.5 12h-2M6 6 4.5 4.5M18 6l1.5-1.5M6 18l-1.5 1.5M18 18l1.5 1.5',
  // 文件类型
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  code: 'M8 8 5 12l3 4M16 8l3 4-3 4M13 6l-2 12',
  archive: 'M5 4h14v16H5zM5 8h14M10 12h4',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
};

export function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.8 }) {
  const d = PATHS[name] || PATHS.file;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** 实心填充的文件类型图标（用于卡片，带颜色） */
export function FileGlyph({ kind, className = 'w-6 h-6' }) {
  const name =
    kind === 'folder' ? 'folder'
    : kind === 'image' ? 'image'
    : kind === 'video' ? 'video'
    : kind === 'audio' ? 'audio'
    : kind === 'code' ? 'code'
    : kind === 'archive' ? 'archive'
    : kind === 'doc' ? 'doc'
    : 'file';
  return <Icon name={name} className={className} strokeWidth={2} />;
}
