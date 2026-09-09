'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Pagination } from '@/components/ui/pagination';
import { pageEnd } from '@/lib/page-boundary';
type Point = {node: Node; offset: number};
type Unit = {start: Point; end: Point};
type Page = {html: string; start: number};
export default function PagedReader({html, size, ruby, bookKey, full, onNextSection}:{html:string;size:number;ruby:boolean;bookKey:string;full:boolean;onNextSection?:()=>void}) {
  const viewport=useRef<HTMLDivElement>(null);
  const measure=useRef<HTMLDivElement>(null);
  const [pages,setPages]=useState<Page[]>([]);
  const [page,setPage]=useState(0);
  const [busy,setBusy]=useState(true);
  const [dimensions,setDimensions]=useState({width:0,height:0});
  const position=useRef(0);
  const restored=useRef(false);
  const touch=useRef<{x:number;y:number}|null>(null);
  const wheelTime=useRef(0);
  const [jump,setJump]=useState('1');
  useEffect(()=>{
    position.current=0;restored.current=false;
    try{const saved=JSON.parse(localStorage.getItem('aozora-page:'+bookKey)||'null');if(saved&&Number.isFinite(saved.anchor)) {position.current=Math.max(0,saved.anchor);restored.current=true;}}catch{}
  },[html,bookKey]);
  useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(()=>setDimensions({width:el.clientWidth,height:el.clientHeight}));observer.observe(el);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    if(!dimensions.width||!dimensions.height)return;
    let cancelled=false;setBusy(true);
    const source=document.createElement('div');source.innerHTML=html;
    const units:Unit[]=[];
    const segmenter=new Intl.Segmenter('ja',{granularity:'grapheme'});
    function walk(node:Node){
      if(node.nodeType===Node.TEXT_NODE){const value=node.textContent||'';for(const item of segmenter.segment(value)){units.push({start:{node,offset:item.index},end:{node,offset:item.index+item.segment.length}});}return;}
      if(node instanceof Element&&['RUBY','IMG','BR','HR'].includes(node.tagName)) {const parent=node.parentNode!;const i=Array.prototype.indexOf.call(parent.childNodes,node);units.push({start:{node:parent,offset:i},end:{node:parent,offset:i+1}});return;}
      node.childNodes.forEach(walk);
    }
    async function paginate(){
      await document.fonts.ready;if(cancelled)return;
      walk(source);
      const box=measure.current!;
      // Wait for illustrations to settle before measuring page boundaries.
      await Promise.all(Array.from(source.querySelectorAll('img')).map(img=>new Promise<void>(resolve=>{const probe=new Image();const timer=setTimeout(resolve,1500);probe.onload=probe.onerror=()=>{clearTimeout(timer);resolve()};probe.src=img.src;})));
      if(cancelled)return;
      const result:Page[]=[];const range=document.createRange();
      let start=0;let lastYield=performance.now();
      function render(end:number){range.setStart(units[start].start.node,units[start].start.offset);range.setEnd(units[end-1].end.node,units[end-1].end.offset);box.replaceChildren(range.cloneContents());}
      while(start<units.length){
        if(cancelled)return;
        const end=pageEnd(start,units.length,(end)=>{render(end);return box.scrollWidth<=box.clientWidth+1&&box.scrollHeight<=box.clientHeight+1;});
        render(end);result.push({html:box.innerHTML,start});start=end;
        if(performance.now()-lastYield>18){await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
      }
      if(cancelled)return;
      box.replaceChildren();
      if(!restored.current){try{const legacy=Number(localStorage.getItem('aozora:'+bookKey)||0);if(Number.isFinite(legacy))position.current=Math.round(Math.max(0,Math.min(1,legacy))*Math.max(0,units.length-1));}catch{}restored.current=true;}
      const target=Math.max(0,result.findLastIndex(p=>p.start<=position.current));
      setPages(result.length?result:[{html:'',start:0}]);setPage(target);setJump(String(target+1));setBusy(false);
    }
    void paginate();return()=>{cancelled=true};
  },[html,size,ruby,dimensions,bookKey]);
  function go(n:number){if(busy)return;if(n>=pages.length&&onNextSection){onNextSection();return;}const next=Math.max(0,Math.min(pages.length-1,n));setPage(next);setJump(String(next+1));position.current=pages[next]?.start||0;if(full)try{localStorage.setItem('aozora-page:'+bookKey,JSON.stringify({anchor:position.current}));}catch{}}
  const total=pages.length||1;
  return <>
    <div className="page-stage">
      <div ref={viewport} tabIndex={0} role="region" aria-label={`日文竖排正文，第 ${page+1} 页，共 ${total} 页。左方向键下一页，右方向键上一页。`} aria-busy={busy} className={'vertical-reader paged-viewport '+(!ruby?'hide-ruby':'')} style={{fontSize:size}}
       onKeyDown={e=>{if(['ArrowLeft','PageDown','ArrowRight','PageUp','Home','End'].includes(e.key)){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?total-1:page+(['ArrowLeft','PageDown'].includes(e.key)?1:-1));}}}
       onWheel={e=>{const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?-e.deltaX:e.deltaY;if(Math.abs(delta)>15&&Date.now()-wheelTime.current>450){wheelTime.current=Date.now();go(page+(delta>0?1:-1));}}}
       onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}}
       onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x;const dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)go(page+(dx>0?1:-1));touch.current=null;}}>
        <div className="prose page-content" lang="ja" style={{visibility:busy?'hidden':'visible'}} dangerouslySetInnerHTML={{__html:pages[page]?.html||''}}/>
      </div>
      <div aria-hidden="true" className={'page-measure vertical-reader '+(!ruby?'hide-ruby':'')} style={{width:dimensions.width,height:dimensions.height,fontSize:size}}><div ref={measure} className="prose page-content" lang="ja"/></div>
      {busy&&<div className="pagination-status" role="status">正在分页…</div>}
    </div>
    <Pagination className="reader-footer" aria-label="阅读分页">
      <button disabled={busy||(page>=total-1&&!onNextSection)} onClick={()=>go(page+1)}><ChevronLeft size={18}/> {page>=total-1&&onNextSection?'下一段':'下一页'}</button>
      <div className="progress-box"><div><span aria-live="polite">{busy?'正在排版':`第 ${page+1} / ${total} 页`}</span><form className="page-jump" onSubmit={e=>{e.preventDefault();const n=Number(jump);if(Number.isInteger(n)&&n>=1&&n<=total)go(n-1);}}><input aria-label="跳转页码" type="number" min={1} max={total} value={jump} onChange={e=>setJump(e.target.value)} disabled={busy}/><button disabled={busy}>跳转</button></form></div><Slider aria-label="阅读页码" value={[page+1]} min={1} max={Math.max(2,total)} step={1} disabled={busy||total<2} onValueChange={v=>go((Array.isArray(v)?v[0]:v)-1)}/></div>
      <button disabled={busy||page===0} onClick={()=>go(page-1)}>上一页 <ChevronRight size={18}/></button>
    </Pagination>
  </>;
}
