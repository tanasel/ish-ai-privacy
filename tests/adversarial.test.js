// Independent synthetic regression cases for the 2026-09-11 staff release audit.
'use strict';

function makeT() {
  const failures = [];
  let passed = 0;
  return {
    ok(cond, label, detail) {
      if (cond) passed += 1;
      else failures.push(label + (detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ''));
    },
    result(name) { return { name, passed, failed: failures.length, failures }; }
  };
}

module.exports.run = function run(ctx) {
  const { PIIEngine } = ctx;
  const t = makeT();
  const has = (dets, type, value) => dets.some(d => d.type === type && d.value === value);

  function mapText(input, custom) {
    const detections = PIIEngine.detect(input, custom || []);
    const mapper = PIIEngine.createMapper();
    const anonymized = mapper.anonymize(input, detections);
    return { detections, mapper, anonymized, entries: mapper.entries(), restored: mapper.restore(anonymized) };
  }

  // Ordinary words that collided with the legacy NATO/tree aliases stay ordinary.
  {
    const input = 'Alpha is our reading group. The Oak table is reserved. Femke Jansen submitted.';
    const r = mapText(input);
    t.ok(r.anonymized.includes('Alpha is our reading group'), 'ordinary Alpha is unchanged in anonymized text', r);
    t.ok(r.anonymized.includes('The Oak table is reserved'), 'ordinary Oak is unchanged in anonymized text', r);
    t.ok(r.restored.text === input, 'ordinary NATO/tree prose round-trips exactly', r.restored);
    t.ok(r.restored.flagged.length === 0, 'clean ordinary-word roundtrip has no flags', r.restored.flagged);
  }

  // Shared components do not merge two people and no component alias exists.
  {
    const input = 'Jan de Vries met Jan Bakker. Anna Smith met Ben Smith.';
    const r = mapText(input);
    const people = r.entries.filter(e => e.type === 'name');
    t.ok(people.length === 4, 'four full people receive four mappings', people);
    t.ok(new Set(people.map(e => e.pseudonym)).size === 4, 'shared first/last components do not collide', people);
    const partial = r.mapper.restore('Alpha Oak Jan Smith remain ordinary prose.');
    t.ok(partial.text === 'Alpha Oak Jan Smith remain ordinary prose.', 'ordinary partial name words are never substituted', partial);
  }

  // Existing literal tokens are reserved and left intact.
  {
    const input = 'Template examples [[PERSON_001]] and [[person_002]] stay literal. Femke Jansen submitted.';
    const r = mapText(input);
    const person = r.entries.find(e => e.type === 'name');
    t.ok(person && person.pseudonym === '[[PERSON_003]]', 'source tokens are skipped case-insensitively during allocation', r.entries);
    t.ok(r.restored.text === input, 'literal source token round-trips unchanged', r.restored);
    t.ok(r.restored.flagged.length === 0, 'literal source token is not falsely flagged', r.restored.flagged);
  }

  // More than 30 mappings remain unique and exact.
  {
    const literals = [];
    const spans = [];
    let input = 'Literal [[DETAIL_001]]. ';
    for (let i = 0; i < 40; i += 1) {
      const value = 'private-value-' + String(i).padStart(2, '0');
      const start = input.length;
      input += value + (i === 39 ? '' : ', ');
      literals.push(value);
      spans.push({ start, end: start + value.length, type: 'detail' });
    }
    const mapper = PIIEngine.createMapper();
    const anonymized = mapper.anonymize(input, spans);
    const entries = mapper.entries();
    t.ok(entries.length === 40, '40 details create 40 mappings', entries.length);
    t.ok(new Set(entries.map(e => e.pseudonym)).size === 40, '40 generated tokens are unique', entries);
    t.ok(entries[0].pseudonym === '[[DETAIL_002]]', 'existing DETAIL_001 is reserved', entries[0]);
    t.ok(literals.every(value => !anonymized.includes(value)), 'all 40 originals are removed', anonymized);
    t.ok(mapper.restore(anonymized).text === input, '40 mappings round-trip exactly');
  }

  // Overlaps cover the complete union. Adjacent spans remain independent.
  {
    const input = 'Alice Smith';
    let mapper = PIIEngine.createMapper();
    let anonymized = mapper.anonymize(input, [
      { start: 0, end: 11, type: 'name' }, { start: 0, end: 5, type: 'name' }
    ]);
    t.ok(anonymized === '[[PERSON_001]]', 'same-start overlap keeps the full union', { anonymized, entries: mapper.entries() });
    t.ok(mapper.entries()[0].original === input, 'overlap mapping stores the full source union', mapper.entries());

    mapper = PIIEngine.createMapper();
    anonymized = mapper.anonymize(input, [
      { start: 0, end: 7, type: 'name' }, { start: 4, end: 11, type: 'detail' }
    ]);
    t.ok(anonymized === '[[DETAIL_001]]', 'different-type overlap becomes one DETAIL token', { anonymized, entries: mapper.entries() });
    t.ok(mapper.entries()[0].original === input, 'different-type overlap covers every character', mapper.entries());

    mapper = PIIEngine.createMapper();
    anonymized = mapper.anonymize(input, [
      { start: 0, end: 5, type: 'name' }, { start: 6, end: 11, type: 'name' }
    ]);
    t.ok(mapper.entries().length === 2 && anonymized.includes(' '), 'adjacent spans stay separate', { anonymized, entries: mapper.entries() });
  }

  // Class-list imports: scripts, Dutch tussenvoegsel and common-word names.
  {
    const csv = [
      'Voornaam;Tussenvoegsel;Achternaam',
      'Мария;;Иванова',
      'ليلى;;الحسن',
      '小明;;王',
      'Sanne;van der;Berg',
      'May;;Li'
    ].join('\n');
    const parsed = PIIEngine.parseNameCSV(csv);
    t.ok(parsed.length === 5, 'five multi-script CSV rows remain distinct', parsed);
    t.ok(parsed.some(x => x.first === 'Sanne' && x.last === 'van der Berg'), 'Dutch tussenvoegsel joins the surname', parsed);
    const text = 'Мария Иванова, ليلى الحسن, 王小明, Sanne van der Berg and May attended.';
    const dets = PIIEngine.detect(text, parsed);
    for (const value of ['Мария Иванова', 'ليلى الحسن', '王小明', 'Sanne van der Berg', 'May']) {
      t.ok(has(dets, 'name', value), `provided class-list name detected: ${value}`, dets);
    }
  }

  // Western punctuation/diacritics and distinct original spellings.
  {
    const custom = [
      { first: 'Zoë', last: 'D’Ávila' },
      { first: 'Anne-Marie', last: "O'Brien" }
    ];
    const input = "Zoë D’Ávila met Anne-Marie O'Brien. José Álvarez met Jose Alvarez.";
    const r = mapText(input, custom);
    for (const value of ['Zoë D’Ávila', "Anne-Marie O'Brien", 'José Álvarez', 'Jose Alvarez']) {
      t.ok(has(r.detections, 'name', value), `punctuation/diacritic name detected: ${value}`, r.detections);
    }
    t.ok(new Set(r.entries.filter(e => e.type === 'name').map(e => e.pseudonym)).size === 4,
      'diacritic variants keep distinct exact mappings', r.entries);
    t.ok(r.restored.text === input, 'case/diacritic originals restore exactly', r.restored);
  }

  // Repeated identical text stays stable.
  {
    const input = 'Elif Yılmaz reported. Elif Yılmaz followed up.';
    const r = mapText(input);
    t.ok(r.entries.filter(e => e.type === 'name').length === 1, 'identical repeated name uses one mapping', r.entries);
    t.ok((r.anonymized.match(/\[\[PERSON_001\]\]/g) || []).length === 2, 'identical repeated name uses the same token twice', r.anonymized);
    t.ok(r.restored.text === input, 'repeated identical name round-trips exactly', r.restored);
  }

  // Bounded date coverage: generic two-digit numeric dates remain label-dependent.
  {
    const cases = [
      ['DOB: 03/09/09', '03/09/09'],
      ['Geboortedatum: 3-9-09', '3-9-09'],
      ['Born March 4, 2009', 'March 4, 2009'],
      ['Born 4 March, 2009', '4 March, 2009'],
      ['Geboren op 4 maart 2009', '4 maart 2009']
    ];
    for (const [text, value] of cases) t.ok(has(PIIEngine.detect(text), 'date', value), `date detected: ${value}`, PIIEngine.detect(text));
    t.ok(!PIIEngine.detect('Version 03/09/09 was retired.').some(d => d.type === 'date'),
      'unlabelled two-digit numeric date is not generically redacted', PIIEngine.detect('Version 03/09/09 was retired.'));
  }

  // Dutch street variants plus labelled international full-address lines.
  {
    const cases = [
      ['Laan van Meerdervoort 12-A, 2517 AK Den Haag', 'Laan van Meerdervoort 12-A'],
      ['Willem de Zwijgerlaan 12 bis, 2582 ER Den Haag', 'Willem de Zwijgerlaan 12 bis'],
      ['Bezuidenhoutseweg 99 A, 2594 AC Den Haag', 'Bezuidenhoutseweg 99 A'],
      ['Address: Apt 4B, 12 Rue de la Paix, 75002 Paris, France', 'Apt 4B, 12 Rue de la Paix, 75002 Paris, France'],
      ['Adres: 3e verdieping, Calle de Alcalá 45, 28014 Madrid, Spanje', '3e verdieping, Calle de Alcalá 45, 28014 Madrid, Spanje'],
      ['Adresse: Wohnung 4, Friedrichstraße 12, 10117 Berlin, Deutschland', 'Wohnung 4, Friedrichstraße 12, 10117 Berlin, Deutschland'],
      ['Dirección: Piso 2, Calle de Alcalá 45, 28014 Madrid, España', 'Piso 2, Calle de Alcalá 45, 28014 Madrid, España']
    ];
    for (const [text, value] of cases) t.ok(has(PIIEngine.detect(text), 'address', value), `address detected: ${value}`, PIIEngine.detect(text));
  }

  // Contextual identifiers, international phones and Dutch postcodes.
  {
    const detailCases = [
      ['Student ID: 24A-01987', '24A-01987'],
      ['Leerlingnummer: 1049382', '1049382']
    ];
    for (const [text, value] of detailCases) t.ok(has(PIIEngine.detect(text), 'detail', value), `labelled identifier detected: ${value}`, PIIEngine.detect(text));
    t.ok(!PIIEngine.detect('Archive batch 1049382').some(d => d.type === 'detail'),
      'unlabelled ordinary number is not treated as a student ID', PIIEngine.detect('Archive batch 1049382'));
    t.ok(has(PIIEngine.detect('BSN: 111222333'), 'bsn', '111222333'),
      'labelled checksum-valid BSN is detected', PIIEngine.detect('BSN: 111222333'));
    t.ok(!PIIEngine.detect('Archive batch 111222333').some(d => d.type === 'bsn'),
      'unlabelled checksum-valid number is not treated as a BSN', PIIEngine.detect('Archive batch 111222333'));
    const row = 'student_id,dob,bsn\n24A-01987,03/09/09,111222333';
    const rowDets = PIIEngine.detect(row);
    t.ok(has(rowDets, 'detail', '24A-01987'), 'student ID detected under a delimited header', rowDets);
    t.ok(has(rowDets, 'date', '03/09/09'), 'two-digit DOB detected under a delimited header', rowDets);
    t.ok(has(rowDets, 'bsn', '111222333'), 'BSN detected under a delimited header', rowDets);
    const phones = ['+44 20 7946 0958', '+1 (202) 555-0198', '0031 6 12345678', '06 12 34 56 78', '(202) 555-0198', '202-555-0198'];
    for (const value of phones) t.ok(has(PIIEngine.detect('Phone: ' + value), 'phone', value), `phone detected: ${value}`, PIIEngine.detect('Phone: ' + value));
    for (const value of ['2517KL', '2594 AC']) t.ok(has(PIIEngine.detect('Postcode: ' + value), 'postcode', value), `postcode detected: ${value}`, PIIEngine.detect('Postcode: ' + value));
  }

  // A URL containing an email-like path is redacted as the whole URL.
  {
    const value = 'https://portal.example.org/users/person@example.com/private';
    const dets = PIIEngine.detect('Open ' + value + ' now.');
    t.ok(has(dets, 'url', value), 'whole URL wins over nested email-like candidate', dets);
  }

  // Unknown/malformed tokens are preserved and flagged, never guessed.
  {
    const r = mapText('Femke Jansen submitted.');
    const malformed = ['[[PERS0N_001]]', '[[PERSON_001]', '[PERSON_001]]', '[[PERSON_001]]]', 'PERSON_001'];
    for (const value of malformed) {
      const restored = r.mapper.restore(value);
      t.ok(restored.text === value, `malformed token left unchanged: ${value}`, restored);
      t.ok(restored.flagged.some(f => f.pseudonym === value), `malformed token flagged: ${value}`, restored.flagged);
    }
    const unknown = r.mapper.restore('[[PERSON_999]]');
    t.ok(unknown.text === '[[PERSON_999]]', 'unknown well-formed token left unchanged', unknown);
    t.ok(unknown.flagged.some(f => f.pseudonym === '[[PERSON_999]]'), 'unknown well-formed token flagged', unknown.flagged);
  }

  // Integration regressions: international numeric dates and administration identifiers.
  for (const value of ['12/31/2010', '31/12/2010', 'DOB: 12/31/10', 'Geboortedatum: 31/12/10']) {
    const r = mapText(value);
    t.ok(r.detections.some(d => d.type === 'date'), 'US and European birth-date forms: ' + value);
    t.ok(r.restored.text === value, 'Date spelling is preserved: ' + value);
  }
  for (const label of ['Employee ID: EMP-1234','Staff ID: 84921','Passport number: AB1234567','National ID: A1298634','Personeelsnummer: P-56789','Paspoortnummer: XY489321']) {
    const r = mapText(label);
    t.ok(r.detections.some(d => d.type === 'detail'), 'Administration identifier: ' + label);
    t.ok(r.restored.text === label, 'Administration identifier round-trip: ' + label);
  }
  for (const input of ['note,student_id\nSTU-9876,STU-9876', 'note,student_id\n"a, b",STU-9876']) {
    const r = mapText(input);
    t.ok(r.detections.some(d => d.value === 'STU-9876' && d.start === input.lastIndexOf('STU-9876')), 'Correct table column is covered when cells repeat or contain commas');
    t.ok(r.restored.text === input, 'Table identifier round-trip is exact');
  }

  for (const value of ['Sofia_Marin_DOB_2010-03-14.pdf','Мария Иванова report.docx','أحمد_خالد_10492.xlsx','File name: "Student_84921_report.pdf"','Bestandsnaam: "Zoë_Dubois_03-09-2012.pdf"','Please review Sofia_Marin_report.pdf today.']) {
    const r=mapText(value);
    t.ok(r.detections.some(d=>d.type==='filename'), 'File name detected as one detail: '+value);
    t.ok(!r.anonymized.includes('.pdf')&&!r.anonymized.includes('.docx')&&!r.anonymized.includes('.xlsx'), 'Full filename removed from shared text');
    t.ok(r.restored.text===value, 'Filename round-trip preserves exact spelling');
  }

  t.ok(has(PIIEngine.detect('Her BSN is 123456782.'),'bsn','123456782'), 'Natural-language BSN is label is supported');
  return t.result('adversarial');
};
