/** @type {import('tailwindcss').Config} */
// Tailwind 配置：字体、大圆角、玻璃阴影、backdrop-blur、主题色（引用 CSS 变量）
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // 主题通过 data-theme 属性切换（而非 dark class），故不用 darkMode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'SF Pro Text', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'sans-serif'],
      },
      // 大圆角体系
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // 玻璃阴影：外阴影 + 顶部内高光（模拟玻璃折射）
      boxShadow: {
        glass: 'var(--shadow)',
        'glass-hover': 'var(--shadow-hover)',
        'glass-inset': 'inset 0 1px 0 var(--glass-highlight)',
      },
      // 磨砂模糊强度
      backdropBlur: {
        glass: 'var(--blur)',
        'glass-sm': '12px',
      },
      // 主题色（引用 CSS 变量，随主题切换）
      colors: {
        ink: 'var(--text)',
        'ink-soft': 'var(--text-secondary)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        glass: 'var(--glass-bg)',
      },
      // 微动画：悬浮放大
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.4,0,0.2,1)',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.4,0,0.2,1)',
      },
      // 过渡曲线
      transitionTimingFunction: {
        glass: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
