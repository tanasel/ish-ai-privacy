/* PII Shield — i18n (English default, Dutch optional).
 * In-memory language state only: NO localStorage, NO cookies (privacy by design).
 * Auto-detect: navigator.language starting with 'nl' -> Dutch, else English. */
'use strict';

const PII_I18N = {
  en: {
    // header / chrome
    offline_pill: 'OFFLINE — no data leaves this device',
    lang_toggle_aria: 'Schakel over naar Nederlands (switch to Dutch)',
    start_over: 'Start over',
    stepper_aria: 'Steps',
    stepper_1: 'Paste or upload',
    stepper_2: 'Review',
    stepper_3: 'Safe copy',
    stepper_4: 'Use your AI',
    stepper_5: 'Put names back',
    footer: '100% offline — nothing leaves this computer. GDPR/UAVG by design.',
    // step 1
    step1_title: 'Step 1 — Put your text in',
    step1_lead: 'Paste the text you want to send to an AI, or drop a file below. Everything stays on this computer.',
    dropzone_aria: 'Drop a file here or press Enter to choose a file',
    drop_strong: 'Drop a file here',
    drop_types: '.txt, .csv, .pdf, .docx, .xlsx',
    dz_or: 'or',
    pick_file: 'Choose a file',
    file_input_aria: 'Choose a file',
    your_text: 'Your text',
    input_placeholder: 'Paste your text here…',
    import_csv: 'Import class list (CSV)',
    csv_input_aria: 'Choose class list CSV',
    csv_hint: "A class list helps PII Shield spot your students' names, even unusual ones. It never leaves this computer.",
    find_btn: 'Find personal details →',
    // step 2
    step2_title: 'Step 2 — Check what was found',
    warnbar: '⚠ Review every detection before continuing. The computer is good, but you know your students.',
    preview_h: 'Preview',
    select_hint: 'Select any missed name or detail in the preview below, then press "Add selected text".',
    preview_aria: 'Text preview with highlighted detections',
    add_selected: 'Add selected text',
    or_type: 'or type it:',
    missed_value: 'Missed value',
    manual_placeholder: 'e.g. a missed name',
    type_label: 'Type',
    add_btn: 'Add',
    detections_h: 'Detections',
    th_keep: 'Keep?',
    th_value: 'Value',
    th_type: 'Type',
    th_found_by: 'Found by',
    th_confidence: 'Confidence',
    back: '← Back',
    make_safe: 'Make the safe copy →',
    // detection type labels
    type_name: 'Name',
    type_email: 'Email',
    type_phone: 'Phone',
    type_iban: 'IBAN',
    type_bsn: 'BSN',
    type_postcode: 'Postcode',
    type_date: 'Date',
    type_ip: 'IP address',
    type_url: 'Web address',
    type_address: 'Street address',
    // layer labels
    layer_regex: 'pattern',
    layer_list: 'name list',
    layer_custom: 'your class list',
    layer_ner: 'AI model',
    layer_manual: 'added by you',
    // step 3
    step3_title: 'Step 3 — Your safe copy',
    step3_lead: 'This version has all personal details swapped for placeholders. It is safe to paste into an AI tool.',
    anon_aria: 'Anonymized text',
    copy_safe: 'Copy safe text',
    download_txt: 'Download .txt',
    download_mapping: 'Download mapping key (CSV)',
    dangerbar_key: '🔑 The mapping key is the only sensitive file. It stays on this computer — you need it to restore names.',
    next_ai: 'Next: use your AI →',
    // step 4
    step4_title: 'Step 4 — Use your AI',
    bigstep_1: 'Open your AI tool (ChatGPT, Claude, NotebookLM, …) in another tab.',
    bigstep_2: 'Paste the safe text from Step 3 and ask your question.',
    bigstep_3: "Copy the AI's answer.",
    bigstep_4: 'Come back here and go to Step 5 to put the real names back.',
    keep_tab_hint: 'Keep this tab open. If you close it, the key that restores the names is gone (that is on purpose — nothing is saved).',
    have_answer: "I have the AI's answer →",
    // step 5
    step5_title: 'Step 5 — Put the real names back',
    ai_label: "Paste the AI's answer here",
    ai_placeholder: "Paste the AI's answer…",
    restore_btn: 'Restore names',
    restored_h: 'Restored text',
    restore_aria: 'Restored text',
    copy_restored: 'Copy restored text',
    done_over: 'Done — start over',
    // dynamic (ui.js)
    alert_need_text: 'Please paste or upload some text first.',
    alert_need_review: 'Please review the detections in step 2 first.',
    alert_select_first: 'First select some text in the preview, then press this button.',
    alert_no_session: 'There is no active session — go through steps 1-3 first.',
    confirm_restart: 'Start over? The current session and its mapping key will be gone.',
    file_loaded: 'Loaded "{name}".',
    file_loaded_text: 'Loaded text from "{name}".',
    pdf_missing: 'PDF support is not bundled in this build — please copy the text out of the PDF and paste it instead.',
    pdf_fail: 'Sorry, that PDF could not be read — please paste the text instead.',
    word_missing: 'Word support is not bundled in this build — please copy the text out of the document and paste it instead.',
    word_fail: 'Sorry, that Word file could not be read — please paste the text instead.',
    excel_missing: 'Excel support is not bundled in this build — please copy the cells and paste them instead.',
    excel_fail: 'Sorry, that Excel file could not be read — please paste the cells instead.',
    file_unsupported: 'That file type is not supported — please use .txt, .csv, .pdf, .docx or .xlsx, or paste the text.',
    csv_fail: 'Sorry, that class list could not be read. It should be a CSV with first and last names.',
    csv_count_one: '1 name imported',
    csv_count_many: '{n} names imported',
    summary_none: 'No personal details found. If that looks wrong, add missed items below.',
    summary_one: '1 detection: {parts}.',
    summary_many: '{n} detections: {parts}.',
    summary_part_one: '1 {label}',
    summary_part_many: '{n} {label}s',
    keep_aria: 'Keep {value}',
    copied_safe: 'Copied — safe to paste into your AI.',
    copied: 'Copied.',
    flagged_intro: '⚠ Check these spots by hand — the tool could not safely put the real name back everywhere:',
    // ner.js
    ner_btn_enable: 'Enable smart name detection (optional)',
    ner_btn_on: 'Smart detection: ON',
    ner_btn_title: 'One-time model download. After that it works offline. Your document never leaves this computer.',
    ner_offline: 'You appear to be offline. Smart detection needs one first-time download — everything else keeps working.',
    ner_downloading: 'Downloading the language model (one time, ~65 MB)… the page stays usable meanwhile.',
    ner_on_status: 'Smart name detection is ON (runs 100% inside this browser).',
    ner_fail: 'Could not download the model (network blocked?). No problem — the built-in detection still works fully.',
    ner_active: 'Smart detection active — {n} extra name mention(s) found',
    ner_problem: 'Smart detection had a problem with this text — regular detection still applies.'
  },
  nl: {
    // header / chrome
    offline_pill: 'OFFLINE — er verlaat niets deze computer',
    lang_toggle_aria: 'Switch to English (overschakelen naar Engels)',
    start_over: 'Opnieuw beginnen',
    stepper_aria: 'Stappen',
    stepper_1: 'Plakken of uploaden',
    stepper_2: 'Controleren',
    stepper_3: 'Veilige kopie',
    stepper_4: 'Gebruik je AI',
    stepper_5: 'Zet de namen terug',
    footer: '100% offline — er verlaat niets deze computer. Zo voldoe je vanzelf aan de AVG.',
    // step 1
    step1_title: 'Stap 1 — Zet je tekst erin',
    step1_lead: 'Plak de tekst die je naar een AI wilt sturen, of sleep hieronder een bestand. Alles blijft op deze computer.',
    dropzone_aria: 'Sleep hier een bestand naartoe of druk op Enter om een bestand te kiezen',
    drop_strong: 'Sleep hier een bestand naartoe',
    drop_types: '.txt, .csv, .pdf, .docx, .xlsx',
    dz_or: 'of',
    pick_file: 'Kies een bestand',
    file_input_aria: 'Kies een bestand',
    your_text: 'Jouw tekst',
    input_placeholder: 'Plak hier je tekst…',
    import_csv: 'Klassenlijst importeren (CSV)',
    csv_input_aria: 'Kies een klassenlijst (CSV)',
    csv_hint: 'Met een klassenlijst herkent PII Shield de namen van jouw leerlingen, ook de bijzondere. De lijst verlaat deze computer nooit.',
    find_btn: 'Zoek persoonsgegevens →',
    // step 2
    step2_title: 'Stap 2 — Controleer wat er gevonden is',
    warnbar: '⚠ Controleer elke vondst voordat je verdergaat. De computer is goed, maar jij kent je leerlingen.',
    preview_h: 'Voorbeeld',
    select_hint: 'Selecteer een gemiste naam of een gemist gegeven in het voorbeeld hieronder en druk dan op "Voeg selectie toe".',
    preview_aria: 'Tekstvoorbeeld met gemarkeerde vondsten',
    add_selected: 'Voeg selectie toe',
    or_type: 'of typ het:',
    missed_value: 'Gemist gegeven',
    manual_placeholder: 'bijv. een gemiste naam',
    type_label: 'Type',
    add_btn: 'Toevoegen',
    detections_h: 'Vondsten',
    th_keep: 'Houden?',
    th_value: 'Gegeven',
    th_type: 'Type',
    th_found_by: 'Gevonden door',
    th_confidence: 'Zekerheid',
    back: '← Terug',
    make_safe: 'Maak de veilige kopie →',
    // detection type labels
    type_name: 'Naam',
    type_email: 'E-mailadres',
    type_phone: 'Telefoonnummer',
    type_iban: 'IBAN',
    type_bsn: 'BSN',
    type_postcode: 'Postcode',
    type_date: 'Datum',
    type_ip: 'IP-adres',
    type_url: 'Webadres',
    type_address: 'Straatadres',
    // layer labels
    layer_regex: 'patroon',
    layer_list: 'namenlijst',
    layer_custom: 'jouw klassenlijst',
    layer_ner: 'AI-model',
    layer_manual: 'zelf toegevoegd',
    // step 3
    step3_title: 'Stap 3 — Je veilige kopie',
    step3_lead: 'In deze versie zijn alle persoonsgegevens vervangen door neutrale codes. Deze tekst kun je veilig in een AI-tool plakken.',
    anon_aria: 'Geanonimiseerde tekst',
    copy_safe: 'Kopieer veilige tekst',
    download_txt: 'Download .txt',
    download_mapping: 'Download sleutelbestand (CSV)',
    dangerbar_key: '🔑 Het sleutelbestand is het enige gevoelige bestand. Het blijft op deze computer — je hebt het nodig om de namen terug te zetten.',
    next_ai: 'Volgende: gebruik je AI →',
    // step 4
    step4_title: 'Stap 4 — Gebruik je AI',
    bigstep_1: 'Open je AI-tool (ChatGPT, Claude, NotebookLM, …) in een ander tabblad.',
    bigstep_2: 'Plak de veilige tekst uit stap 3 en stel je vraag.',
    bigstep_3: 'Kopieer het antwoord van de AI.',
    bigstep_4: 'Kom hier terug en ga naar stap 5 om de echte namen terug te zetten.',
    keep_tab_hint: 'Houd dit tabblad open. Als je het sluit, is de sleutel die de namen terugzet weg (dat is expres — er wordt niets opgeslagen).',
    have_answer: 'Ik heb het antwoord van de AI →',
    // step 5
    step5_title: 'Stap 5 — Zet de echte namen terug',
    ai_label: 'Plak hier het antwoord van de AI',
    ai_placeholder: 'Plak het antwoord van de AI…',
    restore_btn: 'Zet de namen terug',
    restored_h: 'Teruggezette tekst',
    restore_aria: 'Teruggezette tekst',
    copy_restored: 'Kopieer teruggezette tekst',
    done_over: 'Klaar — opnieuw beginnen',
    // dynamic (ui.js)
    alert_need_text: 'Plak of upload eerst wat tekst.',
    alert_need_review: 'Controleer eerst de vondsten in stap 2.',
    alert_select_first: 'Selecteer eerst wat tekst in het voorbeeld en druk dan op deze knop.',
    alert_no_session: 'Er is geen actieve sessie — doorloop eerst stap 1 tot en met 3.',
    confirm_restart: 'Opnieuw beginnen? De huidige sessie en het sleutelbestand zijn dan weg.',
    file_loaded: '"{name}" geladen.',
    file_loaded_text: 'Tekst uit "{name}" geladen.',
    pdf_missing: 'PDF-ondersteuning zit niet in deze versie — kopieer de tekst uit de PDF en plak die hier.',
    pdf_fail: 'Sorry, deze PDF kon niet gelezen worden — plak de tekst er alsjeblieft zelf in.',
    word_missing: 'Word-ondersteuning zit niet in deze versie — kopieer de tekst uit het document en plak die hier.',
    word_fail: 'Sorry, dit Word-bestand kon niet gelezen worden — plak de tekst er alsjeblieft zelf in.',
    excel_missing: 'Excel-ondersteuning zit niet in deze versie — kopieer de cellen en plak ze hier.',
    excel_fail: 'Sorry, dit Excel-bestand kon niet gelezen worden — plak de cellen er alsjeblieft zelf in.',
    file_unsupported: 'Dit bestandstype wordt niet ondersteund — gebruik .txt, .csv, .pdf, .docx of .xlsx, of plak de tekst.',
    csv_fail: 'Sorry, deze klassenlijst kon niet gelezen worden. Het moet een CSV zijn met voor- en achternamen.',
    csv_count_one: '1 naam geïmporteerd',
    csv_count_many: '{n} namen geïmporteerd',
    summary_none: 'Geen persoonsgegevens gevonden. Klopt dat niet? Voeg gemiste gegevens hieronder toe.',
    summary_one: '1 vondst: {parts}.',
    summary_many: '{n} vondsten: {parts}.',
    summary_part_one: '1 × {label}',
    summary_part_many: '{n} × {label}',
    keep_aria: 'Houden: {value}',
    copied_safe: 'Gekopieerd — veilig om in je AI te plakken.',
    copied: 'Gekopieerd.',
    flagged_intro: '⚠ Kijk deze plekken zelf even na — de tool kon de echte naam niet overal veilig terugzetten:',
    // ner.js
    ner_btn_enable: 'Slimme naamherkenning aanzetten (optioneel)',
    ner_btn_on: 'Slimme herkenning: AAN',
    ner_btn_title: 'Eenmalige download van het model. Daarna werkt het offline. Je document verlaat deze computer nooit.',
    ner_offline: 'Je lijkt offline te zijn. Slimme herkenning heeft één eerste download nodig — al het andere blijft gewoon werken.',
    ner_downloading: 'Het taalmodel wordt gedownload (eenmalig, ~65 MB)… de pagina blijft intussen gewoon bruikbaar.',
    ner_on_status: 'Slimme naamherkenning staat AAN (draait 100% in deze browser).',
    ner_fail: 'Het model kon niet gedownload worden (netwerk geblokkeerd?). Geen probleem — de ingebouwde herkenning blijft volledig werken.',
    ner_active: 'Slimme herkenning actief — {n} extra naamvermelding(en) gevonden',
    ner_problem: 'Slimme herkenning had moeite met deze tekst — de gewone herkenning blijft gelden.'
  }
};

