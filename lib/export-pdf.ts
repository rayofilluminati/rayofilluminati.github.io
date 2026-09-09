import {PDFDocument,PDFName,PDFDict,ReadingDirection,rgb,type PDFPage,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {exportBlocks,type BookExport} from './export-model';
const split=(s:string)=>Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(s),x=>x.segment);
export async function createPDF(book:BookExport,fontBytes:Uint8Array,progress:(s:string)=>void=()=>{},signal?:AbortSignal){
 progress('正在准备日文字体…');const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(fontBytes,{subset:false,features:{vert:true,vrt2:true}});
 pdf.setTitle(book.title);pdf.setAuthor(book.author);pdf.setSubject(book.url);pdf.setLanguage('ja');pdf.catalog.set(PDFName.of('PageLayout'),PDFName.of('TwoPageRight'));pdf.catalog.getOrCreateViewerPreferences().setReadingDirection(ReadingDirection.R2L);
 const width=419.53,height=595.28;const top=height-46,bottom=48,right=width-49,left=43;const size=12,step=15.5,gap=26;const rows=Math.floor((top-bottom)/step);
 let page:PDFPage;let x=right;let row=0;let written=0;
 const supported=new Set(font.getCharacterSet());
 const unicodeMap=new Map<string,string>();
 const safe=(s:string)=>{const value=s.normalize('NFC');const missing=Array.from(value).filter(c=>!supported.has(c.codePointAt(0)!));if(missing.length)throw Error('PDF 字体不包含部分字符（'+missing.slice(0,4).join('')+'），请使用 EPUB 以完整保留这些字符。');return value;};
 const remember=(s:string)=>{const encoded=font.encodeText(s).asString();const codes=encoded.match(/.{4}/g)||[];const chars=Array.from(s);codes.forEach((code,i)=>unicodeMap.set(code,codes.length===1?s:chars[i]||'\u200b'));};
 function glyph(text:string,gx:number,gy:number,fs:number,f:PDFFont=font){const textSafe=safe(text);remember(textSafe);page.drawText(textSafe,{x:gx+(fs-f.widthOfTextAtSize(textSafe,fs))/2,y:gy-fs*.88,font:f,size:fs,color:rgb(.1,.1,.1)});}
 function newPage(){page=pdf.addPage([width,height]);x=right;row=0;remember(String(pdf.getPageCount()));page.drawText(String(pdf.getPageCount()),{x:width/2-5,y:23,font,size:8,color:rgb(.4,.4,.4)});}
 function nextColumn(){row=0;x-=gap;if(x<left)newPage();}
 function chars(text:string,fs=size){for(const ch of split(text)){if(row>=rows)nextColumn();glyph(ch,x,top-row*step,fs);row++;written++;}}
 newPage();
 // A separate vertical title page includes the complete title, author, and source.
 chars(book.title,14);nextColumn();nextColumn();chars(book.author);nextColumn();
 for(const label of ['原文',book.url]){chars(label,8);nextColumn();}
 newPage();
 const blocks=exportBlocks(book.html);let finished=0;
 for(const block of blocks){signal?.throwIfAborted();if(row>0)nextColumn();if(block.heading&&x!==right)nextColumn();
  for(const run of block.runs){
   if(!run.ruby){chars(run.text);}
   else{
    const base=split(run.text),reading=split(run.ruby);let offset=0;
    while(offset<base.length){if(row>=rows)nextColumn();if(base.length<=rows&&base.length>rows-row)nextColumn();const take=Math.min(rows-row,base.length-offset);const annotation=reading.slice(Math.round(offset/base.length*reading.length),Math.round((offset+take)/base.length*reading.length));const y=top-row*step;
     chars(base.slice(offset,offset+take).join(''));
     const rs=Math.min(5.5,take*step/Math.max(1,annotation.length));const advance=rs*1.1;const start=y-(take*step-annotation.length*advance)/2;
     annotation.forEach((ch,i)=>glyph(ch,x+size+1,start-i*advance,rs));offset+=take;
    }
   }
   if(written>1200){progress(`正在生成 PDF · ${pdf.getPageCount()} 页`);await new Promise(r=>setTimeout(r,0));signal?.throwIfAborted();written=0;}
  }
  if(!block.runs.length)nextColumn();if(block.heading)nextColumn();finished++;
  if(finished%50===0){await new Promise(r=>setTimeout(r,0));progress(`正在生成 PDF · ${pdf.getPageCount()} 页`);}
 }
 signal?.throwIfAborted();progress('正在保存 PDF…');
 // Vertical OpenType alternates need an explicit Unicode map for copy/search.
 await font.embed();
 const utf16=(s:string)=>Array.from({length:s.length},(_,i)=>s.charCodeAt(i).toString(16).padStart(4,'0')).join('');
 const entries=Array.from(unicodeMap,([code,text])=>'<'+code+'> <'+utf16(text)+'>');
 let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /ReaderUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
 for(let i=0;i<entries.length;i+=100){const group=entries.slice(i,i+100);cmap+=group.length+' beginbfchar\n'+group.join('\n')+'\nendbfchar\n';}
 cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
 pdf.context.lookup(font.ref,PDFDict).set(PDFName.of('ToUnicode'),pdf.context.register(pdf.context.flateStream(cmap)));
 return pdf.save();
}


