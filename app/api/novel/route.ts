import {novelURL,novelRoot} from '@/lib/sources';
import {parseNovel} from '@/lib/novel-parser';
export async function GET(request:Request){
 let url:URL;try{url=novelURL(new URL(request.url).searchParams.get('url')||'');}catch{return Response.json({error:'请输入支持的作品或章节链接。'},{status:400});}
 try{
  const signal=AbortSignal.timeout(20000);let response:Response|undefined;let current=url;
  for(let i=0;i<4;i++){
   response=await fetch(current,{redirect:'manual',signal,headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Language':'ja,en;q=0.8'}});
   if(![301,302,303,307,308].includes(response.status))break;
   const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('原站跳转异常。');
   const next=novelURL(new URL(location,current).href);if(novelRoot(next.href)!==novelRoot(url.href)||next.href!==url.href)throw Error('原站要求跳转，请确认这部分正文公开可读。');current=next;
  }
  if(!response?.ok){console.error('novel_upstream',current.hostname,response?.status);return Response.json({error:response?.status===429?'原站请求频繁，请稍后再试。':response?.status===403?'原站暂时不接受本站的读取请求。你可以前往原站阅读，或稍后重试。':'原站暂时无法读取，请稍后重试或打开原文。'},{status:response?.status===429?429:502,headers:{'Cache-Control':'no-store'}});}
  const reader=response.body?.getReader();if(!reader)throw Error('原站返回空页面。');const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>6_000_000){await reader.cancel();throw Error('原站页面过大，暂时无法读取。');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const data=parseNovel(new TextDecoder().decode(bytes),current.href);
  return Response.json(data,{headers:{'Cache-Control':'public, max-age=300'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'载入失败，请重试。'},{status:502});}
}
