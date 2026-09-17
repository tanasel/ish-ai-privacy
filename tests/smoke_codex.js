'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = [
  fs.readFileSync(path.join(root, 'src', 'names_db.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'src', 'engine.js'), 'utf8'),
  ';globalThis.__engine = PIIEngine; globalThis.__names = PII_NAMES_DB;'
].join('\n');
const sandbox = {};
vm.runInNewContext(source, sandbox, { filename: 'pii-shield-concatenated.js' });

const engine = sandbox.__engine;
const names = sandbox.__names;
assert(names.first.length + names.last.length >= 2000, 'name database is below contract minimum');
assert(
  names.first.concat(names.last).every(name => /^[a-z][a-z'-]*$/.test(name)),
  'name database contains a non-normalized entry'
);

const original = 'Maria Garcia lives at Baker Street 12, 2512 AB. On 4 July 2026, email ' +
  'maria.garcia@example.org or call +31 6 1234 5678. Her BSN is 123456782, IBAN ' +
  'NL91 ABNA 0417 1643 00, IP 192.168.1.10, and portal https://school.example.org/profile.';
const detections = engine.detect(original);
const detectedTypes = new Set(detections.map(item => item.type));
for (const type of ['name', 'email', 'phone', 'iban', 'bsn', 'postcode', 'date', 'ip', 'url', 'address']) {
  assert(detectedTypes.has(type), 'sample did not detect expected type: ' + type);
}

const mapper = engine.createMapper();
const anonymized = mapper.anonymize(original, detections);
assert.notStrictEqual(anonymized, original, 'anonymization made no changes');
assert(mapper.entries().length >= detections.length, 'mapping entries were not recorded');
const restored = mapper.restore(anonymized);
assert.strictEqual(restored.flagged.length, 0, 'clean pseudonyms were unexpectedly flagged');
assert.strictEqual(restored.text, original, 'round-trip restoration changed the paragraph');

const custom = engine.parseNameCSV('first_name;last_name\n"Zoë";"Dvořák"');
const customHit = engine.detect('Zoe Dvorak', custom)[0];
assert(customHit && customHit.type === 'name' && customHit.layer === 'custom',
  'custom CSV name did not match diacritic-insensitively');

console.log('smoke ok:', detections.length, 'detections,', mapper.entries().length, 'mapping entries');
