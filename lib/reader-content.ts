export function sanitizeContent(html:string,url:string):string{
 const doc=new DOMParser().parseFromString('<div id="reader-content">'+html+'</div>','text/html');const content=doc.querySelector('#reader-content')!;
 const allowed=new Set(['P','BR','RUBY','RB','RT','RP','SPAN','DIV','H1','H2','H3','H4','H5','H6','EM','STRONG','B','I','SUP','SUB','IMG','HR']);
 content.querySelectorAll('script,style,iframe,object,embed,form,link,meta,svg,math,template').forEach(el=>el.remove());
 for(const el of Array.from(content.querySelectorAll('*'))){if(!allowed.has(el.tagName)){el.replaceWith(...Array.from(el.childNodes));continue;}const src=el.getAttribute('src');const alt=el.getAttribute('alt');for(const attr of Array.from(el.attributes))el.removeAttribute(attr.name);
  if(el.tagName==='IMG'){try{const img=new URL(src||'',url);if(img.protocol==='https:'&&!img.username&&!img.password&&!img.port&&['www.aozora.gr.jp','mitemin.net','img.estar.jp','novema.jp','www.no-ichigo.jp','cdn-static.kakuyomu.jp'].some(host=>img.hostname===host||(host==='mitemin.net'&&img.hostname.endsWith('.mitemin.net')))){el.setAttribute('src',img.href);el.setAttribute('alt',alt||'插图');el.setAttribute('loading','lazy');}else el.remove();}catch{el.remove();}}
 }
 return content.innerHTML;
}
export const escapeHTML=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
