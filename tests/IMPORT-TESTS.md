# Import regression tests

Run `node tests/imports.browser.test.js chromium` or `node tests/imports.browser.test.js webkit` after building the app. Python 3 is required for the deterministic fixture generator. The runner generates large files in its own temporary directory and removes that directory after the run. `PII_IMPORT_FIXTURES` can point to an existing generated set; such a directory is not removed. `PII_IMPORT_EVIDENCE` can override the evidence directory.

The suite checks import text, ordering, comments, notes, hidden content, relationship targets, malformed XML and ZIP packages, input and expansion limits, cancellation, filename review, source preservation, Dutch labels, and network silence. Fixtures contain only fictional data. They never contact an external service.

The 31 small or hostile synthetic cases exercise specific extractor semantics. They are not evidence that Microsoft Office renders each constructed package. The six pinned packages under `fixtures/imports-real` were generated with python-pptx, python-docx, and openpyxl, reopened by those libraries, and converted to ODF using LibreOffice with an isolated temporary profile. The manifest records exact library versions and SHA-256 hashes. The fixture generator verifies those hashes before using the files. Interactive Microsoft Office and physical-device checks are outside this suite.

To refresh the six full packages deliberately, run `make-real-import-fixtures.py` using a Python environment with python-pptx, python-docx and openpyxl and a `soffice` executable. It writes generated Office and ODF files plus a combined manifest to the chosen output directory. Review the new files and expectations before replacing the pinned files and their manifest. That regeneration is not part of normal test execution.

These tests establish the observed extraction behavior for the cases listed in the result file. They do not certify that every document format variant is supported, that all identifying details can be detected automatically, or that a resulting text is legally anonymous.
