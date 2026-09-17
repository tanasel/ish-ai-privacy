#!/usr/bin/env node
// PII Shield — test runner. Loads the browser-global engine scripts into a
// node:vm context, then drives unit / roundtrip / recall suites.
//
//   node tests/run_all.js
//   PII_ENGINE_PATHS=tests/_stub_engine.js node tests/run_all.js   (plumbing smoke-test)
//
// PII_ENGINE_PATHS: comma-separated script paths (relative to app root or absolute),
// concatenated in order into one vm context. Default: src/names_db.js,src/engine.js.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_ROOT = path.join(__dirname, '..');
const DEFAULT_PATHS = ['src/names_db.js', 'src/engine.js'];

function loadEngineContext() {
  const raw = process.env.PII_ENGINE_PATHS;
  const rels = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_PATHS;
  const files = rels.map(r => (path.isAbsolute(r) ? r : path.resolve(APP_ROOT, r)));
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`FATAL: engine script not found: ${f}`);
      console.error('Set PII_ENGINE_PATHS (comma-separated) or create the src/ modules.');
      process.exit(2);
    }
  }
  const context = vm.createContext({ console });
  for (const f of files) {
    try {
      // engine files are plain const-global browser scripts (no exports); the
      // consts land on the shared context so later scripts + tests can see them.
      vm.runInContext(fs.readFileSync(f, 'utf8'), context, { filename: f });
    } catch (e) {
      console.error(`FATAL: failed evaluating ${f}: ${e.message}`);
      process.exit(2);
    }
  }
  // const declarations are context-locals, not context properties — lift them out.
  const lift = name => {
    try { return vm.runInContext(name, context); } catch { return undefined; }
  };
  const ctx = { PIIEngine: lift('PIIEngine'), PII_NAMES_DB: lift('PII_NAMES_DB') };
  if (!ctx.PIIEngine || typeof ctx.PIIEngine.detect !== 'function') {
    console.error('FATAL: loaded scripts did not define a PIIEngine with detect(). Files: ' + files.join(', '));
    process.exit(2);
  }
  console.log('Engine loaded from: ' + files.map(f => path.relative(APP_ROOT, f)).join(', '));
  return ctx;
}

function main() {
  const ctx = loadEngineContext();
  const suites = ['./unit.test.js', './roundtrip.test.js', './adversarial.test.js', './recall.test.js', './new-edgecases.test.js', './removal.test.js', './name-budget.test.js'];
  const results = [];
  for (const s of suites) {
    const name = path.basename(s, '.test.js');
    console.log(`\n=== ${name} ===`);
    let r;
    try {
      r = require(s).run(ctx);
    } catch (e) {
      r = { name, passed: 0, failed: 1, failures: [`suite crashed: ${e.stack}`] };
    }
    results.push(r);
    console.log(`  ${r.passed} passed, ${r.failed} failed`);
    for (const f of r.failures || []) console.log('  FAIL: ' + f);
  }

  const totPass = results.reduce((a, r) => a + r.passed, 0);
  const totFail = results.reduce((a, r) => a + r.failed, 0);
  console.log('\n================ SUMMARY ================');
  for (const r of results) {
    console.log(`  ${r.failed === 0 ? 'PASS' : 'FAIL'}  ${r.name.padEnd(10)} ${r.passed} passed, ${r.failed} failed`);
  }
  console.log(`  TOTAL: ${totPass} passed, ${totFail} failed`);
  console.log(totFail === 0 ? '  RESULT: PASS' : '  RESULT: FAIL');
  process.exit(totFail === 0 ? 0 : 1);
}

main();
