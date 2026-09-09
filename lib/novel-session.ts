import {apiURL} from '@/lib/deployment';
import {novelRoot,novelURL,type Chapter,type NovelPage} from './sources';
export type NovelSession={index:NovelPage;chapters:Chapter[];getChapter:(index:number,signal:AbortSignal)=>Promise<NovelPage>};
export async function fetchNovel(url:string,signal:AbortSignal):Promise<NovelPage>{
 signal.throwIfAborted();const res=await fetch(apiURL('/api/novel?url='+encodeURIComponent(novelURL(url).href)),{signal});
 const data=await res.json() as NovelPage & {error?:string};if(!res.ok)throw Error(data.error||'载入失败，请重试。');return data;
}
export async function openNovel(input:string,signal:AbortSignal,onProgress:(message:string)=>void):Promise<NovelSession>{
 const root=novelRoot(input);onProgress('正在读取作品目录…');const index=await fetchNovel(root,signal);
 const chapters=new Map<string,Chapter>();const visited=new Set<string>([root]);let current=index;
 if(index.kind==='chapter')chapters.set(root,{url:root,title:index.title});
 else while(true){for(const c of current.chapters||[]){const url=novelURL(c.url).href;if(novelRoot(url)!==root)throw Error('章节链接不属于这部作品。');chapters.set(url,{url,title:c.title});}
  if(!current.next)break;const next=novelURL(current.next).href;if(novelRoot(next)!==root||visited.has(next)||visited.size>200)throw Error('章节目录异常，已停止载入。');visited.add(next);onProgress(`正在读取目录 · 已找到 ${chapters.size} 章…`);current=await fetchNovel(next,signal);if(current.kind!=='index')throw Error('章节目录不完整，请重试。');
 }
 const entries=Array.from(chapters.values());if(!entries.length)throw Error('没有找到公开章节。');
 const cache=new Map<number,NovelPage>();if(index.kind==='chapter')cache.set(0,index);
 return {index,chapters:entries,async getChapter(number,signal){
  signal.throwIfAborted();if(!Number.isInteger(number)||number<0||number>=entries.length)throw Error('章节不存在。');
  const saved=cache.get(number);if(saved){cache.delete(number);cache.set(number,saved);return saved;}
  const page=await fetchNovel(entries[number].url,signal);signal.throwIfAborted();if(page.kind!=='chapter'||!page.html?.trim())throw Error('这部分没有可读正文，请打开原文确认。');
  cache.set(number,page);while(cache.size>5)cache.delete(cache.keys().next().value!);return page;
 }};
}
