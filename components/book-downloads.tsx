'use client';
import {sitePath} from '@/lib/deployment';
import {useEffect,useRef,useState} from 'react';
import {Download} from 'lucide-react';
import type {BookExport} from '@/lib/export-model';
export default function BookDownloads({book,prepare}:{book:BookExport;prepare?:(signal:AbortSignal,progress:(message:string)=>void)=>Promise<BookExport>}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[book.html]);
 async function download(format:'pdf'|'epub'){
  const job=new AbortController();controller.current=job;setBusy(true);setError('');setMessage('正在准备导出…');
  try{
   const complete=prepare?await prepare(job.signal,setMessage):book;job.signal.throwIfAborted();
   let bytes:Uint8Array;
   if(format==='epub'){const {createEPUB}=await import('@/lib/export-epub');bytes=await createEPUB(complete,setMessage,job.signal);}
   else{setMessage('正在载入日文字体…');const [{createPDF},response]=await Promise.all([import('@/lib/export-pdf'),fetch(sitePath('/fonts/NotoSerifJP.ttf'),{signal:job.signal})]);if(!response.ok)throw Error('日文字体载入失败，请重试。');bytes=await createPDF(complete,new Uint8Array(await response.arrayBuffer()),setMessage,job.signal);}
   job.signal.throwIfAborted();const {filename}=await import('@/lib/export-model');
   const blob=new Blob([bytes as BlobPart],{type:format==='pdf'?'application/pdf':'application/epub+zip'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename(complete.title)+'.'+format;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('文件已生成，下载已开始。');
  }catch(e){if(job.signal.aborted)setMessage('已取消导出。');else{setError(e instanceof Error?e.message:'导出失败，请重试。');setMessage('');}}
  finally{setBusy(false);}
 }
 return <div className="book-downloads"><div className="download-actions"><span>下载全文</span><button disabled={busy} onClick={()=>download('pdf')}><Download size={15}/> PDF · 竖排</button><button disabled={busy} onClick={()=>download('epub')}><Download size={15}/> EPUB · 竖排</button>{busy&&<button onClick={()=>controller.current?.abort()}>取消</button>}</div><p className="download-note">{prepare?'点击下载后才会读取完整作品。':''}文字版保留注音；PDF 为 A5 竖排，EPUB 需支持日文竖排的阅读软件。</p>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="export-error">{error}</p>}</div>;
}



