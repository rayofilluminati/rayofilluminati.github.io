import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DOMParser} from 'linkedom';
await build({entryPoints:['lib/sources.ts','lib/novel-parser.ts','lib/novel-session.ts','lib/reader-content.ts','app/api/novel/route.ts'],bundle:true,platform:'node',packages:'external',format:'esm',outbase:'.',outdir:'work/adapter-tests',outExtension:{'.js':'.mjs'}});
const {novelURL,novelRoot}=await import('../work/adapter-tests/lib/sources.mjs');
const {parseNovel,parseSourceCatalogue}=await import('../work/adapter-tests/lib/novel-parser.mjs');
const {openNovel}=await import('../work/adapter-tests/lib/novel-session.mjs');
const {sanitizeContent}=await import('../work/adapter-tests/lib/reader-content.mjs');
const {GET}=await import('../work/adapter-tests/app/api/novel/route.mjs');
test('normalizes all new sources and rejects foreign hosts, paths and credentials',()=>{
 for(const [input,root] of [['http://kakuyomu.jp/works/123/episodes/456','https://kakuyomu.jp/works/123'],['https://novema.jp/book/n123/2','https://novema.jp/book/n123'],['https://www.no-ichigo.jp/book/n123/2','https://www.no-ichigo.jp/book/n123'],['https://estar.jp/novels/123/viewer?page=2','https://estar.jp/novels/123']])assert.equal(novelRoot(input),root);
 for(const input of ['https://estar.jp.evil.test/novels/123','https://user@novema.jp/book/n123','https://kakuyomu.jp/works/123/../../admin','https://novema.jp:444/book/n123','https://127.0.0.1/book/n123'])assert.throws(()=>novelURL(input));
 assert.equal(novelURL('https://estar.jp/novels/123/viewer?page=7&utm_source=test').search,'?page=7');
});
test('Kakuyomu reads ordered collapsed TOC data and detects missing episodes',()=>{
 const state={'Work:123':{title:'試験',publicEpisodeCount:2,tableOfContentsV2:[{__ref:'T:1'}]},'T:1':{episodeUnions:[{__ref:'Episode:9'},{__ref:'Episode:2'}]},'Episode:9':{__typename:'Episode',id:'9',title:'始まり'},'Episode:2':{__typename:'Episode',id:'2',title:'終わり'}};
 const render=()=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{__APOLLO_STATE__:state}}})+'</script>';
 const r=parseNovel(render(),'https://kakuyomu.jp/works/123');assert.deepEqual(r.chapters.map(c=>c.title),['始まり','終わり']);
 delete state['Episode:2'];assert.throws(()=>parseNovel(render(),'https://kakuyomu.jp/works/123'),/目录不完整/);
});
test('Starts sources include every original page, not only chapter starts',()=>{
 for(const host of ['novema.jp','www.no-ichigo.jp']){const root='https://'+host+'/book/n123';const result=parseNovel('<html><body><h2>作品</h2><a href="/member/n1">作者</a><dl>ページ数 4ページ</dl><a href="'+root+'/1">第一章</a><a href="'+root+'/3">第二章</a></body></html>',root);assert.equal(result.chapters.length,4);assert.equal(result.chapters[1].url,root+'/2');assert.equal(result.chapters[2].title,'第二章');const page=parseNovel('<nav>広告</nav><article class="bookText"><aside>1/4</aside><div>本文<ruby>空<rt>そら</rt></ruby></div></article>',root+'/1');assert.match(page.html,/<ruby>/);assert.doesNotMatch(page.html,/広告|1\/4/);}
});
test('Estar uses only visible requested-page content and preserves paragraph breaks',()=>{
 const page=parseNovel('<div class="mainBody"><div class="content">一行目\n二行目<ruby>猫<rt>ねこ</rt></ruby></div></div><div class="bodyFooter">広告</div>','https://estar.jp/novels/123/viewer?page=2');assert.match(page.html,/一行目<br>二行目/);assert.doesNotMatch(page.html,/広告/);assert.throws(()=>parseNovel('<h1>ログイン</h1>','https://estar.jp/novels/123/viewer?page=2'));
});
test('home catalogue retains title and author from image-linked cards',()=>{
 const result=parseSourceCatalogue('<li><figure><a href="/book/n123"><img alt="test"></a></figure><p class="book_name">試験</p><p class="writer_name">作者／著</p></li>','novema');assert.equal(result[0].title,'試験');assert.equal(result[0].author,'作者');
});
test('lazy session requests no body until selected, caches visits and supports cancellation',async()=>{
 const native=fetch;const root='https://novema.jp/book/n123';const seen=[];
 globalThis.fetch=async input=>{const url=new URL('https://reader.test'+input).searchParams.get('url');seen.push(url);return Response.json(url===root?{kind:'index',title:'試験',chapters:[1,2,3].map(n=>({url:root+'/'+n,title:String(n)}))}:{kind:'chapter',html:'<p>本文</p>',url});};
 try{const signal=new AbortController().signal;const session=await openNovel(root,signal,()=>{});assert.equal(seen.length,1);await session.getChapter(0,signal);assert.equal(seen.length,2);await session.getChapter(0,signal);assert.equal(seen.length,2);await session.getChapter(2,signal);assert.equal(seen.length,3);assert.ok(!seen.includes(root+'/2'));const c=new AbortController();c.abort();await assert.rejects(session.getChapter(1,c.signal),{name:'AbortError'});assert.equal(seen.length,3);}finally{globalThis.fetch=native;}
});
test('proxy rejects unsafe redirects and excessive responses without following them',async()=>{
 const native=fetch;let calls=0;const request=new Request('https://reader.test/api/novel?url='+encodeURIComponent('https://novema.jp/book/n123'));
 try{globalThis.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/book/n123'}});};assert.equal((await GET(request)).status,502);assert.equal(calls,1);globalThis.fetch=async()=>new Response('x'.repeat(6_000_001));assert.equal((await GET(request)).status,502);}finally{globalThis.fetch=native;}
});
test('sanitizer keeps ruby and source illustrations while stripping active content',()=>{
 const original=globalThis.DOMParser;globalThis.DOMParser=DOMParser;
 try{const html=sanitizeContent('<script>bad()</script><ruby onclick="bad()">空<rt>そら</rt></ruby><img src="https://img.estar.jp/public/test.jpg" onerror="bad()"><img src="http://127.0.0.1/private"><a href="javascript:bad()">本文</a>','https://estar.jp/novels/123');assert.match(html,/<ruby>空<rt>そら/);assert.match(html,/img.estar.jp/);assert.doesNotMatch(html,/script|onclick|onerror|127.0.0.1|javascript/);}finally{globalThis.DOMParser=original;}
});
