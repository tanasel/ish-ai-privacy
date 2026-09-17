# ISH AI Privacy: module contract

Offline deliverable: one self-contained `ish-ai-privacy.html` (also built as `pii-shield.html` for compatibility). The hosted edition is `hosting/index.html` plus the identical code in `hosting/ish-ai-privacy-2.3-r2.bundle.js`, bound by Subresource Integrity and a matching CSP hash. This keeps host HTML monitoring from modifying embedded libraries or truncating the large page. The browser requests the page and its same-origin code at startup; no document content is uploaded and no connections are allowed during processing. During the build we work in modules; `build.js` inlines them in this order inside one `<script>` block:

1. `src/names_db.js`      — defines `const PII_NAMES_DB = { first: [...], last: [...] }` (lowercase, NFD-stripped diacritics; 2000+ entries total, 50+ nationalities incl. transliteration variants).
2. `src/engine.js`        — detection + pseudonym + restore. Pure JS, no DOM, no imports. Exposes ONE global:

```js
const PIIEngine = {
  // Find supported potential personal details; recall is incomplete. customNames: [{first,last}] from CSV import (priority over built-ins).
  // Returns non-overlapping spans sorted by start:
  //   [{start, end, value, type, layer, confidence}]
  //   type ∈ 'name'|'email'|'phone'|'iban'|'bsn'|'postcode'|'date'|'ip'|'url'|'address'|'detail'|'filename'
  //   layer ∈ 'regex'|'list'|'custom'
  detect(text, customNames = []),

  // Parse a name-list CSV (first_name,last_name header optional, comma/semicolon, quotes,
  // diacritics kept for display but matching is insensitive). Returns [{first,last}].
  parseNameCSV(csvText),

  // Session mapper. Deterministic within one reviewed input. Every exact original value has one
  // typed token; distinct case and diacritic spellings remain distinct mappings.
  createMapper(),

  // Generic removal only. Same [REMOVED] marker for every selected span, no mapping.
  // No assurance that remaining text is anonymous.
  redact(text, detections /*confirmed only*/),
  //   mapper.anonymize(text, detections /*confirmed only*/) -> string
  //   mapper.entries() -> [{original, pseudonym, type}]   // internal session review and tests only
  //   mapper.restore(aiText) -> { text, flagged: [{pseudonym, reason}] }
  //     restore accepts a complete known token, case-insensitively. Text outside the token,
  //     including plural or possessive suffixes, is preserved. It never substitutes a partial
  //     person token. Unknown or malformed typed tokens remain unchanged and go to flagged. Missing known codes are also flagged for review; omission can be intentional in a summary.
}
```

Pseudonym formats: `[[PERSON_001]]`, `[[EMAIL_001]]`, `[[PHONE_001]]`, `[[IBAN_001]]`, `[[BSN_001]]`, `[[ADDRESS_001]]`, `[[DATE_001]]`, `[[POSTCODE_001]]`, `[[URL_001]]`, `[[IP_001]]`, `[[DETAIL_001]]`, and `[[FILE_001]]`. Allocation skips any case variant of a well-formed token already present in the reviewed source. Overlapping confirmed spans are merged over the complete union; mixed types become `detail`.

BSN detection MUST apply the 11-proef (elfproef) checksum and requires a BSN label or BSN-named delimited column. Dates: dd-mm-yyyy, dd/mm/yyyy, mm/dd/yyyy, Month d yyyy, d Month yyyy (EN+NL month names), yyyy-mm-dd, yyyy/mm/dd, yyyy.mm.dd, abbreviated months including Sept., plus two-digit numeric years only with a DOB/geboortedatum label or column. Context-labelled student, staff, employee, passport and national IDs use `detail`; unlabelled ordinary numbers are not student IDs. Labelled Home address/Woonadres/Address/Adres/Adresse/Dirección lines may capture the full line because unlabelled international address syntax is not claimed. Common capitalized words are excluded from built-in single-name hits via a stopword set; explicitly imported name-list names override that stoplist and still require staff review.

