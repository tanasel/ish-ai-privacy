/* Local, bounded text import. Never rewrites a source document or follows an external link. */
(function (global) {
 'use strict';
 const MiB=1024*1024;
 const limits=Object.freeze({file:50*MiB,text:100000,entries:10000,expanded:150*MiB,xml:8*MiB,xmlTotal:32*MiB,pages:200,slides:200,sheets:200,nodes:300000});
 const extensions=Object.freeze(['txt','csv','tsv','md','pdf','docx','xlsx','pptx','odt','ods','odp']);
 const fail=code=>Object.assign(new Error(code),{code,errorCategory:'validation',isRetryable:false});
 const all=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
 const direct=(node,name)=>Array.from(node.children||[]).filter(n=>n.localName===name);
 function attr(node,name){const a=Array.from(node.attributes||[]).find(a=>a.localName===name);return a?a.value:'';}
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 function crcUpdate(crc,bytes){for(let i=0;i<bytes.length;i++)crc=crcTable[(crc^bytes[i])&255]^(crc>>>8);return crc;}
 function decode(bytes){
  const encoding=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8';
  try{return new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch(e){throw fail('file_encoding');}
 }
 function context(options){
  const started=Date.now(),counts={slides:0,pages:0,sheets:0,hidden:0,notes:0,comments:0},warnings=new Set();let chars=0,xmlBytes=0,nodes=0,lastYield=0;
  const parts=[];
  const c={lang:options.lang==='nl'?'nl':'en',counts,warnings,parts,
   label(en,nl){return c.lang==='nl'?nl:en;},
   check(){if(options.signal&&options.signal.aborted)throw fail(options.signal.reason==='timeout'?'file_timeout':'file_cancelled');if(Date.now()-started>30000)throw fail('file_timeout');},
   async tick(force=false){c.check();if(force||Date.now()-lastYield>8){if(options.onProgress)options.onProgress({...counts});await new Promise(r=>setTimeout(r,0));lastYield=Date.now();c.check();}},
   add(value){value=String(value||'');chars+=value.length;if(chars>limits.text)throw fail('text_large');parts.push(value);},
   section(label,value){if(String(value).trim())c.add('\n\n['+label+']\n'+value);},
   xmlCost(n){xmlBytes+=n;if(xmlBytes>limits.xmlTotal)throw fail('file_expanded_large');},
   nodeCost(n){nodes+=n;if(nodes>limits.nodes)throw fail('file_complex');},
   result(){return {text:parts.join('').trim(),warnings:Array.from(warnings),counts:{...counts}};}
  };return c;
 }
 // Read the real end-of-central-directory record, then reconcile every local entry.
 // No searching for arbitrary central-header magic inside compressed data or extra fields.
 function archive(buffer,c){
  const bytes=new Uint8Array(buffer),v=new DataView(buffer),size=bytes.length;
  if(size<22)throw fail('file_failed');let end=-1;
  for(let p=size-22;p>=Math.max(0,size-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===size){end=p;break;}
  if(end<0||v.getUint16(end+4,true)||v.getUint16(end+6,true))throw fail('file_archive');
  const count=v.getUint16(end+10,true),cdSize=v.getUint32(end+12,true),cdStart=v.getUint32(end+16,true);
  if(count===65535||cdSize===0xffffffff||cdStart===0xffffffff||v.getUint16(end+8,true)!==count)throw fail('file_archive');
  if(count>limits.entries)throw fail('file_complex');
  if(cdStart+cdSize!==end||cdStart>end)throw fail('file_archive');
  const entries=new Map(),ranges=[];let p=cdStart,total=0;
  function extra(start,length){let k=start;while(k<start+length){if(k+4>start+length)throw fail('file_archive');const type=v.getUint16(k,true),n=v.getUint16(k+2,true);if(type===1||type===0x9901)throw fail('file_archive');k+=4+n;if(k>start+length)throw fail('file_archive');}}
  for(let i=0;i<count;i++){
   c.check();if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw fail('file_archive');
   const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),expanded=v.getUint32(p+24,true),n=v.getUint16(p+28,true),x=v.getUint16(p+30,true),z=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
   if(p+46+n+x+z>end||!n||v.getUint16(p+34,true)||local===0xffffffff||compressed===0xffffffff||expanded===0xffffffff)throw fail('file_archive');
   if(flags&0x2041)throw fail('file_encrypted');if(method!==0&&method!==8)throw fail('file_archive');
   const name=decode(bytes.subarray(p+46,p+46+n));
   if(name.includes('\0')||name.includes('\\')||name.startsWith('/')||name.includes(':')||name.split('/').some(x=>x==='..'||x==='.')||entries.has(name))throw fail('file_archive');
   extra(p+46+n,x);total+=expanded;if(total>limits.expanded)throw fail('file_expanded_large');
   if(local+30>cdStart||v.getUint32(local,true)!==0x04034b50||v.getUint16(local+6,true)!==flags||v.getUint16(local+8,true)!==method)throw fail('file_archive');
   const ln=v.getUint16(local+26,true),lx=v.getUint16(local+28,true),data=local+30+ln+lx;
   if(data+compressed>cdStart||ln!==n||decode(bytes.subarray(local+30,local+30+ln))!==name)throw fail('file_archive');
   extra(local+30+ln,lx);
   if(!(flags&8)&&(v.getUint32(local+14,true)!==crc||v.getUint32(local+18,true)!==compressed||v.getUint32(local+22,true)!==expanded))throw fail('file_archive');
   if(method===0&&compressed!==expanded)throw fail('file_archive');
   let stop=data+compressed;
   if(flags&8){let d=stop;if(d+4<=cdStart&&v.getUint32(d,true)===0x08074b50)d+=4;if(d+12>cdStart||v.getUint32(d,true)!==crc||v.getUint32(d+4,true)!==compressed||v.getUint32(d+8,true)!==expanded)throw fail('file_archive');stop=d+12;}
   ranges.push([local,stop]);entries.set(name,{name,data,compressed,expanded,crc,method});p+=46+n+x+z;
  }
  if(p!==end)throw fail('file_archive');ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw fail('file_archive');
  const used=new Set();
  return {entries,used,
   async xml(name,required=true){
    c.check();const e=entries.get(name);if(!e){if(required)throw fail('file_archive');return null;}
    if(e.expanded>limits.xml)throw fail('file_expanded_large');used.add(name);
    const chunks=[];let length=0,crc=0xffffffff;
    const receive=chunk=>{length+=chunk.length;if(length>limits.xml||length>e.expanded)throw fail('file_expanded_large');c.xmlCost(chunk.length);crc=crcUpdate(crc,chunk);chunks.push(chunk);};
    try{
     if(e.method===0){for(let i=0;i<e.compressed;i+=65536){receive(bytes.subarray(e.data+i,e.data+Math.min(e.compressed,i+65536)));await c.tick();}}
     else{const inflater=new global.fflate.Inflate(receive);for(let i=0;i<e.compressed;i+=1024){inflater.push(bytes.subarray(e.data+i,e.data+Math.min(e.compressed,i+1024)),i+1024>=e.compressed);await c.tick();}if(!e.compressed)throw fail('file_archive');}
    }catch(e){if(e.code&&e.errorCategory)throw e;throw fail('file_archive');}
    if(length!==e.expanded||((crc^0xffffffff)>>>0)!==e.crc)throw fail('file_archive');
    const combined=new Uint8Array(length);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}
    const xml=decode(combined);if(/<!\s*(DOCTYPE|ENTITY)/i.test(xml))throw fail('file_xml');
    const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName==='parsererror')throw fail('file_xml');
    c.nodeCost(doc.getElementsByTagName('*').length);await c.tick();return doc;
   }
  };
 }
 function targetPath(source,target){
  if(!target||/[\\\0?#]/.test(target)||/^[a-z][a-z\d+.-]*:/i.test(target))throw fail('file_archive');
  let decoded;try{decoded=decodeURIComponent(target);}catch(e){throw fail('file_archive');}
  if(/[\\\0?#:]/.test(decoded))throw fail('file_archive');
  const parts=decoded.startsWith('/')?[]:source.split('/').slice(0,-1);
  for(const part of decoded.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!parts.length)throw fail('file_archive');parts.pop();}else parts.push(part);}
  return parts.join('/');
 }
 function relName(source){const parts=source.split('/'),file=parts.pop();return [...parts,'_rels',file+'.rels'].join('/');}
 async function relationships(zip,source,c){
  const doc=await zip.xml(relName(source),false),result=new Map();if(!doc)return result;
  for(const el of all(doc,'Relationship')){
   const id=el.getAttribute('Id'),type=el.getAttribute('Type'),target=el.getAttribute('Target');if(!id||result.has(id))throw fail('file_archive');
   if(el.getAttribute('TargetMode')==='External'){c.warnings.add('import_external');result.set(id,{type,external:true});continue;}
   result.set(id,{type,path:targetPath(source,target)});
  }return result;
 }
 // Walk iteratively, preserving split runs, paragraph boundaries and ODF spaces.
 function content(node,c,kind='office'){
  const parts=[];let length=0;
  const add=s=>{if(!s)return;length+=s.length;if(length>limits.text)throw fail('text_large');parts.push(s);};
  const textLeaves=new Set(['t','delText','instrText','text','v','creator','lastModifiedBy','title','subject','description','keywords','category','identifier','Company','Manager','lpstr','lpwstr','date','initials']);
  const stack=[{n:node,exit:false}];
  while(stack.length){
   c.check();const {n,exit,text}=stack.pop();if(text){add(n.nodeValue);continue;}if(n.nodeType!==1&&n.nodeType!==9)continue;
   const tag=n.localName;
   if(exit){if(['p','h','table-row','row','tr','annotation','cm','comment'].includes(tag))add('\n');if(tag==='table-cell'||tag==='tc')add('\t');continue;}
   if(kind==='metadata'&&n.nodeType===1&&!n.children.length){if(n.textContent.trim())add(tag+': '+n.textContent+'\n');continue;}
   for(const a of Array.from(n.attributes||[]))if(['descr','title','author','userId','email'].includes(a.localName)||(['cmAuthor','author','person','property','cNvPr'].includes(tag)&&['name','initials'].includes(a.localName)))add(' '+a.value+' ');
   if(kind==='odf'){
    for(const key of ['number-rows-repeated','number-columns-repeated']){const v=attr(n,key),max=key==='number-rows-repeated'?1048576:16384;if(v&&(!/^\d+$/.test(v)||Number(v)<1||Number(v)>max))throw fail('file_complex');if(Number(v)>1)c.warnings.add('import_repeated');}
    if(tag==='table-cell'&&attr(n,'formula'))add(c.label('[Formula: ','[Formule: ')+attr(n,'formula')+'] ');
    if(tag==='table-cell'&&!n.textContent.trim()){const value=attr(n,'date-value')||attr(n,'string-value')||attr(n,'value');if(value)add(value);}
    if(tag==='s'){const count=attr(n,'c')||'1';if(!/^\d+$/.test(count)||Number(count)>10000)throw fail('file_complex');add(' '.repeat(Number(count)));continue;}
    if(tag==='tab'){add('\t');continue;}if(tag==='line-break'){add('\n');continue;}
   }
   if(tag==='br'){add('\n');continue;}if(tag==='tab'){add('\t');continue;}
   if(kind==='office'&&textLeaves.has(tag)){add(n.textContent);continue;}
   stack.push({n,exit:true});
   for(let i=n.childNodes.length-1;i>=0;i--){const child=n.childNodes[i];if(child.nodeType===1)stack.push({n:child,exit:false});else if(kind!=='office'&&(child.nodeType===3||child.nodeType===4))stack.push({n:child,exit:false,text:true});}
  }
  return parts.join('').replace(/[ \t]+\n/g,'\n').trim();
 }
 async function extras(zip,c,pattern){
  for(const name of zip.entries.keys())if(!zip.used.has(name)&&pattern.test(name)){
   const doc=await zip.xml(name);const text=content(doc,c,name.startsWith('docProps/')?'metadata':'office');c.section(c.label('Additional document text','Aanvullende documenttekst'),text);
   c.counts.comments+=all(doc,'cm').length+all(doc,'comment').length;
  }
  if(Array.from(zip.entries.keys()).some(n=>/\/(media|embeddings)\/|vbaProject|altChunk/i.test(n)))c.warnings.add('import_media');
 }
 async function pptx(zip,c){
  const source='ppt/presentation.xml',doc=await zip.xml(source),rels=await relationships(zip,source,c),slides=all(doc,'sldId');
  if(slides.length>limits.slides)throw fail('file_slide_pages');if(!slides.length)throw fail('file_failed');
  for(const slide of slides){
   const id=Array.from(slide.attributes).find(a=>a.localName==='id'&&a.namespaceURI&&a.namespaceURI.includes('relationships'));
   const rel=id&&rels.get(id.value);if(!rel||rel.external||!rel.type.endsWith('/slide'))throw fail('file_archive');
   const page=await zip.xml(rel.path);c.counts.slides++;const hidden=page.documentElement.getAttribute('show')==='0'||page.documentElement.getAttribute('show')==='false';if(hidden)c.counts.hidden++;
   const title=c.label('Slide ','Dia ')+c.counts.slides+(hidden?c.label(' (hidden)',' (verborgen)'):'');
   const pageName=all(page,'cSld').map(n=>n.getAttribute('name')||'').filter(Boolean).join('\n');
   c.section(title,[pageName,content(page,c)].filter(Boolean).join('\n'));
   const linked=await relationships(zip,rel.path,c);
   for(const item of linked.values())if(!item.external&&/\/(notesSlide|comments|comment|chart|diagramData)$/.test(item.type)){
    const extra=await zip.xml(item.path);if(item.type.endsWith('/notesSlide')){c.counts.notes++;c.section(title+c.label(' / speaker notes',' / sprekersnotities'),content(extra,c));}
    else{c.counts.comments+=all(extra,'cm').length+all(extra,'comment').length;c.section(title+c.label(' / related text',' / bijbehorende tekst'),content(extra,c));}
   }await c.tick(true);
  }
  await extras(zip,c,/^(docProps\/.*|ppt\/(comments|authors|persons|notesSlides|charts|diagrams|slideMasters|slideLayouts)\/[^/]+|ppt\/(commentAuthors|authors|persons))\.xml$/);
  c.warnings.add('import_slides');
 }
 async function docx(zip,c){
  const doc=await zip.xml('word/document.xml');c.section(c.label('Document','Document'),content(doc,c));
  const rels=await relationships(zip,'word/document.xml',c);
  for(const rel of rels.values())if(!rel.external&&/\/(header|footer|footnotes|endnotes|comments|commentsExtended|people)$/.test(rel.type)){
   if(zip.used.has(rel.path))continue;const part=await zip.xml(rel.path);c.counts.comments+=all(part,'comment').length;
   c.section(c.label('Additional document text','Aanvullende documenttekst'),content(part,c));
  }
  await extras(zip,c,/^(docProps\/.*|word\/(header\d*|footer\d*|footnotes|endnotes|comments[^/]*|people|charts\/[^/]+|diagrams\/[^/]+))\.xml$/);
  c.warnings.add('import_document');
 }
 function excelDate(value,format,date1904){
  const builtin=new Set([14,15,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,35,36,45,46,47,50,51,52,53,54,55,56,57,58]);
  if(!builtin.has(format.id)&&!/[ymdhs]/i.test((format.code||'').replace(/"[^"]*"|\\./g,'')))return value;
  const n=Number(value);if(!Number.isFinite(n)||n<0||n>2958465)return value;
  if(!date1904&&Math.floor(n)===60)return '1900-02-29';
  const date=new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:31)+Math.round((n-(date1904?0:n>=60?1:0))*86400000));
  return date.toISOString().replace('T',' ').replace(/ 00:00:00\.000Z$/,'').replace(/\.000Z$/,'');
 }
 async function xlsx(zip,c){
  const doc=await zip.xml('xl/workbook.xml'),rels=await relationships(zip,'xl/workbook.xml',c),sheets=all(doc,'sheet');
  if(sheets.length>limits.sheets)throw fail('file_complex');
  const partPath=(type,fallback)=>{const matching=Array.from(rels.values()).filter(r=>r.type.endsWith('/'+type));if(matching.length>1||matching[0]?.external)throw fail('file_archive');return matching[0]?.path||fallback;};
  const ss=await zip.xml(partPath('sharedStrings','xl/sharedStrings.xml'),false),strings=ss?all(ss,'si').map(n=>content(n,c)):[];
  if(strings.reduce((sum,x)=>sum+x.length,0)>limits.text)throw fail('text_large');
  const styles=await zip.xml(partPath('styles','xl/styles.xml'),false),formats=new Map(styles?all(styles,'numFmt').map(n=>[n.getAttribute('numFmtId'),n.getAttribute('formatCode')]):[]);
  const xfs=styles?all(styles,'cellXfs').flatMap(n=>direct(n,'xf').map(x=>({id:Number(x.getAttribute('numFmtId')),code:formats.get(x.getAttribute('numFmtId'))||''}))):[];
  const date1904=all(doc,'workbookPr').some(n=>['1','true'].includes(n.getAttribute('date1904')));
  for(const sheet of sheets){
   const rel=rels.get(attr(sheet,'id'));if(!rel||rel.external||!rel.type.endsWith('/worksheet'))throw fail('file_archive');
   const data=await zip.xml(rel.path),hidden=['hidden','veryHidden'].includes(sheet.getAttribute('state'));c.counts.sheets++;if(hidden)c.counts.hidden++;
   c.add('\n\n['+c.label('Sheet: ','Werkblad: ')+(sheet.getAttribute('name')||String(c.counts.sheets))+(hidden?c.label(' (hidden)',' (verborgen)'):'')+']\n');
   for(const row of all(data,'row')){
    for(const cell of direct(row,'c')){
     const type=cell.getAttribute('t'),value=direct(cell,'v')[0]?.textContent||'';let text;
     if(type==='s'){if(!/^\d+$/.test(value)||!Object.hasOwn(strings,Number(value)))throw fail('file_archive');text=strings[Number(value)];}
     else if(type==='inlineStr')text=direct(cell,'is').map(n=>content(n,c)).join('');
     else{text=value;if((type==='n'||!type)&&value)text=excelDate(value,xfs[Number(cell.getAttribute('s'))]||{id:0},date1904);}
     c.add(text+'\t');const formula=direct(cell,'f')[0]?.textContent;if(formula)c.add(c.label('[Formula: ','[Formule: ')+formula+']\t');
    }c.add('\n');await c.tick();
   }
   const linked=await relationships(zip,rel.path,c);
   for(const item of linked.values())if(!item.external&&/\/(comments|threadedComment|drawing|chart)$/.test(item.type)&&!zip.used.has(item.path)){const part=await zip.xml(item.path);c.counts.comments+=all(part,'comment').length;c.section(c.label('Additional sheet text','Aanvullende werkbladtekst'),content(part,c));}
   await c.tick(true);
  }
  await extras(zip,c,/^(docProps\/.*|xl\/(comments[^/]*|threadedComments\/[^/]+|person(s)?\/[^/]+|drawings\/[^/]+|charts\/[^/]+))\.xml$/);
  c.warnings.add('import_spreadsheet');
 }
 async function odf(zip,c,ext){
  const manifest=await zip.xml('META-INF/manifest.xml',false);if(manifest&&all(manifest,'encryption-data').length)throw fail('file_encrypted');
  const doc=await zip.xml('content.xml'),styles=await zip.xml('styles.xml',false);
  const styleMap=new Map([doc,styles].filter(Boolean).flatMap(d=>all(d,'style').map(s=>[attr(s,'name'),s])));
  const hiddenStyle=(node,property,key,value)=>{let name=attr(node,'style-name');const seen=new Set();while(name&&!seen.has(name)){seen.add(name);const s=styleMap.get(name);if(!s)break;if(all(s,property).some(p=>attr(p,key)===value))return true;name=attr(s,'parent-style-name');}return false;};
  if(ext==='odp'){
   const slides=all(doc,'page').filter(n=>n.namespaceURI==='urn:oasis:names:tc:opendocument:xmlns:drawing:1.0');if(slides.length>limits.slides)throw fail('file_slide_pages');
   for(const slide of slides){c.counts.slides++;const hidden=attr(slide,'visibility')==='hidden'||hiddenStyle(slide,'drawing-page-properties','visibility','hidden');if(hidden)c.counts.hidden++;c.counts.notes+=all(slide,'notes').length;c.counts.comments+=all(slide,'annotation').length;c.section(c.label('Slide ','Dia ')+c.counts.slides+' '+attr(slide,'name')+(hidden?c.label(' (hidden)',' (verborgen)'):''),content(slide,c,'odf'));await c.tick(true);}c.warnings.add('import_slides');
  }else if(ext==='ods'){
   const sheets=all(doc,'spreadsheet').flatMap(n=>direct(n,'table'));if(sheets.length>limits.sheets)throw fail('file_complex');
   for(const sheet of sheets){c.counts.sheets++;c.counts.comments+=all(sheet,'annotation').length;const hidden=attr(sheet,'display')==='false'||hiddenStyle(sheet,'table-properties','display','false');if(hidden)c.counts.hidden++;c.section(c.label('Sheet: ','Werkblad: ')+attr(sheet,'name')+(hidden?c.label(' (hidden)',' (verborgen)'):''),content(sheet,c,'odf'));await c.tick(true);}c.warnings.add('import_spreadsheet');
  }else{c.counts.comments+=all(doc,'annotation').length;c.section(c.label('Document','Document'),content(doc,c,'odf'));c.warnings.add('import_document');}
  if(styles)for(const tag of ['header','footer','header-left','footer-left','header-first','footer-first',...(ext==='odp'?['master-page']:[])])for(const part of all(styles,tag))c.section(c.label('Header, footer or master text','Koptekst, voettekst of modeltekst'),content(part,c,'odf'));
  const meta=await zip.xml('meta.xml',false);if(meta)c.section(c.label('Document properties','Documenteigenschappen'),content(meta,c,'metadata'));
  if(Array.from(zip.entries.keys()).some(n=>/^(Pictures|Object|Scripts|Media)\//.test(n)))c.warnings.add('import_media');
 }
 async function pdf(file,c,signal){
  const task=global.pdfjsLib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
  const abort=()=>{task.destroy().catch(()=>{});};if(signal)signal.addEventListener('abort',abort,{once:true});
  try{
   c.check();const doc=await task.promise;if(doc.numPages>limits.pages)throw fail('file_pdf_pages');
   for(let n=1;n<=doc.numPages;n++){
    c.check();const page=await doc.getPage(n),tc=await page.getTextContent();const text=tc.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
    c.counts.pages++;if(!text.trim())c.warnings.add('import_empty_page');c.section(c.label('Page ','Pagina ')+n,text);
    const annotations=await page.getAnnotations();for(const a of annotations){const values=[a.titleObj?.str,a.contentsObj?.str,a.fieldName,typeof a.fieldValue==='string'?a.fieldValue:''].filter(Boolean);if(values.length){c.counts.comments++;c.section(c.label('Page ','Pagina ')+n+c.label(' / annotation or form',' / opmerking of formulier'),values.join('\n'));}}
    page.cleanup();await c.tick(true);
   }
   const metadata=await doc.getMetadata();const values=Object.entries(metadata.info||{}).filter(([key,value])=>['Title','Author','Subject','Keywords','Creator','Producer'].includes(key)&&typeof value==='string').map(([key,value])=>key+': '+value);c.section(c.label('Document properties','Documenteigenschappen'),values.join('\n'));
   c.warnings.add('import_pdf');
  }finally{if(signal)signal.removeEventListener('abort',abort);await task.destroy();}
 }
 async function extract(file,options={}){
  const c=context(options),ext=file.name.toLowerCase().split('.').pop();
  if(file.size>limits.file)throw fail('file_large');if(!extensions.includes(ext))throw fail('file_unsupported');await c.tick(true);
  try{
   if(['txt','csv','tsv','md'].includes(ext)){
    // At most four UTF-8 bytes per character. Avoid reading huge text files just to reject them.
    if(file.size>limits.text*4+4)throw fail('text_large');c.add(decode(new Uint8Array(await file.arrayBuffer())));
   }else if(ext==='pdf')await pdf(file,c,options.signal);
   else{const zip=archive(await file.arrayBuffer(),c);if(ext==='pptx')await pptx(zip,c);else if(ext==='docx')await docx(zip,c);else if(ext==='xlsx')await xlsx(zip,c);else await odf(zip,c,ext);}
   await c.tick(true);return c.result();
  }catch(e){c.check();if(e.code&&e.errorCategory)throw e;throw fail('file_failed');}
 }
 global.PIIImports=Object.freeze({extract,limits,extensions});
})(window);
