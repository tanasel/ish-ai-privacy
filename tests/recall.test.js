// PII Shield — recall / false-positive benchmark over tests/samples/*.json.
// Driven by tests/run_all.js via run(ctx). Contract targets: recall > 0.95, FP rate < 0.10.
// Hit = any detection span covering an occurrence of the listed value (substring position match).
// FP  = a detection whose value is not in pii[] and not a substring of a listed value.
'use strict';
const fs = require('fs');
const path = require('path');

const SAMPLES_DIR = path.join(__dirname, 'samples');

function occurrences(text, value) {
  const result = [];
  let idx = text.indexOf(value);
  while (idx !== -1) {
    result.push({ start: idx, end: idx + value.length });
    idx = text.indexOf(value, idx + 1);
  }
  return result;
}

function typeMatches(expected, actual) {
  return expected === actual || actual === 'detail';
}

function coversOccurrence(det, expected, occurrence) {
  return typeMatches(expected.type, det.type) && det.start <= occurrence.start && det.end >= occurrence.end;
}

function isFalsePositive(text, det, pii) {
  return !pii.some(expected => typeMatches(expected.type, det.type) &&
    (expected.value === det.value || expected.value.includes(det.value) || det.value.includes(expected.value)));
}

module.exports.run = function run(ctx) {
  const { PIIEngine } = ctx;
  const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) {
    return { name: 'recall', passed: 0, failed: 1, failures: ['no sample files found in tests/samples/'] };
  }

  let totalPII = 0, totalHits = 0, totalDets = 0, totalFP = 0;
  const rows = [];
  const misses = [];

  for (const f of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, f), 'utf8'));
    let dets;
    try {
      dets = PIIEngine.detect(doc.text);
    } catch (e) {
      return { name: 'recall', passed: 0, failed: 1, failures: [`detect() threw on ${f}: ${e.message}`] };
    }
    let hits = 0;
    let expectedOccurrences = 0;
    const uniqueExpected = [];
    const seenExpected = new Set();
    for (const p of doc.pii) {
      const key = p.type + '\u0000' + p.value;
      if (seenExpected.has(key)) continue;
      seenExpected.add(key);
      uniqueExpected.push(p);
    }
    for (const p of uniqueExpected) {
      const ranges = occurrences(doc.text, p.value);
      if (ranges.length === 0) {
        misses.push(`${doc.name}: ANNOTATION NOT IN TEXT ${p.type} "${p.value}"`);
        expectedOccurrences += 1;
        continue;
      }
      expectedOccurrences += ranges.length;
      for (const range of ranges) {
        if (dets.some(det => coversOccurrence(det, p, range))) hits += 1;
        else misses.push(`${doc.name}: MISSED ${p.type} "${p.value}" at ${range.start}`);
      }
    }
    let fps = 0;
    for (const d of dets) if (isFalsePositive(doc.text, d, doc.pii)) { fps++; if (misses.length + fps < 400) misses.push(`${doc.name}: FP ${d.type} "${d.value}"`); }
    totalPII += expectedOccurrences;
    totalHits += hits;
    totalDets += dets.length;
    totalFP += fps;
    rows.push({ sample: doc.name, pii: expectedOccurrences, hits, dets: dets.length, fps });
  }

  // per-sample table
  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n  ' + pad('SAMPLE', 26) + pad('PII', 5) + pad('HIT', 5) + pad('DET', 5) + 'FP');
  for (const r of rows) {
    const mark = r.hits === r.pii && r.fps === 0 ? ' ' : '!';
    console.log(`  ${mark}` + pad(r.sample, 25) + pad(r.pii, 5) + pad(r.hits, 5) + pad(r.dets, 5) + r.fps);
  }
  const recall = totalPII ? totalHits / totalPII : 0;
  const fpRate = totalDets ? totalFP / totalDets : 0;
  console.log(`  TOTALS: samples=${rows.length} pii=${totalPII} hits=${totalHits} detections=${totalDets} fps=${totalFP}`);
  console.log(`  RECALL=${(recall * 100).toFixed(2)}% (target > 95%)   FP-RATE=${(fpRate * 100).toFixed(2)}% (target < 10%)`);

  const failures = [];
  if (recall <= 0.95) {
    failures.push(`recall ${(recall * 100).toFixed(2)}% <= 95%`);
    for (const m of misses.filter(x => x.includes('MISSED')).slice(0, 25)) failures.push('  ' + m);
  }
  if (fpRate >= 0.10) {
    failures.push(`FP rate ${(fpRate * 100).toFixed(2)}% >= 10%`);
    for (const m of misses.filter(x => x.includes(': FP ')).slice(0, 25)) failures.push('  ' + m);
  }
  if (files.length !== 50) failures.push(`expected 50 samples, found ${files.length}`);

  return {
    name: 'recall',
    passed: failures.length === 0 ? 1 : 0,
    failed: failures.length === 0 ? 0 : 1,
    failures,
    metrics: { recall, fpRate, totalPII, totalHits, totalDets, totalFP },
  };
};