3. `src/ui.js` + `src/styles.css` + `index.template.html` — UI reads ONLY the PIIEngine API above.
4. `vendor/*.js` — PDF.js and its worker, plus pinned fflate 0.8.3, explicitly selected and inlined by build.js. Mammoth, SheetJS and the docx writer are not included in the shipped build. Existing vendor files remain only for older fixtures/history.

Tests (node, no framework): `tests/unit.test.js` (engine), `tests/roundtrip.test.js`, `tests/adversarial.test.js`, and `tests/new-edgecases.test.js`, `tests/removal.test.js`, and `tests/recall.test.js` (runs 50 samples in `tests/samples/*.json`), run via `node tests/run_all.js`. Sample JSON shape: `{ "name": "...", "text": "...", "pii": [{"value": "...", "type": "name"}] }`. Recall enumerates every occurrence of each unique annotated type/value pair and requires a compatible detection span for every occurrence. Target >95% recall and <10% FP rate. These bounded tests do not establish complete anonymisation.

Staff workflow: three steps with default removal, or four with optional reversible codes. Both the AI request and document are combined into the reviewed text. Mandatory full-text/context review and sharing acknowledgement. Editing source, request, mode or detections invalidates downstream output. In removal mode preparation creates no mapper and clears source, request, imported list, detection rows and private DOM. The UI prevents returning to cleared review/restoration state. This is reference clearing, not secure device erasure. Remaining context can still identify someone. Optional codes are explicitly labelled pseudonymisation. No model downloads, persistence, restoration-key export or uploads. A strict CSP blocks connections. All file extraction is local and outputs plain text; original files are unchanged. The single HTML includes English and Dutch help, FAQ and a printable guide. Limits: 50 MB (50 × 1024 × 1024 bytes) per file, 100,000 extracted or pasted characters including the filename, 200 PDF pages or slides, no OCR, name list up to 1 MB and 2,000 records.

Imported filenames are included in the reviewed source. The staff filename-list control accepts one per line and offers complete filename replacement, including Unicode names, date and number components. Neutral download names never reuse original names. This does not rename, modify or sanitise original file attachments or metadata.

Current standalone route: `https://shield.ishweb.nl/`. The approved Academy route is `https://www.ish.academy/privacy/`. Old `/innovate/pii-shield/` links redirect. Staff branding is ISH AI Privacy with bundled vector logo and favicon. HTTP CSP and no-store headers are generated by the build from the exact script/style hashes. The build does not certify legal compliance. School governance, purpose, lawful basis, provider agreements and other GDPR obligations are separate.

Fresh additional regressions cover complete Unicode emails, local paths including username directories, crossing name/filename spans, lowercase supported-country IBANs, whole labelled home addresses and additional valid dates. These support the existing bounded corpus, not universal international recognition.


## Shared ISH design and publication

Staff edition 2.2 matches the ISH Space design family: the unchanged official school mark, Fjalla One headings, Source Sans 3 body, optional Atkinson Hyperlegible reading view, official five-colour stripe, square controls, 3px borders and hard shadows. Latin/Latin-extended font files and their OFL licences are bundled as data resources; the CSP permits `font-src data:` only. Other writing systems use the browser's installed fallback fonts. Hosted HTML has a 768 KiB budget including embedded fonts and logo. The offline copy requires no font/image service.

Approved destinations are `https://www.ish.academy/privacy/` and a full independent copy at `https://shield.ishweb.nl/`. A release manifest is not proof of either site being live. Verify public bytes, response headers and real browser journeys for each host. Academy's original `/innovate/pii-shield/` entry points retain their redirects. The same short staff-tool card format is used for Class, Space, Quiz and AI Privacy.

Deploy the versioned bundle before changing the entry page. A temporary policy can allow the previous and new exact hashes while switching the page, then restore the final generated policy. Preserve exact public backups and do not deploy audit/test fixtures. Login credentials remain user-entered. Current publication evidence and blockers belong in the release report.

