import {parseHTML} from 'linkedom';
import {novelURL,novelRoot,sourceOf,type NovelPage,type Chapter,type WebSource} from './sources';
import {parseNarou} from './narou';
import type {CatalogueBook} from './catalogue';
type RecordValue = Record<string,any>;
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
function apollo(document:Document):Record<string,RecordValue>{try{return JSON.parse(document.querySelector('#__NEXT_DATA__')?.textContent||'{}').props?.pageProps?.__APOLLO_STATE__||{};}catch{return {};}}
// Read only public page metadata. No script evaluation, hidden APIs or session tokens.
function nuxtRecords(document:Document):RecordValue[]{
 try{const pool=JSON.parse(document.querySelector('#__NUXT_DATA__')?.textContent||'[]');
 if(!Array.isArray(pool)||pool.length>200000)return [];
 const deref=(index:number)=>{let value=pool[index];let depth=0;while(Array.isArray(value)&&typeof value[0]==='string'&&value.length===2&&depth++<5)value=pool[value[1]];return value;};
 return pool.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)).map(v=>{const record=Object.fromEntries(Object.entries(v).map(([k,n])=>[k,typeof n==='number'?deref(n):undefined]));if(record.user?.nickname!==undefined)record.authorName=deref(record.user.nickname);return record;});
 }catch{return [];}
}
function checkedChapters(chapters:Chapter[],root:string){return Array.from(new Map(chapters.flatMap(c=>{try{const u=novelURL(c.url);return novelRoot(u.href)===root?[[u.href,{url:u.href,title:clean(c.title)}] as const]:[];}catch{return [];}})).values());}
export function parseNovel(raw:string,input:string):NovelPage{
 const u=novelURL(input),root=novelRoot(input),source=sourceOf(input) as WebSource;
 if(source==='narou')return {...parseNarou(raw,u.href),root,source,unit:'章'};
 const {document}=parseHTML(raw);const d=document as unknown as Document;
 const text=(selector:string)=>clean(d.querySelector(selector)?.textContent||'');
 let title='',author='',html:string|undefined,chapters:Chapter[]=[],unit:'章'|'页'='章';
 if(source==='kakuyomu'){
  const state=apollo(d),work=state['Work:'+u.pathname.split('/')[2]];
  title=work?.title||text('#contentMain-header-workTitle')||text('h1');author=work?.alternateAuthorName||state[work?.author?.__ref]?.activityName||text('#contentMain-header-author')||text('.partialGiftWidgetActivityName');
  if(u.pathname.includes('/episodes/')){html=d.querySelector('.widget-episodeBody')?.innerHTML;title=text('.widget-episodeTitle')||title;}
  else {
   for(const ref of work?.tableOfContentsV2||[]){const section=state[ref.__ref];for(const ref of section?.episodeUnions||[]){const ep=state[ref.__ref];if(ep?.__typename==='Episode'&&/^\d+$/.test(ep.id))chapters.push({url:root+'/episodes/'+ep.id,title:ep.title});}}
   if(!chapters.length)chapters=Array.from(d.querySelectorAll('a[href*="/episodes/"]')).map(a=>({url:new URL(a.getAttribute('href')!,root).href,title:a.textContent||''}));
   chapters=checkedChapters(chapters,root);
   if(work?.publicEpisodeCount&&chapters.length!==work.publicEpisodeCount)throw Error('原站章节目录不完整，暂时无法载入这部作品。');
  }
 }else if(source==='novema'||source==='noichigo'){
  unit='页';title=text('.bookTitle h2')||text('h2')||text('.title');author=text('a[href*="/member/n"]');
  const isPage=/\/n\d+\/\d+$/.test(u.pathname);
  if(isPage){html=d.querySelector('article.bookText > div')?.innerHTML;title=text('.chapterName')||'第 '+u.pathname.split('/').at(-1)+' 页';}
  else{
   const total=Number(d.body.textContent?.match(/ページ数\s*([\d,]+)ページ/)?.[1]?.replace(/,/g,''));
   if(!total||total>20000)throw Error('没有找到公开正文页数。作品可能尚未公开或需要登录。');
   const headings=new Map<number,string>();for(const a of Array.from(d.querySelectorAll('a[href]'))){try{const link=novelURL(new URL(a.getAttribute('href')!,root).href);if(novelRoot(link.href)===root&&/\/n\d+\/\d+$/.test(link.pathname)){const label=clean(a.textContent||'');if(label&&label!=='読む')headings.set(Number(link.pathname.split('/').at(-1)),label);}}catch{}}
   chapters=Array.from({length:total},(_,i)=>({url:root+'/'+(i+1),title:headings.get(i+1)||'第 '+(i+1)+' 页'}));
  }
 }else{
  unit='页';const records=nuxtRecords(d);const id=u.pathname.split('/')[2];const work=records.find(r=>r.workId===id&&r.title&&r.publishedPageCount>0);
  title=work?.title||text('.novelData h1')||text('.viewerHeader h1');
  // Nuxt serializes the user reference; select its nickname from the same pool.
  author=work?.authorName||'';
  author=author||text('.novelData a[href*="/users/"]');
  if(u.pathname.endsWith('/viewer')){
   const content=d.querySelector('.mainBody .content');
   if(content){
    // Estar's renderer uses literal newlines for paragraphs. Make them explicit for export and pagination.
    const walk=(element:Node)=>{for(const node of Array.from(element.childNodes)){if(node.nodeType===3&&node.textContent?.includes('\n')){const fragment=d.createDocumentFragment();node.textContent.split('\n').forEach((line,i)=>{if(i)fragment.appendChild(d.createElement('br'));fragment.appendChild(d.createTextNode(line));});element.replaceChild(fragment,node);}else walk(node);}};walk(content);
   }
   html=content?.innerHTML;
   // The public rendered viewer is authoritative, never cached bodies of other pages.
   title='第 '+u.searchParams.get('page')+' 页';
  }else{
   const count=Number(work?.publishedPageCount)||Number(d.body.textContent?.match(/(?:全\d+エピソード)?([\d,]+)ページ/)?.[1]?.replace(/,/g,''));
   if(!count||count>20000)throw Error('没有找到公开正文目录。作品可能需要登录或尚未公开。');
   const headings=new Map<number,string>();for(const r of records)if(r.novelPageId&&Number.isInteger(r.pageNo)&&r.title)headings.set(r.pageNo,r.title);
   chapters=Array.from({length:count},(_,i)=>({url:root+'/viewer?page='+(i+1),title:headings.get(i+1)||'第 '+(i+1)+' 页'}));
  }
 }
 if(html!==undefined){if(!html.trim())throw Error('这一页没有公开正文。');return {kind:'chapter',url:u.href,root,source,title,author,html,unit};}
 if(u.href!==root||!chapters.length)throw Error('无法读取公开正文。作品可能需要登录、付费，或原站暂时限制访问。');
 return {kind:'index',url:root,root,source,title:title||'未命名作品',author,chapters:checkedChapters(chapters,root),unit};
}
export function parseSourceCatalogue(raw:string,source:WebSource):CatalogueBook[]{
 const {document}=parseHTML(raw);const d=document as unknown as Document;const result:CatalogueBook[]=[];
 if(source==='kakuyomu'){
  const state=apollo(d);for(const work of Object.values(state))if(work.__typename==='Work'&&/^\d+$/.test(work.id)&&work.title&&!work.kakuyomuNextWork)result.push({title:work.title,author:work.alternateAuthorName||state[work.author?.__ref]?.activityName||'',description:(work.catchphrase||'').slice(0,140),url:'https://kakuyomu.jp/works/'+work.id});
 }else if(source==='estar'){
  const records=nuxtRecords(d);for(const work of records)if(/^\d+$/.test(work.workId)&&work.title){const author=work.authorName||'';result.push({title:work.title,author:author||'',description:clean(work.catchphrase||work.description||'').slice(0,140),url:'https://estar.jp/novels/'+work.workId});}
 }else{
  const host=source==='novema'?'https://novema.jp':'https://www.no-ichigo.jp';
  for(const a of Array.from(d.querySelectorAll('a[href]'))){try{const url=novelURL(new URL(a.getAttribute('href')!,host).href);if(url.origin!==host||url.href!==novelRoot(url.href))continue;
   const card=a.closest('li')||a.parentElement!;const title=clean(a.querySelector('.title')?.textContent||a.textContent||'')||clean(card.querySelector('.book_name,.title')?.textContent||'');
   if(!title||title.length>160)continue;const author=clean(card.querySelector('.writer_name,.author')?.textContent||'').replace(/[/／]著$/,'');
   result.push({url:url.href,title,author,description:clean(card.querySelector('.genre_name')?.textContent||'')});
  }catch{}}
 }
 return Array.from(new Map(result.map(b=>[b.url,b])).values());
}
