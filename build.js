#!/usr/bin/env node
/* PII Shield single-file assembler.
 * Usage: node build.js [--no-vendor]
 * Reads index.template.html, inlines styles + vendor libs + names DB + engine + UI
 * into ONE pii-shield.html next to this script. */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { createHash } = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const NO_VENDOR = process.argv.includes('--no-vendor');
const VERIFY = process.argv.includes('--verify');

// Single source of truth for the edition. Tests and the in-app "Check this build" section read these values.
const APP_VERSION = '2.4';
const RELEASE_DATE_EN = '17 September 2026';
const SECURITY_CONTACT = 'mailto:a.tanasel@ishthehague.nl';
const SECURITY_EXPIRES = '2027-09-17T00:00:00.000Z';
const HASH_RECORD = 'RELEASE-HASHES.txt';

function read(p) { return fs.readFileSync(p, 'utf8'); }

function escScript(js) {
  // A literal "</script" inside the payload would end our <script> block early.
  // GoDaddy also scans for closing document tags without parsing JavaScript.
  // Escape those strings so its monitoring insertion cannot split a library.
  return js.replace(/<\/(script|body|html|head)/gi, match => '<\\/' + match.slice(2));
}

function parseCheck(label, code) {
  const tmp = path.join(os.tmpdir(), 'pii-shield-check-' + process.pid + '.js');
  fs.writeFileSync(tmp, code);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  } catch (e) {
    console.error('\nPARSE CHECK FAILED for ' + label + ':');
    console.error(String(e.stderr || e.message));
    process.exit(1);
  } finally {
    fs.unlinkSync(tmp);
  }
  console.log('  parse check OK: ' + label);
}

function requireFile(p, label) {
  if (!fs.existsSync(p)) {
    console.error('MISSING required file: ' + p + ' (' + label + ')');
    process.exit(1);
  }
  return read(p);
}

// ---- gather pieces ----
const template = requireFile(path.join(ROOT, 'index.template.html'), 'template');
const fontsDir = path.join(ROOT, 'brand', 'fonts');
const fontStyles = read(path.join(fontsDir, 'fonts.css')).replace(/url\(\.\/fonts\/([^)]*)\)/g, (_, file) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(fontsDir, file)).toString('base64') + ')');
const fontLicenses = ['fjalla-one', 'source-sans-3', 'atkinson-hyperlegible'].map(name => '/* ' + read(path.join(fontsDir, name + '-LICENSE.txt')) + ' */').join('\n');
const styles = fontLicenses + '\n' + fontStyles + '\n' + requireFile(path.join(ROOT, 'src', 'styles.css'), 'styles') + '\n' + requireFile(path.join(ROOT, 'src', 'brand.css'), 'ISH tool design');
const ishMark = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'brand', 'ish-mark.png')).toString('base64');
const bundleFile = 'ish-ai-privacy-' + APP_VERSION + '.bundle.js';
const namesDb = requireFile(path.join(ROOT, 'src', 'names_db.js'), 'names DB');
const engine = requireFile(path.join(ROOT, 'src', 'engine.js'), 'engine');
const i18n = requireFile(path.join(ROOT, 'src', 'i18n.js'), 'i18n') + '\n' + requireFile(path.join(ROOT, 'src', 'staff-copy.js'), 'staff wording') + '\n' + requireFile(path.join(ROOT, 'src', 'privacy-copy.js'), 'privacy wording') + '\n' + requireFile(path.join(ROOT, 'src', 'import-copy.js'), 'import wording');
const imports = requireFile(path.join(ROOT, 'src', 'imports.js'), 'local importers');
let ui = imports + '\n' + requireFile(path.join(ROOT, 'src', 'ui.js'), 'UI');
for (const [needle, value] of [['__PII_VERSION__', APP_VERSION], ['__PII_HASH_RECORD__', HASH_RECORD]]) {
  if (!ui.includes(needle)) { console.error('UI is missing build placeholder ' + needle); process.exit(1); }
  ui = ui.split(needle).join(value);
}
// Staff build has no remote model loader. All processing is bundled locally.

parseCheck('src/names_db.js', namesDb);
parseCheck('src/engine.js', engine);
parseCheck('src/i18n.js', i18n);
parseCheck('src/ui.js', ui);

