/* Public ISH Web release verification. Fictional data only. No authenticated surfaces. */
'use strict';
const fs = require('fs');
const path = require('path');
const {createRequire} = require('module');
const root = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(root, 'package.json'));
const {launch} = require(path.join(root, 'tests/browser-support.js'));
const out = path.resolve(root, '../docs/audit-2026-09-11-imports');
const base = process.env.PRIVACY_LIVE_BASE || 'https://shield.ishweb.nl/';
const expectedUrl = new URL(base);
if (expectedUrl.protocol !== 'https:' || !['ishweb.nl','shield.ishweb.nl'].includes(expectedUrl.hostname) || expectedUrl.search || expectedUrl.hash || expectedUrl.username || expectedUrl.password) {
  console.error(JSON.stringify({errorCategory:'validation',isRetryable:false,message:'PRIVACY_LIVE_BASE must be a public HTTPS route on ishweb.nl or shield.ishweb.nl, without query, credentials or fragment.'}));
  process.exit(2);
}
const evidencePrefix = expectedUrl.hostname === 'shield.ishweb.nl' ? 'shield' : 'ishweb';
const modes = process.argv.filter(value => ['chromium', 'webkit'].includes(value));
if (!process.argv.includes('--live-confirmed')) {
  console.error(JSON.stringify({errorCategory:'validation', isRetryable:false, message:'Pass --live-confirmed to run these checks against the public deployment.'}));
  process.exit(2);
}
if (!modes.length) modes.push('chromium', 'webkit');
fs.mkdirSync(out, {recursive:true});
const axeSource = fs.readFileSync(localRequire.resolve('axe-core/axe.min.js'), 'utf8');
const expectedMark = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'brand/ish-mark.png')).toString('base64');
async function run(mode) {
  const checks = [], errors = [], processingRequests = [], loadRequests = [];
  let browser, page, processing = false, finalUrl = null;
  function check(name, pass, detail) {
    checks.push({name, pass:!!pass, ...(!pass ? {detail} : {})});
    console.log(mode+' '+(pass ? 'PASS ' : 'FAIL ')+name);
  }
  async function fontsReady() {
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().endTime < Infinity).map(a => a.finished.catch(()=>{}))); });
  }
  async function visualChecks(stage, widths) {
    await page.evaluate(axeSource);
    for (const width of widths) {
      await page.setViewportSize({width, height:1000});
      await fontsReady();
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id, impact:v.impact, targets:v.nodes.map(n=>n.target)})));
      check(stage+' accessibility '+width, violations.length === 0, violations);
      const dimensions = await page.evaluate(() => ({content:document.documentElement.scrollWidth, viewport:innerWidth}));
      check(stage+' no overflow '+width, dimensions.content <= dimensions.viewport, dimensions);
      await page.screenshot({path:path.join(out, evidencePrefix+'-'+mode+'-'+stage+'-'+width+'.png'), fullPage:true});
    }
  }
  async function clear() { await page.click('#start-over'); }
  async function prepare() { await page.check('#review-confirm'); await page.click('#to-step-3'); }
  try {
    browser = await launch(mode);
    const context = await browser.newContext({viewport:{width:1440,height:1000}, locale:'en-GB', colorScheme:'light'});
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    page.on('request', r => { if (/^https?:/.test(r.url())) (processing ? processingRequests : loadRequests).push({url:r.url(), method:r.method(), type:r.resourceType()}); });
    const response = await page.goto(base, {waitUntil:'load', timeout:60000});
    finalUrl = page.url();
    await page.waitForFunction(() => document.getElementById('stepbtn-1')?.getAttribute('aria-current') === 'step');
    await fontsReady();
    const loadedUrl = new URL(finalUrl);
    check('Public privacy route responds and initializes', response?.status() === 200 && loadedUrl.protocol === 'https:' && loadedUrl.hostname === expectedUrl.hostname && loadedUrl.pathname === expectedUrl.pathname, {status:response?.status(),url:finalUrl,expected:base});
    check('Published title and edition are current', (await page.title()) === 'ISH AI Privacy | ISH Academy' && (await page.textContent('.version')).includes('Staff edition 2.4'));
    check('Versioned bundle is 2.4', await page.locator('script[src$="ish-ai-privacy-2.4.bundle.js"]').count() === 1);
    const mark = await page.locator('.privacy-logo img').evaluate(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}));
    check('Official bundled ISH mark matches the reviewed asset', mark.src === expectedMark && mark.complete && mark.width > 0 && mark.height > 0, {complete:mark.complete,width:mark.width,height:mark.height});
    const fonts = await page.evaluate(()=>({body:getComputedStyle(document.body).fontFamily, heading:getComputedStyle(document.querySelector('h1')).fontFamily, faces:[...document.fonts].map(f=>({family:f.family.replace(/["']/g,''),status:f.status}))}));
    check('Brand typefaces load from the bundled build', fonts.body.includes('Source Sans 3') && fonts.heading.includes('Fjalla One') && ['Source Sans 3','Fjalla One'].every(family=>fonts.faces.some(f=>f.family===family&&f.status==='loaded')), fonts);
    processing = true;
    check('Removal is the initial default', await page.locator('#mode-remove').isChecked() && !(await page.locator('#mode-codes').isChecked()));
    check('Removal has no restoration navigation', !(await page.locator('#restore-nav').isVisible()) && !(await page.locator('#stepbtn-5').isEnabled()));
    await visualChecks('add', [1440,390]);
    await page.click('#readability'); await fontsReady();
    const readable = await page.evaluate(()=>({family:getComputedStyle(document.body).fontFamily,loaded:[...document.fonts].some(f=>f.family.replace(/["']/g,'')==='Atkinson Hyperlegible'&&f.status==='loaded')}));
    check('Reading view loads Atkinson Hyperlegible', readable.family.includes('Atkinson Hyperlegible') && readable.loaded, readable);
    await page.click('#readability');

    // Filename list, including a non-Latin name and an ID, through the real UI.
    await page.click('#filename-tool summary');
    await page.fill('#filename-list', 'Sofia_Marin_2010-03-14.pdf\n李_王_12345.xlsx');
    await page.click('#check-filenames');
    check('Filename list detects both whole names', (await page.locator('#preview mark').allTextContents()).length === 2);
    check('Filename preparation requires review', !(await page.locator('#to-step-3').isEnabled()));
    await prepare();
    const names = await page.textContent('#anon-output');
    check('Filename output removes names dates and IDs', names.split('[REMOVED]').length === 3 && !/Sofia|Marin|2010|李|王|12345/.test(names), names);
    await clear();

    // The AI request itself must be inside the review and removal boundary.
    await page.fill('#input-text', 'A report for Sofia Marin. Keep the facts unchanged.');
    await page.fill('#ai-task', 'Summarise for parent@example.org, DOB: 2009/03/09.');
    await page.click('#to-step-2');
    const marks = await page.locator('#preview mark').allTextContents();
    check('Request email and birth date are detected', marks.includes('parent@example.org') && marks.includes('2009/03/09'), marks);
    check('Review calls out identifying context', /class|location/.test(await page.textContent('.context-check')));
    await visualChecks('review', [390]);
    await prepare();
    const removed = await page.textContent('#anon-output');
    check('Default removal protects both request and source', removed.includes('[REMOVED]') && !/parent@example\.org|2009|Sofia|Marin|\[\[PERSON_/.test(removed), removed);
    const privateState = await page.evaluate(()=>({values:['input-text','ai-task','ai-text','manual-value','filename-list','file-input','csv-input'].map(id=>document.getElementById(id).value),text:['preview','review-tbody','file-note','csv-count','restore-output'].map(id=>document.getElementById(id).textContent)}));
    check('Removal clears source request filename fields and hidden private preview', [...privateState.values,...privateState.text].every(value=>value===''), privateState);
    check('Removal cannot return to discarded review or restore', !(await page.locator('#back-to-2').isVisible()) && !(await page.locator('#stepbtn-2').isEnabled()) && !(await page.locator('#to-step-5').isVisible()) && !(await page.locator('#stepbtn-5').isEnabled()));
    check('Sharing requires separate acknowledgement', !(await page.locator('#copy-safe').isEnabled()) && !(await page.locator('#download-safe').isEnabled()));
    await visualChecks('prepared', [390]);
    await page.check('#share-confirm');
    const pendingDownload = page.waitForEvent('download'); await page.click('#download-safe');
    const download = await pendingDownload; const exported = fs.readFileSync(await download.path(),'utf8');
    check('Download contains exactly the full reviewed prompt', exported === await page.textContent('#prompt-output'));
    check('Downloaded prompt and filename contain no selected source identifiers', !/parent@example\.org|2009|Sofia|Marin/.test(exported+' '+download.suggestedFilename()));
    await clear();

    // Optional restoration is retained for the staff workflow that needs it.
    await page.check('#mode-codes'); await page.click('#try-example'); await page.click('#to-step-2');
    const original = await page.textContent('#preview');
    check('Practice example includes multiple personal-detail detections', await page.locator('#preview mark').count() >= 5);
    await prepare(); const coded = await page.textContent('#anon-output');
    check('Optional mode replaces identifiers with codes', /\[\[PERSON_\d+\]\]/.test(coded) && !/Sofia|14 March|2554/.test(coded));
    await page.click('#to-step-5'); await page.fill('#ai-text', coded); await page.click('#do-restore');
    check('Optional reply restores exactly to the reviewed source and request', (await page.textContent('#restore-output')) === original);
    await visualChecks('restore', [390]);
    await clear();

    await page.click('#open-help');
    check('English tutorial and eighteen FAQs are present', await page.locator('.guide-steps>li').count() === 6 && await page.locator('.faq').count() === 25);
    const enGuide = await page.textContent('#help-content');
    check('English guide covers staff roles filenames and compliance limit', /Learning support/.test(enGuide) && /file names/.test(enGuide) && /does not certify compliance/.test(enGuide));
    await visualChecks('guide-en', [1440,390]);
    await page.click('#lang-toggle');
    const nlGuide = await page.textContent('#help-content');
    check('Dutch tutorial and eighteen FAQs are present', await page.locator('.guide-steps>li').count() === 6 && await page.locator('.faq').count() === 25);
    check('Dutch guide covers staff roles filenames and compliance limit', /Leerlingondersteuning/.test(nlGuide) && /bestandsnamen/.test(nlGuide) && /certificeert geen AVG/.test(nlGuide));
    await visualChecks('guide-nl', [390]);
    await page.click('#lang-toggle'); await page.click('#close-help');
    await page.setViewportSize({width:1440,height:1000});
    check('No processing network requests', processingRequests.length === 0, processingRequests);
    check('No application exceptions', errors.length === 0, errors);
    check('No browser storage or script-visible cookies created', await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0&&document.cookie===''));
    check('Session ends with private source and outputs cleared', (await page.inputValue('#input-text')) === '' && (await page.textContent('#anon-output')) === '' && (await page.textContent('#restore-output')) === '');
  } catch (error) {
    check('Public ISH Web journey completes', false, {message:error.stack,errorCategory:'validation',isRetryable:false});
  } finally {
    if (browser) await browser.close();
    const result = {browser:mode,base,finalUrl,checkedAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,loadRequests,processingRequests,errors,checks};
    fs.writeFileSync(path.join(out,evidencePrefix+'-'+mode+'-live-results.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({browser:mode,passed:result.passed,failed:result.failed}));
    return result;
  }
}
(async()=>{ const results=[]; for (const mode of modes) results.push(await run(mode)); process.exitCode=results.some(result=>result.failed)?1:0; })();
