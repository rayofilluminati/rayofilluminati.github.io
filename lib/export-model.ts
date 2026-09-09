import {parseHTML} from 'linkedom';
export type BookExport={title:string;author:string;url:string;html:string};
export type Run={text:string;ruby?:string};
export type Block={runs:Run[];heading?:number};
export const xml=(text:string)=>text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function exportBlocks(html:string):Block[]{
 const {document}=parseHTML('<div id="export-root">'+html+'</div>');const blocks:Block[]=[];let runs:Run[]=[];let heading:number|undefined;
 const flush=(blank=false)=>{if(runs.some(r=>r.text.trim())||blank)blocks.push({runs,heading});runs=[];};
 const add=(text:string,ruby?:string)=>{text=text.replace(/[\r\n\t]+/g,' ').replace(/ {2,}/g,' ');if(text)runs.push({text,ruby});};
 function walk(node:Node){
  if(node.nodeType===3){add(node.textContent||'');return;}if(node.nodeType!==1)return;
  const el=node as Element;const tag=el.tagName.toLowerCase();if(['script','style','rt','rp'].includes(tag))return;
  if(tag==='ruby'){const copy=el.cloneNode(true) as Element;copy.querySelectorAll('rt,rp').forEach(n=>n.remove());add(copy.textContent||'',Array.from(el.querySelectorAll('rt')).map(n=>n.textContent).join(''));return;}
  if(tag==='img'){const alt=el.getAttribute('alt');if(alt)add(alt);return;}
  if(tag==='br'||tag==='hr'){flush(true);return;}
  const block=['p','div','section','h1','h2','h3','h4','h5','h6'].includes(tag);
  if(block)flush();const previous=heading;if(/^h[1-6]$/.test(tag))heading=Number(tag[1]);
  el.childNodes.forEach(n=>walk(n as unknown as Node));if(block)flush();heading=previous;
 }
 document.getElementById('export-root')!.childNodes.forEach(n=>walk(n as unknown as Node));flush();return blocks;
}
export function blockXHTML(block:Block){const tag=block.heading?'h2':'p';return '<'+tag+'>'+block.runs.map(r=>r.ruby?'<ruby>'+xml(r.text)+'<rt>'+xml(r.ruby)+'</rt></ruby>':xml(r.text)).join('')+(block.runs.length?'':'&#160;')+'</'+tag+'>';}
export const filename=(title:string)=>title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/,'').slice(0,100)||'book';
