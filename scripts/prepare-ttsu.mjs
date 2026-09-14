import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Adapt the pinned upstream checkout without maintaining a second copy of its source.
const root = resolve(process.argv[2] || '.ttsu-source', 'apps/web');
async function replace(path, before, after) {
  const file = resolve(root, path);
  const source = await readFile(file, 'utf8');
  if (!source.includes(before)) throw new Error(`TTsu source changed: ${path}`);
  await writeFile(file, source.replace(before, after));
}
await replace('svelte.config.js', 'kit: {', "kit: {\n    paths: {base: '/ttsu', relative: false},");
await replace('src/routes/+layout.server.ts', 'export const prerender = true;', "export const prerender = true;\nexport const trailingSlash = 'always';");
await replace('src/lib/data/env.ts', "import.meta.env.VITE_PAGE_PATH || ''", "'/ttsu'");
await replace('src/lib/data/env.ts', "'https://reader.ttsu.app'", "'https://rayofilluminati.github.io'");
await replace('src/routes/+layout.svelte', '`${basePath}/icons/', '`${basePath}/ttsu/icons/');
await replace('src/service-worker.ts', 'const BUILD_CACHE_NAME = `build:${version}`;', "const CACHE_PREFIX = 'ttsu:/ttsu:';\nconst BUILD_CACHE_NAME = `${CACHE_PREFIX}build:${version}`;");
await replace('src/service-worker.ts', '(key) => key !== BUILD_CACHE_NAME && key !== userFontsCacheName', '(key) => key.startsWith(CACHE_PREFIX) && key !== BUILD_CACHE_NAME && key !== userFontsCacheName');
await replace('src/service-worker.ts', '`other:${version}`', '`${CACHE_PREFIX}other:${version}`');
await replace('src/service-worker.ts', "url.pathname.startsWith('/userfonts/')", "url.pathname.startsWith(`${pagePath}/userfonts/`)");
await replace('src/service-worker.ts', "createRedirectResponse('/fonts/noto-serif-v21-regular.woff2')", "new Response('Font not found', {status: 404})");
await replace('src/lib/components/settings/settings-user-font-add.svelte', '<script lang="ts">', '<script lang="ts">\n  import { pagePath } from \'$lib/data/env\';');
await replace('src/lib/components/settings/settings-user-font-add.svelte', '`/userfonts/', '`${pagePath}/userfonts/');
