import estarBackup from '@/lib/catalogue/estar.json';
import noichigoBackup from '@/lib/catalogue/noichigo.json';
import novemaBackup from '@/lib/catalogue/novema.json';
import kakuyomuBackup from '@/lib/catalogue/kakuyomu.json';
import {sources,type Source,type WebSource} from '@/lib/sources';
import {parseSourceCatalogue} from '@/lib/novel-parser';
import {parseHTML} from 'linkedom';
import {sampleBooks,readerURL,type CatalogueBook} from '@/lib/catalogue';
import aozoraBackup from '@/lib/catalogue/aozora.json';
import narouBackup from '@/lib/catalogue/narou.json';
async function get(url:string){const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36','Accept':'application/json,text/html','Accept-Language':'ja,en;q=0.8'}});if(!response.ok)throw Error('目录暂时不可用');return response;}
async function aozora(){
 const kana=['a','i','u','e','o','ka','ki','ku','ke','ko','sa','si','su','se','so','ta','ti','tu','te','to','na','ni','nu','ne','no','ha','hi','hu','he','ho','ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa'];
 const key=kana[Math.floor(Math.random()*kana.length)];const path='/index_pages/sakuhin_'+key+'1.html';let raw='';
 for(const host of ['https://www.aozora.gr.jp','https://aozora.gr.jp']){try{const bytes=await (await get(host+path)).arrayBuffer();const head=new TextDecoder().decode(bytes.slice(0,2000));raw=new TextDecoder(/shift_jis|sjis/i.test(head)?'shift_jis':'utf-8').decode(bytes);break;}catch{}}
 if(!raw)throw Error('目录暂时不可用');
 const {document}=parseHTML(raw);
 const books:CatalogueBook[]=Array.from(document.querySelectorAll('a[href*="/card"]')).flatMap(a=>{try{const url=readerURL(new URL(a.getAttribute('href')||'','https://www.aozora.gr.jp'+path).href);const cells=a.closest('tr')?.querySelectorAll('td');return [{title:a.textContent?.trim()||'',author:cells?.[3]?.textContent?.trim()||'',description:cells?.[2]?.textContent?.trim()||'',url}];}catch{return [];}}).filter(b=>b.title);
 if(books.length<5)throw Error('目录数量不足');return books;
}
async function narou(){
 const orders=['new','hyoka','weeklypoint','generalfirstup'];const order=orders[Math.floor(Math.random()*orders.length)];const start=1+Math.floor(Math.random()*1400);
 const data=await (await get('https://api.syosetu.com/novelapi/api/?out=json&lim=80&of=t-n-w-s&order='+order+'&st='+start)).json() as {title?:string;writer?:string;ncode?:string;story?:string}[];
 const books=data.filter(b=>b.ncode&&/^n\d{4}[a-z]{1,4}$/i.test(b.ncode)&&b.title).map(b=>({title:b.title!,author:b.writer||'',url:'https://ncode.syosetu.com/'+b.ncode!.toLowerCase()+'/',description:(b.story||'').slice(0,140)}));
 if(books.length<5)throw Error('目录数量不足');return books;
}
const backups={aozora:aozoraBackup,narou:narouBackup,kakuyomu:kakuyomuBackup,novema:novemaBackup,noichigo:noichigoBackup,estar:estarBackup};
export async function GET(request:Request){const source=new URL(request.url).searchParams.get('source') as Source;if(!Object.hasOwn(sources,source))return Response.json({error:'未知书源'},{status:400});let books:CatalogueBook[];let fallback=false;try{if(source==='aozora')books=await aozora();else if(source==='narou')books=await narou();else books=parseSourceCatalogue(await(await get(source==='estar'?'https://estar.jp/novels/ranking?ranking_type=all&ranking_axis_type=general_popular':sources[source].home+'/')).text(),source as WebSource);if(books.length<5)throw Error('目录数量不足');}catch{books=backups[source];fallback=true;}return Response.json({books:sampleBooks(books),fallback},{headers:{'Cache-Control':'no-store'}});}
