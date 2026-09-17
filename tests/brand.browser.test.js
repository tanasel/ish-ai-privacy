/* ISH AI Privacy brand and reflow audit. Fictional data only. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module'),{pathToFileURL}=require('url');
const appRoot=[process.env.PRIVACY_APP_ROOT,process.cwd(),path.join(process.cwd(),'pii-shield/app'),path.resolve(__dirname,'..')].filter(Boolean).find(p=>fs.existsSync(path.join(p,'tests/browser-support.js')));
if(!appRoot)throw new Error('Cannot locate the app. Run from its directory or set PRIVACY_APP_ROOT.');
const localRequire=createRequire(path.join(appRoot,'package.json'));
const {launch,serve}=localRequire('./tests/browser-support');
const mode=process.argv[2]||'chromium';
if(!['chromium','webkit','firefox'].includes(mode))throw new Error('Unknown browser '+mode);
const out=process.env.PRIVACY_BRAND_OUT||path.resolve(appRoot,'../docs/audit-2026-09-11-imports');
fs.mkdirSync(out,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
// Verified against the unchanged 498x498 mark in ISH Space and ISH Class public/brand.
const expectedMarkHash='a072e0c93c671b29bd6e9eff9569cdfaceae28474896ae99bb1546a86b460e86';
const artifactPaths=['pii-shield.html','ish-ai-privacy.html'];
const sourceHashes=Object.fromEntries(artifactPaths.map(p=>[p,hash(fs.readFileSync(path.join(appRoot,p)))]));
const expectedFaces=['Fjalla One','Source Sans 3','Atkinson Hyperlegible'];
const axeSource=fs.readFileSync(localRequire.resolve('axe-core/axe.min.js'),'utf8');
const results=[],errors=[],assetRequests=[],fontEvidence=[],screenshots=[];
function check(name,pass,detail){results.push({name,pass:!!pass,...(!pass?{detail}:{})});console.log((pass?'PASS ':'FAIL ')+name+(!pass?' '+JSON.stringify(detail):''));}
function dataBytes(uri){const match=/^data:([^,]*),(.*)$/s.exec(uri||'');if(!match)return null;return match[1].includes(';base64')?Buffer.from(match[2],'base64'):Buffer.from(decodeURIComponent(match[2]));}
async function settle(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime<Infinity).map(a=>a.finished.catch(()=>{})));});}
async function fonts(page,key,reading){
 const evidence=await page.evaluate(async faces=>{
  await Promise.all(faces.map(f=>document.fonts.load('400 18px "'+f+'"')));await document.fonts.ready;
  const faceInfo=[...document.fonts].map(f=>({family:f.family.replace(/^['"]|['"]$/g,''),status:f.status,weight:f.weight}));
  const family=s=>getComputedStyle(document.querySelector(s)).fontFamily;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const widths=faces.map(f=>{ctx.font='400 40px "'+f+'", monospace';const branded=ctx.measureText('ISH Privacy AamMWwie012').width;ctx.font='400 40px monospace';return {family:f,branded,fallback:ctx.measureText('ISH Privacy AamMWwie012').width};});
  return {faceInfo,widths,h1:family('h1'),body:family('body'),input:family('#input-text'),rootSize:getComputedStyle(document.documentElement).fontSize,bodySize:getComputedStyle(document.body).fontSize};
 },expectedFaces);
 fontEvidence.push({key,...evidence});
 check(key+': every bundled family has a loaded face',expectedFaces.every(f=>evidence.faceInfo.some(v=>v.family===f&&v.status==='loaded')),evidence.faceInfo);
 check(key+': loaded fonts render differently from the fallback',evidence.widths.every(w=>Math.abs(w.branded-w.fallback)>1),evidence.widths);
 check(key+': heading uses Fjalla One',evidence.h1.includes('Fjalla One'),evidence.h1);
 const body=reading?'Atkinson Hyperlegible':'Source Sans 3';
 check(key+': body and input use '+body,evidence.body.includes(body)&&evidence.input.includes(body),{body:evidence.body,input:evidence.input});
}
async function auditState(page,key,state){
 await settle(page);
 const label=key+' / '+state;
 const layout=await page.evaluate(()=>{
  const visible=el=>!!(el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const controls=[...document.querySelectorAll('button,.btn,select,input[type=text],textarea')].filter(visible).map(el=>{
   const r=el.getBoundingClientRect();return {id:el.id,text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,70),x:r.x,width:r.width,height:r.height,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth};
  });
  const textOutside=[...document.querySelectorAll('button')].filter(visible).flatMap(el=>{const box=el.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);const outside=[...range.getClientRects()].filter(r=>r.width>0&&(r.left<box.left-.75||r.right>box.right+.75));return outside.length?[{id:el.id,text:el.innerText,button:{left:box.left,right:box.right},textBounds:outside.map(r=>({left:r.left,right:r.right}))}]:[];});
  return {viewport:innerWidth,page:document.documentElement.scrollWidth,textOutside,offscreen:controls.filter(x=>x.x<-.75||x.x+x.width>innerWidth+.75),small:controls.filter(x=>x.height<43.5),clipped:controls.filter(x=>x.scrollWidth>x.clientWidth+3&&x.id!=='input-text'&&x.id!=='ai-task')};
 });
 check(label+': no horizontal page overflow',layout.page<=layout.viewport+1,layout);
 check(label+': form controls stay inside the viewport',layout.offscreen.length===0,layout.offscreen);
 check(label+': visible buttons and fields meet 44px height',layout.small.length===0,layout.small);
 check(label+': button and field text is not horizontally clipped',layout.clipped.length===0&&layout.textOutside.length===0,{clipped:layout.clipped,textOutside:layout.textOutside});
 const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 check(label+': axe WCAG A/AA reports no violations',violations.length===0,violations);
 const screenshot=path.join(out,'brand-'+mode+'-'+key+'-'+state+'.png');await page.screenshot({path:screenshot,fullPage:true});screenshots.push(screenshot);
}
async function runScenario(browser,url,scenario){
 const key=scenario.lang+'-'+scenario.width+'-'+scenario.view;
 const context=await browser.newContext({viewport:{width:scenario.width,height:1000},locale:'en-GB',colorScheme:scenario.view==='dark'?'dark':'light'});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push({key,message:e.message}));page.on('dialog',d=>d.accept());
 page.on('request',r=>{if(/^https?:/.test(r.url())&&['font','image'].includes(r.resourceType()))assetRequests.push({key,type:r.resourceType(),url:r.url()});});
 try{
  await page.goto(url);await settle(page);await page.evaluate(axeSource);
  if(scenario.lang==='nl')await page.click('#lang-toggle');
  if(scenario.view==='reading')await page.click('#readability');
  if(scenario.view==='contrast')await page.click('#contrast-toggle');
  if(scenario.view==='text200'){
   const scaled=await page.evaluate(()=>{const before=parseFloat(getComputedStyle(document.body).fontSize);const root=parseFloat(getComputedStyle(document.documentElement).fontSize);document.documentElement.style.fontSize=(root*2)+'px';return {before,after:parseFloat(getComputedStyle(document.body).fontSize)};});
   check(key+': body text is enlarged to 200 percent',scaled.after>=scaled.before*1.99,scaled);
  }
  if(scenario.view==='text200'){
   const skip=await page.locator('.skip-link').evaluate(el=>{const r=el.getBoundingClientRect();return {focused:document.activeElement===el,top:r.top,bottom:r.bottom};});
   check(key+': enlarged unfocused skip link remains fully off screen',!skip.focused&&skip.bottom<=0,skip);
  }
  if(scenario.width===390&&['light','reading','dark'].includes(scenario.view))await fonts(page,key,scenario.view==='reading');
  check(key+': document language matches the visible interface',await page.getAttribute('html','lang')===scenario.lang);
  await page.fill('#input-text','Sofia Marin met Amir Haddad. Email: family.contact.with.long.label@example.org\nHome address: 24 Example Road, The Hague 2554 BZ\nDOB: 14/03/2010. Keep the explanation concise.');
  await page.fill('#ai-task',scenario.lang==='nl'?'Maak een korte, algemene samenvatting.':'Write a short, general summary.');
  await auditState(page,key,'add');
  await page.click('#to-step-2');await page.click('#detection-options summary');
  check(key+': review opens and marks the fictional details',await page.locator('#step-2').isVisible()&&await page.locator('#preview mark').count()>=4);
  await auditState(page,key,'review');
  await page.check('#review-confirm');await page.click('#to-step-3');
  check(key+': removal output is usable',await page.locator('#step-3').isVisible()&&(await page.textContent('#anon-output')).includes('[REMOVED]')&&!(await page.textContent('#anon-output')).includes('Sofia'));
  await page.check('#share-confirm');check(key+': reviewed output enables copying',await page.locator('#copy-safe').isEnabled());
  await auditState(page,key,'output');
  await page.click('#open-help');await page.locator('.faq summary').first().click();
  check(key+': help retains all tutorial steps and FAQs',await page.locator('.guide-steps>li').count()===6&&await page.locator('.faq').count()===25);
  await auditState(page,key,'help');
  await page.click('#close-help');check(key+': leaving help returns to the prepared output',await page.locator('#step-3').isVisible()&&await page.locator('#copy-safe').isEnabled());
 }finally{await context.close();}
}
(async()=>{let browser,server;
 try{
  const started=await serve();server=started.server;browser=await launch(mode);
  const probe=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});probe.on('request',r=>{if(/^https?:/.test(r.url())&&['font','image'].includes(r.resourceType()))assetRequests.push({key:'brand-probe',type:r.resourceType(),url:r.url()});});
  await probe.goto(started.url);await settle(probe);
  const branding=await probe.evaluate(()=>{
   const image=document.querySelector('.privacy-logo img,img.privacy-logo,.brand img');const style=getComputedStyle(document.querySelector('.step-panel'));
   return {image:image?{src:image.currentSrc||image.src,width:image.naturalWidth,height:image.naturalHeight}:null,favicon:document.querySelector('link[rel="icon"]')?.href,border:style.borderTopWidth,borderColor:style.borderTopColor,radius:style.borderTopLeftRadius,shadow:style.boxShadow,stripes:[...document.querySelectorAll('.brand-stripe')].map(el=>[...el.children].map(x=>getComputedStyle(x).backgroundColor))};
  });
  const markBytes=dataBytes(branding.image?.src),faviconBytes=dataBytes(branding.favicon);
  check('Header displays the unchanged official ISH mark',!!markBytes&&hash(markBytes)===expectedMarkHash&&branding.image.width===498&&branding.image.height===498,{expectedMarkHash,actual:markBytes?hash(markBytes):null,image:branding.image?{width:branding.image.width,height:branding.image.height}:null});
  check('Favicon uses the unchanged official ISH mark',!!faviconBytes&&hash(faviconBytes)===expectedMarkHash,{expectedMarkHash,actual:faviconBytes?hash(faviconBytes):null});
  check('Main panel has a 3px black square border',branding.border==='3px'&&branding.borderColor==='rgb(0, 0, 0)'&&branding.radius==='0px',branding);
  check('Main panel uses a visible hard shadow',/\b[1-9]\d*px [1-9]\d*px 0px/.test(branding.shadow),branding.shadow);
  const stripe=['rgb(0, 82, 135)','rgb(155, 86, 162)','rgb(179, 210, 52)','rgb(242, 102, 72)','rgb(211, 13, 68)'];
  check('Top and footer stripes retain the five ISH colours in order',branding.stripes.length>=2&&branding.stripes.every(v=>JSON.stringify(v)===JSON.stringify(stripe)),branding.stripes);
  await probe.locator('.skip-link').focus();
  check('Keyboard focus reveals the skip link',await probe.locator('.skip-link').evaluate(el=>document.activeElement===el&&el.getBoundingClientRect().top>=0));
  await probe.evaluate(()=>document.documentElement.style.fontSize=(parseFloat(getComputedStyle(document.documentElement).fontSize)*2)+'px');
  check('Focused skip link remains fully visible at 200 percent text',await probe.locator('.skip-link').evaluate(el=>{const r=el.getBoundingClientRect();return document.activeElement===el&&r.top>=0&&r.bottom<=innerHeight;}));
  await probe.close();
  const scenarios=[];
  for(const lang of ['en','nl']){
   for(const width of [390,768,1440])scenarios.push({lang,width,view:'light'});
   for(const width of [390,1440])scenarios.push({lang,width,view:'dark'});
   scenarios.push({lang,width:390,view:'reading'},{lang,width:390,view:'contrast'},{lang,width:1440,view:'text200'});
  }
  const filter=process.env.PRIVACY_BRAND_VIEWS?.split(',');
  for(const scenario of scenarios.filter(s=>!filter||filter.includes(s.view)))await runScenario(browser,started.url,scenario);
  const offlineContext=await browser.newContext({viewport:{width:390,height:1000}});await offlineContext.route(/^https?:\/\//,route=>route.abort());const disk=await offlineContext.newPage();const offlineRequests=[];disk.on('request',r=>{if(/^https?:/.test(r.url()))offlineRequests.push({type:r.resourceType(),url:r.url()});});
  await disk.goto(pathToFileURL(path.join(appRoot,'ish-ai-privacy.html')).href);await offlineContext.setOffline(true);await settle(disk);await fonts(disk,'offline',false);
  check('Downloaded tool fonts and mark load without any HTTP requests',offlineRequests.length===0&&await disk.locator('.brand img').evaluate(el=>el.complete&&el.naturalWidth===498),offlineRequests);
  await offlineContext.close();
  check('No font or image HTTP requests in any hosted journey',assetRequests.length===0,assetRequests);
  check('No application exceptions in the tested views',errors.length===0,errors);
 }catch(error){check('Brand audit completes',false,{message:error.message,stack:error.stack,errorCategory:'validation',isRetryable:false});}
 finally{
  if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
  const finalHashes=Object.fromEntries(artifactPaths.map(p=>[p,hash(fs.readFileSync(path.join(appRoot,p)))]));
  check('Build bytes did not change during this audit',JSON.stringify(sourceHashes)===JSON.stringify(finalHashes),{sourceHashes,finalHashes});
  const summary={browser:mode,checkedAt:new Date().toISOString(),appRoot,expectedMarkHash,sourceHashes,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,scaling:'200% root text size, with the rendered body enlargement checked; not browser UI zoom',results,fontEvidence,screenshots,assetRequests,errors};
  fs.writeFileSync(path.join(out,'brand-'+mode+'-results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({browser:mode,passed:summary.passed,failed:summary.failed,screenshots:screenshots.length}));process.exitCode=summary.failed?1:0;
 }
})();
