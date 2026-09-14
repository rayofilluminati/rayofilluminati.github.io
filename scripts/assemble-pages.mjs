import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const reader = resolve(process.argv[2] || '.ttsu-source', 'apps/web/build');
const output = resolve('dist-site');
await mkdir(output, {recursive: true});
await cp('dist-pages', resolve(output, 'aozora'), {recursive: true});
await cp(reader, resolve(output, 'ttsu'), {recursive: true});
await cp('portal', output, {recursive: true});
await writeFile(resolve(output, '.nojekyll'), '');
// GitHub Pages only serves the root 404. Static TTsu routes have their own
// index.html; this fallback also supports the reader's legacy /b/<id> URLs.
const fallback = await readFile(resolve(reader, '404.html'), 'utf8');
const guard = `<script>
const legacy = /^\\/ttsu\\/b\\/(\\d+)\\/?$/.exec(location.pathname);
if (legacy) {const query = new URLSearchParams(location.search);query.set('id', legacy[1]);location.replace('/ttsu/b/?'+query+location.hash);}
else if(!location.pathname.startsWith('/ttsu/'))location.replace('/'+location.search+location.hash);
</script>`;
await writeFile(resolve(output, '404.html'), fallback.replace('<head>', '<head>' + guard));
