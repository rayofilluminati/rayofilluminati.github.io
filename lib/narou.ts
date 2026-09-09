import { parseHTML } from 'linkedom';
export function narouURL(input:string) {
  const u=new URL(input);
  if(u.hostname!=='ncode.syosetu.com'||!['http:','https:'].includes(u.protocol)||u.port||u.username||u.password||!/^\/n\d{4}[a-z]{1,4}(?:\/\d+)?\/?$/i.test(u.pathname))throw Error('请输入 ncode.syosetu.com 的作品或章节链接。');
  u.protocol='https:';u.pathname=u.pathname.toLowerCase().replace(/\/?$/,'/');u.hash='';
  const p=u.searchParams.get('p');u.search='';if(p&&/^\d+$/.test(p)&&Number(p)>0)u.searchParams.set('p',p);
  return u;
}
export function parseNarou(raw:string,input:string){
  const url=narouURL(input);const root=new URL('/'+url.pathname.split('/')[1]+'/',url);
  const {document}=parseHTML(raw);
  const title=document.querySelector('.p-novel__title,.novel_title,.novel_subtitle')?.textContent?.trim()||'';
  const author=(document.querySelector('.p-novel__author,.novel_writername')?.textContent||'').replace(/^\s*作者[：:]\s*/,'').trim();
  const body=document.querySelector('.js-novel-text:not(.p-novel__text--preface):not(.p-novel__text--afterword),#novel_honbun');
  if(body){
    const blocks=Array.from(document.querySelectorAll('.p-novel__body .js-novel-text,#novel_p,#novel_honbun,#novel_a'));
    return {kind:'chapter' as const,title,author,url:url.href,html:(blocks.length?blocks:[body]).map(el=>el.innerHTML).join('<br/>')};
  }
  const chapters=Array.from(document.querySelectorAll('.p-eplist__subtitle,.novel_sublist2 .subtitle a')).flatMap(a=>{
    try{const u=narouURL(new URL(a.getAttribute('href')||'',url).href);if(u.pathname.startsWith(root.pathname)&&/^\/n\d{4}[a-z]{1,4}\/\d+\/$/.test(u.pathname))return [{url:u.href,title:a.textContent?.trim()||''}];}catch{}return [];
  });
  if(!chapters.length)throw Error('无法读取公开正文或章节目录。作品可能已删除、需要登录，或原站暂时限制访问。');
  let next:string|null=null;
  const href=document.querySelector('a.c-pager__item--next')?.getAttribute('href');
  if(href){const u=narouURL(new URL(href,url).href);if(u.pathname!==root.pathname||Number(u.searchParams.get('p'))<=Number(url.searchParams.get('p')||1))throw Error('章节目录的下一页链接无效。');next=u.href;}
  return {kind:'index' as const,title,author,url:root.href,chapters,next};
}
