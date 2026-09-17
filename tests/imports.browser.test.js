/* Independent import regression probes. All files and personal details are synthetic.
 * First: python3 tests/make-import-fixtures.py
 * Then: node tests/imports.browser.test.js chromium
 * Optional PII_IMPORT_FIXTURES and PII_IMPORT_EVIDENCE override local paths.
 */
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {execFileSync}=require('child_process');
const {launch,serve,root}=require('./browser-support');
const engine=process.argv[2]||'chromium',apiOnly=process.argv.includes('--api-only');
const live=process.argv.includes('--live-confirmed');
const ownsFixtures=!process.env.PII_IMPORT_FIXTURES;
const fixtures=process.env.PII_IMPORT_FIXTURES||fs.mkdtempSync(path.join(os.tmpdir(),'privacy-import-fixtures-'));
if(ownsFixtures)execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'make-import-fixtures.py'),fixtures],{stdio:'inherit'});
const out=process.env.PII_IMPORT_EVIDENCE||path.resolve(root,'../docs/audit-2026-09-11-imports');
const manifest=JSON.parse(fs.readFileSync(path.join(fixtures,'fixture-manifest.json')));
const checks=[],timings=[],skipped=[];let browser,server,page,url;
function check(name,pass,detail){checks.push({name,pass:!!pass,...(!pass&&detail!==undefined?{detail}:{} )});console.log((pass?'PASS ':'FAIL ')+name);}
async function probe(name,fn){try{await fn();}catch(e){check(name+' completes',false,e.stack);}}
function validError(result){return !result.ok&&typeof result.code==='string'&&result.code.length>0&&['transient','validation','business','permission'].includes(result.errorCategory)&&typeof result.isRetryable==='boolean';}
async function direct(file,options={}){
 await page.setInputFiles('#qa-import-file',path.join(fixtures,file));
 const result=await page.evaluate(async options=>{
  const f=document.getElementById('qa-import-file').files[0],progress=[],controller=new AbortController();
  if(options.preAbort)controller.abort();
  try{const result=await window.PIIImports.extract(f,{lang:options.lang||'en',signal:controller.signal,onProgress:c=>{progress.push(c);if(options.abortAtSlide&&c.slides>=options.abortAtSlide)controller.abort();}});return {ok:true,...result,progress};}
  catch(e){return {ok:false,code:e.code,errorCategory:e.errorCategory,isRetryable:e.isRetryable,message:e.message,progress};}
 },options);return result;
}
async function uiImport(file,expected){
 await page.setInputFiles('#file-input',path.join(fixtures,file));
 await page.waitForFunction(token=>document.getElementById('input-text').value.includes(token),expected,{timeout:10000});
 return page.inputValue('#input-text');
}
(async()=>{
 try{
  if(live)url='https://shield.ishweb.nl/';else ({server,url}=await serve());browser=await launch(engine);page=await browser.newPage();page.setDefaultTimeout(10000);page.on('dialog',d=>d.accept());
  const network=[],errors=[];page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.PIIImports&&typeof window.PIIImports.extract==='function');const initialNetwork=network.length;
  await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='qa-import-file';input.hidden=true;document.body.appendChild(input);});
  const limits=await page.evaluate(()=>window.PIIImports.limits);
  check('Input cap is 50 MiB; extracted text cap stays 100,000 characters',limits.file===50*1024*1024&&limits.text===100000,limits);
  const results={};
  for(const spec of manifest.fixtures){
   await probe(spec.file,async()=>{
    const started=Date.now(),result=await direct(spec.file);timings.push({file:spec.file,ms:Date.now()-started});results[spec.file]=result;
    if(spec.error){check(spec.file+' rejects with a structured error',validError(result),result);return;}
    check(spec.file+' extracts successfully',result.ok,result);if(!result.ok)return;
    check(spec.file+' returns all count fields and stable warning codes',Object.entries(result.counts||{}).length===6&&['slides','pages','sheets','hidden','notes','comments'].every(k=>Number.isInteger(result.counts[k])&&result.counts[k]>=0)&&Array.isArray(result.warnings)&&result.warnings.every(x=>typeof x==='string'&&/^import_[a-z_]+$/.test(x)),result);
    for(const value of spec.contains||[])check(spec.file+' preserves '+value,result.text.includes(value),result.text);
    if(spec.ordered){const positions=spec.ordered.map(x=>result.text.indexOf(x));check(spec.file+' follows document order',positions.every((n,i)=>n>=0&&(!i||n>positions[i-1])),positions);}
    check(spec.file+' reports progress without going backwards',result.progress.length>0&&result.progress.every((p,i)=>!i||['slides','pages','sheets'].every(k=>p[k]>=result.progress[i-1][k])),result.progress);
   });
  }
  const rich=results['slides-order-notes-hidden-comments.pptx'];if(rich?.ok){
   check('PPTX counts include three slides, one hidden slide, two note parts, one comment',rich.counts.slides===3&&rich.counts.hidden===1&&rich.counts.notes===2&&rich.counts.comments===1,rich.counts);
   check('PPTX notes remain next to their associated slide',rich.text.indexOf('FIRST_NOTES')>rich.text.indexOf('FIRST_SLIDE')&&rich.text.indexOf('FIRST_NOTES')<rich.text.indexOf('SECOND_SLIDE')&&rich.text.indexOf('SECOND_NOTES')>rich.text.indexOf('SECOND_SLIDE')&&rich.text.indexOf('SECOND_NOTES')<rich.text.indexOf('THIRD_HIDDEN_SLIDE'),rich.text);
   check('External hyperlink is flagged for manual review without fetching it',rich.warnings.includes('import_external'),rich.warnings);
  }
  const odt=results['writer-text-spaces-annotations.odt'];if(odt?.ok){check('ODT inline whitespace, tab and line break preserve following text',odt.text.includes('Sofia  Marin\tDOB: 14/03/2010\nSECOND_LINE & <literal>'),odt.text);check('ODT annotation count is reported',odt.counts.comments===1,odt.counts);}
  const odp=results['presentation-pages-notes.odp'];if(odp?.ok)check('ODP hidden slide and speaker notes are counted',odp.counts.slides===2&&odp.counts.hidden===1&&odp.counts.notes===1,odp.counts);
  const ods=results['spreadsheet-repeated-cells.ods'];if(ods?.ok)check('ODS represents repeated identical content once and explicitly flags it',ods.warnings.includes('import_repeated')&&(ods.text.match(/Sofia Marin/g)||[]).length===1,ods);
  const xlsx=results['spreadsheet-strings-date-hidden.xlsx'];if(xlsx?.ok){check('Excel dates become readable dates',/2010-03-14|14[\/-]0?3[\/-]2010|3\/14\/10/.test(xlsx.text),xlsx.text);check('Workbook order and hidden sheet count are preserved',xlsx.text.indexOf('Sofia Marin')<xlsx.text.indexOf('HIDDEN_WORKSHEET')&&xlsx.counts.sheets===2&&xlsx.counts.hidden===1,xlsx);}
  for(const [file,type] of [['generated-staff-presentation.pptx','slides'],['generated-staff-presentation.odp','slides'],['generated-staff-workbook.xlsx','sheets'],['generated-staff-workbook.ods','sheets']]){const r=results[file];if(r?.ok)check(file+' reports its real hidden content',r.counts.hidden===1&&r.counts[type]===(type==='slides'?3:2),r.counts);}
  for(const file of ['generated-staff-presentation.pptx','generated-staff-presentation.odp']){const r=results[file];if(r?.ok)check(file+' separates document property values into labelled lines',/(?:creator|initial-creator): Fictional QA Author\n/.test(r.text),r.text);}
  const pdf=results['selectable-text.pdf'];if(pdf?.ok)check('Selectable PDF page count is reported',pdf.counts.pages===1,pdf.counts);
  await probe('Dutch import labels',async()=>{const nl=await direct('slides-order-notes-hidden-comments.pptx',{lang:'nl'});check('Dutch import uses Dia and sprekersnotities labels',nl.ok&&nl.text.includes('[Dia 1]')&&nl.text.includes('sprekersnotities')&&nl.text.includes('verborgen'),nl);});
  await probe('Pre-aborted import',async()=>{const r=await direct('slides-larger-than-10mb.pptx',{preAbort:true});check('Pre-aborted import rejects as cancelled',validError(r)&&r.code==='file_cancelled',r);});
  await probe('Mid-import cancellation',async()=>{const r=await direct('slides-order-notes-hidden-comments.pptx',{abortAtSlide:1});check('Cancelling during progress never returns partially extracted success',validError(r)&&r.code==='file_cancelled'&&r.progress.some(x=>x.slides===1),r);});
  await probe('Unsupported binary and invalid text encodings',async()=>{
   const r=await page.evaluate(async()=>{const result=[];for(const [name,data] of [['legacy.ppt','not an OOXML package'],['invalid.txt',new Uint8Array([0xc0,0x80])]])try{await PIIImports.extract(new File([data],name));result.push({ok:true});}catch(e){result.push({ok:false,code:e.code,errorCategory:e.errorCategory,isRetryable:e.isRetryable});}return result;});
   check('Legacy binary PowerPoint rejects clearly',validError(r[0])&&r[0].code==='file_unsupported',r[0]);check('Invalid UTF-8 rejects instead of losing characters',validError(r[1])&&r[1].code==='file_encoding',r[1]);
  });
  if(apiOnly)skipped.push('UI integration probes excluded by --api-only');else{
   await probe('Input format picker',async()=>{const accepted=(await page.getAttribute('#file-input','accept')).split(',');check('Picker advertises every supported extension',(await page.evaluate(()=>PIIImports.extensions)).every(x=>accepted.includes('.'+x)),accepted);});
   await probe('Larger-file UI import',async()=>{const txt=await uiImport('slides-larger-than-10mb.pptx','BASELINE_SLIDE');check('UI accepts a 12 MiB presentation and prepends its file name',txt.includes('slides-larger-than-10mb.pptx')&&txt.startsWith('File name:'),txt);});
   await probe('File-name review',async()=>{
    await page.setInputFiles('#file-input',{name:'Sofia_Marin_14-03-2010.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:fs.readFileSync(path.join(fixtures,'slides-package-absolute-target.pptx'))});
    await page.waitForFunction(()=>document.getElementById('input-text').value.includes('Sofia_Marin_14-03-2010.pptx'));
    await page.click('#to-step-2');const matches=await page.textContent('#review-tbody');check('Identifying name and date from imported file name enter the review',matches.includes('Sofia')&&matches.includes('2010'),matches);await page.click('#stepbtn-1');
   });
   await probe('Oversize UI preservation',async()=>{
    await page.fill('#input-text','CURRENT-SOURCE-KEEP');await page.setInputFiles('#file-input',path.join(fixtures,'slides-over-50mb.pptx'));await page.waitForFunction(()=>!document.getElementById('file-note').hidden&&document.getElementById('file-note').textContent.includes('50'));
    check('Over-50-MiB UI rejection preserves the prior source',(await page.inputValue('#input-text'))==='CURRENT-SOURCE-KEEP');
   });
   await probe('Text cap includes the file name',async()=>{
    await page.fill('#input-text','KEEP-BEFORE-TEXT-LIMIT');await page.setInputFiles('#file-input',{name:'name-and-prefix-count.md',mimeType:'text/markdown',buffer:Buffer.from('A'.repeat(99995))});await page.waitForFunction(()=>!document.getElementById('file-note').hidden&&/100[,. ]?000/.test(document.getElementById('file-note').textContent));
    check('Filename prefix cannot push accepted source beyond 100,000 characters',(await page.inputValue('#input-text'))==='KEEP-BEFORE-TEXT-LIMIT');
   });
   await probe('Markdown and TSV UI import',async()=>{
    await uiImport('plain-markdown.md','onerror');await page.click('#to-step-2');check('Markdown markup remains inert during review',await page.evaluate(()=>!window.LEAK&&!document.querySelector('#preview img, #preview script')));await page.click('#stepbtn-1');
    const txt=await uiImport('plain-tab-separated.tsv','Name\tDate of birth');check('TSV imports without losing row and column separators',txt.includes('Name\tDate of birth\nSofia Marin\t14/03/2010'));
   });
   for(const action of ['edit','clear','cancel'])await probe('Pending file '+action,async()=>{
    await page.evaluate(()=>{window.qaOriginalArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='delayed.md')return new Promise(resolve=>window.qaFinishRead=()=>resolve(new TextEncoder().encode('STALE-PRIVATE-DATA').buffer));return window.qaOriginalArrayBuffer.call(this);};});
    await page.setInputFiles('#file-input',{name:'delayed.md',mimeType:'text/markdown',buffer:Buffer.from('STALE-PRIVATE-DATA')});await page.waitForFunction(()=>typeof window.qaFinishRead==='function');
    const before=await page.inputValue('#input-text');if(action==='edit')await page.fill('#input-text','CURRENT-EDIT');else if(action==='clear')await page.click('#start-over');else await page.click('#cancel-import');
    await page.evaluate(()=>{File.prototype.arrayBuffer=window.qaOriginalArrayBuffer;window.qaFinishRead();delete window.qaFinishRead;});await page.waitForTimeout(50);
    check('Late import cannot overwrite source after '+action,(await page.inputValue('#input-text'))===(action==='edit'?'CURRENT-EDIT':action==='cancel'?before:'' ));
   });
   await probe('Import receipt, language and accessibility',async()=>{
    fs.mkdirSync(out,{recursive:true});await uiImport('slides-order-notes-hidden-comments.pptx','FIRST_SLIDE');
    const receipt=await page.textContent('#import-receipt');
    check('Receipt reports the actual format, count and hidden content',receipt.includes('PPTX')&&receipt.includes('3 slide(s)')&&receipt.includes('1 hidden'));
    check('Receipt explains original attachment and external-content limits',receipt.includes('original document')&&receipt.includes('External links were not opened'));
    await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
    for(const lang of ['en','nl']){
     if(lang==='nl')await page.click('#lang-toggle');
     for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
      const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id));
      check('Populated import receipt accessibility '+lang+' '+width,violations.length===0,violations);
      check('Populated import receipt fits viewport '+lang+' '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(out,'import-receipt-'+(live?'live-':'')+engine+'-'+lang+'-'+width+'.png'),fullPage:true});
     }
    }
    check('Receipt language switches to Dutch', (await page.textContent('#import-receipt')).includes('3 dia’s'));
    await page.click('#start-over');check('Clear session removes receipt and source',!(await page.locator('#import-receipt').isVisible())&&(await page.inputValue('#input-text'))==='');
   });
  }
  check('Importing and reviewing every fixture makes zero additional HTTP requests',network.length===initialNetwork,network.slice(initialNetwork));
  check('No imported markup executes',await page.evaluate(()=>!window.LEAK));
  check('No uncaught browser errors',errors.length===0,errors);
 }catch(e){check('Import browser suite completes',false,e.stack);console.error(e.stack);}
 finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));fs.mkdirSync(out,{recursive:true});const failed=checks.filter(x=>!x.pass).length;const result={engine,url,scope:apiOnly?'API only':'API and UI',passed:checks.length-failed,failed,skipped,fixtures:manifest.fixtures.length,checks,timings};fs.writeFileSync(path.join(out,'imports-'+engine+(apiOnly?'-api':'')+(live?'-live':'')+'.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,failed,fixtures:result.fixtures,skipped,evidence:out}));if(ownsFixtures)fs.rmSync(fixtures,{recursive:true,force:true});process.exitCode=failed?1:0;}
})();
