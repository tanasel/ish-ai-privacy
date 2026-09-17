/* Independent staff edition 2.1 privacy regression journeys. Fictional data only. */
'use strict';
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {launch,serve,root}=require('./browser-support');
const mode=process.argv[2]||'chromium';
const out=path.resolve(root,'../docs/audit-2026-09-11-imports');
fs.mkdirSync(out,{recursive:true});
const results=[],pageErrors=[],processingRequests=[];
function check(name,pass,detail){results.push({name,pass:!!pass,...(!pass?{detail}:{})});console.log((pass?'PASS ':'FAIL ')+name+(!pass?' '+JSON.stringify(detail):''));}
async function prepared(page){await page.check('#review-confirm');await page.click('#to-step-3');}
async function clear(page){await page.click('#start-over');}
async function content(page,id){return await page.locator(id).textContent();}
async function noPrivateControls(page){return page.evaluate(()=>{
 const values=['input-text','ai-text','ai-task','manual-value','file-input','csv-input','filename-list'].map(id=>[id,document.getElementById(id).value]);
 const text=['preview','review-tbody','detect-summary','file-note','manual-note','csv-count','restore-output','flagged-panel'].map(id=>[id,document.getElementById(id).textContent]);
 return {left:[...values,...text].filter(([,value])=>value!==''),files:['file-input','csv-input'].map(id=>document.getElementById(id).files.length)};
 });}
