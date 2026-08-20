import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  platform: 'node',
  target: 'node20',
  // 关键：保留 node: 前缀（node:sqlite 等内置模块），否则打包后运行时无法解析
  removeNodeProtocol: false,
  clean: true
});