var PII_LANG = (function () {
  // In-memory only. Default English; Dutch when the browser reports Dutch.
  var lang = (typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().indexOf('nl') === 0) ? 'nl' : 'en';
  var listeners = [];

  function t(key, vars) {
    var dict = PII_I18N[lang] || PII_I18N.en;
    var s = dict[key];
    if (s === undefined) s = PII_I18N.en[key];
    if (s === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  function applyTemplate() {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = t(els[i].getAttribute('data-i18n'));
    }
    // data-i18n-attr="placeholder:key;aria-label:key"
    var attrEls = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrEls.length; j++) {
      var pairs = attrEls[j].getAttribute('data-i18n-attr').split(';');
      for (var k = 0; k < pairs.length; k++) {
        var p = pairs[k].split(':');
        if (p.length === 2) attrEls[j].setAttribute(p[0].trim(), t(p[1].trim()));
      }
    }
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.textContent = (lang === 'en') ? 'NL' : 'EN';
      toggle.setAttribute('aria-label', t('lang_toggle_aria'));
    }
  }

  function setLang(l) {
    if (l !== 'en' && l !== 'nl') return;
    lang = l;
    applyTemplate();
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { /* never break the app */ } });
  }

  function initDom() {
    applyTemplate();
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        setLang(lang === 'en' ? 'nl' : 'en');
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDom);
    else initDom();
  }

  return {
    get lang() { return lang; },
    t: t,
    setLang: setLang,
    apply: applyTemplate,
    onChange: function (fn) { listeners.push(fn); }
  };
})();

// Short global helper used by ui.js / ner.js.
function t(key, vars) { return PII_LANG.t(key, vars); }
