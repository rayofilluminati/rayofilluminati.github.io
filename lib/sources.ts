export const sources = {
  aozora: {name:'青空文库',home:'https://www.aozora.gr.jp',label:'日本文学 · 随机选读'},
  narou: {name:'小説家になろう',home:'https://ncode.syosetu.com',label:'网络小说 · 随机选读'},
  kakuyomu: {name:'カクヨム',home:'https://kakuyomu.jp',label:'原创故事 · 随机选读'},
  novema: {name:'ノベマ！',home:'https://novema.jp',label:'青春与奇幻 · 随机选读'},
  noichigo: {name:'野いちご',home:'https://www.no-ichigo.jp',label:'校园与恋爱 · 随机选读'},
  estar: {name:'エブリスタ',home:'https://estar.jp',label:'多彩故事 · 随机选读'},
} as const;
export type Source = keyof typeof sources;
export type WebSource = Exclude<Source,'aozora'>;
export type Chapter = {url:string;title:string};
export type NovelPage = {kind:'index'|'chapter';url:string;root:string;source:WebSource;title:string;author:string;html?:string;chapters?:Chapter[];next?:string|null;unit?:'章'|'页'};
export function sourceOf(input:string):Source {
 const host=new URL(input).hostname;
 const source=(Object.keys(sources) as Source[]).find(k=>new URL(sources[k].home).hostname===host);
 if(!source)throw Error('不支持这个书源。');return source;
}
export function novelURL(input:string):URL {
 const u=new URL(input);
 if(!['http:','https:'].includes(u.protocol)||u.port||u.username||u.password)throw Error('请使用公开作品链接。');
 const rules:Record<string,RegExp>={
  'ncode.syosetu.com':/^\/n\d{4}[a-z]{1,4}(?:\/[1-9]\d*)?\/?$/i,
  'kakuyomu.jp':/^\/works\/\d+(?:\/episodes\/\d+)?\/?$/,
  'novema.jp':/^\/book\/n\d+(?:\/[1-9]\d*)?\/?$/,
  'www.no-ichigo.jp':/^\/book\/n\d+(?:\/[1-9]\d*)?\/?$/,
  'estar.jp':/^\/novels\/\d+(?:\/viewer)?\/?$/,
 };
 if(!rules[u.hostname]?.test(u.pathname))throw Error('请输入支持的小说作品或章节链接。');
 const page=u.searchParams.get(u.hostname==='ncode.syosetu.com'?'p':'page');
 u.protocol='https:';u.hash='';u.search='';u.pathname=u.pathname.replace(/\/$/,'');
 if(u.hostname==='ncode.syosetu.com'){u.pathname=u.pathname.toLowerCase()+'/';if(page&&/^[1-9]\d*$/.test(page))u.searchParams.set('p',page);}
 if(u.hostname==='estar.jp'&&u.pathname.endsWith('/viewer'))u.searchParams.set('page',page&&/^[1-9]\d*$/.test(page)?page:'1');
 return u;
}
export function novelRoot(input:string):string {
 const u=novelURL(input);const parts=u.pathname.split('/').filter(Boolean);
 u.pathname=u.hostname==='ncode.syosetu.com'?'/'+parts[0]+'/':'/'+parts.slice(0,2).join('/');u.search='';return u.href;
}
