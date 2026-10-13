import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 的網址是 https://<帳號>.github.io/<repo 名稱>/,
// 所以 build 出來的檔案要帶上 /<repo 名稱>/ 這個前綴,否則會找不到檔案(空白頁)。
// 本機 `npm run dev` 不需要前綴。換 repo 名稱時,改這裡或設定環境變數 VITE_BASE。
const REPO_NAME = '20261013';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? (process.env.VITE_BASE ?? `/${REPO_NAME}/`) : '/',
}));