let vendorBlock = '';
if (NO_VENDOR) {
  console.log('--no-vendor: skipping vendor libraries.');
  vendorBlock = '/* vendor libraries not bundled (--no-vendor build) */';
} else {
  const vendorDir = path.join(ROOT, 'vendor');
  let files = [];
  if (fs.existsSync(vendorDir)) {
    files = ['0_fflate.min.js','3_pdf.min.js','4_pdf.worker.min.js'].filter(f => fs.existsSync(path.join(vendorDir,f))); // Only parsers used by this app.
  }
  for (const required of ['0_fflate.min.js','3_pdf.min.js','4_pdf.worker.min.js']) {
    if (!files.includes(required)) {
      console.error('Missing required document parser: ' + required);
      process.exit(1);
    }
  }
  if (files.length === 0) {
    console.warn('WARNING: no vendor/*.js files found — building without file-format support (PDF/DOCX/XLSX). Paste-text still works.');
    vendorBlock = '/* no vendor libraries were present at build time */';
  } else {
    const parts = [];
    for (const f of files) {
      const p = path.join(vendorDir, f);
      let code;
      try { code = read(p); }
      catch (e) { console.error('Could not read required vendor file ' + f + ': ' + e.message); process.exit(1); }
      parseCheck('vendor/' + f, code);
      // Wrap each lib in try/catch so one broken lib cannot kill the app.
      parts.push('/* ---- vendor: ' + f + ' ---- */\ntry {\n' + code + '\n} catch (e) { console.warn("Vendor library ' + f.replace(/"/g, '') + ' failed to load:", e); }');
      console.log('  vendor inlined: ' + f + ' (' + (code.length / 1024).toFixed(0) + ' KB)');
    }
    vendorBlock = '/* ' + read(path.join(vendorDir, 'fflate-LICENSE.txt')) + ' */\n' + parts.join('\n');
  }
}

// ---- assemble (use function replacer so "$" in payloads is never special) ----
let out = template.replaceAll('{{ISH_MARK}}', ishMark);
for (const [key, value] of [['{{VERSION}}', APP_VERSION], ['{{RELEASE_DATE_EN}}', RELEASE_DATE_EN]]) {
  if (!out.includes(key)) { console.error('Template is missing placeholder ' + key); process.exit(1); }
  out = out.replaceAll(key, value);
}
const fills = {
  '{{STYLES}}': styles,
  '{{VENDOR}}': escScript(vendorBlock),
  '{{NAMES_DB}}': escScript(namesDb),
  '{{ENGINE}}': escScript(engine),
  '{{I18N}}': escScript(i18n),
  '{{UI}}': escScript(ui)
};
for (const key of Object.keys(fills)) {
  if (!out.includes(key)) {
    console.error('Template is missing placeholder ' + key);
    process.exit(1);
  }
  out = out.replace(key, () => fills[key]);
}

// ---- final parse check of the assembled script block ----
const m = out.match(/<script>([\s\S]*)<\/script>/);
if (!m) {
  console.error('Could not find the assembled <script> block in the output.');
  process.exit(1);
}
parseCheck('assembled <script> block', m[1].replace(/<\\\/script/g, '</scr' + 'ipt'));

// Hash only the executable script; injected host scripts are not trusted.
const scriptHash = createHash('sha256').update(m[1]).digest('base64');
const styleHash = createHash('sha256').update(out.match(/<style>([\s\S]*?)<\/style>/)[1]).digest('base64');
const csp = "default-src 'none'; script-src 'sha256-" + scriptHash + "'; style-src 'sha256-" + styleHash + "'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src blob:; base-uri 'none'; form-action 'none'; object-src 'none'";
out = out.replace('{{CSP}}', () => csp);
const OUT = path.join(ROOT, 'pii-shield.html');
const academyShortLink = '<a class="short-link" href="https://www.ish.academy/privacy/">ish.academy/privacy</a>';
const shieldShortLink = '<a class="short-link" href="https://shield.ishweb.nl/">shield.ishweb.nl</a>';
const offline = out.replace(academyShortLink, shieldShortLink);
fs.writeFileSync(OUT, offline);
fs.writeFileSync(path.join(ROOT, 'ish-ai-privacy.html'), offline);
const size = fs.statSync(OUT).size;
console.log('\nBuilt ' + OUT);
console.log('Size: ' + size.toLocaleString() + ' bytes (' + (size / 1024 / 1024).toFixed(2) + ' MB)');

// The hosted page stays small: shared hosts may buffer or alter large HTML.
// Serve the identical code as a same-origin, integrity-checked static asset.
// The downloadable HTML above remains entirely self-contained.
const hostedDir = path.join(ROOT, 'hosting');
fs.mkdirSync(hostedDir, { recursive: true });
const hosted = out.replace(/<script>[\s\S]*<\/script>/,
  '<script src="' + bundleFile + '" integrity="sha256-' + scriptHash + '" crossorigin="anonymous"></script>');
