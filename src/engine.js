/* PII Shield detection and reversible pseudonym engine. No DOM dependencies. */
const PIIEngine = (() => {
  'use strict';

  const COMBINING_MARKS = /[\u0300-\u036f]/g;
  const WORD_RE = /[\p{L}](?:[\p{L}\p{M}]|['\u2019-](?=[\p{L}]))*/gu;
  const SPECIAL_FOLD = {
    '\u00df': 'ss', '\u00e6': 'ae', '\u0153': 'oe', '\u00f8': 'o', '\u0142': 'l',
    '\u0111': 'd', '\u00f0': 'd', '\u00fe': 'th', '\u0131': 'i', '\u014b': 'n', '\u0127': 'h'
  };

  function fold(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(COMBINING_MARKS, '')
      .toLowerCase()
      .replace(/[\u00df\u00e6\u0153\u00f8\u0142\u0111\u00f0\u00fe\u0131\u014b\u0127]/g, ch => SPECIAL_FOLD[ch]);
  }

  function nameKey(value) {
    return fold(value).replace(/[^\p{L}\p{N}]/gu, '');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function wordsWithOffsets(text) {
    const words = [];
    WORD_RE.lastIndex = 0;
    let match;
    while ((match = WORD_RE.exec(text)) !== null) {
      words.push({
        value: match[0],
        key: nameKey(match[0]),
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return words;
  }

  const STOPWORDS = new Set((
    'a an and are as at be but by can could did do does for from had has have he her hers him his i if in into is it its ' +
    'may might must my no nor not of on or our ours she should so than that the their theirs them then there these they this ' +
    'those to us was we were what when where which who why will with would you your yours dear hello hi regards thanks thank ' +
    'monday tuesday wednesday thursday friday saturday sunday maandag dinsdag woensdag donderdag vrijdag zaterdag zondag ' +
    'january february march april june july august september october november december januari februari maart mei juni juli ' +
    'augustus oktober december today tomorrow yesterday morning afternoon evening school college university office department ' +
    'class teacher student principal doctor professor mr mrs ms miss dr sir madam team group company committee board ' +
    'amsterdam rotterdam utrecht eindhoven groningen hague netherlands nederland europe european english dutch french german ' +
    'street road avenue lane drive square park station hospital library room building north south east west new old young ' +
    'black white brown green gray grey orange rose violet summer winter autumn spring mark bill grant hope faith joy ' +
    'home page contact subject date name email phone address website information message document file meeting report'
  ).split(/\s+/));

  const PARTICLES = new Set(
    'al el bin bint da das de del della der des di dos du la le van von den ten ter y'.split(' ')
  );

  const MONTHS = new Map([
    ['january', 1], ['jan', 1], ['januari', 1],
    ['february', 2], ['feb', 2], ['februari', 2],
    ['march', 3], ['mar', 3], ['maart', 3],
    ['april', 4], ['apr', 4],
    ['may', 5], ['mei', 5],
    ['june', 6], ['jun', 6], ['juni', 6],
    ['july', 7], ['jul', 7], ['juli', 7],
    ['august', 8], ['aug', 8], ['augustus', 8],
    ['september', 9], ['sept', 9], ['sep', 9],
    ['october', 10], ['oct', 10], ['oktober', 10], ['okt', 10],
    ['november', 11], ['nov', 11],
    ['december', 12], ['dec', 12]
  ]);

  const DETECTION_PRIORITY = {
    email: 120, url: 115, iban: 110, phone: 108, date: 105, ip: 104,
    postcode: 103, bsn: 102, address: 95, detail: 121, filename: 125,
    custom: 80, listPair: 70, listSingle: 60
  };

  function isValidDate(day, month, year) {
    day = Number(day);
    month = Number(month);
    year = Number(year);
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) ||
        year < 1000 || year > 2999 || month < 1 || month > 12 || day < 1) return false;
    return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function isValidBSN(value) {
    let digits = value.replace(/\D/g, '');
    if (!/^\d{8,9}$/.test(digits)) return false;
    digits = digits.padStart(9, '0');
    if (/^0{9}$/.test(digits)) return false;
    let total = 0;
    for (let i = 0; i < 8; i += 1) total += Number(digits[i]) * (9 - i);
    total -= Number(digits[8]);
    return total % 11 === 0;
  }

  function isIBANFormat(value) {
    const compact = value.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact) && compact.length <= 34;
  }

  function isValidIPv4(value) {
    const parts = value.split('.');
    return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  }

  function isValidIPv6(value) {
    if (!value.includes(':') || !/^[0-9a-f:]+$/i.test(value)) return false;
    if ((value.match(/::/g) || []).length > 1) return false;
    const halves = value.split('::');
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    if (![...left, ...right].every(part => /^[0-9a-f]{1,4}$/i.test(part))) return false;
    return halves.length === 2 ? left.length + right.length < 8 : left.length === 8;
  }

  function isNameCase(value) {
    return /^\p{Lu}/u.test(value) || (/^\p{L}+$/u.test(value) && value === value.toUpperCase());
  }

  function cleanURL(value) {
    let cleaned = value;
    while (/[.,;:!?]$/.test(cleaned)) cleaned = cleaned.slice(0, -1);
    const pairs = [['(', ')'], ['[', ']'], ['{', '}']];
    for (const [open, close] of pairs) {
      while (cleaned.endsWith(close) &&
             (cleaned.split(close).length - 1) > (cleaned.split(open).length - 1)) {
        cleaned = cleaned.slice(0, -1);
      }
    }
    return cleaned;
  }

  function separatorAllowsName(text, left, right) {
    return /^[\s,'\u2019-]+$/u.test(text.slice(left, right));
  }

  function makeDetection(text, start, end, type, layer, confidence, priority) {
    return { start, end, value: text.slice(start, end), type, layer, confidence, _priority: priority };
  }

  function addRegexDetections(text, candidates) {
    function collect(regex, type, confidence, validator, transform) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        let value = match[0];
        if (transform) value = transform(value);
        if (!value || (validator && !validator(value))) continue;
        const start = match.index;
        candidates.push(makeDetection(
          text, start, start + value.length, type, 'regex', confidence, DETECTION_PRIORITY[type]
        ));
      }
    }

    function collectGroup(regex, groupIndex, type, confidence, validator) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[groupIndex];
        if (!value || (validator && !validator(value))) continue;
        const within = match[0].lastIndexOf(value);
        const start = match.index + within;
        candidates.push(makeDetection(
          text, start, start + value.length, type, 'regex', confidence, DETECTION_PRIORITY[type]
        ));
      }
    }

    function numericDateIsValid(value) {
      const parts = value.split(/[\/.-]/);
      if (parts.length !== 3) return false;
      if (/^\d{4}$/.test(parts[0])) return isValidDate(parts[2], parts[1], parts[0]);
      const [day, month, rawYear] = parts;
      const year = rawYear.length === 2
        ? (Number(rawYear) <= 49 ? 2000 + Number(rawYear) : 1900 + Number(rawYear))
        : Number(rawYear);
      return (rawYear.length === 2 || rawYear.length === 4) && (isValidDate(day, month, year) || isValidDate(month, day, year));
    }

    function collectDelimitedColumn(headerAliases, type, confidence, validator) {
      const lines = [];
      const lineRegex = /[^\r\n]+/g;
      let lineMatch;
      while ((lineMatch = lineRegex.exec(text)) !== null) {
        lines.push({ value: lineMatch[0], start: lineMatch.index });
      }
      const canonical = value => fold(value).replace(/[\s_-]/g, '');
      for (let i = 0; i < lines.length; i += 1) {
        const counts = [',', ';', '\t'].map(delimiter => ({
          delimiter,
          count: lines[i].value.split(delimiter).length - 1
        })).sort((a, b) => b.count - a.count);
        if (counts[0].count === 0) continue;
        const delimiter = counts[0].delimiter;
        const header = parseCSVRows(lines[i].value, delimiter)[0] || [];
        const column = header.findIndex(value => headerAliases.has(canonical(value)));
        if (column < 0) continue;
        for (let j = i + 1; j < lines.length; j += 1) {
          if (/^\s*#/.test(lines[j].value)) continue;
          const row = parseCSVRows(lines[j].value, delimiter)[0] || [];
          if (row.length <= column) break;
          const value = String(row[column] || '').trim();
          if (!value || (validator && !validator(value))) continue;
          // Locate the actual column, even when another column has the same value.
          const rawLine = lines[j].value;
          const starts = [0]; let inQuotes = false;
          for (let k = 0; k < rawLine.length; k += 1) {
            if (rawLine[k] === '"') {
              if (inQuotes && rawLine[k + 1] === '"') k += 1;
              else inQuotes = !inQuotes;
            } else if (!inQuotes && rawLine[k] === delimiter) starts.push(k + 1);
          }
          const fieldStart = starts[column];
          const fieldEnd = starts[column + 1] === undefined ? rawLine.length : starts[column + 1] - 1;
          const relative = rawLine.slice(fieldStart, fieldEnd).indexOf(value);
          if (relative < 0) continue;
          const within = fieldStart + relative;
          const start = lines[j].start + within;
          candidates.push(makeDetection(
            text, start, start + value.length, type, 'regex', confidence, DETECTION_PRIORITY[type]
          ));
        }
        break;
      }
    }

    // Treat a filename as one potentially identifying value, including Unicode, dates and IDs.
    collectGroup(/(?:^|\n)[ \t]*(?:file[ \t]*name|bestandsnaam|dateiname|nom du fichier|nombre del archivo)[ \t]*:[ \t]*([^\r\n]{1,500})/gim,
      1, 'filename', 0.99);
    collectGroup(/(?:^|\n)[ \t]*([^\r\n]{1,250}\.(?:pdf|docx?|xlsx?|csv|txt|pptx?|odt|ods|rtf|jpe?g|png|zip))[ \t]*(?=\r?$)/gim,
      1, 'filename', 0.95);
    collect(/(?<![\p{L}\p{N}])(?:[\p{L}\p{N}][\p{L}\p{N}_.-]{0,200})\.(?:pdf|docx?|xlsx?|csv|txt|pptx?|odt|ods|rtf|jpe?g|png|zip)\b/giu,
      'filename', 0.92);

    // A copied path can identify the account holder through its parent folders.
    // Quoted paths retain spaces; unquoted paths with a recognised extension do too.
    collectGroup(/"((?:[A-Z]:[\\/]|\\\\|\/)[^"\r\n]{1,1000})"/gi, 1, 'filename', 0.98);
    collectGroup(/'((?:[A-Z]:[\\/]|\\\\|\/)[^'\r\n]{1,1000})'/gi, 1, 'filename', 0.98);
    collect(/(?<![\p{L}\p{N}:\/\\])(?:[A-Z]:[\\/]|\\\\[^\\/\s<>"']+[\\/]|\/(?:Users|home|Volumes|tmp|var|mnt|media)\/)[^<>"'\r\n]{1,1000}?\.(?:pdf|docx?|xlsx?|csv|txt|pptx?|odt|ods|rtf|jpe?g|png|zip)\b/giu,
      'filename', 0.98);
    collect(/(?<![\p{L}\p{N}:\/\\])(?:[A-Z]:[\\/]|\\\\[^\\/\s<>"']+[\\/]|\/(?:Users|home|Volumes|tmp|var|mnt|media)\/)[^\s<>"'\r\n]{1,1000}/giu,
      'filename', 0.97, null, cleanURL);

    // Unicode letters and copied zero-width characters must not leave a visible
    // prefix behind when an international email address is replaced.
    collect(/(?<![\p{L}\p{N}\p{M}.!#$%&'*+/=?^_`{|}~\-\u200B-\u200D\u2060\uFEFF])[\p{L}\p{N}\p{M}.!#$%&'*+/=?^_`{|}~\-\u200B-\u200D\u2060\uFEFF]+[@＠][\p{L}\p{N}](?:[\p{L}\p{N}\p{M}\-\u200B-\u200D\u2060\uFEFF]{0,61}[\p{L}\p{N}\p{M}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}\-\u200B-\u200D\u2060\uFEFF]{0,61}[\p{L}\p{N}\p{M}])?)+(?![\p{L}\p{N}\p{M}\-])/giu,
      'email', 0.99);
    collect(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, 'url', 0.98, null, cleanURL);
    const ibanLengths = {
      AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22,
      CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FO: 18, FI: 18,
      FR: 27, GE: 22, DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26,
      IE: 22, IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21, LB: 28,
      LI: 21, LT: 20, LU: 20, MK: 19, MT: 31, MR: 27, MU: 30, MD: 24, MC: 27,
      ME: 22, NL: 18, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24,
      SM: 27, SA: 24, RS: 22, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21, TN: 24,
      TR: 26, AE: 23, GB: 22, VG: 24
    };
    collect(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/gi, 'iban', 0.99, value => isIBANFormat(value) &&
      Boolean(ibanLengths[value.slice(0, 2).toUpperCase()]), value => {
      const expected = ibanLengths[value.slice(0, 2).toUpperCase()];
      if (!expected) return value;
      let count = 0;
      for (let i = 0; i < value.length; i += 1) {
        if (/[A-Z0-9]/i.test(value[i])) count += 1;
        if (count === expected) return value.slice(0, i + 1);
      }
      return value;
    });

    collect(/\b(?:\d{1,2}([/.-])\d{1,2}\1\d{4}|\d{4}([/.-])\d{1,2}\2\d{1,2})\b/g,
      'date', 0.98, value => {
        if (/^\d{4}[/.-]/.test(value)) {
          const [year, month, day] = value.split(/[\/.-]/);
          return isValidDate(day, month, year);
        }
        const [day, month, year] = value.split(/[\/.-]/);
        return isValidDate(day, month, year) || isValidDate(month, day, year);
      });

    const monthPattern = Array.from(MONTHS.keys()).sort((a, b) => b.length - a.length).join('|');
    collect(new RegExp('\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:' + monthPattern + ')\\.?\\s*,?\\s*\\d{4}\\b', 'gi'),
      'date', 0.98, value => {
        const match = /^(\d{1,2})(?:st|nd|rd|th)?\s+([^\s,.]+)\.?\s*,?\s*(\d{4})$/i.exec(value);
        return Boolean(match && isValidDate(match[1], MONTHS.get(fold(match[2])), match[3]));
      });
    collect(new RegExp('\\b(?:' + monthPattern + ')\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s*\\d{4}\\b', 'gi'),
      'date', 0.98, value => {
        const match = /^([^\s,.]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})$/i.exec(value);
        return Boolean(match && isValidDate(match[2], MONTHS.get(fold(match[1])), match[3]));
      });

    collectGroup(/\b(?:dob|date\s+of\s+birth|birth\s+date|geboortedatum|geboren\s+op)\s*[:=-]?\s*(\d{1,2}([/.-])\d{1,2}\2\d{2}(?:\d{2})?)\b/gi,
      1, 'date', 0.99, numericDateIsValid);

    collect(/(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?!\d|\.\d)/g, 'ip', 0.99, isValidIPv4);
    collect(/(?<![0-9a-f:])(?:[0-9a-f]{0,4}:){2,8}[0-9a-f]{0,4}(?![0-9a-f:])/gi,
      'ip', 0.97, isValidIPv6);
    collect(/(?<![\d/.-])\b[1-9]\d{3}\s?[A-Z]{2}\b/gi, 'postcode', 0.97);
    collectGroup(/\b(?:bsn|burgerservicenummer|sofinummer)(?:\s+(?:on\s+file|is))?\s*[:=#-]?\s*(\d{8,9})\b/gi,
      1, 'bsn', 0.995, isValidBSN);
    collectDelimitedColumn(new Set(['bsn', 'burgerservicenummer']), 'bsn', 0.995, isValidBSN);
    collectDelimitedColumn(new Set(['dob', 'dateofbirth', 'geboortedatum']), 'date', 0.99, numericDateIsValid);

    const streetTerms = (
      'street st road rd avenue ave lane ln drive dr boulevard blvd court ct place pl way square terrace highway ' +
      'close crescent straat laan weg plein gracht kade dijk singel hof allee platz strasse stra\u00dfe rue chemin avenida ' +
      'calle carrer via viale piazza ulica ul prospekt sokak cadde mahala'
    ).split(' ');
    const streetSuffix = '(?:' + streetTerms.map(term =>
      Array.from(term).map(ch => /[a-z]/i.test(ch) ? '[' + ch.toLowerCase() + ch.toUpperCase() + ']' : escapeRegExp(ch)).join('') +
      (['st', 'rd', 'ave', 'ln', 'dr', 'blvd', 'ct', 'pl', 'ul'].includes(term) ? '\\.?' : '')
    ).join('|') + ')';
    const houseNumber = '\\d{1,5}(?:\\s?[A-Z]|\\s?(?:bis|hs|zwart|rood))?(?:[-/]\\s?[A-Z0-9]+)?' +
      '(?:\\s?(?:bis|hs|zwart|rood|I{1,4}))?';
    collect(new RegExp('\\b' + houseNumber + '(?:\\s*,?\\s+)(?:[\\p{L}][\\p{L}\\p{M}\'\u2019.-]*\\s+){1,5}' +
      streetSuffix + '\\b', 'gu'), 'address', 0.93);
    collect(new RegExp('\\b(?:[A-Z\\u00c0-\\u00d6\\u00d8-\\u00de][\\p{L}\\p{M}\'\u2019.-]*\\s+){0,5}' + streetSuffix +
      '\\s+' + houseNumber + '\\b', 'gu'), 'address', 0.93);
    collect(/\b[\p{L}][\p{L}\p{M}'\u2019.-]*(?:straat|laan|weg|plein|gracht|kade|dijk|singel|hof)\s+\d{1,5}[A-Z]?(?:-[A-Z0-9]+)?\b/giu,
      'address', 0.94);

    const nlWord = "[\\p{L}][\\p{L}\\p{M}'\\u2019.-]*";
    collect(new RegExp('\\b(?:' + nlWord + '\\s+){0,5}' + nlWord +
      '(?:straat|laan|weg|plein|gracht|kade|dijk|singel|hof)\\s+' + houseNumber + '\\b', 'giu'),
      'address', 0.96);
    collect(new RegExp('\\b(?:laan|plein|hof|singel|kade|dijk|gracht)\\s+(?:' + nlWord + '\\s+){1,5}' +
      houseNumber + '\\b', 'giu'), 'address', 0.96);
    collectGroup(/(?:^|\n)[ \t]*(?:address|adres|adresse|direcci[oó]n)\s*:\s*([^\r\n]{5,200})/gim,
      1, 'address', 0.99, value => /\d/.test(value));

    collectGroup(/(?:^|\n)[ \t]*(?:(?:home|postal|mailing|residential)\s+address|woonadres|postadres|huisadres)\s*:\s*([^\r\n]{5,200})/gim,
      1, 'detail', 0.99, value => /\d/.test(value));

    collect(/(?:\+\s?\d{1,3}(?:[\s().-]*\d){6,13}|\b00\d{1,3}(?:[\s().-]*\d){6,13}|\b0[1-9](?:[\s().-]*\d){8,13})(?!\d)/g,
      'phone', 0.91, value => {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) return false;
        if (!value.trim().startsWith('+') && !/[\s().-]/.test(value) && digits.length < 10) return false;
        return true;
      }, value => value.replace(/[\s.,;:]+$/, ''));
    collect(/(?<!\d)(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\d)/g,
      'phone', 0.93, value => value.replace(/\D/g, '').length === 10);

    collectGroup(/\b(?:student|pupil|learner)\s*(?:id|number|no\.?|nr\.?)\s*[:=#-]?\s*([A-Z0-9][A-Z0-9/_-]{3,19})\b/gi,
      1, 'detail', 0.98, value => /\d/.test(value));
    collectGroup(/\b(?:leerlingnummer|leerlingnr\.?|studentnummer|studentnr\.?|stamnummer)\s*[:=#-]?\s*([A-Z0-9][A-Z0-9/_-]{3,19})\b/gi,
      1, 'detail', 0.98, value => /\d/.test(value));
    collectGroup(/\b(?:staff|employee|personnel|payroll|passport|national\s+id)\s*(?:id|number|no\.?|nr\.?)?\s*[:=#-]\s*([A-Z0-9][A-Z0-9/_-]{3,24})\b/gi,
      1, 'detail', 0.98, value => /\d/.test(value));
    collectGroup(/\b(?:personeelsnummer|medewerkernummer|paspoortnummer)\s*[:=#-]?\s*([A-Z0-9][A-Z0-9/_-]{3,24})\b/gi,
      1, 'detail', 0.98, value => /\d/.test(value));
    collectDelimitedColumn(new Set(['studentid', 'studentnumber', 'pupilid', 'leerlingnummer', 'studentnummer', 'employeeid', 'staffid', 'passportnumber', 'personeelsnummer']),
      'detail', 0.98, value => /^[A-Z0-9][A-Z0-9/_-]{3,19}$/i.test(value) && /\d/.test(value));
  }

  function customParts(value) {
    return wordsWithOffsets(String(value || '')).map(word => word.key).filter(Boolean);
  }

  function validateCustomNames(rows) {
    if (!Array.isArray(rows)) return;
    let total = 0;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const first = String(row.first || ''), last = String(row.last || '');
      total += first.length + last.length;
      if (rows.length > 2000 || first.length > 256 || last.length > 256 || total > 200000 || customParts(first + ' ' + last).length > 32) {
        throw Object.assign(new Error('csv_complex'), {code:'csv_complex', errorCategory:'validation', isRetryable:false});
      }
    }
  }

  function addCustomNameDetections(text, words, customNames, candidates) {
    validateCustomNames(customNames);
    const seenPatterns = new Set();
    const patterns = [];
    const compactPatterns = new Set();

    function addPattern(parts, confidence, isFull) {
      if (!parts.length || parts.some(part => !part)) return;
      const id = parts.join('|');
      if (seenPatterns.has(id)) return;
      seenPatterns.add(id);
      patterns.push({ parts, confidence, isFull });
    }

    for (const row of Array.isArray(customNames) ? customNames : []) {
      if (!row || typeof row !== 'object') continue;
      const first = customParts(row.first);
      const last = customParts(row.last);
      addPattern(first.concat(last), 0.995, first.length > 0 && last.length > 0);
      if (first.length && last.length) addPattern(last.concat(first), 0.985, true);
      if (first.length && last.length) {
        compactPatterns.add(first.concat(last).join(''));
        compactPatterns.add(last.concat(first).join(''));
      }
      addPattern(first, 0.96, false);
      addPattern(last, 0.96, false);
    }

    // Shared prefixes avoid rescanning the complete text for every class-list name.
    const trie = {next:new Map()};
    for (const pattern of patterns) {
      let node = trie;
      for (const part of pattern.parts) {
        if (!node.next.has(part)) node.next.set(part, {next:new Map()});
        node = node.next.get(part);
      }
      node.confidence = pattern.confidence;
    }
    for (let i = 0; i < words.length; i += 1) {
      let node = trie;
      for (let j = i; j < words.length && j < i + 32; j += 1) {
        if (j > i && !separatorAllowsName(text, words[j - 1].end, words[j].start)) break;
        node = node.next.get(words[j].key);
        if (!node) break;
        if (node.confidence) candidates.push(makeDetection(text, words[i].start, words[j].end, 'name', 'custom', node.confidence, DETECTION_PRIORITY.custom));
      }
    }
    for (const word of words) {
      if (!compactPatterns.has(word.key)) continue;
      candidates.push(makeDetection(
        text, word.start, word.end, 'name', 'custom', 0.99, DETECTION_PRIORITY.custom
      ));
    }
  }

  function addBuiltInNameDetections(text, words, candidates) {
    const database = typeof PII_NAMES_DB !== 'undefined' ? PII_NAMES_DB : { first: [], last: [] };
    const firstNames = new Set((database.first || []).map(nameKey).filter(Boolean));
    const lastNames = new Set((database.last || []).map(nameKey).filter(Boolean));

    for (let i = 0; i < words.length; i += 1) {
      const first = words[i];
      if (!firstNames.has(first.key) || !isNameCase(first.value)) continue;

      let bestEnd = -1;
      const limit = Math.min(words.length, i + 4);
      for (let j = i + 1; j < limit; j += 1) {
        if (!separatorAllowsName(text, words[j - 1].end, words[j].start)) break;
        if (PARTICLES.has(words[j].key)) continue;
        if (!isNameCase(words[j].value)) break;
        const middleOK = j === i + 1 || PARTICLES.has(words[j - 1].key) ||
          firstNames.has(words[j - 1].key) || lastNames.has(words[j - 1].key);
        if (middleOK && lastNames.has(words[j].key)) bestEnd = j;
        if (!PARTICLES.has(words[j].key) && !firstNames.has(words[j].key) && !lastNames.has(words[j].key)) break;
      }

      if (bestEnd >= 0) {
        candidates.push(makeDetection(
          text, first.start, words[bestEnd].end, 'name', 'list', 0.94, DETECTION_PRIORITY.listPair
        ));
      } else if (first.key.length >= 3 && !STOPWORDS.has(first.key)) {
        candidates.push(makeDetection(
          text, first.start, first.end, 'name', 'list', 0.76, DETECTION_PRIORITY.listSingle
        ));
      }
    }

    for (let i = 0; i + 1 < words.length; i += 1) {
      const family = words[i];
      const given = words[i + 1];
      if (!lastNames.has(family.key) || !firstNames.has(given.key) ||
          STOPWORDS.has(family.key) || STOPWORDS.has(given.key) ||
          !isNameCase(family.value) || !isNameCase(given.value) ||
          !separatorAllowsName(text, family.end, given.start)) continue;
      candidates.push(makeDetection(
        text, family.start, given.end, 'name', 'list', 0.91, DETECTION_PRIORITY.listPair
      ));
    }

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      if (!lastNames.has(word.key) || firstNames.has(word.key) || STOPWORDS.has(word.key) ||
          word.key.length < 4 || !isNameCase(word.value)) continue;
      candidates.push(makeDetection(
        text, word.start, word.end, 'name', 'list', 0.69, DETECTION_PRIORITY.listSingle
      ));
    }
  }

  function resolveOverlaps(text, candidates) {
    const ordered = candidates.filter(candidate => candidate.start >= 0 && candidate.end > candidate.start)
      .slice().sort((a, b) => a.start - b.start || b.end - a.end || b._priority - a._priority);
    const chosen = [];
    for (const candidate of ordered) {
      const previous = chosen[chosen.length - 1];
      if (!previous || candidate.start >= previous.end) {
        chosen.push({ ...candidate });
        continue;
      }
      if (candidate.end <= previous.end) continue;
      // Crossing spans must keep their complete union. Replacing an earlier
      // name span with a filename suffix otherwise exposes the given name.
      previous.end = candidate.end;
      previous.value = text.slice(previous.start, previous.end);
      if (candidate.type !== previous.type) previous.type = 'detail';
      previous.confidence = Math.max(previous.confidence, candidate.confidence);
      previous._priority = Math.max(previous._priority, candidate._priority);
    }
    return chosen.map(item => ({
      start: item.start,
      end: item.end,
      value: item.value,
      type: item.type,
      layer: item.layer,
      confidence: item.confidence
    }));
  }

  function detect(text, customNames = []) {
    text = String(text == null ? '' : text);
    if (!text) return [];
    const candidates = [];
    const words = wordsWithOffsets(text);
    addRegexDetections(text, candidates);
    addCustomNameDetections(text, words, customNames, candidates);
    addBuiltInNameDetections(text, words, candidates);
    return resolveOverlaps(text, candidates);
  }

  function chooseDelimiter(csvText) {
    let comma = 0;
    let semicolon = 0;
    let quoted = false;
    for (let i = 0; i < csvText.length; i += 1) {
      const ch = csvText[i];
      if (ch === '"') {
        if (quoted && csvText[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && ch === ',') comma += 1;
      else if (!quoted && ch === ';') semicolon += 1;
    }
    return semicolon > comma ? ';' : ',';
  }

  function parseCSVRows(csvText, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < csvText.length; i += 1) {
      const ch = csvText[i];
      if (quoted) {
        if (ch === '"' && csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"' && field === '') quoted = true;
      else if (ch === delimiter) {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && csvText[i + 1] === '\n') i += 1;
        row.push(field.trim());
        if (row.some(value => value !== '')) rows.push(row);
        row = [];
        field = '';
      } else field += ch;
    }
    row.push(field.trim());
    if (row.some(value => value !== '')) rows.push(row);
    return rows;
  }

  function parseNameCSV(csvText) {
    csvText = String(csvText == null ? '' : csvText).replace(/^\uFEFF/, '');
    if (!csvText.trim()) return [];
    const rows = parseCSVRows(csvText, chooseDelimiter(csvText));
    if (!rows.length) return [];

    const canonicalHeader = value => fold(value).replace(/[\s_-]/g, '');
    const firstAliases = new Set(['first', 'firstname', 'given', 'givenname', 'forename', 'voornaam']);
    const lastAliases = new Set(['last', 'lastname', 'surname', 'familyname', 'achternaam']);
    const prefixAliases = new Set(['prefix', 'surnameprefix', 'tussenvoegsel']);
    const fullAliases = new Set(['name', 'fullname', 'studentname', 'pupilname', 'naam', 'volledigenaam']);
    const headerIndex = rows.slice(0, 8).findIndex(row => row.map(canonicalHeader).some(value =>
      firstAliases.has(value) || lastAliases.has(value) || fullAliases.has(value)
    ));
    const header = headerIndex >= 0 ? rows[headerIndex].map(canonicalHeader) : [];
    let firstIndex = header.findIndex(value => firstAliases.has(value));
    let lastIndex = header.findIndex(value => lastAliases.has(value));
    const prefixIndex = header.findIndex(value => prefixAliases.has(value));
    const fullIndex = header.findIndex(value => fullAliases.has(value));
    const useFullName = fullIndex >= 0 && firstIndex < 0 && lastIndex < 0;
    if (headerIndex < 0) {
      firstIndex = 0;
      lastIndex = 1;
    } else {
      if (firstIndex < 0) firstIndex = 0;
      if (lastIndex < 0) lastIndex = firstIndex === 0 ? 1 : 0;
    }

    const result = [];
    const seen = new Set();
    for (let i = headerIndex >= 0 ? headerIndex + 1 : 0; i < rows.length; i += 1) {
      let first = String(rows[i][useFullName ? fullIndex : firstIndex] || '').trim();
      let last = useFullName ? '' : String(rows[i][lastIndex] || '').trim();
      const prefix = prefixIndex >= 0 ? String(rows[i][prefixIndex] || '').trim() : '';
      if (prefix) last = (prefix + ' ' + last).trim();
      if (!first && !last) continue;
      first = first.normalize('NFC');
      last = last.normalize('NFC');
      const key = first + '|' + last;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ first, last });
    }
    validateCustomNames(result);
    return result;
  }

  const TOKEN_LABELS = {
    name: 'PERSON', email: 'EMAIL', phone: 'PHONE', iban: 'IBAN', bsn: 'BSN',
    address: 'ADDRESS', date: 'DATE', postcode: 'POSTCODE', url: 'URL', ip: 'IP',
    detail: 'DETAIL', filename: 'FILE'
  };
  const TOKEN_RE_SOURCE = /\[\[[A-Z][A-Z0-9_]*_\d{3,}\]\]/gi;
  const TOKEN_RE_LIKE = /\[{1,3}[A-Za-z][A-Za-z0-9 _-]{0,60}_\d{1,9}\]{1,3}/g;
  const TOKEN_CORE_RE = /\b(?:PERSON|EMAIL|PHONE|IBAN|BSN|ADDRESS|DATE|POSTCODE|URL|IP|DETAIL|FILE)_\d{1,9}\b/gi;

  function createMapper() {
    const mappings = new Map();
    const records = [];
    const counters = Object.create(null);
    const reservedTokens = new Set();
    const allocatedTokens = new Set();

    function reserveSourceTokens(text) {
      TOKEN_RE_SOURCE.lastIndex = 0;
      let match;
      while ((match = TOKEN_RE_SOURCE.exec(text)) !== null) reservedTokens.add(match[0].toLowerCase());
    }

    function normalizedType(type) {
      return Object.prototype.hasOwnProperty.call(TOKEN_LABELS, type) ? type : 'detail';
    }

    function nextToken(type) {
      type = normalizedType(type);
      const label = TOKEN_LABELS[type];
      let token;
      do {
        counters[type] = (counters[type] || 0) + 1;
        token = '[[' + label + '_' + String(counters[type]).padStart(3, '0') + ']]';
      } while (reservedTokens.has(token.toLowerCase()) || allocatedTokens.has(token));
      allocatedTokens.add(token);
      return token;
    }

    function addMapping(key, original, pseudonym, type) {
      const mapping = { original, pseudonym, type };
      mappings.set(key, mapping);
      records.push(mapping);
      return pseudonym;
    }

    function mapValue(original, type) {
      type = normalizedType(type);
      const key = type + '\u0000' + original;
      if (mappings.has(key)) return mappings.get(key).pseudonym;
      return addMapping(key, original, nextToken(type), type);
    }

    function mergeConfirmedDetections(text, detections) {
      const safe = (Array.isArray(detections) ? detections : [])
        .filter(item => item && Number.isInteger(item.start) && Number.isInteger(item.end) &&
          item.start >= 0 && item.end > item.start && item.end <= text.length)
        .map(item => ({ start: item.start, end: item.end, type: normalizedType(item.type) }))
        .sort((a, b) => a.start - b.start || b.end - a.end);
      const merged = [];
      for (const item of safe) {
        const previous = merged[merged.length - 1];
        if (!previous || item.start >= previous.end) {
          merged.push({ ...item });
          continue;
        }
        previous.end = Math.max(previous.end, item.end);
        if (previous.type !== item.type) previous.type = 'detail';
      }
      return merged;
    }

    function anonymize(text, detections) {
      text = String(text == null ? '' : text);
      reserveSourceTokens(text);
      const merged = mergeConfirmedDetections(text, detections);

      let output = '';
      let cursor = 0;
      for (const item of merged) {
        output += text.slice(cursor, item.start);
        const original = text.slice(item.start, item.end);
        output += mapValue(original, item.type);
        cursor = item.end;
      }
      return output + text.slice(cursor);
    }

    function restore(aiText) {
      aiText = String(aiText == null ? '' : aiText);
      const candidates = [];
      for (const mapping of records) {
        const regex = new RegExp(escapeRegExp(mapping.pseudonym), 'gi');
        let match;
        while ((match = regex.exec(aiText)) !== null) {
          const matchEnd = match.index + match[0].length;
          if (aiText[match.index - 1] === '[' || aiText[matchEnd] === ']') continue;
          candidates.push({
            start: match.index,
            end: matchEnd,
            replacement: mapping.original,
            mapping
          });
        }
      }
      candidates.sort((a, b) => a.start - b.start || b.end - a.end);
      let restored = '';
      let cursor = 0;
      for (const match of candidates) {
        if (match.start < cursor) continue;
        restored += aiText.slice(cursor, match.start) + match.replacement;
        cursor = match.end;
      }
      restored += aiText.slice(cursor);

      const flagged = [];
      const flagKeys = new Set();
      function addFlag(pseudonym, reason) {
        const key = pseudonym + '|' + reason;
        if (flagKeys.has(key)) return;
        flagKeys.add(key);
        flagged.push({ pseudonym, reason });
      }

      const observedMappings = new Set(candidates.map(candidate => candidate.mapping.pseudonym));
      for (const record of records) {
        if (!observedMappings.has(record.pseudonym)) {
          addFlag(record.pseudonym, 'Placeholder missing from reply; check the source and intended meaning');
        }
      }

      const knownTokens = new Set(records.map(record => record.pseudonym.toLowerCase()));
      TOKEN_RE_LIKE.lastIndex = 0;
      let observed;
      while ((observed = TOKEN_RE_LIKE.exec(aiText)) !== null) {
        const value = observed[0];
        if (!knownTokens.has(value.toLowerCase()) && !reservedTokens.has(value.toLowerCase())) {
          const wellFormed = /^\[\[[A-Za-z][A-Za-z0-9_]*_\d{3,}\]\]$/.test(value);
          addFlag(value, wellFormed
            ? 'Unknown placeholder; no matching session mapping'
            : 'Malformed placeholder; left unchanged');
        }
      }
      TOKEN_CORE_RE.lastIndex = 0;
      while ((observed = TOKEN_CORE_RE.exec(aiText)) !== null) {
        const coreStart = observed.index;
        const coreEnd = observed.index + observed[0].length;
        const hasEnvelope = aiText.slice(Math.max(0, coreStart - 2), coreStart) === '[[' &&
          aiText.slice(coreEnd, coreEnd + 2) === ']]';
        if (hasEnvelope) continue;
        let start = coreStart;
        let end = coreEnd;
        while (start > 0 && aiText[start - 1] === '[') start -= 1;
        while (end < aiText.length && aiText[end] === ']') end += 1;
        addFlag(aiText.slice(start, end), 'Malformed placeholder; left unchanged');
      }

      return { text: restored, flagged };
    }

    return {
      anonymize,
      entries() {
        return records.map(({ original, pseudonym, type }) => ({ original, pseudonym, type }));
      },
      restore
    };
  }

  // Generic removal creates no identity-to-code mapping. Remaining context still needs review.
  function redact(text, detections) {
    text = String(text == null ? '' : text);
    const ranges = (Array.isArray(detections) ? detections : []).filter(d => d &&
      Number.isInteger(d.start) && Number.isInteger(d.end) && d.start >= 0 &&
      d.end > d.start && d.end <= text.length).sort((a,b) => a.start-b.start || b.end-a.end);
    let output = '', cursor = 0, pending = null;
    for (const range of ranges) {
      if (pending && range.start < pending.end) { pending.end = Math.max(pending.end,range.end); continue; }
      if (pending) { output += text.slice(cursor,pending.start)+'[REMOVED]';cursor=pending.end; }
      pending = {start:range.start,end:range.end};
    }
    if (pending) { output += text.slice(cursor,pending.start)+'[REMOVED]';cursor=pending.end; }
    return output+text.slice(cursor);
  }

  return { detect, parseNameCSV, createMapper, redact };
})();
