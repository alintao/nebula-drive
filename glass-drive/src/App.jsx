import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/Layout.jsx';

/**
 * 主入口：注入主题 Context，渲染整体布局。
 */
export default function App() {
  return (
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  );
}
