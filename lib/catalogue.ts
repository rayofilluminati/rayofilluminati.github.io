import {readerPath} from './deployment';
import {novelRoot} from './sources';
export type CatalogueBook={title:string;author:string;url:string;description:string};
export function sampleBooks<T extends {url:string}>(items:T[],count=5,random= Math.random):T[]{
 const pool=Array.from(new Map(items.map(item=>[item.url,item])).values());
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,count);
}
export function readerURL(input:string){
 let u:URL;try{u=new URL(input.trim());}catch{throw Error('请输入完整的作品链接。');}
 if(!['https:','http:'].includes(u.protocol)||u.port||u.username||u.password)throw Error('请使用公开作品的 HTTP 或 HTTPS 链接。');
 if(['aozora.gr.jp','www.aozora.gr.jp'].includes(u.hostname)&&/^\/cards\/\d+\/(?:card\d+\.html|files\/[\w.-]+\.html)$/.test(u.pathname)){u.hostname='www.aozora.gr.jp';}
 else if(u.hostname==='ncode.syosetu.com'&&/^\/n\d{4}[a-z]{1,4}(?:\/\d+)?\/?$/i.test(u.pathname)){u.pathname='/'+u.pathname.split('/')[1].toLowerCase()+'/';}
 else {try{return novelRoot(u.href);}catch{throw Error('支持青空文库、小説家になろう、カクヨム、ノベマ！、野いちご和エブリスタ的作品链接。');}}
 u.protocol='https:';u.search='';u.hash='';return u.href;
}
export const readingLink=(url:string)=>readerPath()+'?url='+encodeURIComponent(readerURL(url));
