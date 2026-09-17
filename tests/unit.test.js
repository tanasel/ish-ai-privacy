// PII Shield — engine unit tests (driven by tests/run_all.js via run(ctx)).
'use strict';

function makeT() {
  const failures = [];
  let passed = 0;
  return {
    ok(cond, label, detail) {
      if (cond) passed++;
      else failures.push(label + (detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ''));
    },
    result(name) { return { name, passed, failed: failures.length, failures }; },
  };
}

module.exports.run = function run(ctx) {
  const { PIIEngine } = ctx;
  const t = makeT();
  const detect = (text, custom) => PIIEngine.detect(text, custom || []);
  const has = (dets, type, value) =>
    dets.some(d => d.type === type && (d.value === value || d.value.includes(value)));

  // --- regex layer: one representative value per type (CONTRACT §2/§4 formats) ---
  const cases = [
    ['email', 'Contact sanne.vdberg@example-school.nl please.', 'sanne.vdberg@example-school.nl'],
    ['phone', 'Call +31 6 12345678 after class.', '+31 6 12345678'],
    ['phone', 'Or the office line +31 70 1234567 works.', '+31 70 1234567'],
    ['iban', 'Pay to NL91ABNA0417164300 before Friday.', 'NL91ABNA0417164300'],
    ['postcode', 'Address ends with 2517 KL Den Haag.', '2517 KL'],
    ['date', 'Born on 03-09-2009 in the city.', '03-09-2009'],
    ['date', 'Session on 12/05/2024 went well.', '12/05/2024'],
    ['date', 'Deadline is 4 March 2026 sharp.', '4 March 2026'],
    ['date', 'Ingeleverd op 15 maart 2026 via mail.', '15 maart 2026'],
    ['date', 'Logged 2026-07-20 automatically.', '2026-07-20'],
    ['ip', 'Server sits at 192.168.2.44 internally.', '192.168.2.44'],
    ['url', 'See https://portal.example-school.nl/student/12345 for details.', 'https://portal.example-school.nl/student/12345'],
    ['address', 'Lives at Kamperfoeliestraat 12 nearby.', 'Kamperfoeliestraat 12'],
    ['address', 'Moved to 12 Oak Lane recently.', '12 Oak Lane'],
  ];
  for (const [type, text, value] of cases) {
    t.ok(has(detect(text), type, value), `detects ${type}: "${value}"`, detect(text));
  }

  // --- BSN elfproef ---
  // 111222333: 9*1+8*1+7*1 + 6*2+5*2+4*2 + 3*3+2*3 - 3 = 24+30+15-3 = 66 = 6*11 → valid
  t.ok(has(detect('BSN: 111222333 on file.'), 'bsn', '111222333'), 'valid BSN (elfproef pass) detected');
  // 111222334 fails elfproef
  const inv = detect('Ref number 111222334 is not a BSN.');
  t.ok(!inv.some(d => d.type === 'bsn'), 'invalid BSN (elfproef fail) NOT detected as bsn', inv);
  t.ok(!detect('Order 123456789 shipped.').some(d => d.type === 'bsn'), '123456789 fails elfproef, not bsn');

  // --- parseNameCSV ---
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let r = PIIEngine.parseNameCSV('first_name,last_name\nSanne,van der Berg\nDaan,de Jong\n');
  t.ok(eq(r, [{ first: 'Sanne', last: 'van der Berg' }, { first: 'Daan', last: 'de Jong' }]), 'CSV with header', r);
  r = PIIEngine.parseNameCSV('Femke,Jansen');
  t.ok(eq(r, [{ first: 'Femke', last: 'Jansen' }]), 'CSV without header', r);
  r = PIIEngine.parseNameCSV('José;Álvarez\nSøren;Kristiansen');
  t.ok(eq(r, [{ first: 'José', last: 'Álvarez' }, { first: 'Søren', last: 'Kristiansen' }]), 'semicolon separator + diacritics kept', r);
  r = PIIEngine.parseNameCSV('"Lucía","Fernández García"\n"O""Brien-like",Test');
  t.ok(r.length === 2 && r[0].first === 'Lucía' && r[0].last === 'Fernández García', 'quoted cells', r);
  t.ok(r[1].first === 'O"Brien-like', 'escaped double quote inside quoted cell', r);

  // --- stopwords not detected as names ---
  const stopText = 'On Monday in January the students visited The Hague and the School library.';
  const stopDets = detect(stopText).filter(d => d.type === 'name');
  t.ok(stopDets.length === 0, 'stopwords (Monday, January, The Hague, School) not flagged as names', stopDets);

  // --- custom names: detected, and take priority over built-ins ---
  const custom = [{ first: 'Xanthippe', last: 'Quirrelbaum' }];
  const cd = detect('Please see Xanthippe Quirrelbaum after class.', custom);
  t.ok(has(cd, 'name', 'Xanthippe Quirrelbaum'), 'custom (CSV) name detected', cd);
  t.ok(cd.some(d => d.value.includes('Xanthippe') && d.layer === 'custom'), "custom name has layer 'custom'", cd);
  // a name that is both in the built-in db and the custom list → custom layer wins
  const both = detect('Speak to Hannah Müller today.', [{ first: 'Hannah', last: 'Müller' }]);
  t.ok(both.some(d => d.type === 'name' && d.layer === 'custom'), 'custom list takes priority over built-in db', both);
  // custom matching is diacritic/case-insensitive
  const dia = detect('MINH NGUYEN was absent.', [{ first: 'Minh', last: 'Nguyễn' }]);
  t.ok(dia.some(d => d.type === 'name'), 'custom match is case/diacritic-insensitive', dia);

  // --- detect() output shape ---
  const shape = detect('Mail sanne.vdberg@example-school.nl and 111222333.');
  t.ok(shape.every(d => typeof d.start === 'number' && typeof d.end === 'number' && d.value && d.type && d.layer), 'spans have start/end/value/type/layer', shape);
  const sorted = shape.every((d, i) => i === 0 || d.start >= shape[i - 1].end);
  t.ok(sorted, 'spans are non-overlapping and sorted by start', shape);

  return t.result('unit');
};
