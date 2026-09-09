'use client';
import {apiURL,sitePath} from '@/lib/deployment';

import { useEffect, useRef, useState } from 'react';

import {useSearchParams} from 'next/navigation';
import {readerURL} from '@/lib/catalogue';
import {openNovel,type NovelSession} from '@/lib/novel-session';
import {sourceOf,sources} from '@/lib/sources';
import {sanitizeContent,escapeHTML} from '@/lib/reader-content';
import type {BookExport} from '@/lib/export-model';
import ChapterNavigation from '@/components/chapter-navigation';
import PagedReader from '@/components/paged-reader';
import BookDownloads from '@/components/book-downloads';
import { SlidersHorizontal, X, ExternalLink } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
export default function ReaderClient(){
 const search=useSearchParams();const requested=search.get('url')||'';let originalURL='';try{originalURL=readerURL(requested);}catch{}
 const [book,setBook]=useState({title:'',author:'',html:'',url:'',chapters:0});
 const [session,setSession]=useState<NovelSession|null>(null);const [chapter,setChapter]=useState(0);const [retryChapter,setRetryChapter]=useState<number|null>(null);
 const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [size,setSize]=useState(22);const [ruby,setRuby]=useState(true);const [theme,setTheme]=useState('paper');const [settings,setSettings]=useState(false);const [full,setFull]=useState(false);const [loadMessage,setLoadMessage]=useState('');const loadController=useRef<AbortController|null>(null);
 useEffect(()=>()=>loadController.current?.abort(),[]);
 async function openBook(input:string){
 loadController.current?.abort();const controller=new AbortController();loadController.current=controller;
 setFull(false);setSession(null);setLoading(true);setError('');setRetryChapter(null);setLoadMessage('正在载入作品…');try{
 input=readerURL(input);
 if(sourceOf(input)!=='aozora'){
  const opened=await openNovel(input,controller.signal,setLoadMessage);let selected=0;
  try{const saved=localStorage.getItem('novel-chapter:'+input);const found=opened.chapters.findIndex(c=>c.url===saved);if(found>=0)selected=found;}catch{}
  setLoadMessage('正在打开'+opened.chapters[selected].title+'…');const page=await opened.getChapter(selected,controller.signal);controller.signal.throwIfAborted();
  setSession(opened);setChapter(selected);setBook({title:opened.index.title,author:opened.index.author,html:sanitizeContent(page.html!,page.url),url:input,chapters:opened.chapters.length});
 }else{
  const res=await fetch(apiURL('/api/book?url='+encodeURIComponent(input)),{signal:controller.signal});const data=await res.json() as {raw:string;url:string;error?:string};if(!res.ok)throw Error(data.error||'加载失败，请重试。');controller.signal.throwIfAborted();
  const doc=new DOMParser().parseFromString(data.raw,'text/html');const content=doc.querySelector('.main_text');if(!content)throw Error('无法识别这部作品的正文。');
  setBook({title:doc.querySelector('.title')?.textContent?.trim()||'未命名作品',author:doc.querySelector('.author')?.textContent?.trim()||'',html:sanitizeContent(content.innerHTML,data.url),url:data.url,chapters:0});
 }
 setFull(true);
 }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'加载失败，请重试。');}finally{if(loadController.current===controller){setLoading(false);setLoadMessage('');}}
 }
 async function changeChapter(next:number){
  if(!session||next<0||next>=session.chapters.length)return;
  loadController.current?.abort();const controller=new AbortController();loadController.current=controller;setLoading(true);setError('');setRetryChapter(null);setLoadMessage('正在载入'+session.chapters[next].title+'…');
  try{const page=await session.getChapter(next,controller.signal);controller.signal.throwIfAborted();setBook(b=>({...b,html:sanitizeContent(page.html!,page.url)}));setChapter(next);try{localStorage.setItem('novel-chapter:'+book.url,session.chapters[next].url);}catch{}}
  catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'载入失败');setRetryChapter(next);}}
  finally{if(loadController.current===controller){setLoading(false);setLoadMessage('');}}
 }
 async function prepareExport(signal:AbortSignal,progress:(message:string)=>void):Promise<BookExport>{
  if(!session)return book;const parts:string[]=[];let length=0;
  for(let i=0;i<session.chapters.length;i++){
   signal.throwIfAborted();progress(`正在准备全文 · ${i+1} / ${session.chapters.length} ${session.index.unit||'章'}`);
   let page;try{page=await session.getChapter(i,signal);}catch(e){signal.throwIfAborted();throw Error(`第 ${i+1} ${session.index.unit||'章'}载入失败，未生成不完整的下载文件。${e instanceof Error?e.message:''}`);}
   const html=sanitizeContent(page.html!,page.url);length+=html.length;if(length>40_000_000)throw Error('全文超过当前导出容量。');
   parts.push('<h2>'+escapeHTML(session.chapters[i].title)+'</h2>'+html);
   if(i<session.chapters.length-1)await new Promise(resolve=>setTimeout(resolve,300));
  }
  signal.throwIfAborted();return {...book,html:parts.join('')};
 }
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem('aozora-settings')||'{}');if(p.size)setSize(p.size);if(p.theme)setTheme(p.theme);if(typeof p.ruby==='boolean')setRuby(p.ruby)}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem('aozora-settings',JSON.stringify({size,ruby,theme}))}catch{}},[size,ruby,theme]);
 useEffect(()=>{if(requested)void openBook(requested);return()=>loadController.current?.abort();},[requested]);
 useEffect(()=>{if(full)document.title=book.title+' · 青空阅读室';},[book.title,full]);
 return <main data-theme={theme}>
 <header className="topbar"><a className="brand" href={sitePath('/')}><span className="brand-mark">青</span><strong>青空<span>阅读室</span></strong></a><a href={sitePath('/')} className="source-link">← 返回首页选书</a></header>
 <div className="reader-layout">
 <section className="reading-area"><div className="reader-toolbar"><div><span className="reading-label">正在阅读</span><strong lang="ja">{full?book.title:loading?'正在载入作品…':'阅读页'}</strong><span className="author">{book.author}</span></div><button disabled={!full} className={'settings-button '+(settings?'selected':'')} onClick={()=>setSettings(!settings)} aria-expanded={settings}><SlidersHorizontal size={17}/> 阅读设置</button></div>
 {settings&&<div className="settings"><div className="settings-title">阅读设置<button aria-label="关闭设置" onClick={()=>setSettings(false)}><X size={17}/></button></div><label>字号 <span>{size}px</span></label><Slider aria-label="字号" value={[size]} min={16} max={36} step={1} onValueChange={v=>setSize(Array.isArray(v)?v[0]:v)}/><div className="setting-row"><label htmlFor="ruby">显示注音</label><Switch id="ruby" checked={ruby} onCheckedChange={setRuby}/></div><div className="themes">{[['paper','纸白'],['warm','暖纸'],['night','夜读']].map(([v,t])=><button key={v} aria-pressed={theme===v} onClick={()=>setTheme(v)}>{t}</button>)}</div></div>}
 {error&&<div className="error" role="alert">{error}{retryChapter!==null&&<button onClick={()=>changeChapter(retryChapter)}>重试这一段</button>}</div>}{loading&&<div className="loading" role="status">{loadMessage}<button type="button" className="cancel-load" onClick={()=>loadController.current?.abort()}>取消</button></div>}
 {full&&<div className="paper"><div className="paper-top"><span>{sources[sourceOf(book.url)].name}</span><a href={session?.chapters[chapter]?.url||book.url} target="_blank" rel="noreferrer">原文 <ExternalLink size={12}/></a></div>
 <BookDownloads book={book} prepare={session?prepareExport:undefined}/>
 {session&&<ChapterNavigation chapters={session.chapters} current={chapter} unit={session.index.unit||'章'} loading={loading} onChange={changeChapter}/>}
 <PagedReader html={book.html} size={size} ruby={ruby} bookKey={session?.chapters[chapter]?.url||book.url} full={full} onNextSection={session&&chapter<session.chapters.length-1&&!loading?()=>changeChapter(chapter+1):undefined}/>
 <div className="paper-bottom"><span>{full?`${session?'按需载入 · 第 '+(chapter+1)+' / '+session.chapters.length+' '+(session.index.unit==='页'?'原站页':'章'):'全文'} · 阅读进度保存在此设备`:'试读'}</span><span>縦書き</span></div></div>}

 {!full&&!loading&&<div className="reader-empty"><p>{requested?'点击重试，重新打开这部作品。':'请先在首页选择作品或输入链接。'}</p>{requested&&<button onClick={()=>openBook(requested)}>重新载入</button>}<a href={sitePath('/')}>返回首页</a>{originalURL&&<a href={originalURL} target="_blank" rel="noreferrer">前往原站阅读 ↗</a>}</div>}
 </section></div></main>
}



