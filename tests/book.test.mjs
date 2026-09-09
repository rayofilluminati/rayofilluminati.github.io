import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/book/route.ts';
const nativeFetch = globalThis.fetch;
const request = (url = 'https://www.aozora.gr.jp/cards/000148/card789.html') => new Request('https://reader.test/api/book?url=' + encodeURIComponent(url));
const fixture = (body) => new Response('<meta charset="utf-8">' + body);
test('falls back for both card and body, retaining canonical URL and ruby', async () => {
  const seen=[];
  globalThis.fetch=async (url) => {
    seen.push(String(url));
    if (String(url).startsWith('https://www.aozora.gr.jp')) return new Response('Unavailable', {status:403});
    return fixture(String(url).endsWith('card789.html') ? '<a href="files/789_14547.html">本文</a>' : '<div class="main_text"><ruby>吾輩<rt>わがはい</rt></ruby>は猫である。</div>');
  };
  try { const res=await GET(request()); const data=await res.json(); assert.equal(res.status,200); assert.match(data.raw,/吾輩/); assert.match(data.raw,/<rt>/); assert.equal(data.url,'https://www.aozora.gr.jp/cards/000148/files/789_14547.html'); assert.equal(seen.length,4); assert.ok(seen[1].startsWith('https://aozora.gr.jp/cards/')); }
  finally {globalThis.fetch=nativeFetch;}
});
test('supports direct Shift-JIS text', async () => {
  globalThis.fetch=async () => new Response(new Uint8Array([...new TextEncoder().encode('<div class="main_text">'),0x94,0x4c,...new TextEncoder().encode('</div>')]));
  try {const res=await GET(request('https://www.aozora.gr.jp/cards/000148/files/789_14547.html'));assert.equal(res.status,200);assert.match((await res.json()).raw,/猫/);} finally {globalThis.fetch=nativeFetch;}
});
test('rejects foreign URLs without a fetch', async()=>{globalThis.fetch=async()=>{throw Error('must not fetch')};try{assert.equal((await GET(request('https://example.com/'))).status,400);}finally{globalThis.fetch=nativeFetch;}});
test('both upstream failures return retryable uncached error',async()=>{globalThis.fetch=async()=>new Response('',{status:503});try{const res=await GET(request());assert.equal(res.status,502);assert.equal(res.headers.get('cache-control'),'no-store');}finally{globalThis.fetch=nativeFetch;}});

test('follows official mirror redirect without changing canonical book URL',async()=>{
  const seen=[];globalThis.fetch=async(url)=>{seen.push(String(url));return String(url).includes('mirror.aozora.gr.jp')?fixture('<div class="main_text">猫</div>'):new Response(null,{status:302,headers:{location:'http://mirror.aozora.gr.jp/cards/000148/files/789_14547.html'}})};
  try{const res=await GET(request('https://www.aozora.gr.jp/cards/000148/files/789_14547.html'));assert.equal(res.status,200);assert.match((await res.json()).url,/www.aozora.gr.jp/);assert.match(seen[1],/mirror.aozora.gr.jp/);}finally{globalThis.fetch=nativeFetch;}
});
test('never follows redirect to an unrelated host',async()=>{
  const seen=[];globalThis.fetch=async(url)=>{seen.push(String(url));return new Response(null,{status:302,headers:{location:'http://127.0.0.1/cards/000148/files/789_14547.html'}})};
  try{assert.equal((await GET(request('https://www.aozora.gr.jp/cards/000148/files/789_14547.html'))).status,502);assert.ok(seen.every(url=>['www.aozora.gr.jp','aozora.gr.jp'].includes(new URL(url).hostname)));}finally{globalThis.fetch=nativeFetch;}
});

