import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
import {mkdir, copyFile, writeFile} from 'node:fs/promises';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({command, mode}) => {
  const env = {...loadEnv(mode, root, ''), ...process.env};
  const base = env.PAGES_BASE_PATH || '/';
  if (!/^\/(?:[\w.-]+\/)*$/.test(base)) throw new Error('PAGES_BASE_PATH must be / or /repository/');
  const api = (env.VITE_API_ORIGIN || '').replace(/\/$/, '');
  if (command === 'build' && !api) throw new Error('Set VITE_API_ORIGIN to the deployed API Worker origin.');
  if (api) {
    const url = new URL(api);
    if (url.origin !== api || !['https:', 'http:'].includes(url.protocol)) throw new Error('VITE_API_ORIGIN must be an HTTP(S) origin without a path.');
    if (command === 'build' && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('The published API must use HTTPS.');
  }
  return {
    root: root + 'static-app', base, envDir: root, publicDir: root + 'public',
    resolve: {alias: {'@': root, 'next/navigation': root + 'static-app/navigation.ts'}},
    define: {__PAGES_BASE__: JSON.stringify(base), __API_ORIGIN__: JSON.stringify(api)},
    css: {postcss: {plugins: [tailwindcss()]}},
    plugins: [react(), {name: 'pages-reader-entry', async closeBundle() {
      if (command !== 'build') return;
      await mkdir(root + 'dist-pages/read', {recursive: true});
      await copyFile(root + 'dist-pages/index.html', root + 'dist-pages/read/index.html');
      await writeFile(root + 'dist-pages/.nojekyll', '');
    }}],
    build: {outDir: root + 'dist-pages', emptyOutDir: true},
    server: {proxy: {'/api': 'http://127.0.0.1:8787'}},
  };
});
