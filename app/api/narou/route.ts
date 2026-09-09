import { narouURL, parseNarou } from '@/lib/narou';
export async function GET(request:Request){
  let url:URL;
  try{url=narouURL(new URL(request.url).searchParams.get('url')||'');}catch{return Response.json({error:'请输入 ncode.syosetu.com 的作品或章节链接。'},{status:400});}
  try{
    let current=url;let response:Response|undefined;const signal=AbortSignal.timeout(20000);
    for(let i=0;i<4;i++){
      response=await fetch(current,{redirect:'manual',signal,headers:{'User-Agent':'Mozilla/5.0 AozoraReader/1.0','Accept':'text/html,application/xhtml+xml'}});
      if(![301,302,303,307,308].includes(response.status))break;
      const location=response.headers.get('location');if(!location)throw Error('原站跳转异常。');
      const next=narouURL(new URL(location,current).href);if(next.pathname!==url.pathname||next.search!==url.search)throw Error('原站要求跳转到其他页面，请确认作品公开可读。');
      await response.body?.cancel();current=next;
    }
    if(!response?.ok){const status=response?.status===429?429:502;return Response.json({error:status===429?'原站请求频繁，请稍后重试。':'暂时无法访问小説家になろう，请确认作品公开可读并稍后重试。'},{status,headers:{'Cache-Control':'no-store'}});}
    if(Number(response.headers.get('content-length'))>4_000_000)throw Error('此章节内容过大，无法载入。');
    const bytes=await response.arrayBuffer();if(bytes.byteLength>4_000_000)throw Error('此章节内容过大，无法载入。');
    const data=parseNarou(new TextDecoder('utf-8').decode(bytes),current.href);
    return Response.json(data,{headers:{'Cache-Control':'public, max-age=300'}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'章节载入失败，请重试。'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
