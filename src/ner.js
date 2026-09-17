/* PII Shield — optional NER layer (progressive enhancement).
 * Smart name detection via transformers.js, loaded ONLY when the teacher clicks
 * the button, from the network ONCE (library + model are then cached by the
 * browser). This is the single allowed network exception in the whole tool and
 * it carries no user data: the document text NEVER leaves the page — the model
 * runs inside the browser (WebAssembly). Offline or blocked → the tool simply
 * works without it. */
(function () {
  'use strict';

  var NER_LIB_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
  var NER_MODEL = 'Xenova/distilbert-base-multilingual-cased-ner-hrl';

  var pipe = null;          // the loaded pipeline
  var loading = false;
  var cache = { text: null, spans: null, pending: false };

  function findSpans(text, entities) {
    // transformers.js gives us entity strings + scores; locate them in the text.
    var spans = [];
    var seen = {};
    function addAll(word, score) {
      if (word.length < 2 || seen[word.toLowerCase()]) return false;
      seen[word.toLowerCase()] = true;
      var from = 0, idx, found = false;
      while ((idx = text.indexOf(word, from)) !== -1) {
        found = true;
        spans.push({
          start: idx, end: idx + word.length, value: text.slice(idx, idx + word.length),
          type: 'name', layer: 'ner',
          confidence: Math.round((score || 0.5) * 100) / 100
        });
        from = idx + word.length;
      }
      return found;
    }
    entities.forEach(function (ent) {
      var word = (ent.word || '').trim();
      // Tokenizers split around spaces/hyphens; if the stitched name is not in
      // the text verbatim, fall back to its parts ("Okonkwo - Vermeulen" case).
      if (!addAll(word, ent.score)) {
        word.split(/[\s-]+/).forEach(function (part) {
          if (part.length >= 3) addAll(part, ent.score);
        });
      }
    });
    return spans;
  }

  function aggregatePersons(tokens) {
    // transformers.js v2 token-classification returns per-token B-/I- tags with
    // WordPiece fragments ("Oko", "##nk", "##wo") — stitch them back into full
    // names before searching the text.
    var groups = [], cur = null;
    (tokens || []).forEach(function (tk) {
      var tag = tk.entity_group || tk.entity || '';
      var isPer = /PER/i.test(tag);
      var word = tk.word || '';
      var cont = word.indexOf('##') === 0;
      if (isPer && cur && (cont || !/^B-/i.test(tag))) {
        cur.word += cont ? word.slice(2) : ' ' + word;
        cur.score = Math.min(cur.score, tk.score || 1);
      } else if (isPer) {
        if (cur) groups.push(cur);
        cur = { word: cont ? word.slice(2) : word, score: tk.score || 1 };
      } else {
        if (cur) groups.push(cur);
        cur = null;
      }
    });
    if (cur) groups.push(cur);
    return groups.filter(function (g) { return g.score >= 0.6 && g.word.length >= 2; });
  }

  function analyze(text) {
    cache.pending = true;
    pipe(text).then(function (out) {
      var persons = aggregatePersons(out);
      cache.text = text;
      cache.spans = findSpans(text, persons);
      cache.pending = false;
      setStatus('ner_active', 'ok', { n: cache.spans.length });
      if (typeof window.PIIRerunDetect === 'function') window.PIIRerunDetect();
    }).catch(function () {
      cache.pending = false;
      setStatus('ner_problem', 'warn');
    });
  }

  // Synchronous hook the app calls on every detect run.
  window.PIINER = function (text) {
    if (!pipe || !text) return [];
    if (cache.text === text && cache.spans) return cache.spans;  // ready → merge
    if (!cache.pending) analyze(text);                            // kick off, rerun later
    return [];
  };

  // ---- tiny UI: an opt-in button + status line, injected into the page ----
  var box, btn, status;
  var lastStatus = null; // { key, cls, vars } — so a language switch can re-render it
  function setStatus(key, cls, vars) {
    if (!status) return;
    lastStatus = { key: key, cls: cls, vars: vars };
    status.textContent = t(key, vars);
    status.className = 'ner-status' + (cls ? ' ner-' + cls : '');
  }

  function enable() {
    if (loading || pipe) return;
    if (!navigator.onLine) {
      setStatus('ner_offline', 'warn');
      return;
    }
    loading = true;
    btn.disabled = true;
    setStatus('ner_downloading', 'busy');
    import(NER_LIB_URL).then(function (T) {
      if (T.env && T.env.allowLocalModels !== undefined) T.env.allowLocalModels = false;
      return T.pipeline('token-classification', NER_MODEL, { quantized: true });
    }).then(function (p) {
      pipe = p;
      loading = false;
      setStatus('ner_on_status', 'ok');
      btn.textContent = t('ner_btn_on');
      if (typeof window.PIIRerunDetect === 'function') window.PIIRerunDetect();
    }).catch(function (e) {
      loading = false;
      btn.disabled = false;
      setStatus('ner_fail', 'warn');
    });
  }

  function inject() {
    var host = document.querySelector('[data-ner-slot]') || document.querySelector('header') || document.body;
    if (!host) return;
    box = document.createElement('div');
    box.className = 'ner-box';
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ner-btn';
    btn.textContent = t('ner_btn_enable');
    btn.title = t('ner_btn_title');
    btn.addEventListener('click', enable);
    if (typeof PII_LANG !== 'undefined') {
      PII_LANG.onChange(function () {
        btn.textContent = pipe ? t('ner_btn_on') : t('ner_btn_enable');
        btn.title = t('ner_btn_title');
        if (lastStatus) setStatus(lastStatus.key, lastStatus.cls, lastStatus.vars);
      });
    }
    status = document.createElement('p');
    status.className = 'ner-status';
    box.appendChild(btn);
    box.appendChild(status);
    host.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
