import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';

for (const path of ['index.html', 'read/index.html', 'aozora/index.html', 'aozora/read/index.html', 'aozora/fonts/NotoSerifJP.ttf', 'ttsu/index.html', 'ttsu/manage/index.html', 'ttsu/b/index.html', 'ttsu/settings/index.html', 'ttsu/auth/index.html', 'ttsu/service-worker.js', 'ttsu/manifest.webmanifest', '404.html']) {
  await access(`dist-site/${path}`);
}
for (const path of ['aozora/index.html', 'aozora/read/index.html']) {
  const html = await readFile(`dist-site/${path}`, 'utf8');
  assert.match(html, /\/aozora\/assets\//);
}
const reader = await readFile('dist-site/ttsu/index.html', 'utf8');
assert.match(reader, /\/ttsu\/_app\//);
assert.doesNotMatch(reader, /(?:src|href)="\/_app\//);
const manifest = JSON.parse(await readFile('dist-site/ttsu/manifest.webmanifest', 'utf8'));
assert.equal(new URL(manifest.scope, 'https://example.com/ttsu/manifest.webmanifest').pathname, '/ttsu/');
assert.equal(new URL(manifest.start_url, 'https://example.com/ttsu/manifest.webmanifest').pathname, '/ttsu/');
console.log('Combined Pages routes, assets and PWA scope verified.');
