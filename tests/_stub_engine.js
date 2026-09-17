// PII Shield — tiny STUB engine, harness smoke-test only. NOT the real engine.
// Mirrors the CONTRACT.md API surface so tests/run_all.js plumbing can be proven
// before src/engine.js exists. Loaded as a plain browser-style const-global script.
'use strict';

const PII_NAMES_DB = {
  first: ['sanne', 'daan', 'femke', 'oliver', 'poppy', 'layla', 'omar', 'wei', 'arjun', 'jose', 'zofia', 'soren', 'kwame', 'haruto', 'elif', 'minh', 'hannah', 'jan'],
  last: ['jansen', 'de jong', 'van der berg', 'whitfield', 'ellison', 'zhang', 'nair', 'alvarez', 'kowalczyk', 'kristiansen', 'mensah', 'yamamoto', 'nguyen', 'muller', 'bakker', 'de vries'],
};

const PIIEngine = (() => {
  const STOPWORDS = new Set(['the', 'school', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'den', 'haag', 'hague', 'amsterdam', 'student', 'dear', 'from', 'to', 'subject', 'note', 'staff', 'memo']);
  const NATO = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
  const TREES = ['Oak', 'Birch', 'Maple', 'Cedar', 'Elm', 'Willow', 'Pine', 'Ash', 'Rowan', 'Linden', 'Alder', 'Beech', 'Hazel', 'Spruce', 'Poplar', 'Juniper'];

  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function elfproef(s) {
    if (!/^\d{9}$/.test(s)) return false;
    const w = [9, 8, 7, 6, 5, 4, 3, 2, -1];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(s[i]) * w[i];
    return sum % 11 === 0;
  }

  const MON = '(?:January|February|March|April|May|June|July|August|September|October|November|December|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)';
  const REGEXES = [
    ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
    ['url', /https?:\/\/[^\s,)"']+/g],
    ['iban', /\bNL\d{2}[A-Z]{4}\d{10}\b/g],
    ['phone', /\+31[\s-]?(?:\(0\))?[\s-]?\d[\d\s-]{6,12}\d/g],
    ['ip', /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g],
    ['date', new RegExp('\\b(?:\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2} ' + MON + ' \\d{4})\\b', 'g')],
    ['postcode', /\b[1-9]\d{3}\s?[A-Z]{2}\b/g],
    ['address', /\b(?:[A-Z][a-zà-ÿ]*(?:straat|laan|weg|kade|plein|hof|singel|dijk|gracht)\s\d+[a-zA-Z-]*|\d{1,4}\s[A-Z][a-z]+\s(?:Lane|Avenue|Grove|Close|Road|Court|Street))\b/g],
    ['bsn', /\b\d{9}\b/g],
  ];

  function detect(text, customNames = []) {
    const spans = [];
    const taken = [];
    const overlaps = (a, b) => taken.some(t => a < t.end && b > t.start);
    const add = (start, end, value, type, layer, confidence) => {
      if (overlaps(start, end)) return;
      taken.push({ start, end });
      spans.push({ start, end, value, type, layer, confidence });
    };
    for (const [type, re] of REGEXES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (type === 'bsn' && !elfproef(m[0])) continue;
        add(m.index, m.index + m[0].length, m[0], type, 'regex', 0.95);
      }
    }
    // names: custom first (priority), then built-in db. Word pairs + singles.
    const nameRe = /\p{Lu}[\p{L}'-]+(?:\s(?:van|de|der|den|ter|te|el|al|van der|van den|de la)\s\p{Lu}?[\p{L}'-]+|\s\p{Lu}[\p{L}'-]+(?:\s\p{Lu}[\p{L}'-]+)?)?/gu;
    const custFirst = new Set(customNames.map(n => strip(n.first || '')));
    const custLast = new Set(customNames.map(n => strip(n.last || '')));
    let m;
    while ((m = nameRe.exec(text))) {
      const words = m[0].split(/\s+/);
      const sFirst = strip(words[0]);
      const sRest = strip(words.slice(1).join(' '));
      if (STOPWORDS.has(sFirst)) continue;
      if (custFirst.has(sFirst) || custLast.has(sRest) || custLast.has(strip(words[words.length - 1]))) {
        add(m.index, m.index + m[0].length, m[0], 'name', 'custom', 0.99);
      } else if (PII_NAMES_DB.first.includes(sFirst) || PII_NAMES_DB.last.includes(sRest) || PII_NAMES_DB.last.includes(strip(words[words.length - 1]))) {
        add(m.index, m.index + m[0].length, m[0], 'name', 'list', 0.8);
      }
    }
    return spans.sort((a, b) => a.start - b.start);
  }

  function parseNameCSV(csvText) {
    const rows = csvText.split(/\r?\n/).filter(l => l.trim());
    const out = [];
    for (let line of rows) {
      const sep = line.includes(';') ? ';' : ',';
      const cells = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (c === sep && !inQ) { cells.push(cur); cur = ''; }
        else cur += c;
      }
      cells.push(cur);
      const [a, b] = cells.map(s => s.trim());
      if (!a) continue;
      if (/^first[_ ]?name$/i.test(a)) continue; // header
      out.push({ first: a, last: b || '' });
    }
    return out;
  }

  function createMapper() {
    const firstMap = new Map(), lastMap = new Map(), entries = [], byPseud = new Map();
    let fi = 0, li = 0, n = 0;
    const pseudFirst = f => { const k = strip(f); if (!firstMap.has(k)) firstMap.set(k, NATO[fi++ % NATO.length]); return firstMap.get(k); };
    const pseudLast = l => { const k = strip(l); if (!lastMap.has(k)) lastMap.set(k, TREES[li++ % TREES.length]); return lastMap.get(k); };
    function pseudonymFor(det) {
      n++;
      let p;
      switch (det.type) {
        case 'name': {
          const w = det.value.split(/\s+/);
          p = pseudFirst(w[0]) + (w.length > 1 ? ' ' + pseudLast(w.slice(1).join(' ')) : '');
          break;
        }
        case 'email': p = `person${n}@example.com`; break;
        case 'phone': p = `+00-000-000-000${n}`; break;
        case 'iban': p = `XX00XXXX0000000${n}`; break;
        case 'bsn': p = String(n).padStart(9, '0'); break;
        case 'address': p = `${n}0 Greentown Street`; break;
        case 'date': p = `01/01/200${n % 10}`; break;
        case 'postcode': p = '0000XX'; break;
        case 'url': p = `https://example.com/ref${n}`; break;
        case 'ip': p = `0.0.0.${n}`; break;
        default: p = `REDACTED${n}`;
      }
      if (!byPseud.has(p)) { byPseud.set(p, det.value); entries.push({ original: det.value, pseudonym: p, type: det.type }); }
      return p;
    }
    return {
      anonymize(text, detections) {
        let out = '', pos = 0;
        for (const d of [...detections].sort((a, b) => a.start - b.start)) {
          out += text.slice(pos, d.start) + pseudonymFor(d);
          pos = d.end;
        }
        return out + text.slice(pos);
      },
      entries() { return entries.slice(); },
      restore(aiText) {
        const flagged = [];
        let text = aiText;
        const norm = s => s.replace(/’/g, "'").toLowerCase();
        for (const [p, orig] of byPseud) {
          const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(esc.replace(/ /g, '\\s+') + "(?:'s|’s|es|s)?", 'gi');
          let seen = false;
          text = text.replace(re, m => {
            seen = true;
            const suffix = norm(m).slice(norm(p).length).replace(/^’/, "'");
            return orig + (suffix === 'es' || suffix === 's' ? 's' : suffix === "'s" ? "'s" : '');
          });
          // single-component restore for names
          if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(p)) {
            for (const comp of p.split(' ')) {
              const cre = new RegExp('\\b' + comp + "\\b(?:'s|’s)?", 'g');
              text = text.replace(cre, m => { seen = true; return orig + (m.length > comp.length ? "'s" : ''); });
            }
          }
          if (!seen && aiText.toLowerCase().includes(p.split(' ')[0].toLowerCase().slice(0, 4))) {
            flagged.push({ pseudonym: p, reason: 'not cleanly restorable' });
          }
        }
        // pseudonym-like NATO+Tree strings not in the map
        const natoRe = new RegExp('\\b(' + NATO.join('|') + ')\\s+(' + TREES.join('|') + ')\\b', 'g');
        let m2;
        while ((m2 = natoRe.exec(text))) {
          if (!byPseud.has(m2[0])) flagged.push({ pseudonym: m2[0], reason: 'pseudonym-like, not in mapping' });
        }
        return { text, flagged };
      },
    };
  }

  return { detect, parseNameCSV, createMapper };
})();
