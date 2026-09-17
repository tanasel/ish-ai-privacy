/* PII Shield staff workflow. Personal data lives only in this closure and the visible controls. */
(function () {
 'use strict';
 const STEPS=[1,2,3,5], MAX_TEXT=100000, MAX_FILE=PIIImports.limits.file;
 const $=id=>document.getElementById(id);
 const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 let importController=null, importReceipt=null;
 let state, fileTicket=0, listTicket=0, helpOpen=false, selectionText='', printedDetails=[];
 function blankState(){return {step:1,mode:'remove',reviewText:'',text:'',customNames:[],detections:[],detectedText:null,mapper:null,anonText:'',restoredText:'',revision:0,preparedRevision:-1,loading:false,listLoading:false};}
 state=blankState();
 function message(key,el='app-message',vars){$(el).textContent=t(key,vars);$(el).hidden=false;}
 function clearRestore(){state.restoredText='';$('restore-output').textContent='';$('restore-wrap').hidden=true;$('flagged-panel').textContent='';$('flagged-panel').hidden=true;$('restore-copy-status').textContent='';$('restore-copy-status').hidden=true;}
 function invalidateResult(){state.revision++;state.mapper=null;state.anonText='';state.preparedRevision=-1;$('anon-output').textContent='';$('prompt-output').textContent='';$('ai-text').value='';$('share-confirm').checked=false;$('copy-status').textContent='';$('copy-status').hidden=true;clearRestore();syncButtons();}
 function invalidateReview(){ $('review-confirm').checked=false;invalidateResult(); }
 function syncButtons(){
  $('cancel-import').hidden=!state.loading;
  const ready=isPrepared();
  const reviewed=$('review-confirm').checked&&state.detectedText===reviewSource();
  $('to-step-2').disabled=state.loading||state.listLoading;
  $('to-step-3').disabled=!reviewed;
  $('copy-safe').disabled=!ready||!$('share-confirm').checked;
  $('download-safe').disabled=!ready||!$('share-confirm').checked;
  $('stepbtn-2').disabled=!state.text.trim()||state.loading||state.listLoading;
  $('stepbtn-3').disabled=!ready&&!reviewed;
  $('stepbtn-5').disabled=!ready||!state.mapper;
  $('restore-nav').hidden=state.mode==='remove';$('step-nav').classList.toggle('removal',state.mode==='remove');
  $('to-step-5').hidden=state.mode==='remove';$('code-instructions').hidden=state.mode==='remove';$('code-session-note').hidden=state.mode==='remove';
  $('finish-removal').hidden=state.mode!=='remove';$('back-to-2').hidden=state.mode==='remove'&&ready;
  $('prepare-note').textContent=t(state.mode==='remove'?'prepare_remove_note':'prepare_codes_note');
  $('to-step-3').textContent=t(state.mode==='remove'?'prepare_remove':'make_safe');
  $('output-mode-note').textContent=t(state.mode==='remove'?'output_remove_note':'output_codes_note');
 }
 function isPrepared(){return state.preparedRevision===state.revision&&!!state.anonText;}
 function reviewSource(){return t('prompt_task')+'\n'+$('ai-task').value.trim()+'\n\n'+t('prompt_text')+'\n'+state.text;}
 function updateCount(){ $('input-count').textContent=t('input_count',{n:$('input-text').value.length.toLocaleString(PII_LANG.lang)}); }
 function setSource(text){
  state.text=String(text);$('input-text').value=state.text;state.detectedText=null;state.reviewText='';state.detections=[];
  $('preview').textContent='';$('review-tbody').textContent='';$('detect-summary').textContent='';
  $('filename-list').value='';
  invalidateReview();updateCount();syncButtons();
 }
 function focusHeading(){const h=$('step-'+state.step).querySelector('h2');h.tabIndex=-1;h.focus();}
 function showStep(n){
  helpOpen=false;$('help-panel').hidden=true;$('step-nav').hidden=false;
  state.step=n;
  STEPS.forEach((step,index)=>{ $('step-'+step).hidden=step!==n;const btn=$('stepbtn-'+step);btn.classList.toggle('done',index<STEPS.indexOf(n));if(step===n)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');});
  $('app-message').hidden=true;syncButtons();focusHeading();window.scrollTo(0,0);
 }
 function validSource(){
  state.text=$('input-text').value;
  if(state.loading||state.listLoading){message('busy_wait');return false;}
  if(!state.text.trim()){message('alert_need_text');$('input-text').focus();return false;}
  if(state.text.length>MAX_TEXT){message('text_large');return false;}
  return true;
 }
 function detect(){
  if(!validSource())return false;
  const reviewed=reviewSource();if(state.detectedText===reviewed)return true;
  try{state.detections=PIIEngine.detect(reviewed,state.customNames).map((d,i)=>({...d,id:'d'+i,confirmed:true}));}
  catch(error){message('detected_error');return false;}
  state.reviewText=reviewed;state.detectedText=reviewed;invalidateReview();renderReview();return true;
 }
 function typeLabel(type){return PII_I18N[PII_LANG.lang]['type_'+type]?t('type_'+type):t('type_detail');}
 function renderReview(){
  const selected=state.detections.filter(d=>d.confirmed);
  $('detect-summary').textContent=t(selected.length===0?'summary_none':selected.length===1?'summary_one':'summary_many',{n:selected.length});
  let html='',pos=0;
  state.detections.slice().sort((a,b)=>a.start-b.start).forEach(d=>{
   if(d.start<pos)return;
   html+=esc(state.reviewText.slice(pos,d.start))+'<mark class="hl hl-'+esc(d.type)+(d.confirmed?'':' hl-off')+'" title="'+esc(typeLabel(d.type))+'">'+esc(state.reviewText.slice(d.start,d.end))+'</mark>';pos=d.end;
  });
  $('preview').innerHTML=html+esc(state.reviewText.slice(pos));
  $('review-tbody').innerHTML=state.detections.map(d=>'<tr'+(d.confirmed?'':' class="dismissed"')+'><td><input type="checkbox" '+(d.confirmed?'checked':'')+' data-id="'+d.id+'" aria-label="'+esc(t('keep_aria',{value:d.value}))+'"></td><td>'+esc(d.value)+'</td><td>'+esc(typeLabel(d.type))+'</td></tr>').join('');
  syncButtons();
 }
 function addManual(value,type){
  value=String(value||'').trim();if(!value){message('manual_not_found','manual-note');return;}
  // Unicode case-insensitive search preserves raw-string offsets. Never invent a value-only row.
  const regex=new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
  const ranges=[];let match;
  while((match=regex.exec(state.reviewText))!==null)ranges.push({start:match.index,end:match.index+match[0].length});
  if(!ranges.length){message('manual_not_found','manual-note');return;}
  // Cover the union, so adding a full phrase cannot leave an overlapping suffix behind.
  ranges.forEach(range=>{
   let expanded=true;
   while(expanded){expanded=false;state.detections.forEach(d=>{if(range.start<d.end&&range.end>d.start){const a=Math.min(range.start,d.start),b=Math.max(range.end,d.end);if(a!==range.start||b!==range.end){range.start=a;range.end=b;expanded=true;}}});}
   state.detections=state.detections.filter(d=>!(range.start<d.end&&range.end>d.start));
   state.detections.push({...range,value:state.reviewText.slice(range.start,range.end),type,layer:'manual',confidence:1,confirmed:true});
  });
  state.detections.sort((a,b)=>a.start-b.start).forEach((d,i)=>d.id='d'+i);
  invalidateReview();renderReview();message('manual_added','manual-note',{n:ranges.length});$('manual-value').value='';selectionText='';
 }
 function clearPrivateSource(){
  cancelImport();listTicket++;selectionText='';state.text='';state.reviewText='';state.detectedText=null;state.detections=[];state.customNames=[];state.mapper=null;
  ['input-text','ai-text','ai-task','manual-value','file-input','csv-input','filename-list'].forEach(id=>$(id).value='');
  ['preview','review-tbody','detect-summary','file-note','manual-note','csv-count'].forEach(id=>$(id).textContent='');
  ['file-note','manual-note','csv-count','clear-csv'].forEach(id=>$(id).hidden=true);
  $('review-confirm').checked=false;updateCount();
 }
 function prepare(){
  if(isPrepared())return true;
  if(!validSource())return false;
  if(state.detectedText!==reviewSource()||!$('review-confirm').checked){message('alert_need_review');return false;}
  try{
   const selected=state.detections.filter(d=>d.confirmed);
   if(state.mode==='remove'){
    state.anonText=PIIEngine.redact(state.reviewText,selected);
    clearPrivateSource();
   }else{
    const mapper=PIIEngine.createMapper();state.anonText=mapper.anonymize(state.reviewText,selected);state.mapper=mapper;
   }
   state.preparedRevision=state.revision;
  }catch(error){message('detected_error');return false;}
  $('anon-output').textContent=state.anonText;$('share-confirm').checked=false;clearRestore();renderPrompt();syncButtons();return true;
 }
 function promptText(){return t(state.mode==='remove'?'prompt_remove_rules':'prompt_rules')+'\n\n'+state.anonText;}
 function renderPrompt(){$('prompt-output').textContent=isPrepared()?promptText():'';}
 function canShare(){if(!isPrepared()||!$('share-confirm').checked){message('share_required','copy-status');return false;}return true;}
 function fallbackCopy(text){
  const active=document.activeElement,ta=document.createElement('textarea');ta.value=text;ta.className='visually-hidden';ta.setAttribute('readonly','');document.body.appendChild(ta);ta.select();
  let copied=false;try{copied=document.execCommand('copy')===true;}catch(error){}ta.remove();if(active&&active.focus)active.focus();return copied;
 }
 async function copyText(text,el,key){
  const session=state,revision=state.revision;
  let copied=false;
  try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);copied=true;}}catch(error){}
  if(state!==session||state.revision!==revision)return;
  if(!copied)copied=fallbackCopy(text);
  message(copied?key:'copy_failed',el);
 }
 function download(filename,text,mime='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 function validationError(code){return Object.assign(new Error(code),{code,errorCategory:'validation',isRetryable:false});}
 function clearImportReceipt(){importReceipt=null;$('import-receipt').hidden=true;$('import-counts').textContent='';$('import-warnings').textContent='';}
 function cancelImport(){fileTicket++;if(importController){importController.abort();importController=null;}state.loading=false;clearImportReceipt();}
 function renderImportReceipt(){
  if(!importReceipt)return;const {counts,warnings}=importReceipt;
  const summary=[importReceipt.format,t('import_receipt_characters',{n:importReceipt.characters.toLocaleString(PII_LANG.lang)}),...Object.entries(counts).filter(([,n])=>n>0).map(([key,n])=>t('import_count_'+key,{n}))];
  $('import-counts').textContent=summary.join(' · ')||t('import_text_only');
  $('import-warnings').textContent='';for(const code of ['import_original',...warnings]){const li=document.createElement('li');li.textContent=t(code);$('import-warnings').appendChild(li);}
  $('import-receipt').hidden=false;
 }
 async function handleFile(file){
  if(!file)return;cancelImport();const ticket=fileTicket;
  if(file.size>MAX_FILE){message('file_large','file-note');syncButtons();return;}
  if(!PIIImports.extensions.includes(file.name.toLowerCase().split('.').pop())){message('file_unsupported','file-note');syncButtons();return;}
  state.loading=true;syncButtons();message('file_loading','file-note');
  const controller=new AbortController();importController=controller;let lastProgress=Date.now();
  const timeout=setTimeout(()=>controller.abort('timeout'),30000);
  try{
   const result=await PIIImports.extract(file,{lang:PII_LANG.lang,signal:controller.signal,onProgress:counts=>{if(ticket===fileTicket&&Date.now()-lastProgress>250){lastProgress=Date.now();message('file_progress','file-note',{n:counts.slides+counts.pages+counts.sheets});}}});
   if(ticket!==fileTicket)return;if(!result.text.trim()){message('file_empty','file-note');return;}
   const namedText=t('file_name_label')+': '+JSON.stringify(file.name)+'\n\n'+result.text;
   if(namedText.length>MAX_TEXT){message('text_large','file-note');return;}
   setSource(namedText);importReceipt={counts:result.counts,warnings:result.warnings,format:file.name.toLowerCase().split('.').pop().toUpperCase(),characters:namedText.length};renderImportReceipt();message('file_loaded_text','file-note',{name:file.name});
  }catch(error){if(ticket===fileTicket)message(PII_I18N[PII_LANG.lang][error.code]?error.code:'file_failed','file-note');}
  finally{clearTimeout(timeout);if(ticket===fileTicket){state.loading=false;importController=null;$('file-input').value='';syncButtons();}}
 }
 async function importList(file){
  if(!file)return;const ticket=++listTicket;
  if(file.size>1024*1024){state.listLoading=false;syncButtons();message('csv_large','file-note');return;}
  state.listLoading=true;syncButtons();
  try{const names=PIIEngine.parseNameCSV(await file.text());if(ticket!==listTicket)return;if(!names.length)throw new Error('Empty name list');if(names.length>2000){message('csv_large','file-note');return;}state.customNames=names;state.detectedText=null;invalidateReview();renderList();}
  catch(error){if(ticket===listTicket)message(error.code==='csv_complex'?'csv_complex':'csv_fail','file-note');}
  finally{if(ticket===listTicket){state.listLoading=false;syncButtons();}}
 }
 function renderList(){const n=state.customNames.length;$('csv-count').textContent=n?t(n===1?'csv_count_one':'csv_count_many',{n}):'';$('csv-count').hidden=!n;$('clear-csv').hidden=!n;}
 function restore(){
  if(!state.mapper||state.preparedRevision!==state.revision){message('alert_no_session');return;}
  const reply=$('ai-text').value;if(!reply.trim()){message('ai_empty');return;}if(reply.length>MAX_TEXT){message('text_large');return;}
  const result=state.mapper.restore(reply);state.restoredText=result.text;$('restore-output').textContent=result.text;$('restore-wrap').hidden=false;
  const known=state.mapper.entries().some(e=>reply.toLowerCase().includes(e.pseudonym.toLowerCase()));
  let issues=result.flagged||[];
  if(issues.length){$('flagged-panel').innerHTML='<p>'+esc(t('flagged_intro'))+'</p><ul>'+issues.map(f=>'<li>'+esc(f.pseudonym)+': '+esc(t('flag_reason'))+'</li>').join('')+'</ul>';$('flagged-panel').hidden=false;}
  else if(!known&&state.mapper.entries().length){message('no_codes','flagged-panel');}
  else{$('flagged-panel').textContent='';$('flagged-panel').hidden=true;}
 }
 function hasData(){return !!(state.text.trim()||state.customNames.length||$('ai-text').value.trim()||$('filename-list').value.trim()||state.anonText||($('ai-task').value.trim()&&$('ai-task').value!==t('task_default')));}
 function startOver(){
  if(hasData()&&!confirm(t('confirm_restart')))return;
  cancelImport();listTicket++;state=blankState();selectionText='';
  ['input-text','ai-text','manual-value','file-input','csv-input','filename-list'].forEach(id=>$(id).value='');
  ['preview','review-tbody','detect-summary','anon-output','prompt-output','restore-output','flagged-panel','file-note','manual-note','copy-status','restore-copy-status','csv-count','app-message'].forEach(id=>$(id).textContent='');
  ['file-note','manual-note','copy-status','restore-copy-status','csv-count','clear-csv','flagged-panel','restore-wrap','app-message'].forEach(id=>$(id).hidden=true);
  $('review-confirm').checked=false;$('share-confirm').checked=false;$('detection-options').open=false;$('filename-tool').open=false;$('ai-task').value=t('task_default');
  $('mode-remove').checked=true;$('mode-codes').checked=false;updateCount();showStep(1);
 }
 function buildInfo(){
  const meta=document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const policy=meta?/script-src 'sha256-([^']+)'/.exec(meta.getAttribute('content')||''):null;
  const script=document.querySelector('script[src][integrity]');
  const sri=script?String(script.getAttribute('integrity')||'').replace(/^sha256-/,''):null;
  return {version:'__PII_VERSION__',record:'__PII_HASH_RECORD__',policyHash:policy?policy[1]:'',bundle:script?script.getAttribute('src'):null,sri,hosted:!!script,match:script?sri===(policy?policy[1]:null):null};
 }
 function renderVerify(g){
  const v=g.verify,b=buildInfo();
  const rows=[[v.edition,b.version],[v.hash,b.policyHash||v.unknown]];
  if(b.hosted){rows.push([v.loaded,b.bundle]);rows.push([v.integrity,b.match?v.yes:v.no]);}else rows.push([v.loaded,v.offline]);
  const record=b.hosted?'<a href="'+esc(b.record)+'" target="_blank" rel="noopener noreferrer">'+esc(b.record)+'</a>':esc(b.record);
  return '<h3>'+esc(v.title)+'</h3><p>'+esc(v.intro)+'</p><dl class="verify-list">'+rows.map(([k,val])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(val)+'</dd></div>').join('')+'<div><dt>'+esc(v.record)+'</dt><dd>'+record+'</dd></div></dl><p>'+esc(v.how)+'</p>';
 }
 function renderHelp(){
  const g=PII_GUIDE[PII_LANG.lang];
  $('help-content').innerHTML='<p class="guide-intro">'+esc(g.intro)+'</p><ol class="guide-route">'+g.route.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><h3>'+esc(g.title)+'</h3><ol class="guide-steps">'+g.steps.map(([a,b])=>'<li><strong>'+esc(a)+'</strong><p>'+esc(b)+'</p></li>').join('')+'</ol><h3>'+esc(g.exampleTitle)+'</h3><pre class="copybox guide-example">'+esc(g.example)+'</pre><h3>'+esc(g.offlineTitle)+'</h3><ol>'+g.offline.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><h3>'+esc(g.faqTitle)+'</h3>'+g.faqs.map(([q,a])=>'<details class="faq"><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+''+renderVerify(g)+'<h3>'+esc(g.sourcesTitle)+'</h3><p>'+esc(g.sourcesNote)+'</p><ul><li><a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679" target="_blank" rel="noopener noreferrer">GDPR: recital 26; articles 4, 5, 6, 9, 25, 28, 32, 35 and 44</a></li><li><a href="https://www.autoriteitpersoonsgegevens.nl/documenten/hulpmiddel-generatieve-ai-en-de-avg-vr-microsoft-copilot" target="_blank" rel="noopener noreferrer">Autoriteit Persoonsgegevens: generatieve AI en de AVG</a></li></ul>';
 }
 function openHelp(){helpOpen=true;STEPS.forEach(n=>$('step-'+n).hidden=true);$('step-nav').hidden=true;$('help-panel').hidden=false;$('app-message').hidden=true;$('help-title').focus();window.scrollTo(0,0);}
 function wire(id,event,fn){$(id).addEventListener(event,fn);}
 function init(){
  if(location.protocol==='file:')$('download-offline').hidden=true;
  $('ai-task').value=t('task_default');
  wire('input-text','input',()=>{cancelImport();setSource($('input-text').value);$('file-note').hidden=true;});
  STEPS.forEach(n=>wire('stepbtn-'+n,'click',()=>{if(n===2&&!detect())return;if(n===3&&!prepare())return;if(n===5&&!state.mapper)return;showStep(n);}));
  wire('to-step-2','click',()=>{if(detect())showStep(2);});wire('to-step-3','click',()=>{if(prepare())showStep(3);});wire('to-step-5','click',()=>{if(state.mapper)showStep(5);});
  wire('back-to-1','click',()=>showStep(1));wire('back-to-2','click',()=>showStep(2));wire('back-to-3','click',()=>showStep(3));wire('start-over','click',startOver);wire('finish-over','click',startOver);wire('finish-removal','click',startOver);
  wire('review-confirm','change',()=>{if(!$('review-confirm').checked)invalidateResult();syncButtons();});wire('share-confirm','change',syncButtons);
  wire('ai-task','input',()=>{state.detectedText=null;state.reviewText='';state.detections=[];$('preview').textContent='';$('review-tbody').textContent='';invalidateReview();});
  ['mode-remove','mode-codes'].forEach(id=>wire(id,'change',()=>{state.mode=$(id).value;invalidateReview();syncButtons();}));
  wire('review-tbody','change',event=>{const d=state.detections.find(x=>x.id===event.target.dataset.id);if(!d)return;d.confirmed=event.target.checked;invalidateReview();renderReview();const cb=$('review-tbody').querySelector('[data-id="'+d.id+'"]');if(cb)cb.focus();});
  document.addEventListener('selectionchange',()=>{const sel=window.getSelection();if(sel&&sel.rangeCount&&$('preview').contains(sel.anchorNode)&&$('preview').contains(sel.focusNode))selectionText=String(sel).trim();});
  wire('add-selected','click',()=>{if(!selectionText){message('alert_select_first','manual-note');return;}addManual(selectionText,$('manual-type').value);});wire('add-manual','click',()=>addManual($('manual-value').value,$('manual-type').value));
  wire('manual-value','keydown',event=>{if(event.key==='Enter'){event.preventDefault();addManual($('manual-value').value,$('manual-type').value);}});
  wire('check-filenames','click',()=>{
   const names=$('filename-list').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   if(!names.length){message('filename_list_empty');return;}
   const text=names.map(name=>t('file_name_label')+': '+JSON.stringify(name)).join('\n');
   if(names.length>2000||names.some(name=>name.length>255)||text.length>MAX_TEXT){message('filename_list_limit');return;}
   cancelImport();setSource(text);if(detect())showStep(2);
  });
  wire('cancel-import','click',()=>{cancelImport();message('file_cancelled','file-note');syncButtons();});
  wire('pick-file','click',()=>$('file-input').click());wire('file-input','change',event=>handleFile(event.target.files[0]));
  wire('dropzone','dragover',event=>{event.preventDefault();$('dropzone').classList.add('dragover');});wire('dropzone','dragleave',()=>$('dropzone').classList.remove('dragover'));wire('dropzone','drop',event=>{event.preventDefault();$('dropzone').classList.remove('dragover');handleFile(event.dataTransfer.files[0]);});
  wire('import-csv','click',()=>$('csv-input').click());wire('csv-input','change',event=>importList(event.target.files[0]));wire('sample-csv','click',()=>download('ish-ai-privacy-name-list-example.csv','first_name,last_name\r\nSofia,Marin\r\nAmir,Haddad\r\n','text/csv;charset=utf-8'));
  wire('clear-csv','click',()=>{listTicket++;state.listLoading=false;state.customNames=[];state.detectedText=null;$('csv-input').value='';invalidateReview();renderList();message('csv_removed','file-note');});
  wire('copy-safe','click',()=>{if(canShare())copyText(promptText(),'copy-status',state.mode==='remove'?'copied_removed':'copied_safe');});wire('download-safe','click',()=>{if(canShare())download('ish-ai-privacy-reviewed-prompt.txt',promptText());});wire('do-restore','click',restore);
  wire('ai-text','input',()=>{clearRestore();$('app-message').hidden=true;});wire('copy-restored','click',()=>{if(state.restoredText)copyText(state.restoredText,'restore-copy-status','copied');});wire('download-restored','click',()=>{if(state.restoredText)download('ish-ai-privacy-restored-private.txt',state.restoredText);});
  wire('try-example','click',()=>{if(hasData()&&!confirm(t('confirm_example')))return;cancelImport();$('ai-task').value=t('task_default');setSource(PII_EXAMPLES[PII_LANG.lang][$('example-kind').value]);message('example_note','file-note');});
  wire('open-help','click',openHelp);wire('close-help','click',()=>showStep(state.step));wire('print-guide','click',()=>{openHelp();window.print();});
  wire('readability','click',()=>{$('readability').setAttribute('aria-pressed',String(document.body.classList.toggle('reading')));});wire('contrast-toggle','click',()=>{$('contrast-toggle').setAttribute('aria-pressed',String(document.body.classList.toggle('contrast')));});
  window.addEventListener('beforeprint',()=>{printedDetails=Array.from(document.querySelectorAll('.faq')).map(el=>[el,el.open]);printedDetails.forEach(([el])=>el.open=true);});window.addEventListener('afterprint',()=>printedDetails.forEach(([el,open])=>el.open=open));
  window.addEventListener('beforeunload',event=>{if(hasData()){event.preventDefault();event.returnValue='';}});
  PII_LANG.onChange(()=>{const tasks=[PII_I18N.en.task_default,PII_I18N.nl.task_default];if(tasks.includes($('ai-task').value))$('ai-task').value=t('task_default');if(state.detectedText!==null){state.detectedText=null;invalidateReview();renderReview();}renderList();renderHelp();renderImportReceipt();updateCount();if(isPrepared())renderPrompt();$('share-confirm').checked=false;syncButtons();});
  renderHelp();updateCount();showStep(1);if(location.hash==='#guide'||location.hash==='#faq')openHelp();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
