'use client';
import {useState} from 'react';
import type {Chapter} from '@/lib/sources';
export default function ChapterNavigation({chapters,current,unit,loading,onChange}:{chapters:Chapter[];current:number;unit:'章'|'页';loading:boolean;onChange:(n:number)=>void}){
 const [group,setGroup]=useState(0);const [jump,setJump]=useState('');
 return <div className="chapter-navigation"><div className="chapter-actions"><button disabled={loading||current===0} onClick={()=>onChange(current-1)}>上一段</button><strong lang="ja">{chapters[current].title}</strong><button disabled={loading||current===chapters.length-1} onClick={()=>onChange(current+1)}>下一段</button></div>
 <details onToggle={e=>{if(e.currentTarget.open)setGroup(Math.floor(current/100));}}><summary>作品目录 · {chapters.length} {unit==='页'?'原站页':'章'}</summary><div className="chapter-directory"><form onSubmit={e=>{e.preventDefault();const n=Number(jump);if(Number.isInteger(n)&&n>0&&n<=chapters.length){onChange(n-1);setGroup(Math.floor((n-1)/100));}}}><label>跳到第 <input aria-label="章节或原站页码" type="number" min="1" max={chapters.length} value={jump} onChange={e=>setJump(e.target.value)}/> {unit}</label><button disabled={loading}>打开</button></form>
 <ol start={group*100+1}>{chapters.slice(group*100,(group+1)*100).map((c,i)=><li key={c.url}><button lang="ja" disabled={loading} aria-current={current===group*100+i?'true':undefined} onClick={()=>onChange(group*100+i)}>{c.title}</button></li>)}</ol>
 {chapters.length>100&&<div className="directory-pagination"><button disabled={!group} onClick={()=>setGroup(g=>g-1)}>上一组目录</button><span>{group+1} / {Math.ceil(chapters.length/100)}</span><button disabled={(group+1)*100>=chapters.length} onClick={()=>setGroup(g=>g+1)}>下一组目录</button></div>}</div></details></div>;
}