async function downloaded(page){const pending=page.waitForEvent('download');await page.click('#download-safe');const item=await pending;return {name:item.suggestedFilename(),text:fs.readFileSync(await item.path(),'utf8')};}
async function attachPage(context,url){const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);await page.goto(url);await page.waitForFunction(()=>document.getElementById('stepbtn-1')?.getAttribute('aria-current')==='step');await page.evaluate(()=>document.fonts.ready);page.on('request',req=>{if(/^https?:/.test(req.url()))processingRequests.push(req.url());});return page;}
async function accessibility(page,stage){
 const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');await page.evaluate(axeSource);
 const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
 check('Mobile accessibility: '+stage,violations.length===0,violations);
 check('Mobile layout has no page overflow: '+stage,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,mode+'-privacy-'+stage+'-390.png'),fullPage:true});
}
(async()=>{
 const {server,url}=await serve();let browser;
 try{
  browser=await launch(mode);
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-GB',colorScheme:'light'});
  const page=await attachPage(context,url);
  check('Removal is the initial default',await page.locator('#mode-remove').isChecked()&&!(await page.locator('#mode-codes').isChecked()));
  check('Default flow has no restoration navigation',!(await page.locator('#restore-nav').isVisible())&&!(await page.locator('#stepbtn-5').isEnabled()));
  check('Request belongs to the initial source stage',await page.locator('#step-1 #ai-task').count()===1&&await page.locator('#ai-task').getAttribute('autocomplete')==='off');
  await accessibility(page,'add');
  await page.evaluate(()=>{window.__mapperCalls=0;PIIEngine.createMapper=()=>{window.__mapperCalls++;throw new Error('Removal must never create a mapper');};});
  await page.setInputFiles('#csv-input',{name:'private-list.csv',mimeType:'text/csv',buffer:Buffer.from('first_name,last_name\nŽivana,Qettilun\n')});
  await page.waitForFunction(()=>document.getElementById('csv-count').textContent.includes('1'));
  const fileName='Sofia_Marin_2010-03-14.txt';
  await page.setInputFiles('#file-input',{name:fileName,mimeType:'text/plain',buffer:Buffer.from('Sofia Marin met Amir Haddad. Keep the explanation concise.')});
  await page.waitForFunction(()=>document.getElementById('input-text').value.includes('Sofia Marin'));
  const sensitive='The only child in class 8B has epilepsy.';
  await page.fill('#ai-task','Help Živana Qettilun. Send to request.only@example.org. DOB: 14/03/2010. '+sensitive);
  await page.click('#filename-tool summary');await page.fill('#filename-list','PRIVATE_UNSUBMITTED_FILENAME.pdf');
  await page.click('#to-step-2');
  const marks=await page.locator('#preview mark').allTextContents();
  check('Request email is included in detection',marks.includes('request.only@example.org'),marks);
  check('Request DOB is included in detection',marks.includes('14/03/2010'),marks);
  check('Provided Unicode name in the request is detected',marks.some(v=>v.includes('Živana')&&v.includes('Qettilun')),marks);
  check('Imported whole filename is included in detection',marks.some(v=>v.includes(fileName)),marks);
  check('Review explicitly addresses indirect and sensitive details',(await content(page,'.context-check')).includes('medical')&&(await content(page,'.context-check')).includes('class'));
  check('Removal discards-source consequence is visible before preparation',(await content(page,'#prepare-note')).includes('cleared')&&(await content(page,'#to-step-3')).includes('discard source'));
  await page.fill('#manual-value',sensitive);await page.click('#add-manual');
  check('A sensitive phrase in the request can be marked in full',(await page.locator('#preview mark').allTextContents()).includes(sensitive));
  await page.fill('#manual-value','PRIVATE_UNSUBMITTED_MANUAL_NOTE');
  check('Review is mandatory before removal',!(await page.locator('#to-step-3').isEnabled()));
  await accessibility(page,'review');
  await prepared(page);
  const output=await content(page,'#anon-output');
  check('Removal successfully prepares despite mapper being forbidden',await page.locator('#step-3').isVisible()&&await page.evaluate(()=>window.__mapperCalls)===0);
  check('Removal uses one generic marker without reversible person codes',output.includes('[REMOVED]')&&!/\[\[[A-Z]+_\d+\]\]/.test(output),output);
  const secrets=['Sofia','Marin','Amir','Haddad','Živana','Qettilun','request.only@example.org','14/03/2010','2010-03-14',sensitive];
  check('Prepared request and source omit every selected synthetic identifier',secrets.every(s=>!output.includes(s)),output);
  const privateState=await noPrivateControls(page);
  check('Preparation clears private form fields, file inputs and hidden review DOM',privateState.left.length===0&&privateState.files.every(n=>n===0),privateState);
  check('Removal cannot return to discarded review or restore details',!(await page.locator('#back-to-2').isVisible())&&!(await page.locator('#stepbtn-2').isEnabled())&&!(await page.locator('#to-step-5').isVisible())&&!(await page.locator('#stepbtn-5').isEnabled()));
  check('Prepared removal explains the remaining anonymity limit',(await content(page,'#output-mode-note')).includes('does not confirm anonymity'));
  check('Sharing remains gated after removal',!(await page.locator('#download-safe').isEnabled())&&!(await page.locator('#copy-safe').isEnabled()));
  await accessibility(page,'prepared');
  await page.check('#share-confirm');const exportFile=await downloaded(page);
  check('Downloaded bytes equal the complete reviewed prompt',exportFile.text===await content(page,'#prompt-output'));
  check('Downloaded bytes contain neither source nor request identifiers',secrets.every(s=>!exportFile.text.includes(s)),exportFile.text);
  check('Download has a neutral filename',!exportFile.name.includes('Sofia')&&!exportFile.name.includes('2010'));
  await page.click('#lang-toggle');
  check('Prepared removal survives language changes without recreating source',(await content(page,'#anon-output'))===output&&(await noPrivateControls(page)).left.length===0&&await page.evaluate(()=>window.__mapperCalls)===0);
  check('Language changes require renewed sharing acknowledgement',!(await page.locator('#share-confirm').isChecked())&&!(await page.locator('#copy-safe').isEnabled()));
  await page.click('#lang-toggle');
  await page.click('#stepbtn-1');
  check('Returning to Add text does not recover discarded input',(await page.inputValue('#input-text'))===''&&(await page.inputValue('#ai-task'))==='');
  await page.click('#stepbtn-3');
  check('Prepared removal survives navigation without recovering a source',(await content(page,'#anon-output'))===output&&(await noPrivateControls(page)).left.length===0);
  await page.click('#finish-removal');
  check('Finish clears prepared output and resets removal mode',(await content(page,'#anon-output'))===''&&(await content(page,'#prompt-output'))===''&&await page.locator('#mode-remove').isChecked());
  // An unchanged sensitive passage is not automatically anonymous merely because the detector finds nothing.
  await page.fill('#input-text','The only wheelchair user in class 8B has epilepsy.');await page.fill('#ai-task','Make the wording clearer.');await page.click('#to-step-2');
  check('Zero detections still require review and do not assert anonymity',!(await page.locator('#to-step-3').isEnabled())&&(await content(page,'#detect-summary')).includes('does not mean'));
  await clear(page);
  // Optional reversible mode retains its existing functionality, with the request inside the review boundary.
  const codes=await attachPage(context,url);
  await codes.evaluate(()=>{window.__mapperIds=[];window.__restoreIds=[];const original=PIIEngine.createMapper;PIIEngine.createMapper=()=>{const id=window.__mapperIds.length+1;window.__mapperIds.push(id);const mapper=original();const restore=mapper.restore;mapper.restore=text=>{window.__restoreIds.push(id);return restore(text);};return mapper;};});
  await codes.check('#mode-codes');await codes.fill('#input-text','Sofia Marin met Amir Haddad.');await codes.fill('#ai-task','Write to task.only@example.org.');await codes.click('#to-step-2');await prepared(codes);
  const originalReview='REQUEST\nWrite to task.only@example.org.\n\nTEXT\nSofia Marin met Amir Haddad.';
  const codeOutput=await content(codes,'#anon-output');
  check('Optional codes protect the reviewed request as well as source',/\[\[EMAIL_\d+\]\]/.test(codeOutput)&&/\[\[PERSON_\d+\]\]/.test(codeOutput)&&!codeOutput.includes('task.only@example.org'),codeOutput);
  await codes.click('#to-step-5');await codes.fill('#ai-text',codeOutput);await codes.click('#do-restore');
  check('Optional complete roundtrip restores the full reviewed request and source',await content(codes,'#restore-output')===originalReview,await content(codes,'#restore-output'));
  const firstPerson=codeOutput.match(/\[\[PERSON_\d+\]\]/)[0];await codes.fill('#ai-text',firstPerson+' prepared a report.');await codes.click('#do-restore');
  check('Partially missing known codes have an omission warning',await codes.locator('#flagged-panel').isVisible()&&(await content(codes,'#flagged-panel')).includes('[[PERSON_002]]'),await content(codes,'#flagged-panel'));
  await codes.click('#stepbtn-1');await codes.fill('#ai-task','Write to changed.request@example.org.');
  check('Editing request invalidates review, output and restoration',!(await codes.locator('#review-confirm').isChecked())&&!(await codes.locator('#stepbtn-3').isEnabled())&&!(await codes.locator('#stepbtn-5').isEnabled())&&(await content(codes,'#anon-output'))===''&&(await content(codes,'#restore-output'))==='');
  await codes.click('#to-step-2');
  check('Changed request is detected on its next review',(await codes.locator('#preview mark').allTextContents()).includes('changed.request@example.org'));
  await prepared(codes);await codes.click('#stepbtn-1');await codes.check('#mode-remove');
  check('Mode change discards prior prepared output and disables restoration',!(await codes.locator('#stepbtn-5').isEnabled())&&(await content(codes,'#anon-output'))===''&&(await content(codes,'#restore-output'))==='');
  const callsBefore=await codes.evaluate(()=>window.__restoreIds.length);
  await codes.evaluate(()=>document.getElementById('do-restore').click());
  check('Restore event cannot access the old key after mode change',await codes.evaluate(()=>window.__restoreIds.length)===callsBefore);
  await codes.click('#to-step-2');await prepared(codes);
  check('Switching a reviewed session to removal does not create another key',await codes.evaluate(()=>window.__mapperIds.length)===2&&(await content(codes,'#anon-output')).includes('[REMOVED]'));
  check('Switching to removal also clears retained original source and request',(await noPrivateControls(codes)).left.length===0);
  // A language change must invalidate reversible output because review section labels change.
  const codesLanguage=await attachPage(context,url);await codesLanguage.check('#mode-codes');await codesLanguage.fill('#input-text','Sofia Marin met Amir Haddad.');await codesLanguage.fill('#ai-task','Write to language.only@example.org.');await codesLanguage.click('#to-step-2');await prepared(codesLanguage);await codesLanguage.check('#share-confirm');await codesLanguage.click('#lang-toggle');
  check('Language change invalidates reversible review, output and restoration',!(await codesLanguage.locator('#review-confirm').isChecked())&&!(await codesLanguage.locator('#share-confirm').isChecked())&&!(await codesLanguage.locator('#stepbtn-5').isEnabled())&&(await content(codesLanguage,'#anon-output'))===''&&(await content(codesLanguage,'#restore-output'))==='');
  check('Language change preserves reversible source and request for another review',(await codesLanguage.inputValue('#input-text'))==='Sofia Marin met Amir Haddad.'&&(await codesLanguage.inputValue('#ai-task'))==='Write to language.only@example.org.');
  await codesLanguage.click('#stepbtn-1');await codesLanguage.click('#to-step-2');
  check('Review after a language change uses current language section labels',(await content(codesLanguage,'#preview')).startsWith('OPDRACHT\n')&&(await content(codesLanguage,'#preview')).includes('\n\nTEKST\n'));
  // Dutch mode shares the same removal semantics, including the instruction text.
  const nl=await attachPage(context,url);await nl.click('#lang-toggle');
  check('Dutch wording describes removal without a restoration key',(await content(nl,'[data-i18n="mode_remove_hint"]')).includes('zonder herstelsleutel'));
  await nl.fill('#ai-task','Schrijf aan nl.only@example.org. Geboortedatum: 03/07/2011.');await nl.fill('#input-text','Sofia Marin heeft korte instructies nodig.');await nl.click('#to-step-2');
  check('Dutch request email and DOB are detected',(await nl.locator('#preview mark').allTextContents()).includes('nl.only@example.org')&&(await nl.locator('#preview mark').allTextContents()).includes('03/07/2011'));
  await prepared(nl);const nlOutput=await content(nl,'#anon-output');
  check('Dutch output removes source and request details',nlOutput.includes('[REMOVED]')&&!/Sofia|Marin|nl\.only|03\/07\/2011/.test(nlOutput),nlOutput);
  check('Dutch source is cleared and anonymity is not promised',(await noPrivateControls(nl)).left.length===0&&(await content(nl,'#output-mode-note')).includes('geen anonimiteit'));
  // Local downloaded HTML must remain usable with the network unavailable.
  const diskContext=await browser.newContext({viewport:{width:390,height:844}});await diskContext.route(/^https?:\/\//,route=>route.abort());const disk=await diskContext.newPage();const diskRequests=[];
  disk.on('request',r=>{if(/^https?:/.test(r.url()))diskRequests.push(r.url());});disk.on('pageerror',e=>pageErrors.push(e.message));disk.on('dialog',d=>d.accept());
  await disk.goto(pathToFileURL(path.join(root,'pii-shield.html')).href);await diskContext.setOffline(true);await disk.fill('#ai-task','Write to offline.only@example.org.');await disk.fill('#input-text','Sofia Marin prepared a report.');await disk.click('#to-step-2');await prepared(disk);
  check('Downloaded HTML loads with no external requests and completes removal offline',(await content(disk,'#anon-output')).includes('[REMOVED]')&&!/Sofia|offline\.only/.test(await content(disk,'#anon-output'))&&diskRequests.length===0,diskRequests);
  check('Offline guide does not offer a broken repeated download',!(await disk.locator('#download-offline').isVisible()));
  check('No processing network requests',processingRequests.length===0,processingRequests);
  check('No runtime exceptions',pageErrors.length===0,pageErrors);
  check('No browser storage or cookies created',await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0&&document.cookie===''));
 }catch(error){check('Privacy browser suite completes',false,error.stack);}
 finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  const failed=results.filter(r=>!r.pass);const summary={browser:mode,checkedAt:new Date().toISOString(),passed:results.length-failed.length,failed:failed.length,results};
  fs.writeFileSync(path.join(out,mode+'-privacy-browser-results.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({browser:mode,passed:summary.passed,failed:summary.failed}));process.exitCode=failed.length?1:0;
 }
})();
