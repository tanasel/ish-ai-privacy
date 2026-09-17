# Security and verification: ISH AI Privacy

## Reporting a problem

Email a.tanasel@ishthehague.nl (also published at `/.well-known/security.txt` on the hosted site).
Include the edition shown under "Check this build" in the tool's guide, the browser, and steps to reproduce.
Do not include real personal data in a report. Use the tool's fictional practice example.

## What the code does with your data

- All detection, removal and file extraction run inside the browser. The page's Content Security Policy sets `connect-src 'none'`, so the running code cannot make network requests.
- No cookies, no analytics, no browser storage. The web server only receives the normal page request (see the FAQ "What does the website itself record about me?").
- The hosted page loads one same-origin code file bound by Subresource Integrity. A changed file does not run.

## Verifying a release

1. `npm ci && npm run build` rebuilds every output from source.
2. `npm run build:verify` rebuilds and fails if any hash differs from `RELEASE-HASHES.txt`.
3. Compare the hash shown under "Check this build" in the running page with `RELEASE-HASHES.txt` for that edition.
4. For a downloaded code file: `shasum -a 256 ish-ai-privacy-<edition>.bundle.js` must match the hexadecimal value in the record.

The build has no timestamps or random values, so a clean checkout reproduces identical bytes on Node 24.

## Limits of this evidence

A matching hash proves which code is running. It does not prove the code is correct or complete, and it does not make a school workflow GDPR compliant. Detection recall is measured on a synthetic corpus only. The school decides purpose, lawful basis, approved AI services and retention. See the trust dossier in `../docs/governance/`.
