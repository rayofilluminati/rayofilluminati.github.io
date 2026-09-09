import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('work', {recursive:true});
await build({entryPoints:['worker/index.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/test-worker.mjs'});
const {default:worker}=await import('../work/test-worker.mjs');
const origin='https://reader.github.io';
const env={ALLOWED_ORIGINS:origin};
test('API error responses are readable by the allowed Pages origin',async()=>{
 for(const path of ['book','novel','narou','catalogue']){
  const response=await worker.fetch(new Request('https://api.example/api/'+path,{headers:{Origin:origin}}),env);
  assert.equal(response.status,400);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  assert.ok((await response.json()).error);
 }
});
test('CORS rejects other origins and accepts preflight',async()=>{
 const denied=await worker.fetch(new Request('https://api.example/api/book',{headers:{Origin:'https://other.example'}}),env);
 assert.equal(denied.status,403);
 assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
 const preflight=await worker.fetch(new Request('https://api.example/api/book',{method:'OPTIONS',headers:{Origin:origin}}),env);
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Methods'),'GET, OPTIONS');
});
test('Worker handles unsupported paths and methods',async()=>{
 assert.equal((await worker.fetch(new Request('https://api.example/missing'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://api.example/api/book',{method:'POST'}),env)).status,405);
});
test('Pages links and assets retain repository base and API uses separate origin',async()=>{
 await build({entryPoints:['lib/deployment.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/test-pages-paths.mjs',define:{__PAGES_BASE__:JSON.stringify('/AozoraAnalyzer/'),__API_ORIGIN__:JSON.stringify('https://api.example')}});
 const paths=await import('../work/test-pages-paths.mjs');
 assert.equal(paths.readerPath(),'/AozoraAnalyzer/read/');
 assert.equal(paths.sitePath('/'),'/AozoraAnalyzer/');
 assert.equal(paths.sitePath('/fonts/NotoSerifJP.ttf'),'/AozoraAnalyzer/fonts/NotoSerifJP.ttf');
 assert.equal(paths.apiURL('/api/book?url=x'),'https://api.example/api/book?url=x');
});
