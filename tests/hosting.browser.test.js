'use strict';
const fs=require('fs'),path=require('path'),http=require('http');
const {launch,root}=require('./browser-support');
const out=path.resolve(root,'../docs/audit-2026-09-11-imports');
const raw=fs.readFileSync(path.join(root,'pii-shield.html'),'utf8');
const hosted=fs.readFileSync(path.join(root,'hosting/index.html'),'utf8');
const bundle=fs.readFileSync(path.join(root,'hosting/ish-ai-privacy-2.4.bundle.js'),'utf8');
const injection="<script>window.__unexpectedHostScript=true;</script><script src='/host-monitor.js'></script>";
const served=hosted.replace('</body>','</body>'+injection);
const checks=[];function check(name,value){checks.push({name,pass:!!value});console.log((value?'PASS ':'FAIL ')+name);}
(async()=>{let browser;const received=[];const server=http.createServer((req,res)=>{received.push(req.url);const isBundle=req.url.includes('ish-ai-privacy-2.4.bundle.js');res.writeHead(200,{'Content-Type':isBundle?'application/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(isBundle?bundle+(req.url.startsWith('/tampered/')?'\n;':''):served);});
 try{
  check('Only actual closing document tags can trigger a hosting insertion',(raw.match(/<\/body>/gi)||[]).length===1&&(raw.match(/<\/html>/gi)||[]).length===1);
  check('Hosted page with offline fonts remains under 768 KiB and binds its versioned bundle with integrity',Buffer.byteLength(hosted)<786432&&hosted.includes('integrity="sha256-')&&hosted.includes('src="ish-ai-privacy-2.4.bundle.js"'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  for(const engine of ['chromium','webkit','firefox']){
  browser=await launch(engine);const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  check(engine+': hosted bundle initializes with monitoring markup present',await page.locator('#stepbtn-1').getAttribute('aria-current')==='step');
  await page.check('#mode-codes');await page.click('#filename-tool summary');await page.fill('#filename-list','Sofia_Marin_2010-03-14.pdf');await page.click('#check-filenames');
  check(engine+': hosted file-name list detects the entire name',await page.locator('#preview mark').count()===1);
  await page.check('#review-confirm');await page.click('#to-step-3');const safe=await page.textContent('#anon-output');
  check(engine+': hosted filename replacement excludes the identifying text',safe.includes('[[FILE_')&&!safe.includes('Sofia')&&!safe.includes('2010'));
  await page.click('#to-step-5');await page.fill('#ai-text',safe);await page.click('#do-restore');
  check(engine+': hosted filename restores exactly',(await page.textContent('#restore-output')).includes('Sofia_Marin_2010-03-14.pdf'));
  check(engine+': CSP rejects the host inline monitoring script',!(await page.evaluate(()=>window.__unexpectedHostScript)));
  check(engine+': CSP prevents the monitoring request reaching the server',!received.includes('/host-monitor.js'));
  const shown=await page.evaluate(()=>{document.getElementById('open-help').click();const dd=[...document.querySelectorAll('.verify-list dd')].map(x=>x.textContent);return {dd,sri:document.querySelector('script[src][integrity]').getAttribute('integrity').replace(/^sha256-/,'')};});
  check(engine+': Check this build shows the edition and the hash that the integrity attribute enforces',shown.dd[0]==='2.4'&&shown.dd[1]===shown.sri&&shown.dd[2]==='ish-ai-privacy-2.4.bundle.js'&&shown.dd[3]==='matches the page policy');
  check(engine+': release record on disk lists the same hash',fs.readFileSync(path.join(root,'hosting/RELEASE-HASHES.txt'),'utf8').includes(shown.sri));
  check(engine+': no application exceptions or visible library source',errors.length===0&&!(await page.locator('body').innerText()).includes('SheetJS Table Export'));
  const tampered=await browser.newPage();await tampered.goto('http://127.0.0.1:'+server.address().port+'/tampered/');
  check(engine+': modified bundle is rejected by integrity checks',await tampered.locator('#stepbtn-1').getAttribute('aria-current')!=='step');
  await browser.close();browser=null;
  }
 }catch(error){checks.push({name:'Hosting suite completes',pass:false,detail:error.stack,errorCategory:'validation',isRetryable:false});}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));const failed=checks.filter(x=>!x.pass).length;const result={checkedAt:new Date().toISOString(),passed:checks.length-failed,failed,checks};fs.writeFileSync(path.join(out,'hosting-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=failed?1:0;}
})();
