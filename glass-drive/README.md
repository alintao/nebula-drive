# 玻璃网盘 · Glass Drive

Apple 毛玻璃（Glassmorphism / 液态玻璃）风格的私人网盘管理界面。
React 18 + Vite + Tailwind CSS，零额外 UI 依赖（图标为内联 SVG）。

## 运行

```bash
npm install
npm run dev        # 开发（默认 http://localhost:5180）
npm run build      # 生产构建 → dist/
npm run preview    # 预览生产构建
```

## 主题切换（4 套，CSS 变量驱动）

| 主题 | data-theme | 说明 |
|------|-----------|------|
| 浅色毛玻璃 | `light-glass` | 蓝粉紫柔和渐变 + 白色磨砂玻璃 |
| 深色毛玻璃 | `dark-glass` | 深蓝紫渐变 + 深色磨砂玻璃 |
| 极简经典 | `minimal` | 无毛玻璃、扁平白底、干净克制 |
| 银灰 | `silver` | 冷调金属银灰渐变玻璃 |

- 顶部栏 **太阳/月亮按钮**：循环切换主题。
- 顶部栏 **四主题快选面板**：点击月亮按钮旁的主题名直接选择。
- 切换通过 `<html data-theme>` 驱动 CSS 变量，选择持久化到 `localStorage`。

## 设计要点

- **背景**：大面积柔和渐变（`--bg`），叠加两团柔光光斑增强玻璃质感。
- **玻璃面板**：`.glass` / `.glass-card` / `.glass-btn` —— 半透明磨砂（20%~30% 透明度）+ `backdrop-blur` + 顶部内高光（`inset 0 1px 0`，模拟玻璃折射）+ 柔和外阴影。
- **大圆角**：卡片 `rounded-3xl`、按钮 `rounded-2xl`。
- **字体**：Inter（Google Fonts）+ SF Pro 回退。
- **微动画**：网格卡片 `hover` 放大 1.035 + 上移 2px + 阴影增强。

## 布局（经典三栏）

- **左侧侧边栏**：保留经典菜单（我的云盘/最近/图片/视频/音乐/文档/分享/回收站），带 **可折叠开关**（收窄为纯图标栏）。
- **顶部栏**：搜索框、**视图切换（网格/列表）**、**主题切换（太阳/月亮 + 四主题快选）**、上传按钮、用户头像。
- **中间内容区**：**网格卡片** 与 **列表** 两种视图切换；网格卡片有悬浮放大微动画与毛玻璃 Hover 状态。

## 目录结构

```
glass-drive/
├── index.html                 # 入口（加载 Inter 字体）
├── tailwind.config.js         # Tailwind 配置（字体/圆角/玻璃阴影/主题色）
├── src/
│   ├── main.jsx               # React 入口
│   ├── App.jsx                # 主入口（ThemeProvider + Layout）
│   ├── index.css              # 主题变量 + 玻璃工具类
│   ├── context/ThemeContext.jsx  # 主题 Context（4 主题 + 持久化）
│   ├── data/mockData.js       # 模拟文件 + 菜单 + 图标元数据
│   └── components/
│       ├── Layout.jsx         # 三栏布局 + 背景 + 视图状态
│       ├── Sidebar.jsx        # 可折叠侧边栏
│       ├── Topbar.jsx         # 顶部栏（视图/主题切换）
│       ├── FileGrid.jsx       # 网格视图
│       ├── FileCard.jsx       # 网格卡片（悬浮微动画）
│       ├── FileList.jsx       # 列表视图
│       └── Icons.jsx          # 内联 SVG 图标集
```

## 自定义主题

在 `src/index.css` 中修改对应 `[data-theme='...']` 的 CSS 变量即可：
`--bg`（背景渐变）、`--glass-bg`（玻璃底色）、`--glass-border`（边框）、
`--glass-highlight`（顶部高光）、`--text` / `--text-secondary`、`--accent`、
`--shadow` / `--shadow-hover`、`--blur`（模糊强度）。
