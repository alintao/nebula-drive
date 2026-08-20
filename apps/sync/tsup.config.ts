import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  sourcemap: false,
  // 保留 node: 前缀（node:sqlite 等内置模块），否则打包后运行时无法解析
  removeNodeProtocol: false,
});