ISH Web portal restriction, confirmed by ALX on 11 September 2026: keep this tool on the separate shield subdomain. Do not add its link or files to the main ISH Web staff portal until ALX explicitly confirms that school permission is granted. The temporary homepage link and `www/www/privacy` folder were removed; the original homepage was restored byte for byte. The standalone hosted variant is generated as `hosting-shield/index.html`, with its own visible short address and identical application code.

## Version 2.3 local import API

`window.PIIImports.extract(file, {lang, signal, onProgress})` returns `{text, warnings, counts}`. Counts include slides, PDF pages, sheets, hidden slides/sheets, note parts and supported comments/annotations. UI adds the quoted original filename, enforces the combined character limit and displays a translated receipt. A failed, cancelled or stale import never replaces the previous source. Clear, edit, practice example and filename-list actions abort an active import. No partial output is accepted after a limit failure.

Supported extensions: TXT, CSV, TSV, MD, PDF, DOCX, XLSX, PPTX, ODT, ODS and ODP. These are plain-text importers, not full format conformance checkers, renderers or attachment cleaners. Office/ODF images, OCR, embedded documents/media and macros are not processed. External relationships are never fetched. All original files and metadata remain unchanged. Repeated identical ODF rows/cells are represented once with an explicit warning; spaces are expanded only within a bounded count. PDF page/annotation text and basic properties are read, not every possible XMP or attachment. Layout order can differ.

PPTX slide order follows presentation relationships. Hidden slides, readable notes/comments, supported author/shape descriptions and conventional master/layout text are included. DOCX follows headers/footers/notes/comment relationships. XLSX follows workbook sheets, shared-string/style relationships; includes sheet names, hidden sheet content, readable cells, formulas as unexecuted text, supported comments and date serial conversion. ODF includes header/footer text and counts hidden slides/sheets using direct and inherited style properties. These claims need both synthetic and generated Office/ODF regression tests.

ZIP validation uses the actual EOCD/directory, entry counts, local-header consistency, non-overlap, descriptors, duplicate/path checks and selected-entry CRC checks. ZIP64, multidisk, encrypted and unsupported compression are rejected. Limits: 10,000 entries; 150 MiB declared total expansion; 8 MiB per XML part and 32 MiB total selected XML, measured during bounded streaming inflation; 300,000 parsed XML nodes; 200 sheets. Unselected media is never inflated. DTD/entity declarations and malformed XML are rejected. The importer yields regularly, checks cancellation and has a 30-second elapsed-time limit. DOM parsing of a single bounded XML part is synchronous; this is not whole-parser worker isolation.

Class-list matching uses shared prefixes rather than a complete-text scan per name. Both CSV parsing and the engine validate up to 2,000 people, 256 characters per first/last field, 32 name parts per person and 200,000 total name characters. Errors carry `code`, `errorCategory: validation` and `isRetryable: false`.

## Edition 2.4: verifiable build

`build.js` owns `APP_VERSION`, the release date and the bundle name, and substitutes `{{VERSION}}`/`{{RELEASE_DATE_EN}}` in the template and `__PII_VERSION__`/`__PII_HASH_RECORD__` in `ui.js`. After assembling it writes `RELEASE-HASHES.txt` (base64 CSP/SRI hash, plus hex SHA-256 of both bundles, both hosted pages and the offline file) and copies it, with `.well-known/security.txt`, into `hosting/` and `hosting-shield/`. `node build.js --verify` rebuilds and exits 1 if the record differs. The build has no timestamps, so a clean checkout reproduces identical bytes on Node 24 (`engines` pinned). `renderVerify()` in the guide reads the script hash from the CSP meta tag and the `integrity` attribute of the loaded bundle and shows edition, hash, source and match state; it never fetches anything. Two FAQs cover verification and what the web server records. The brand test now expects 25 FAQs (verification, approved AI services, what the server records).
