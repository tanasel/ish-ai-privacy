// PII Shield — mapper roundtrip tests (driven by tests/run_all.js via run(ctx)).
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

  // ---------- 1. anonymize → restore returns EXACT original (10 varied texts) ----------
  const texts = [
    'Sanne van der Berg scored well. Mail sanne.vdberg@example-school.nl for details.',
    'Report for Daan de Jong, born 03-09-2009, BSN 111222333, lives at Beukenlaan 12.',
    'Call +31 6 12345678 or transfer to NL91ABNA0417164300 before 4 March 2026.',
    'Well-being note: Femke Jansen moved to 2517 KL Den Haag; review on 2026-07-20.',
    'IA feedback for José Álvarez: remove 192.168.2.44 and https://portal.example-school.nl/student/12345 from the appendix.',
    'Parent mail from hannah.muller@familypost.example.com about Hannah Müller, 12/05/2024.',
    'EE log — Søren Kristiansen interviewed on 15 maart 2026; consent at Vijverweg 3a.',
    'Admissions: Minh Nguyễn, 1234 AB, guardian Linh Trần, phone +31 70 1234567.',
    'Memo: printer at 10.0.0.5; reimburse via NL02RABO0123456789; ask Kwame Mensah.',
    'Elif Yılmaz and Elif Yılmaz both appear; also Arjun Nair at 45 Oak Lane.',
  ];
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const mapper = PIIEngine.createMapper();
    const dets = PIIEngine.detect(text);
    const anon = mapper.anonymize(text, dets);
    t.ok(dets.length === 0 || anon !== text, `roundtrip[${i}]: anonymize changed the text`, anon);
    for (const d of dets) t.ok(!anon.includes(d.value), `roundtrip[${i}]: "${d.value}" removed from anonymized text`, anon);
    const { text: restored, flagged } = mapper.restore(anon);
    t.ok(restored === text, `roundtrip[${i}]: restore returns EXACT original`, { restored, original: text });
    t.ok(flagged.length === 0, `roundtrip[${i}]: nothing flagged on clean roundtrip`, flagged);
  }

  // ---------- helpers for pseudonym-based cases ----------
  function anonWithEntries(text) {
    const mapper = PIIEngine.createMapper();
    const dets = PIIEngine.detect(text);
    const anon = mapper.anonymize(text, dets);
    return { mapper, anon, entries: mapper.entries() };
  }
  const nameEntry = (entries, orig) => entries.find(e => e.type === 'name' && e.original === orig);

  // ---------- 2. exact identity consistency without shared components ----------
  {
    const { entries } = anonWithEntries('Sanne van der Berg helped. Later Sanne van der Berg presented.');
    const nameEntries = entries.filter(e => e.type === 'name');
    t.ok(nameEntries.length === 1, 'same name twice → single mapping entry (same pseudonym)', entries);
  }
  {
    // Shared name components remain separate identities.
    const { entries } = anonWithEntries('Jan de Vries met Jan Bakker at the gate.');
    const a = nameEntry(entries, 'Jan de Vries');
    const b = nameEntry(entries, 'Jan Bakker');
    t.ok(a && b, 'both "Jan ..." names mapped', entries);
    if (a && b) {
      t.ok(/^\[\[PERSON_\d{3,}\]\]$/.test(a.pseudonym), 'first person uses a typed token', a);
      t.ok(/^\[\[PERSON_\d{3,}\]\]$/.test(b.pseudonym), 'second person uses a typed token', b);
      t.ok(a.pseudonym !== b.pseudonym, 'shared first name does not merge two identities', { a: a.pseudonym, b: b.pseudonym });
    }
  }

  // ---------- 3. bounded restore: exact token, case variant, suffix outside token ----------
  {
    const { mapper, entries } = anonWithEntries('Femke Jansen wrote the report.');
    const e = entries.find(x => x.type === 'name');
    t.ok(!!e, 'fuzzy: name mapped', entries);
    if (e) {
      const p = e.pseudonym;
      const orig = e.original;
      let r = mapper.restore(`The ${p}s of this class did well.`);
      t.ok(r.text.includes(orig + 's'), `suffix outside "${p}" is preserved`, r.text);
      r = mapper.restore(`${p}'s draft was strong.`);
      t.ok(r.text.includes(orig + "'s"), `ASCII possessive outside "${p}" is preserved`, r.text);
      r = mapper.restore(`${p}’s notebook was found.`);
      t.ok(r.text.includes(orig + '’s'), `Unicode possessive outside "${p}" is preserved`, r.text);
      r = mapper.restore(`we spoke to ${p.toLowerCase()} yesterday.`);
      t.ok(r.text.includes(orig), 'case-changed complete token restores', r.text);
    }
  }

  // ---------- 4. unknown and malformed token flagging ----------
  {
    const { mapper, entries } = anonWithEntries('Daan de Jong finished early.');
    const e = entries.find(x => x.type === 'name');
    if (e) {
      const mangled = e.pseudonym.replace('PERSON', 'PERS0N');
      const r = mapper.restore(`Feedback for ${mangled}: strong work.`);
      t.ok(!r.text.includes(e.original), 'mangled token is not guessed', r.text);
      t.ok(r.flagged.some(f => f.pseudonym === mangled), `mangled token "${mangled}" is flagged`, r.flagged);
    } else {
      t.ok(false, 'flagging setup: name was mapped', entries);
    }
    const r2 = mapper.restore('[[PERSON_999]] submitted nothing this week.');
    t.ok(r2.flagged.some(f => f.pseudonym === '[[PERSON_999]]'), 'unmapped typed token is flagged', r2.flagged);
  }

  // ---------- 5. entries() shape ----------
  {
    const { entries } = anonWithEntries('Mail femke.jansen@example-school.nl about Femke Jansen.');
    t.ok(entries.every(e => e.original && e.pseudonym && e.type), 'entries() rows have original/pseudonym/type', entries);
  }

  return t.result('roundtrip');
};
