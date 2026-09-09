import {apiURL} from '@/lib/deployment';
type Entry={url:string;title:string};
type Result={kind:'index'|'chapter';url:string;title:string;author:string;html?:string;chapters?:Entry[];next?:string|null;error?:string};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function loadNarou(input:string,signal:AbortSignal,onProgress:(text:string)=>void){
  const parsed=new URL(input);const match=parsed.pathname.match(/^\/(n\d{4}[a-z]{1,4})(?:\/\d+)?\/?$/i);
  if(parsed.hostname!=='ncode.syosetu.com'||!match||parsed.port||parsed.username||parsed.password||!['http:','https:'].includes(parsed.protocol))throw Error('请输入 ncode.syosetu.com 的作品或章节链接。');
  const root='https://ncode.syosetu.com/'+match[1].toLowerCase()+'/';
  async function get(url:string):Promise<Result>{
    for(let attempt=0;;attempt++){
      signal.throwIfAborted();
      try{const res=await fetch(apiURL('/api/narou?url='+encodeURIComponent(url)),{signal});const data=await res.json() as Result;
        if(!res.ok){if(res.status===429||res.status===400)throw Object.assign(Error(data.error||'载入失败'),{noRetry:true});throw Error(data.error||'载入失败');}
        return data;
      }catch(e){if(signal.aborted||attempt>=1||(e as {noRetry?:boolean}).noRetry)throw e;await new Promise(resolve=>setTimeout(resolve,800));}
    }
  }
  onProgress('正在读取小説家になろう作品目录…');
  const first=await get(root);let html='';let count=1;
  if(first.kind==='chapter')html=first.html||'';
  else{
    const entries=new Map<string,Entry>();const visited=new Set<string>();let current:Result=first;
    while(true){for(const entry of current.chapters||[])entries.set(entry.url,entry);if(!current.next)break;
      if(visited.has(current.next))throw Error('章节目录出现循环，已停止加载。');visited.add(current.next);
      onProgress(`正在读取章节目录 · 已找到 ${entries.size} 章…`);current=await get(current.next);
      if(current.kind!=='index')throw Error('章节目录结构发生变化，请重试。');
    }
    const chapters=Array.from(entries.values()).sort((a,b)=>Number(a.url.split('/').filter(Boolean).at(-1))-Number(b.url.split('/').filter(Boolean).at(-1)));
    if(!chapters.length)throw Error('没有找到公开章节。');
    const parts:string[]=[];count=chapters.length;let bytes=0;
    // Read in order with bounded requests; do not fan out hundreds of requests.
    for(let i=0;i<chapters.length;i++){
      onProgress(`正在载入全文 · ${i+1} / ${count} 章 · ${chapters[i].title}`);
      let chapter:Result;try{chapter=await get(chapters[i].url);}catch(e){if(signal.aborted)throw e;throw Error(`第 ${i+1} 章载入失败：${e instanceof Error?e.message:'请重试'}。尚未替换当前书籍。`);}
      if(chapter.kind!=='chapter'||!chapter.html)throw Error(`第 ${i+1} 章没有可读正文，未载入不完整作品。`);
      bytes+=chapter.html.length;if(bytes>40_000_000)throw Error('此作品超过当前阅读器的全文容量（约 4000 万字符）。');
      parts.push('<h2>'+escape(chapter.title||chapters[i].title)+'</h2>'+chapter.html);
      if(i<chapters.length-1)await new Promise(resolve=>setTimeout(resolve,150));
    }
    html=parts.join('');
  }
  signal.throwIfAborted();if(!html.trim())throw Error('作品正文为空。');
  return {raw:'<h1 class="title">'+escape(first.title)+'</h1><div class="author">'+escape(first.author)+'</div><div class="main_text">'+html+'</div>',url:root,chapters:count};
}