fs.writeFileSync(path.join(hostedDir, 'index.html'), hosted);
fs.writeFileSync(path.join(hostedDir, bundleFile), m[1]);
console.log('Hosted page: ' + Buffer.byteLength(hosted) + ' bytes; same bundle protected by CSP and SRI.');

// Generate HTTP policy from the same hashes as the page: no manual stale-policy copying.
fs.writeFileSync(path.join(hostedDir, '.htaccess'), [
  'Options -Indexes',
  '<IfModule mod_headers.c>',
  `Header always set Content-Security-Policy "${csp}; frame-ancestors 'none'"`,
  'Header always set X-Content-Type-Options "nosniff"',
  'Header always set Referrer-Policy "no-referrer"',
  'Header always set X-Frame-Options "DENY"',
  'Header always set Cache-Control "no-store"',
  '</IfModule>',
  '<FilesMatch "^(ish-ai-privacy|pii-shield)\\.html$">',
  'ForceType application/octet-stream',
  '<IfModule mod_headers.c>',
  'Header set Content-Disposition "attachment; filename=ish-ai-privacy.html"',
  '</IfModule>',
  '</FilesMatch>', ''
].join('\n'));

// The standalone ISH Web address has its own visible bookmark link.
// Application code, local assets and CSP stay identical to the Academy edition.
if (!hosted.includes(academyShortLink)) throw new Error('Standalone build requires the reviewed short-link markup');
const shieldDir = path.join(ROOT, 'hosting-shield');
fs.mkdirSync(shieldDir, { recursive: true });
fs.writeFileSync(path.join(shieldDir, 'index.html'), hosted.replace(academyShortLink, shieldShortLink));
fs.writeFileSync(path.join(shieldDir, bundleFile), m[1]);
fs.copyFileSync(path.join(hostedDir, '.htaccess'), path.join(shieldDir, '.htaccess'));

// ---- release record: what a reviewer can compare against the live site ----
// The CSP/SRI value is base64 SHA-256 of the script; the hex form is what `shasum -a 256` prints.
const sha256hex = buf => createHash('sha256').update(buf).digest('hex');
const recordLines = [
  '# ISH AI Privacy release record',
  '# Edition ' + APP_VERSION + ' (' + RELEASE_DATE_EN + '). Generated by build.js; regenerate with: npm run build',
  '# Verify a checkout reproduces these bytes with: npm run build:verify',
  '# Compare a downloaded file with: shasum -a 256 <file>',
  '',
  'script-sha256-base64 (CSP script-src and SRI integrity): ' + scriptHash,
  'style-sha256-base64 (CSP style-src): ' + styleHash,
  '',
  'hosting-shield/' + bundleFile + '  sha256  ' + sha256hex(m[1]),
  'hosting/' + bundleFile + '  sha256  ' + sha256hex(m[1]),
  'hosting-shield/index.html  sha256  ' + sha256hex(fs.readFileSync(path.join(shieldDir, 'index.html'))),
  'hosting/index.html  sha256  ' + sha256hex(fs.readFileSync(path.join(hostedDir, 'index.html'))),
  'ish-ai-privacy.html (offline copy)  sha256  ' + sha256hex(fs.readFileSync(path.join(ROOT, 'ish-ai-privacy.html'))),
  ''
].join('\n');
const recordPath = path.join(ROOT, HASH_RECORD);
if (VERIFY) {
  if (!fs.existsSync(recordPath)) { console.error('No ' + HASH_RECORD + ' to verify against.'); process.exit(1); }
  const committed = read(recordPath);
  if (committed !== recordLines) {
    console.error('\nBUILD VERIFY FAILED: rebuilt hashes differ from ' + HASH_RECORD);
    console.error('--- committed ---\n' + committed + '--- rebuilt ---\n' + recordLines);
    process.exit(1);
  }
  console.log('Build verify OK: rebuilt output matches ' + HASH_RECORD);
} else {
  fs.writeFileSync(recordPath, recordLines);
  console.log('Release record: ' + HASH_RECORD);
}
for (const dir of [hostedDir, shieldDir]) {
  fs.copyFileSync(recordPath, path.join(dir, HASH_RECORD));
  const wk = path.join(dir, '.well-known');
  fs.mkdirSync(wk, { recursive: true });
  const canonical = dir === shieldDir ? 'https://shield.ishweb.nl/' : 'https://www.ish.academy/privacy/';
  fs.writeFileSync(path.join(wk, 'security.txt'), [
    'Contact: ' + SECURITY_CONTACT,
    'Expires: ' + SECURITY_EXPIRES,
    'Preferred-Languages: en, nl',
    'Canonical: ' + canonical + '.well-known/security.txt',
    'Policy: ' + canonical + '#guide',
    ''
  ].join('\n'));
}
